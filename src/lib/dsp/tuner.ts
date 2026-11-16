"use client";
import type { NoteEdit, TuneParams } from "./pitch";

export type CurveResult = {
  frameDur: number;
  frameOffset: number;
  detected: Float32Array;
  corrected: Float32Array;
  key?: { root: number; minor: boolean } | null;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("../../workers/tune.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.reqId);
      if (!p) return;
      pending.delete(e.data.reqId);
      if (e.data.ok) p.resolve(e.data);
      else p.reject(new Error(e.data.error));
    };
  }
  return worker;
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  const reqId = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    getWorker().postMessage({ ...msg, reqId }, transfer);
  });
}

const copyChannels = (buf: AudioBuffer) =>
  Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i).slice());

/** `key` identifica o buffer analisado (usamos o bufferId original). */
export function analyzeBuffer(key: string, buf: AudioBuffer, params: TuneParams) {
  const channels = copyChannels(buf);
  return call<CurveResult>(
    { type: "analyze", key, channels, sampleRate: buf.sampleRate, params },
    channels.map((c) => c.buffer),
  );
}

export function curveFor(key: string, params: TuneParams) {
  return call<CurveResult>({ type: "curve", key, params });
}

export async function applyTune(key: string, buf: AudioBuffer, params: TuneParams, ctx: BaseAudioContext) {
  const channels = copyChannels(buf);
  const res = await call<{ channels: Float32Array[] }>(
    { type: "apply", key, channels, params },
    channels.map((c) => c.buffer),
  );
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  res.channels.forEach((c, i) => out.copyToChannel(c, i));
  return out;
}

export async function applyNotes(key: string, buf: AudioBuffer, notes: NoteEdit[], ctx: BaseAudioContext) {
  const channels = copyChannels(buf);
  const res = await call<{ channels: Float32Array[] }>(
    { type: "applyNotes", key, channels, notes },
    channels.map((c) => c.buffer),
  );
  const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  res.channels.forEach((c, i) => out.copyToChannel(c, i));
  return out;
}
