/**
 * Redução de ruído de fundo (chiado, ventilador, ruído do microfone) por
 * "spectral gating": estima o ruído constante de cada faixa de frequência
 * e atenua o que estiver perto dele. Funções puras (rodam no Web Worker).
 */

const N = 2048;
const HOP = N / 4;

function fft(re: Float32Array, im: Float32Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] /= n;
  }
}

const hann = new Float32Array(N);
for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);

/** amount: 0..1 (0 = nada, 1 = redução máxima, ~24 dB). */
export function denoise(channels: Float32Array[], amount: number): Float32Array[] {
  const len = channels[0].length;
  const frames = Math.max(1, Math.ceil((len + N) / HOP));
  const bins = N / 2 + 1;
  const mono = new Float32Array(len);
  for (const ch of channels) for (let i = 0; i < len; i++) mono[i] += ch[i] / channels.length;

  const re = new Float32Array(N);
  const im = new Float32Array(N);
  const frameAt = (src: Float32Array, f: number) => {
    const start = f * HOP - N + HOP;
    for (let i = 0; i < N; i++) {
      const j = start + i;
      re[i] = j >= 0 && j < len ? src[j] * hann[i] : 0;
      im[i] = 0;
    }
    fft(re, im, false);
  };

  // 1) perfil de ruído: percentil baixo da magnitude de cada bin ao longo do tempo
  const step = Math.max(1, Math.floor(frames / 300));
  const sample: Float32Array[] = [];
  for (let f = 0; f < frames; f += step) {
    frameAt(mono, f);
    const mag = new Float32Array(bins);
    for (let k = 0; k < bins; k++) mag[k] = Math.hypot(re[k], im[k]);
    sample.push(mag);
  }
  const noise = new Float32Array(bins);
  const col = new Float32Array(sample.length);
  for (let k = 0; k < bins; k++) {
    for (let s = 0; s < sample.length; s++) col[s] = sample[s][k];
    const sorted = Array.from(col).sort((a, b) => a - b);
    // percentil 15 de ruído (Rayleigh) ≈ 0,45 × média → corrige para a média
    noise[k] = sorted[Math.floor(sorted.length * 0.15)] * 2.2;
  }
  // suaviza o perfil em frequência
  const noiseS = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    let acc = 0;
    let cnt = 0;
    for (let d = -3; d <= 3; d++) if (k + d >= 0 && k + d < bins) {
      acc += noise[k + d];
      cnt++;
    }
    noiseS[k] = acc / cnt;
  }

  // 2) ganho por bin (calculado no mono, aplicado igual em todos os canais)
  const floor = Math.pow(10, (-24 * amount) / 20);
  const over = 1.5 + 1.5 * amount;
  const gains: Float32Array[] = [];
  let prev = new Float32Array(bins).fill(1);
  for (let f = 0; f < frames; f++) {
    frameAt(mono, f);
    const g = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      const nz = noiseS[k] * noiseS[k] * over;
      let v = p > 0 ? (p - nz) / p : 0;
      v = v < floor ? floor : v;
      // soltura suave no tempo (evita "ruído musical")
      const rel = prev[k] * 0.8;
      g[k] = v > rel ? v : rel;
    }
    // suaviza em frequência
    const gs = new Float32Array(bins);
    for (let k = 0; k < bins; k++) gs[k] = (g[Math.max(0, k - 1)] + 2 * g[k] + g[Math.min(bins - 1, k + 1)]) / 4;
    gains.push(gs);
    prev = g;
  }

  // 3) aplica e reconstrói (overlap-add; Hann² a 75% de sobreposição soma 1,5)
  return channels.map((ch) => {
    const out = new Float32Array(len);
    for (let f = 0; f < frames; f++) {
      frameAt(ch, f);
      const g = gains[f];
      for (let k = 0; k < bins; k++) {
        re[k] *= g[k];
        im[k] *= g[k];
        if (k > 0 && k < N / 2) {
          re[N - k] *= g[k];
          im[N - k] *= g[k];
        }
      }
      fft(re, im, true);
      const start = f * HOP - N + HOP;
      for (let i = 0; i < N; i++) {
        const j = start + i;
        if (j >= 0 && j < len) out[j] += (re[i] * hann[i]) / 1.5;
      }
    }
    return out;
  });
}
