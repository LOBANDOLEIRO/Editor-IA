import type { Clip, DelayDiv, Track } from "../types";

export type TrackChain = {
  input: GainNode;
  hp: BiquadFilterNode;
  lp: BiquadFilterNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  shaper: WaveShaperNode;
  comp: DynamicsCompressorNode;
  makeup: GainNode;
  fader: GainNode;
  pan: StereoPannerNode;
  send: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  meter?: AnalyserNode;
  drive: number; // último drive aplicado (a curva é cara de recriar)
};

const db = (v: number) => Math.pow(10, v / 20);

export const DELAY_BEATS: Record<DelayDiv, number> = {
  "1/4": 1,
  "1/8": 0.5,
  "1/8d": 0.75,
  "1/16": 0.25,
  "1/4t": 2 / 3,
};

export function createTrackChain(ctx: BaseAudioContext, dest: AudioNode, reverbIn: AudioNode, withMeter = false): TrackChain {
  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7;
  const low = ctx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 200;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1500;
  mid.Q.value = 0.8;
  const high = ctx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 6000;
  const shaper = ctx.createWaveShaper();
  shaper.oversample = "2x";
  const comp = ctx.createDynamicsCompressor();
  comp.attack.value = 0.005;
  comp.release.value = 0.15;
  comp.knee.value = 6;
  const makeup = ctx.createGain();
  const fader = ctx.createGain();
  const pan = ctx.createStereoPanner();
  const send = ctx.createGain();
  const delaySend = ctx.createGain();
  const delay = ctx.createDelay(4);
  const feedback = ctx.createGain();
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = "lowpass";
  delayTone.frequency.value = 5000;

  input.connect(hp).connect(lp).connect(low).connect(mid).connect(high).connect(shaper).connect(comp).connect(makeup).connect(fader).connect(pan).connect(dest);
  pan.connect(send).connect(reverbIn);
  pan.connect(delaySend).connect(delay).connect(delayTone).connect(dest);
  delayTone.connect(feedback).connect(delay);

  let meter: AnalyserNode | undefined;
  if (withMeter) {
    meter = ctx.createAnalyser();
    meter.fftSize = 1024;
    pan.connect(meter);
  }
  return { input, hp, lp, low, mid, high, shaper, comp, makeup, fader, pan, send, delaySend, delay, feedback, meter, drive: -1 };
}

function driveCurve(drive: number) {
  const k = 1 + drive * 30;
  const n = 2048;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

/** Aplica parâmetros da faixa. `audible` = considerando mute/solo. */
export function applyTrack(ctx: BaseAudioContext, ch: TrackChain, t: Track, audible: boolean, smooth: boolean, bpm: number) {
  const setP = (p: AudioParam, v: number) => {
    if (smooth) p.setTargetAtTime(v, ctx.currentTime, 0.015);
    else p.value = v;
  };
  const fx = t.fx;
  setP(ch.hp.frequency, Math.max(20, fx.hpFreq));
  setP(ch.lp.frequency, Math.min(20000, fx.lpFreq));
  setP(ch.low.gain, fx.eqLow);
  setP(ch.mid.gain, fx.eqMid);
  setP(ch.high.gain, fx.eqHigh);
  if (ch.drive !== fx.drive) {
    ch.shaper.curve = fx.drive > 0.001 ? driveCurve(fx.drive) : null;
    ch.drive = fx.drive;
  }
  // compressor "desligado" = limiar 0 dB e razão 1
  setP(ch.comp.threshold, fx.compOn ? fx.compThreshold : 0);
  setP(ch.comp.ratio, fx.compOn ? fx.compRatio : 1);
  setP(ch.makeup.gain, (fx.compOn ? db(fx.compMakeup) : 1) * (fx.drive > 0 ? db(-fx.drive * 6) : 1));
  setP(ch.fader.gain, audible ? t.volume : 0);
  setP(ch.pan.pan, t.pan);
  setP(ch.send.gain, fx.reverb);
  setP(ch.delaySend.gain, fx.delayMix);
  setP(ch.delay.delayTime, Math.min(3.9, (60 / bpm) * DELAY_BEATS[fx.delayDiv]));
  setP(ch.feedback.gain, Math.min(0.9, fx.delayFeedback));
}

export function audibleMap(tracks: Track[]) {
  const anySolo = tracks.some((t) => t.solo);
  return new Map(tracks.map((t) => [t.id, !t.mute && (!anySolo || t.solo)]));
}

export function createMaster(ctx: BaseAudioContext, volume: number, withMeter = false) {
  const bus = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = volume;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  bus.connect(master).connect(limiter).connect(ctx.destination);
  let meter: AnalyserNode | undefined;
  if (withMeter) {
    meter = ctx.createAnalyser();
    meter.fftSize = 1024;
    limiter.connect(meter);
  }

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 2.6, 3);
  const reverbIn = ctx.createGain();
  const reverbHp = ctx.createBiquadFilter();
  reverbHp.type = "highpass";
  reverbHp.frequency.value = 200;
  reverbIn.connect(reverbHp).connect(reverb).connect(bus);
  return { bus, master, reverbIn, meter };
}

function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/**
 * Agenda a parte do clip dentro de [from, until) da timeline; o instante `from` toca em `t0` (tempo do contexto).
 * Aplica ganho do clip e fades.
 */
export function scheduleClip(
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  dest: AudioNode,
  clip: Pick<Clip, "start" | "offset" | "duration" | "gain" | "fadeIn" | "fadeOut">,
  from: number,
  t0: number,
  until = Infinity,
) {
  const segStart = Math.max(clip.start, from);
  const segEnd = Math.min(clip.start + clip.duration, until);
  if (segEnd - segStart < 0.005) return null;
  const local0 = segStart - clip.start; // posição dentro do clip
  const local1 = segEnd - clip.start;
  const when = t0 + (segStart - from);
  const at = (local: number) => when + (local - local0);

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  src.connect(g).connect(dest);

  const G = clip.gain ?? 1;
  const fi = Math.min(clip.fadeIn ?? 0, clip.duration);
  const fo = Math.min(clip.fadeOut ?? 0, clip.duration);
  const env = (l: number) => {
    let v = G;
    if (fi > 0 && l < fi) v *= l / fi;
    if (fo > 0 && l > clip.duration - fo) v *= Math.max(0, (clip.duration - l) / fo);
    return v;
  };
  g.gain.setValueAtTime(env(local0), when);
  if (fi > 0 && local0 < fi) g.gain.linearRampToValueAtTime(env(Math.min(fi, local1)), at(Math.min(fi, local1)));
  const foStart = clip.duration - fo;
  if (fo > 0 && local1 > foStart) {
    if (foStart > local0) g.gain.setValueAtTime(env(foStart), at(foStart));
    g.gain.linearRampToValueAtTime(env(local1), at(local1));
  }
  // micro-fade no corte de loop para evitar clique
  if (local1 < clip.duration && until !== Infinity) {
    g.gain.setValueAtTime(env(Math.max(local0, local1 - 0.004)), at(Math.max(local0, local1 - 0.004)));
    g.gain.linearRampToValueAtTime(0, at(local1));
  }

  src.start(when, clip.offset + local0, local1 - local0);
  src.onended = () => g.disconnect();
  return src;
}
