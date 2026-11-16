import type { Clip, DelayDiv, MicModel, Track } from "../types";
import { voiceWorkletReady } from "./voiceWorklet";

export type TrackChain = {
  input: GainNode;
  voice: AudioWorkletNode | null; // gate + de-esser
  mic: BiquadFilterNode[]; // correção de headset + caráter de microfone
  hp: BiquadFilterNode;
  lp: BiquadFilterNode;
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  shaper: WaveShaperNode;
  comp: DynamicsCompressorNode;
  makeup: GainNode;
  eComp: DynamicsCompressorNode; // realce
  eGain: GainNode;
  eLow: BiquadFilterNode;
  eHigh: BiquadFilterNode;
  eShaper: WaveShaperNode;
  fader: GainNode;
  pan: StereoPannerNode;
  send: GainNode;
  delaySend: GainNode;
  delay: DelayNode;
  feedback: GainNode;
  dblGain: GainNode;
  meter?: AnalyserNode;
  drive: number; // últimas curvas aplicadas (são caras de recriar)
  eDrive: number;
};

const db = (v: number) => Math.pow(10, v / 20);

export const DELAY_BEATS: Record<DelayDiv, number> = {
  "1/4": 1,
  "1/8": 0.5,
  "1/8d": 0.75,
  "1/16": 0.25,
  "1/4t": 2 / 3,
};

type Band = { type: BiquadFilterType; f: number; q?: number; g?: number };
const FLAT: Band = { type: "peaking", f: 1000, q: 1, g: 0 };

/** Compensa o som típico de microfone de headset: grave embolado, médio "de caixa" e falta de brilho. */
const HEADSET_FIX: Band[] = [
  { type: "highpass", f: 85, q: 0.7 },
  { type: "peaking", f: 380, q: 1, g: -4 },
  { type: "peaking", f: 2900, q: 1.3, g: -1.5 },
  { type: "highshelf", f: 9000, g: 4 },
];

/**
 * "Caráter" de tipos clássicos de microfone. São curvas de equalização inspiradas na resposta
 * de cada tipo; aproximam o timbre, não transformam um microfone em outro.
 */
export const MIC_MODELS: Record<MicModel, { label: string; bands: Band[] }> = {
  none: { label: "Nenhum", bands: [] },
  condenser: {
    label: "Condensador de estúdio (estilo U87)",
    bands: [
      { type: "lowshelf", f: 120, g: 1 },
      { type: "peaking", f: 420, q: 1, g: -1.5 },
      { type: "peaking", f: 5000, q: 0.8, g: 2.5 },
      { type: "highshelf", f: 10000, g: 2 },
    ],
  },
  tube: {
    label: "Valvulado brilhante (estilo C12 / 251)",
    bands: [
      { type: "peaking", f: 200, q: 0.8, g: 1 },
      { type: "peaking", f: 3000, q: 1, g: -1 },
      { type: "peaking", f: 8000, q: 0.7, g: 3 },
      { type: "highshelf", f: 12000, g: 4 },
    ],
  },
  dynamic: {
    label: "Dinâmico de rádio (estilo SM7B)",
    bands: [
      { type: "lowshelf", f: 150, g: 2 },
      { type: "peaking", f: 300, q: 1, g: -1.5 },
      { type: "peaking", f: 3500, q: 0.9, g: 2 },
      { type: "highshelf", f: 9000, g: -3 },
    ],
  },
  ribbon: {
    label: "Fita vintage (ribbon)",
    bands: [
      { type: "lowshelf", f: 200, g: 3 },
      { type: "peaking", f: 1500, q: 0.8, g: 1 },
      { type: "highshelf", f: 7000, g: -5 },
      FLAT,
    ],
  },
  stage: {
    label: "Palco (estilo SM58)",
    bands: [
      { type: "highpass", f: 100, q: 0.7 },
      { type: "peaking", f: 400, q: 1, g: -2 },
      { type: "peaking", f: 5000, q: 0.9, g: 3 },
      { type: "highshelf", f: 12000, g: -2 },
    ],
  },
};

const MIC_BANDS = HEADSET_FIX.length + 4;

export function createTrackChain(ctx: BaseAudioContext, dest: AudioNode, reverbIn: AudioNode, withMeter = false): TrackChain {
  const input = ctx.createGain();
  let voice: AudioWorkletNode | null = null;
  if (voiceWorkletReady(ctx)) {
    voice = new AudioWorkletNode(ctx, "voice-proc", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: "explicit",
    });
  }
  const mic = Array.from({ length: MIC_BANDS }, () => {
    const f = ctx.createBiquadFilter();
    f.type = "peaking";
    f.gain.value = 0;
    return f;
  });
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
  // realce (um botão): compressão + graves e brilho + saturação leve
  const eComp = ctx.createDynamicsCompressor();
  eComp.attack.value = 0.01;
  eComp.release.value = 0.2;
  eComp.knee.value = 12;
  const eGain = ctx.createGain();
  const eLow = ctx.createBiquadFilter();
  eLow.type = "lowshelf";
  eLow.frequency.value = 90;
  const eHigh = ctx.createBiquadFilter();
  eHigh.type = "highshelf";
  eHigh.frequency.value = 9000;
  const eShaper = ctx.createWaveShaper();
  eShaper.oversample = "2x";
  const fader = ctx.createGain();
  const pan = ctx.createStereoPanner();
  const send = ctx.createGain();
  const delaySend = ctx.createGain();
  const delay = ctx.createDelay(4);
  const feedback = ctx.createGain();
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = "lowpass";
  delayTone.frequency.value = 5000;

  let node: AudioNode = input;
  for (const n of [voice, ...mic, hp, lp, low, mid, high, shaper, comp, makeup, eComp, eGain, eLow, eHigh, eShaper, fader, pan]) {
    if (!n) continue;
    node.connect(n);
    node = n;
  }
  pan.connect(dest);
  pan.connect(send).connect(reverbIn);
  pan.connect(delaySend).connect(delay).connect(delayTone).connect(dest);
  delayTone.connect(feedback).connect(delay);

  // dobra estéreo: duas cópias levemente atrasadas e moduladas, uma em cada lado
  const dblGain = ctx.createGain();
  dblGain.gain.value = 0;
  fader.connect(dblGain);
  for (const [time, rate, side] of [
    [0.013, 0.61, -1],
    [0.021, 0.47, 1],
  ]) {
    const d = ctx.createDelay(0.1);
    d.delayTime.value = time;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const depth = ctx.createGain();
    depth.gain.value = 0.0018;
    lfo.connect(depth).connect(d.delayTime);
    lfo.start();
    const p = ctx.createStereoPanner();
    p.pan.value = side;
    dblGain.connect(d).connect(p).connect(dest);
  }

  let meter: AnalyserNode | undefined;
  if (withMeter) {
    meter = ctx.createAnalyser();
    meter.fftSize = 1024;
    pan.connect(meter);
  }
  return { input, voice, mic, hp, lp, low, mid, high, shaper, comp, makeup, eComp, eGain, eLow, eHigh, eShaper, fader, pan, send, delaySend, delay, feedback, dblGain, meter, drive: -1, eDrive: -1 };
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

/** Aplica parâmetros da faixa. Efeito desligado = valor neutro. `audible` considera mute/solo. */
export function applyTrack(ctx: BaseAudioContext, ch: TrackChain, t: Track, audible: boolean, smooth: boolean, bpm: number) {
  const setP = (p: AudioParam, v: number) => {
    if (smooth) p.setTargetAtTime(v, ctx.currentTime, 0.015);
    else p.value = v;
  };
  const fx = t.fx;

  if (ch.voice) {
    const vp = ch.voice.parameters;
    vp.get("gateOn")!.value = fx.gateOn ? 1 : 0;
    vp.get("gateThreshold")!.value = fx.gateThreshold;
    vp.get("deess")!.value = fx.deessOn ? fx.deess : 0;
  }

  const bands: Band[] = [
    ...(fx.micOn && fx.micFix ? HEADSET_FIX : HEADSET_FIX.map(() => FLAT)),
    ...(fx.micOn ? MIC_MODELS[fx.micModel].bands : []),
  ];
  ch.mic.forEach((f, i) => {
    const b = bands[i] ?? FLAT;
    if (f.type !== b.type) f.type = b.type;
    setP(f.frequency, b.f);
    setP(f.Q, b.q ?? 0.7);
    setP(f.gain, b.g ?? 0);
  });

  setP(ch.hp.frequency, fx.filtersOn ? Math.max(20, fx.hpFreq) : 20);
  setP(ch.lp.frequency, fx.filtersOn ? Math.min(20000, fx.lpFreq) : 20000);
  setP(ch.low.gain, fx.eqOn ? fx.eqLow : 0);
  setP(ch.mid.gain, fx.eqOn ? fx.eqMid : 0);
  setP(ch.high.gain, fx.eqOn ? fx.eqHigh : 0);
  const drive = fx.driveOn ? fx.drive : 0;
  if (ch.drive !== drive) {
    ch.shaper.curve = drive > 0.001 ? driveCurve(drive) : null;
    ch.drive = drive;
  }
  // compressor "desligado" = limiar 0 dB e razão 1
  setP(ch.comp.threshold, fx.compOn ? fx.compThreshold : 0);
  setP(ch.comp.ratio, fx.compOn ? fx.compRatio : 1);
  setP(ch.makeup.gain, (fx.compOn ? db(fx.compMakeup) : 1) * (drive > 0 ? db(-drive * 6) : 1));

  const e = fx.enhanceOn ? fx.enhance : 0;
  setP(ch.eComp.threshold, e > 0 ? -12 - 18 * e : 0);
  setP(ch.eComp.ratio, 1 + 3 * e);
  setP(ch.eGain.gain, db(5 * e));
  setP(ch.eLow.gain, 3 * e);
  setP(ch.eHigh.gain, 4.5 * e);
  if (ch.eDrive !== e) {
    ch.eShaper.curve = e > 0.001 ? driveCurve(e * 0.12) : null;
    ch.eDrive = e;
  }

  setP(ch.fader.gain, audible ? t.volume : 0);
  setP(ch.pan.pan, t.pan);
  setP(ch.dblGain.gain, fx.doublerOn ? fx.doubler * 0.7 : 0);
  setP(ch.send.gain, fx.reverbOn ? fx.reverb : 0);
  setP(ch.delaySend.gain, fx.delayOn ? fx.delayMix : 0);
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
