"use client";
import { addBuffer, getBuffer } from "./audio/buffers";
import { engine, renderMix } from "./audio/engine";
import { downloadBlob, encodeWav } from "./audio/wav";
import { useStudio } from "./store";

const st = () => useStudio.getState();
const activeLoop = () => {
  const s = st();
  return s.loopOn && s.loop ? s.loop : null;
};

export async function play() {
  const s = st();
  if (s.playing) return;
  engine.bpm = s.bpm;
  engine.metronomeOn = s.metronome;
  const loop = activeLoop();
  const from = loop && (s.position < loop.start || s.position >= loop.end) ? loop.start : s.position;
  await engine.play(s.clips, s.tracks, from, loop);
  s.set({ playing: true });
}

export async function stop() {
  const s = st();
  let tookId: string | null = null;
  if (s.recording) {
    const take = await engine.stopCapture(s.latencyMs);
    const track = s.tracks.find((t) => t.armed);
    if (take && track) {
      const bufferId = addBuffer(take.buffer);
      const cut = take.start < 0 ? -take.start : 0;
      const start = Math.max(0, take.start);
      const duration = take.buffer.duration - cut;
      const n = st().clips.filter((c) => c.trackId === track.id).length + 1;
      st().checkpoint();
      st().carve(track.id, start, start + duration); // take novo substitui o trecho antigo
      tookId = st().addClip({ trackId: track.id, bufferId, name: `Take ${n}`, start, offset: cut, duration, fadeIn: 0.005, fadeOut: 0.01 });
    }
  }
  const pos = engine.stop();
  const next = s.recording ? s.position : pos; // depois de gravar, volta para onde o take começou
  engine.seek(next);
  st().set({ playing: false, recording: false, position: next });
  if (tookId) st().select(st().tracks.find((t) => t.armed)?.id ?? null, tookId);
}

export async function togglePlay() {
  if (st().playing) await stop();
  else await play();
}

export async function armTrack(id: string, armed: boolean) {
  st().updateTrack(id, { armed });
  if (!armed) return;
  try {
    await engine.prepareMic();
    engine.syncTracks(st().tracks);
  } catch {
    st().updateTrack(id, { armed: false });
    st().notify("Não consegui acessar o microfone. Verifique a permissão do navegador.");
  }
}

export async function record() {
  const s = st();
  if (s.recording) return stop();
  if (s.playing) await stop();
  let track = st().tracks.find((t) => t.armed);
  if (!track) {
    const id = st().addTrack({ name: "Voz", armed: true, color: "#f43f5e" });
    track = st().tracks.find((t) => t.id === id)!;
  }
  try {
    await engine.prepareMic();
  } catch {
    st().notify("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    return;
  }
  const cur = st();
  engine.bpm = cur.bpm;
  engine.metronomeOn = cur.metronome;
  const countIn = cur.countIn ? (4 * 60) / cur.bpm : 0; // 1 compasso de contagem
  await engine.play(cur.clips, cur.tracks, cur.position - countIn, null);
  engine.startCapture(cur.position);
  st().set({ playing: true, recording: true });
}

export function seek(pos: number) {
  const s = st();
  const p = Math.max(0, pos);
  engine.seek(p);
  s.set({ position: p });
  if (s.playing && !s.recording) void engine.play(s.clips, s.tracks, p, activeLoop());
}

export async function exportMix() {
  const s = st();
  if (!s.clips.length) return s.notify("Nada para exportar ainda.");
  s.notify("Renderizando mixagem…");
  const out = await renderMix(s.tracks, s.clips, s.bpm, s.masterVolume);
  if (!out) return;
  downloadBlob(encodeWav(out), `editor-ia-mix-${Date.now()}.wav`);
  st().notify("Mixagem exportada (WAV).");
}

/** Ajusta o ganho do clip para o pico chegar a -1 dBFS. */
export function normalizeClip(id: string) {
  const c = st().clips.find((x) => x.id === id);
  const buf = c && getBuffer(c.bufferId);
  if (!c || !buf) return;
  const a = Math.floor(c.offset * buf.sampleRate);
  const b = Math.min(buf.length, Math.ceil((c.offset + c.duration) * buf.sampleRate));
  let peak = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = a; i < b; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
    }
  }
  if (peak < 1e-4) return;
  st().checkpoint();
  st().updateClip(id, { gain: Math.min(16, 0.891 / peak) });
}

/** Carrega um áudio (URL) numa nova faixa. */
export async function loadUrlToTrack(url: string, name: string, color?: string, start = 0) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${name} (${res.status})`);
  const buf = await engine.decode(await res.arrayBuffer());
  return addBufferToNewTrack(buf, name, color, start);
}

export function addBufferToNewTrack(buf: AudioBuffer, name: string, color?: string, start = 0) {
  const bufferId = addBuffer(buf);
  const trackId = st().addTrack({ name, ...(color ? { color } : {}) });
  st().addClip({ trackId, bufferId, name, start, offset: 0, duration: buf.duration });
  return trackId;
}
