/**
 * Corretor de afinação (estilo "autotune"/Newtone):
 *  1. detecção de f0 com YIN (em sinal reamostrado ~11 kHz, para ser rápido)
 *  2. alvo = nota mais próxima da escala, suavizado pela "velocidade de correção"
 *  3. deslocamento de pitch com TD-PSOLA (preserva formantes e duração)
 * Funções puras: rodam no Web Worker.
 */

export type PitchAnalysis = {
  sampleRate: number; // taxa original
  factor: number; // fator de decimação
  hop: number; // hop no sinal decimado
  winHalf: number; // meia janela (amostras decimadas)
  f0: Float32Array; // Hz por frame, 0 = sem voz
};

export type TuneParams = {
  root: number; // 0..11 (C..B)
  steps: number[]; // graus da escala em semitons
  speedMs: number; // 0 = robótico
  amount: number; // 0..1
  mix: number; // 0..1
};

const TARGET_SR = 11025;
const HOP = 128;
const MIN_F = 65;
const MAX_F = 1000;
const YIN_THRESHOLD = 0.15;

export function frameDuration(an: PitchAnalysis) {
  return (an.hop * an.factor) / an.sampleRate;
}

function lowpassDecimate(x: Float32Array, factor: number) {
  if (factor <= 1) return x;
  const taps = 33;
  const half = (taps - 1) / 2;
  const fc = (0.5 / factor) * 0.9;
  const h = new Float32Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const n = i - half;
    const sinc = n === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
    h[i] = sinc * w;
    sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  const n = Math.floor(x.length / factor);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = i * factor;
    let acc = 0;
    for (let k = 0; k < taps; k++) {
      const j = c + k - half;
      if (j >= 0 && j < x.length) acc += h[k] * x[j];
    }
    y[i] = acc;
  }
  return y;
}

export function toMono(channels: Float32Array[]) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length;
  return out;
}

export function analyzePitch(mono: Float32Array, sampleRate: number): PitchAnalysis {
  const factor = Math.max(1, Math.floor(sampleRate / TARGET_SR));
  const y = lowpassDecimate(mono, factor);
  const dsr = sampleRate / factor;
  const W = Math.round(dsr * 0.035);
  const minLag = Math.floor(dsr / MAX_F);
  const maxLag = Math.ceil(dsr / MIN_F);
  const frames = Math.max(0, Math.floor((y.length - W - maxLag) / HOP));
  const f0 = new Float32Array(frames);
  const rms = new Float32Array(frames);
  const d = new Float32Array(maxLag + 1);

  let peakRms = 0;
  for (let f = 0; f < frames; f++) {
    const s = f * HOP;
    let e = 0;
    for (let j = 0; j < W; j++) e += y[s + j] * y[s + j];
    rms[f] = Math.sqrt(e / W);
    if (rms[f] > peakRms) peakRms = rms[f];
  }
  const gate = Math.max(0.004, peakRms * 0.06);

  for (let f = 0; f < frames; f++) {
    if (rms[f] < gate) continue;
    const s = f * HOP;
    // função diferença
    for (let tau = 1; tau <= maxLag; tau++) {
      let acc = 0;
      for (let j = 0; j < W; j++) {
        const v = y[s + j] - y[s + j + tau];
        acc += v * v;
      }
      d[tau] = acc;
    }
    // diferença normalizada cumulativa
    d[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= maxLag; tau++) {
      running += d[tau];
      d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }
    let tau = -1;
    for (let t = Math.max(2, minLag); t < maxLag; t++) {
      if (d[t] < YIN_THRESHOLD) {
        while (t + 1 < maxLag && d[t + 1] < d[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) continue;
    // interpolação parabólica
    const a = d[tau - 1];
    const b = d[tau];
    const c = d[tau + 1];
    const den = a + c - 2 * b;
    const shift = den !== 0 ? (0.5 * (a - c)) / den : 0;
    const period = tau + Math.max(-1, Math.min(1, shift));
    f0[f] = dsr / period;
  }

  cleanup(f0);
  return { sampleRate, factor, hop: HOP, winHalf: W / 2, f0 };
}

/** Mediana em janelas de 5 frames + remove segmentos vozeados muito curtos. */
function cleanup(f0: Float32Array) {
  const src = f0.slice();
  const tmp: number[] = [];
  for (let i = 0; i < f0.length; i++) {
    if (src[i] <= 0) continue;
    tmp.length = 0;
    for (let k = -2; k <= 2; k++) {
      const v = src[i + k];
      if (v > 0) tmp.push(v);
    }
    tmp.sort((p, q) => p - q);
    const med = tmp[tmp.length >> 1];
    // corrige erros de oitava isolados
    const r = src[i] / med;
    f0[i] = r > 1.8 || r < 0.55 ? med : src[i];
  }
  let i = 0;
  while (i < f0.length) {
    if (f0[i] <= 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < f0.length && f0[j] > 0) j++;
    if (j - i < 4) for (let k = i; k < j; k++) f0[k] = 0;
    i = j;
  }
}

const hzToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

function nearestInScale(m: number, root: number, steps: number[]) {
  let best = Math.round(m);
  let bestDist = Infinity;
  for (let n = Math.floor(m) - 6; n <= Math.ceil(m) + 6; n++) {
    const pc = (((n - root) % 12) + 12) % 12;
    if (!steps.includes(pc)) continue;
    const dist = Math.abs(n - m);
    if (dist < bestDist) {
      bestDist = dist;
      best = n;
    }
  }
  return best;
}

export type Correction = {
  detected: Float32Array; // MIDI (NaN = sem voz)
  corrected: Float32Array; // MIDI após correção
  semis: Float32Array; // correção aplicada (semitons)
};

export function computeCorrection(an: PitchAnalysis, p: TuneParams): Correction {
  const n = an.f0.length;
  const detected = new Float32Array(n).fill(NaN);
  const corrected = new Float32Array(n).fill(NaN);
  const semis = new Float32Array(n);
  const fd = frameDuration(an);
  const alpha = p.speedMs <= 0 ? 1 : 1 - Math.exp(-(fd * 1000) / p.speedMs);
  let c = 0;
  let prevVoiced = false;
  let prevTarget = NaN;
  for (let i = 0; i < n; i++) {
    const f = an.f0[i];
    if (f <= 0) {
      prevVoiced = false;
      prevTarget = NaN;
      continue;
    }
    const m = hzToMidi(f);
    detected[i] = m;
    let target = nearestInScale(m, p.root, p.steps);
    // histerese: evita trocar de nota em vibrato/transições
    if (!Number.isNaN(prevTarget) && prevTarget !== target && Math.abs(m - prevTarget) < 0.65) target = prevTarget;
    prevTarget = target;
    const want = Math.max(-12, Math.min(12, (target - m) * p.amount));
    c = prevVoiced ? c + (want - c) * alpha : want;
    prevVoiced = true;
    semis[i] = c;
    corrected[i] = m + c;
  }
  return { detected, corrected, semis };
}

/** TD-PSOLA: aplica `semis` (por frame) a todos os canais. */
export function psolaShift(channels: Float32Array[], an: PitchAnalysis, semis: Float32Array, mix: number) {
  const sr = an.sampleRate;
  const N = channels[0].length;
  const mono = toMono(channels);
  const frames = an.f0.length;
  const frameOf = (s: number) => {
    const f = Math.round((s / an.factor - an.winHalf) / an.hop);
    return f < 0 ? 0 : f >= frames ? frames - 1 : f;
  };
  const f0At = (s: number) => (frames ? an.f0[frameOf(s)] : 0);
  const semisAt = (s: number) => (frames ? semis[frameOf(s)] : 0);

  // marcas de pitch (análise)
  const unvoicedP = Math.round(sr * 0.008);
  const marks: number[] = [];
  const periods: number[] = [];
  const voiced: boolean[] = [];
  let last = -1e9;
  let lastVoiced = false;
  let t = 0;
  while (t < N) {
    const f = f0At(t);
    if (f > 0) {
      const P = sr / f;
      let lo: number;
      let hi: number;
      if (lastVoiced) {
        const pred = last + P;
        lo = pred - 0.2 * P;
        hi = pred + 0.2 * P;
      } else {
        lo = t;
        hi = t + P;
      }
      lo = Math.max(Math.round(lo), Math.round(last + 0.5 * P), 0);
      hi = Math.min(Math.round(hi), N - 1);
      if (lo > hi) break;
      let m = lo;
      for (let j = lo + 1; j <= hi; j++) if (mono[j] > mono[m]) m = j;
      marks.push(m);
      periods.push(P);
      voiced.push(true);
      last = m;
      lastVoiced = true;
      t = m + P;
    } else {
      const m = Math.max(Math.round(t), Math.round(last + 1));
      if (m >= N) break;
      marks.push(m);
      periods.push(unvoicedP);
      voiced.push(false);
      last = m;
      lastVoiced = false;
      t = m + unvoicedP;
    }
  }

  const out = channels.map(() => new Float32Array(N));
  if (!marks.length) return channels.map((c) => c.slice());
  const wsum = new Float32Array(N);

  let ts = marks[0];
  let k = 0;
  while (ts < N) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ts) <= Math.abs(marks[k] - ts)) k++;
    const m = marks[k];
    const P = periods[k];
    const r = voiced[k] ? Math.pow(2, semisAt(ts) / 12) : 1;
    const L = Math.max(2, Math.round(P));
    const center = Math.round(ts);
    for (let j = -L; j <= L; j++) {
      const src = m + j;
      const dst = center + j;
      if (src < 0 || src >= N || dst < 0 || dst >= N) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / L);
      wsum[dst] += w;
      for (let c = 0; c < channels.length; c++) out[c][dst] += channels[c][src] * w;
    }
    ts += P / r;
  }

  for (let c = 0; c < channels.length; c++) {
    const o = out[c];
    const dry = channels[c];
    for (let i = 0; i < N; i++) {
      const wet = wsum[i] > 1e-3 ? o[i] / wsum[i] : dry[i];
      o[i] = dry[i] * (1 - mix) + wet * mix;
    }
  }
  return out;
}

// Perfis de Krumhansl-Schmuckler
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Sugere o tom a partir das notas cantadas. */
export function detectKey(an: PitchAnalysis): { root: number; minor: boolean } | null {
  const hist = new Array(12).fill(0);
  let count = 0;
  for (const f of an.f0) {
    if (f <= 0) continue;
    hist[((Math.round(hzToMidi(f)) % 12) + 12) % 12]++;
    count++;
  }
  if (count < 20) return null;
  let best = { root: 0, minor: false, score: -Infinity };
  const corr = (profile: number[], root: number) => {
    const mp = profile.reduce((a, b) => a + b) / 12;
    const mh = hist.reduce((a, b) => a + b) / 12;
    let num = 0;
    let dp = 0;
    let dh = 0;
    for (let i = 0; i < 12; i++) {
      const a = profile[i] - mp;
      const b = hist[(i + root) % 12] - mh;
      num += a * b;
      dp += a * a;
      dh += b * b;
    }
    return num / Math.sqrt(dp * dh || 1);
  };
  for (let r = 0; r < 12; r++) {
    const sMaj = corr(MAJOR, r);
    const sMin = corr(MINOR, r);
    if (sMaj > best.score) best = { root: r, minor: false, score: sMaj };
    if (sMin > best.score) best = { root: r, minor: true, score: sMin };
  }
  return { root: best.root, minor: best.minor };
}
