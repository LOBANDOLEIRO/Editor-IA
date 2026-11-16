/// <reference lib="webworker" />
import {
  analyzePitch,
  computeCorrection,
  detectKey,
  frameDuration,
  psolaShift,
  toMono,
  type PitchAnalysis,
  type TuneParams,
} from "../lib/dsp/pitch";

type Msg =
  | { type: "analyze"; reqId: number; key: string; channels: Float32Array[]; sampleRate: number; params: TuneParams }
  | { type: "curve"; reqId: number; key: string; params: TuneParams }
  | { type: "apply"; reqId: number; key: string; channels: Float32Array[]; params: TuneParams };

const cache = new Map<string, PitchAnalysis>();
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  try {
    if (msg.type === "analyze") {
      const an = analyzePitch(toMono(msg.channels), msg.sampleRate);
      cache.set(msg.key, an);
      const corr = computeCorrection(an, msg.params);
      ctx.postMessage({
        reqId: msg.reqId,
        ok: true,
        frameDur: frameDuration(an),
        detected: corr.detected,
        corrected: corr.corrected,
        key: detectKey(an),
      });
    } else if (msg.type === "curve") {
      const an = cache.get(msg.key);
      if (!an) throw new Error("Analise a voz primeiro");
      const corr = computeCorrection(an, msg.params);
      ctx.postMessage({ reqId: msg.reqId, ok: true, frameDur: frameDuration(an), detected: corr.detected, corrected: corr.corrected });
    } else if (msg.type === "apply") {
      const an = cache.get(msg.key);
      if (!an) throw new Error("Analise a voz primeiro");
      const corr = computeCorrection(an, msg.params);
      const out = psolaShift(msg.channels, an, corr.semis, msg.params.mix);
      ctx.postMessage({ reqId: msg.reqId, ok: true, channels: out }, out.map((c) => c.buffer));
    }
  } catch (err) {
    ctx.postMessage({ reqId: msg.reqId, ok: false, error: String(err instanceof Error ? err.message : err) });
  }
};
