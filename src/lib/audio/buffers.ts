"use client";
import { uid } from "../store";

/** Registro de AudioBuffers fora do estado React (são grandes e não serializáveis). */
const buffers = new Map<string, AudioBuffer>();
const peaks = new Map<string, Float32Array>();

/** Resolução da forma de onda: pares (min,max) por segundo */
export const PEAKS_PER_SEC = 200;

export function addBuffer(buf: AudioBuffer, id = uid()) {
  buffers.set(id, buf);
  peaks.set(id, computePeaks(buf));
  return id;
}

export const getBuffer = (id: string) => buffers.get(id);
export const getPeaks = (id: string) => peaks.get(id);

function computePeaks(buf: AudioBuffer) {
  const per = Math.max(1, Math.floor(buf.sampleRate / PEAKS_PER_SEC));
  const n = Math.ceil(buf.length / per);
  const out = new Float32Array(n * 2);
  const chans = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
  for (let i = 0; i < n; i++) {
    let lo = 0;
    let hi = 0;
    const end = Math.min(buf.length, (i + 1) * per);
    for (let j = i * per; j < end; j++) {
      for (const ch of chans) {
        const v = ch[j];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    out[i * 2] = lo;
    out[i * 2 + 1] = hi;
  }
  return out;
}

export function removeBuffer(id: string) {
  buffers.delete(id);
  peaks.delete(id);
}
