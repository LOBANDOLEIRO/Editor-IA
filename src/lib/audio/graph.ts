import type { Track } from "../types";

export type TrackChain = {
  input: GainNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  comp: DynamicsCompressorNode;
  makeup: GainNode;
  fader: GainNode;
  pan: StereoPannerNode;
  send: GainNode;
};

const db = (v: number) => Math.pow(10, v / 20);

export function createTrackChain(ctx: BaseAudioContext, dest: AudioNode, reverbIn: AudioNode): TrackChain {
  const input = ctx.createGain();
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
  const comp = ctx.createDynamicsCompressor();
  comp.attack.value = 0.005;
  comp.release.value = 0.15;
  comp.knee.value = 6;
  const makeup = ctx.createGain();
  const fader = ctx.createGain();
  const pan = ctx.createStereoPanner();
  const send = ctx.createGain();
  input.connect(low).connect(mid).connect(high).connect(comp).connect(makeup).connect(fader).connect(pan).connect(dest);
  pan.connect(send).connect(reverbIn);
  return { input, low, mid, high, comp, makeup, fader, pan, send };
}

/** Aplica parâmetros da faixa. `audible` = considerando mute/solo. */
export function applyTrack(ctx: BaseAudioContext, ch: TrackChain, t: Track, audible: boolean, smooth: boolean) {
  const setP = (p: AudioParam, v: number) => {
    if (smooth) p.setTargetAtTime(v, ctx.currentTime, 0.015);
    else p.value = v;
  };
  setP(ch.low.gain, t.fx.eqLow);
  setP(ch.mid.gain, t.fx.eqMid);
  setP(ch.high.gain, t.fx.eqHigh);
  // compressor "desligado" = limiar 0 dB e razão 1
  setP(ch.comp.threshold, t.fx.compOn ? t.fx.compThreshold : 0);
  setP(ch.comp.ratio, t.fx.compOn ? t.fx.compRatio : 1);
  setP(ch.makeup.gain, t.fx.compOn ? db(t.fx.compMakeup) : 1);
  setP(ch.fader.gain, audible ? t.volume : 0);
  setP(ch.pan.pan, t.pan);
  setP(ch.send.gain, t.fx.reverb);
}

export function audibleMap(tracks: Track[]) {
  const anySolo = tracks.some((t) => t.solo);
  return new Map(tracks.map((t) => [t.id, !t.mute && (!anySolo || t.solo)]));
}

export function createMaster(ctx: BaseAudioContext) {
  const bus = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  bus.connect(limiter).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx, 2.4, 3);
  const reverbIn = ctx.createGain();
  reverbIn.connect(reverb).connect(bus);
  return { bus, reverbIn };
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

/** Agenda um clip num contexto, tocando a timeline a partir de `from` (s), com o instante 0 em `t0`. */
export function scheduleClip(
  ctx: BaseAudioContext,
  buf: AudioBuffer,
  dest: AudioNode,
  clip: { start: number; offset: number; duration: number },
  from: number,
  t0: number,
) {
  const end = clip.start + clip.duration;
  if (end <= from) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  if (clip.start >= from) {
    src.start(t0 + (clip.start - from), clip.offset, clip.duration);
  } else {
    const skip = from - clip.start;
    src.start(t0, clip.offset + skip, clip.duration - skip);
  }
  return src;
}
