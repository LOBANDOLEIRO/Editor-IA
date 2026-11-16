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
  chunks: Float32Array[];
  firstT: number | null;
  recordFrom: number;
  done: Promise<void>;
};

/** Trecho contínuo de reprodução: `from` (timeline) toca em `t0` (contexto), até `end`. */
type Segment = { t0: number; from: number; end: number; nextBeat: number };

const meterBuf = new Float32Array(1024);
function peakOf(an?: AnalyserNode) {
  if (!an) return 0;
  an.getFloatTimeDomainData(meterBuf);
  let p = 0;
  for (let i = 0; i < meterBuf.length; i++) {
    const v = Math.abs(meterBuf[i]);
    if (v > p) p = v;
  }
  return p;
}

class Engine {
  ctx: AudioContext | null = null;
  private bus!: GainNode;
  private master!: GainNode;
  private masterMeter?: AnalyserNode;
  private reverbIn!: GainNode;
  private chains = new Map<string, TrackChain>();
  private sources = new Set<AudioBufferSourceNode>();
  private segments: Segment[] = [];
  private clips: Clip[] = [];
  private loop: { start: number; end: number } | null = null;
  private stoppedAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  playing = false;

  metronomeOn = true;
  bpm = 90;
  private clickGain!: GainNode;

  // microfone
  private mic: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micMeter: AnalyserNode | null = null;
  private monitorGain: GainNode | null = null;
  private monitorTrack: string | null = null;
  private workletReady = false;
  private capture: Capture | null = null;
  private silent!: GainNode;

  ensure() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    const m = createMaster(ctx, 0.9, true);
    this.bus = m.bus;
    this.master = m.master;
    this.masterMeter = m.meter;
    this.reverbIn = m.reverbIn;
    this.clickGain = ctx.createGain();
    this.clickGain.gain.value = 0.35;
    this.clickGain.connect(ctx.destination); // metrônomo fora do mix/exportação
    this.silent = ctx.createGain();
    this.silent.gain.value = 0;
    this.silent.connect(ctx.destination);
    return ctx;
  }

  setMasterVolume(v: number) {
    const ctx = this.ensure();
    this.master.gain.setTargetAtTime(v, ctx.currentTime, 0.015);
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
        ch = createTrackChain(ctx, this.bus, this.reverbIn, true);
        this.chains.set(t.id, ch);
      }
      applyTrack(ctx, ch, t, audible.get(t.id) ?? true, true, this.bpm);
    }
    // retorno do microfone na faixa armada com monitor ligado
    const mon = tracks.find((t) => t.armed && t.monitor);
    this.setMonitor(mon?.id ?? null);
  }

  // ---------- níveis ----------
  trackLevel(id: string) {
    return peakOf(this.chains.get(id)?.meter);
  }
  masterLevel() {
    return peakOf(this.masterMeter);
  }
  micLevel() {
    return this.micMeter ? peakOf(this.micMeter) : 0;
  }
  get micReady() {
    return !!this.micSource;
  }

  // ---------- transporte ----------
  getPosition() {
    if (!this.playing || !this.ctx) return this.stoppedAt;
    const now = this.ctx.currentTime;
    let seg = this.segments[0];
    for (const s of this.segments) if (s.t0 <= now) seg = s;
    if (!seg) return this.stoppedAt;
    return seg.from + (now - seg.t0);
  }

  seek(pos: number) {
    this.stoppedAt = Math.max(0, pos);
  }

  async play(clips: Clip[], tracks: Track[], from: number, loop: { start: number; end: number } | null = null) {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    this.stopSources();
    this.syncTracks(tracks);
    this.clips = clips;
    this.loop = loop && loop.end - loop.start > 0.05 && from < loop.end ? loop : null;
    this.segments = [];
    this.playing = true;
    this.addSegment(ctx.currentTime + 0.06, from);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  private addSegment(t0: number, from: number) {
    const ctx = this.ctx!;
    const end = this.loop ? this.loop.end : Infinity;
    const beat = 60 / this.bpm;
    this.segments.push({ t0, from, end, nextBeat: Math.ceil((from - 1e-6) / beat) });
    if (this.segments.length > 3) this.segments.shift();
    for (const c of this.clips) {
      const buf = getBuffer(c.bufferId);
      const ch = this.chains.get(c.trackId);
      if (!buf || !ch) continue;
      const src = scheduleClip(ctx, buf, ch.input, c, from, t0, end);
      if (src) {
        this.sources.add(src);
        src.addEventListener("ended", () => this.sources.delete(src));
      }
    }
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const now = ctx.currentTime;
    // agenda a próxima volta do loop com antecedência
    const last = this.segments[this.segments.length - 1];
    if (this.loop && last && last.end !== Infinity) {
      const lastEndCtx = last.t0 + (last.end - last.from);
      if (lastEndCtx - now < 0.3) this.addSegment(lastEndCtx, this.loop.start);
    }
    // metrônomo
    const beat = 60 / this.bpm;
    for (const s of this.segments) {
      while (true) {
        const pos = s.nextBeat * beat;
        if (pos >= s.end - 1e-6) break;
        const when = s.t0 + (pos - s.from);
        if (when > now + 0.15) break;
        if (this.metronomeOn && when >= now - 0.01) this.click(when, ((s.nextBeat % 4) + 4) % 4 === 0);
        s.nextBeat++;
      }
    }
  }

  /** Reagenda mantendo a posição (ex.: clip movido durante a reprodução). */
  async restart(clips: Clip[], tracks: Track[], loop: { start: number; end: number } | null) {
    if (!this.playing) return;
    let pos = this.getPosition();
    if (loop && (pos < loop.start || pos >= loop.end)) pos = Math.max(0, pos);
    await this.play(clips, tracks, pos, loop);
  }

  stop() {
    const pos = this.getPosition();
    this.stopSources();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    this.segments = [];
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
    this.sources.clear();
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

  // ---------- microfone / gravação ----------
  async prepareMic() {
    const ctx = this.ensure();
    if (ctx.state !== "running") await ctx.resume();
    if (!this.mic) {
      this.mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.micSource = ctx.createMediaStreamSource(this.mic);
      this.micMeter = ctx.createAnalyser();
      this.micMeter.fftSize = 1024;
      this.micSource.connect(this.micMeter);
    }
    if (!this.workletReady) {
      const url = URL.createObjectURL(new Blob([RECORDER_WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.workletReady = true;
    }
  }

  private setMonitor(trackId: string | null) {
    if (trackId === this.monitorTrack && (trackId === null || this.monitorGain)) return;
    if (this.monitorGain) {
      this.monitorGain.disconnect();
      this.micSource?.disconnect(this.monitorGain);
      this.monitorGain = null;
    }
    this.monitorTrack = trackId;
    if (!trackId || !this.micSource || !this.ctx) return;
    const ch = this.chains.get(trackId);
    if (!ch) return;
    this.monitorGain = this.ctx.createGain();
    this.micSource.connect(this.monitorGain).connect(ch.input);
  }

  /** Começa a capturar. Chame logo depois de play(). `recordFrom` = onde o take começa na timeline. */
  startCapture(recordFrom: number) {
    const ctx = this.ctx!;
    const node = new AudioWorkletNode(ctx, "rec-proc", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    let resolveDone!: () => void;
    const cap: Capture = {
      node,
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
    this.micSource!.connect(node);
    node.connect(this.silent);
    this.capture = cap;
  }

  /** Para a captura e devolve o take alinhado à timeline. */
  async stopCapture(extraLatencyMs: number): Promise<{ buffer: AudioBuffer; start: number } | null> {
    const cap = this.capture;
    const ctx = this.ctx;
    const seg = this.segments[0];
    if (!cap || !ctx || !seg) return null;
    this.capture = null;
    cap.node.port.postMessage("stop");
    await Promise.race([cap.done, new Promise((r) => setTimeout(r, 500))]);
    this.micSource?.disconnect(cap.node);
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
    const pos0 = seg.from + (cap.firstT - seg.t0) - latency; // posição na timeline do sample 0
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

/** Renderiza a mixagem (ou um trecho) offline, sem metrônomo. */
export async function renderMix(tracks: Track[], clips: Clip[], bpm: number, masterVolume: number, sampleRate = 44100) {
  const end = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  if (end <= 0) return null;
  const length = Math.ceil((end + 2.5) * sampleRate);
  const ctx = new OfflineAudioContext(2, length, sampleRate);
  const m = createMaster(ctx, masterVolume);
  const audible = audibleMap(tracks);
  const chains = new Map<string, TrackChain>();
  for (const t of tracks) {
    const ch = createTrackChain(ctx, m.bus, m.reverbIn);
    applyTrack(ctx, ch, t, audible.get(t.id) ?? true, false, bpm);
    chains.set(t.id, ch);
  }
  for (const c of clips) {
    const buf = getBuffer(c.bufferId);
    const ch = chains.get(c.trackId);
    if (buf && ch) scheduleClip(ctx, buf, ch.input, c, 0, 0);
  }
  return ctx.startRendering();
}
