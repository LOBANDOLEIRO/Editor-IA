/**
 * AudioWorklet por faixa: noise gate (expansor suave) + de-esser.
 * Com os dois desligados o som passa intacto.
 */
export const VOICE_WORKLET = `
class VoiceProc extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'gateOn', defaultValue: 0, automationRate: 'k-rate' },
      { name: 'gateThreshold', defaultValue: -45, automationRate: 'k-rate' },
      { name: 'deess', defaultValue: 0, automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    const sr = sampleRate;
    this.env = 0; this.envS = 0; this.gGate = 1; this.gS = 1; this.hold = 0;
    this.att = 1 - Math.exp(-1 / (sr * 0.001));
    this.rel = 1 - Math.exp(-1 / (sr * 0.06));
    this.gAtt = 1 - Math.exp(-1 / (sr * 0.003));
    this.gRel = 1 - Math.exp(-1 / (sr * 0.12));
    this.sAtt = 1 - Math.exp(-1 / (sr * 0.002));
    this.sRel = 1 - Math.exp(-1 / (sr * 0.05));
    this.holdN = Math.round(sr * 0.15);
    // passa-altas de 2ª ordem em 5,5 kHz (banda das sibilantes)
    const w = 2 * Math.PI * Math.min(5500, sr * 0.4) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * 0.707), a0 = 1 + al;
    this.b0 = (1 + c) / 2 / a0; this.b1 = -(1 + c) / a0; this.b2 = this.b0; this.a1 = -2 * c / a0; this.a2 = (1 - al) / a0;
    this.z = [[0, 0, 0, 0], [0, 0, 0, 0]];
  }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0];
    if (!inp || !inp.length) return true;
    const gateOn = p.gateOn[0] > 0.5, de = p.deess[0];
    if (!gateOn && de <= 0) {
      for (let c = 0; c < out.length; c++) out[c].set(inp[Math.min(c, inp.length - 1)]);
      this.gGate = 1; this.gS = 1;
      return true;
    }
    const thr = Math.pow(10, p.gateThreshold[0] / 20);
    const nCh = Math.min(2, out.length), n = out[0].length, hi = [0, 0];
    for (let i = 0; i < n; i++) {
      let peak = 0, peakS = 0;
      for (let c = 0; c < nCh; c++) {
        const x = inp[Math.min(c, inp.length - 1)][i], z = this.z[c];
        const y = this.b0 * x + this.b1 * z[0] + this.b2 * z[1] - this.a1 * z[2] - this.a2 * z[3];
        z[1] = z[0]; z[0] = x; z[3] = z[2]; z[2] = y;
        hi[c] = y;
        const ax = Math.abs(x), ay = Math.abs(y);
        if (ax > peak) peak = ax;
        if (ay > peakS) peakS = ay;
      }
      this.env += (peak - this.env) * (peak > this.env ? this.att : this.rel);
      this.envS += (peakS - this.envS) * (peakS > this.envS ? this.att : this.rel);
      // gate: abaixo do limiar atenua progressivamente (até -30 dB), com espera antes de fechar
      let tg = 1;
      if (gateOn) {
        if (this.env >= thr) this.hold = this.holdN;
        else if (this.hold > 0) this.hold--;
        else { const r = this.env / thr; tg = Math.max(0.03, r * r); }
      }
      this.gGate += (tg - this.gGate) * (tg > this.gGate ? this.gAtt : this.gRel);
      // de-esser: quando os agudos dominam o sinal, abaixa só a banda aguda
      let ts = 1;
      if (de > 0 && this.env > 1e-4) {
        const ratio = this.envS / this.env;
        if (ratio > 0.3) ts = Math.pow(10, -(de * 18 * Math.min(1, (ratio - 0.3) / 0.3)) / 20);
      }
      this.gS += (ts - this.gS) * (ts < this.gS ? this.sAtt : this.sRel);
      for (let c = 0; c < nCh; c++) {
        const x = inp[Math.min(c, inp.length - 1)][i];
        out[c][i] = ((x - hi[c]) + hi[c] * this.gS) * this.gGate;
      }
    }
    return true;
  }
}
registerProcessor('voice-proc', VoiceProc);
`;

const loaded = new WeakSet<BaseAudioContext>();

/** Carrega o worklet no contexto (uma vez). Devolve false se o navegador não suportar. */
export async function loadVoiceWorklet(ctx: BaseAudioContext) {
  if (loaded.has(ctx)) return true;
  try {
    const url = URL.createObjectURL(new Blob([VOICE_WORKLET], { type: "application/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    loaded.add(ctx);
    return true;
  } catch {
    return false;
  }
}

export const voiceWorkletReady = (ctx: BaseAudioContext) => loaded.has(ctx);
