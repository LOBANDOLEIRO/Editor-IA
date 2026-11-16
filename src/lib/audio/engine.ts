"use client";
import type { Clip, Track } from "../types";
import { getBuffer } from "./buffers";
import { applyTrack, audibleMap, createMaster, createTrackChain, scheduleClip, type TrackChain } from "./graph";

/** AudioWorklet que captura o microfone em blocos com o instante (currentTime) do primeiro sample. */
const RECORDER_WORKLET = `
class RecProc extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 4096; this.buf = new Float32Array(this.size); this.n = 0; this.t = 0; this.on = true;
    this.port.onmessage = (e) => {
      if (e.data === 'stop') {
        if (this.n > 0) this.port.postMessage({ t: this.t, data: this.buf.slice(0, this.n) });
        this.on = false;
        this.port.postMessage({ done: true });
      }
    };
  }
  process(inputs) {
    if (!this.on) return false;
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      if (this.n === 0) this.t = currentTime + i / sampleRate;
      this.buf[this.n++] = ch[i];
      if (this.n === this.size) { this.port.postMessage({ t: this.t, data: this.buf }); this.buf = new Float32Array(this.size); this.n = 0; }
    }
    return true;
  }
}
registerProcessor('rec-proc', RecProc);
`;

type Capture = {
  node: AudioWorkletNode;
  source: MediaStreamAudioSourceNode;
  chunks: Float32Array[];
  firstT: number | null;
  recordFrom: number;
  done: Promise<void>;
};

class Engine {
  ctx: AudioContext | null = null;
  private bus!: GainNode;
  private reverbIn!: GainNode;
  private chains = new Map<string, TrackChain>();
  private sources: AudioBufferSourceNode[] = [];
  private t0 = 0;
  private from = 0;
  private stoppedAt = 0;
  playing = false;

  // metrônomo
  metronomeOn = true;
  bpm = 90;
  private metroTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private clickGain!: GainNode;

  // gravação
  private mic: MediaStream | null = null;
  private workletReady = false;
  private capture: Capture | null = null;
  private silent!: GainNode;

  ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    const m = createMaster(ctx);
    this.bus = m.bus;
    this.reverbIn = m.reverbIn;
    this.clickGain = ctx.createGain();
    this.clickGain.gain.value = 0.35;
    this.clickGain.connect(ctx.destination); // metrônomo fora do mix/exportação
    this.silent = ctx.createGain();
    this.silent.gain.value = 0;
    this.silent.connect(ctx.destination);
    return ctx;
  }

  /** Cria/remove cadeias e aplica parâmetros conforme as faixas. */
  syncTracks(tracks: Track[]) {
    const ctx = this.ensure();
    const ids = new Set(tracks.map((t) => t.id));
    for (const [id, ch] of this.chains) {
      if (!ids.has(id)) {
        ch.input.disconnect();
        ch.pan.disconnect();
        this.chains.delete(id);
      }
    }
    const audible = audibleMap(tracks);
    for (const t of tracks) {
      let ch = this.chains.get(t.id);
      if (!ch) {
        ch = createTrackChain(ctx, this.bus, this.reverbIn);
        this.chains.set(t.id, ch);
      }
      applyTrack(ctx, ch, t, audible.get(t.id) ?? true, true);
    }
  }

  getPosition() {
    if (!this.playing || !this.ctx) return this.stoppedAt;
    return this.from + (this.ctx.currentTime - this.t0);
  }

  seek(pos: number) {
    this.stoppedAt = Math.max(0, pos);
  }

  async play(clips: Clip[], tracks: Track[], from: number) {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    this.stopSources();
    this.syncTracks(tracks);
    this.from = from;
    this.t0 = ctx.currentTime + 0.06;
    for (const c of clips) {
      const buf = getBuffer(c.bufferId);
      const ch = this.chains.get(c.trackId);
      if (!buf || !ch) continue;
      const src = scheduleClip(ctx, buf, ch.input, c, from, this.t0);
      if (src) this.sources.push(src);
    }
    this.playing = true;
    this.startMetronome();
  }

  /** Reagenda mantendo a posição (ex.: clip movido durante a reprodução). */
  async restart(clips: Clip[], tracks: Track[]) {
    if (!this.playing) return;
    await this.play(clips, tracks, this.getPosition());
  }

  stop() {
    const pos = this.getPosition();
    this.stopSources();
    this.stopMetronome();
    this.playing = false;
    this.stoppedAt = Math.max(0, pos);
    return this.stoppedAt;
  }

  private stopSources() {
    for (const s of this.sources) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* já parado */
      }
    }
    this.sources = [];
  }

  // ---------- metrônomo ----------
  private startMetronome() {
    this.stopMetronome();
    const beat = 60 / this.bpm;
    this.nextBeat = Math.ceil((this.from - 1e-6) / beat);
    const tick = () => {
      const ctx = this.ctx;
      if (!ctx || !this.playing) return;
      const beatDur = 60 / this.bpm;
      while (true) {
        const when = this.t0 + (this.nextBeat * beatDur - this.from);
        if (when > ctx.currentTime + 0.15) break;
        if (this.metronomeOn && when >= ctx.currentTime - 0.01) this.click(when, this.nextBeat % 4 === 0);
        this.nextBeat++;
      }
    };
    tick();
    this.metroTimer = setInterval(tick, 25);
  }

  private stopMetronome() {
    if (this.metroTimer) clearInterval(this.metroTimer);
    this.metroTimer = null;
  }

  private click(when: number, down: boolean) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = down ? 1600 : 1000;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(1, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(g).connect(this.clickGain);
    osc.start(when);
    osc.stop(when + 0.06);
  }

  // ---------- gravação ----------
  async prepareMic() {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    if (!this.mic) {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    }
    if (!this.workletReady) {
      const url = URL.createObjectURL(new Blob([RECORDER_WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.workletReady = true;
    }
  }

  /** Começa a capturar. Chame logo depois de play(). `recordFrom` = onde o take começa na timeline. */
  startCapture(recordFrom: number) {
    const ctx = this.ctx!;
    const source = ctx.createMediaStreamSource(this.mic!);
    const node = new AudioWorkletNode(ctx, "rec-proc", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    let resolveDone!: () => void;
    const cap: Capture = {
      node,
      source,
      chunks: [],
      firstT: null,
      recordFrom,
      done: new Promise<void>((r) => (resolveDone = r)),
    };
    node.port.onmessage = (e) => {
      if (e.data.done) return resolveDone();
      if (cap.firstT === null) cap.firstT = e.data.t;
      cap.chunks.push(e.data.data);
    };
    source.connect(node);
    node.connect(this.silent);
    this.capture = cap;
  }

  /** Para a captura e devolve o take alinhado à timeline. */
  async stopCapture(extraLatencyMs: number): Promise<{ buffer: AudioBuffer; start: number } | null> {
    const cap = this.capture;
    const ctx = this.ctx;
    if (!cap || !ctx) return null;
    this.capture = null;
    cap.node.port.postMessage("stop");
    await Promise.race([cap.done, new Promise((r) => setTimeout(r, 500))]);
    cap.source.disconnect();
    cap.node.disconnect();
    if (cap.firstT === null) return null;

    const total = cap.chunks.reduce((n, c) => n + c.length, 0);
    const data = new Float32Array(total);
    let o = 0;
    for (const c of cap.chunks) {
      data.set(c, o);
      o += c.length;
    }

    // latência ida (saída) + volta (entrada) + ajuste manual
    const inLatency = (this.mic?.getAudioTracks()[0]?.getSettings() as { latency?: number })?.latency ?? 0;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + inLatency + extraLatencyMs / 1000;
    const sr = ctx.sampleRate;
    // posição na timeline do sample 0
    const pos0 = this.from + (cap.firstT - this.t0) - latency;
    let skip = Math.max(0, Math.round((cap.recordFrom - pos0) * sr)); // descarta a contagem
    skip = Math.min(skip, data.length);
    const len = data.length - skip;
    if (len < sr * 0.1) return null;
    const buffer = ctx.createBuffer(1, len, sr);
    buffer.copyToChannel(data.subarray(skip), 0);
    return { buffer, start: pos0 + skip / sr };
  }

  async decode(data: ArrayBuffer) {
    return this.ensure().decodeAudioData(data);
  }
}

export const engine = new Engine();

/** Renderiza a mixagem completa offline (sem metrônomo). */
export async function renderMix(tracks: Track[], clips: Clip[], sampleRate = 44100) {
  const end = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  if (end <= 0) return null;
  const length = Math.ceil((end + 2.5) * sampleRate);
  const ctx = new OfflineAudioContext(2, length, sampleRate);
  const m = createMaster(ctx);
  const audible = audibleMap(tracks);
  const chains = new Map<string, TrackChain>();
  for (const t of tracks) {
    const ch = createTrackChain(ctx, m.bus, m.reverbIn);
    applyTrack(ctx, ch, t, audible.get(t.id) ?? true, false);
    chains.set(t.id, ch);
  }
  for (const c of clips) {
    const buf = getBuffer(c.bufferId);
    const ch = chains.get(c.trackId);
    if (buf && ch) scheduleClip(ctx, buf, ch.input, c, 0, 0);
  }
  return ctx.startRendering();
}
