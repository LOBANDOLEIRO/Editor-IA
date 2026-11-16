"use client";

/**
 * Beat de demonstração sintetizado no navegador (sem IA), para testar o estúdio
 * sem token. Gera 3 stems: bateria, baixo e harmonia.
 */
export async function synthDemoStems(bpm: number, root: number, bars = 8, sr = 44100) {
  const beat = 60 / bpm;
  const len = bars * 4 * beat;
  const frames = Math.ceil((len + 0.5) * sr);
  const noise = (ctx: BaseAudioContext, dur: number) => {
    const b = ctx.createBuffer(1, Math.ceil(dur * sr), sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  // progressão i - VI - III - VII (menor)
  const prog = [0, 8, 3, 10];
  const bassMidi = (deg: number) => 36 + ((root + deg) % 12);
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  // ---- bateria ----
  const drums = new OfflineAudioContext(2, frames, sr);
  const dOut = drums.createGain();
  dOut.gain.value = 0.9;
  dOut.connect(drums.destination);
  for (let b = 0; b < bars; b++) {
    for (let s = 0; s < 16; s++) {
      const t = (b * 16 + s) * (beat / 4);
      if (s === 0 || s === 6 || s === 10) {
        const o = drums.createOscillator();
        const g = drums.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        o.connect(g).connect(dOut);
        o.start(t);
        o.stop(t + 0.5);
      }
      if (s === 4 || s === 12) {
        const n = drums.createBufferSource();
        n.buffer = noise(drums, 0.25);
        const f = drums.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 1800;
        const g = drums.createGain();
        g.gain.setValueAtTime(0.8, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        n.connect(f).connect(g).connect(dOut);
        n.start(t);
      }
      if (s % 2 === 0) {
        const n = drums.createBufferSource();
        n.buffer = noise(drums, 0.06);
        const f = drums.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 7000;
        const g = drums.createGain();
        g.gain.setValueAtTime(s % 4 === 2 ? 0.35 : 0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        n.connect(f).connect(g).connect(dOut);
        n.start(t);
      }
    }
  }

  // ---- baixo ----
  const bass = new OfflineAudioContext(2, frames, sr);
  for (let b = 0; b < bars; b++) {
    const deg = prog[b % 4];
    for (const step of [0, 6, 10]) {
      const t = (b * 16 + step) * (beat / 4);
      const o = bass.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = hz(bassMidi(deg));
      const f = bass.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 400;
      const g = bass.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.2);
      o.connect(f).connect(g).connect(bass.destination);
      o.start(t);
      o.stop(t + beat * 1.3);
    }
  }

  // ---- harmonia (pad) ----
  const keys = new OfflineAudioContext(2, frames, sr);
  const kOut = keys.createGain();
  kOut.gain.value = 0.12;
  kOut.connect(keys.destination);
  for (let b = 0; b < bars; b++) {
    const deg = prog[b % 4];
    const minorChord = deg === 0; // i menor; demais maiores (VI, III, VII)
    const chord = [0, minorChord ? 3 : 4, 7].map((i) => 57 + ((root + deg) % 12) + i);
    const t = b * 4 * beat;
    for (const m of chord) {
      const o = keys.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz(m);
      const g = keys.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + 4 * beat);
      o.connect(g).connect(kOut);
      o.start(t);
      o.stop(t + 4 * beat + 0.05);
    }
  }

  const [d, ba, k] = await Promise.all([drums.startRendering(), bass.startRendering(), keys.startRendering()]);
  return [
    { name: "Bateria (demo)", buffer: d },
    { name: "Baixo (demo)", buffer: ba },
    { name: "Harmonia (demo)", buffer: k },
  ];
}
