/// <reference lib="webworker" />
import {
  analyzePitch,
  computeCorrection,
  detectKey,
  detectedMidi,
  frameDuration,
  frameOffset,
  noteCorrection,
  psolaShift,
  toMono,
  type NoteEdit,
  type PitchAnalysis,
  type TuneParams,
} from "../lib/dsp/pitch";
import { denoise } from "../lib/dsp/denoise";

type Msg =
  | { type: "analyze"; reqId: number; key: string; channels: Float32Array[]; sampleRate: number; params: TuneParams }
  | { type: "curve"; reqId: number; key: string; params: TuneParams }
  | { type: "apply"; reqId: number; key: string; channels: Float32Array[]; params: TuneParams }
  | { type: "applyNotes"; reqId: number; key: string; channels: Float32Array[]; notes: NoteEdit[] }
  | { type: "denoise"; reqId: number; channels: Float32Array[]; amount: number };

const cache = new Map<string, PitchAnalysis>();
const ctx = self as unknown as DedicatedWorkerGlobalScope;

function need(key: string) {
  const an = cache.get(key);
  if (!an) throw new Error("Analise a voz primeiro");
  return an;
}

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
        frameOffset: frameOffset(an),
        detected: corr.detected,
        corrected: corr.corrected,
        key: detectKey(an),
      });
    } else if (msg.type === "curve") {
      const an = need(msg.key);
      const corr = computeCorrection(an, msg.params);
      ctx.postMessage({ reqId: msg.reqId, ok: true, frameDur: frameDuration(an), frameOffset: frameOffset(an), detected: corr.detected, corrected: corr.corrected });
    } else if (msg.type === "apply") {
      const an = need(msg.key);
      const corr = computeCorrection(an, msg.params);
      const out = psolaShift(msg.channels, an, corr.semis, msg.params.mix);
      ctx.postMessage({ reqId: msg.reqId, ok: true, channels: out }, out.map((c) => c.buffer));
    } else if (msg.type === "denoise") {
      const out = denoise(msg.channels, msg.amount);
      ctx.postMessage({ reqId: msg.reqId, ok: true, channels: out }, out.map((c) => c.buffer));
    } else if (msg.type === "applyNotes") {
      const an = need(msg.key);
      const corr = noteCorrection(detectedMidi(an), msg.notes, frameDuration(an));
      const out = psolaShift(msg.channels, an, corr.semis, 1);
      ctx.postMessage({ reqId: msg.reqId, ok: true, channels: out }, out.map((c) => c.buffer));
    }
  } catch (err) {
    ctx.postMessage({ reqId: msg.reqId, ok: false, error: String(err instanceof Error ? err.message : err) });
  }
};
