"use client";
import { create } from "zustand";
import { NEUTRAL_FX } from "./presets";
import type { Clip, FxSettings, ScaleName, Tool, Track } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

const COLORS = ["#f97316", "#22d3ee", "#a3e635", "#e879f9", "#facc15", "#60a5fa", "#f87171", "#34d399"];

export const defaultFx = (): FxSettings => ({ ...NEUTRAL_FX });

/** Divisões da grade em tempos (beats). 0 = sem grade. */
export const SNAP_OPTIONS: { label: string; beats: number }[] = [
  { label: "Sem grade", beats: 0 },
  { label: "1/16", beats: 0.25 },
  { label: "1/8", beats: 0.5 },
  { label: "1/4 (tempo)", beats: 1 },
  { label: "1/2", beats: 2 },
  { label: "Compasso", beats: 4 },
];

type Snapshot = { tracks: Track[]; clips: Clip[] };

export type InspectorTab = "mixer" | "fx" | "clip" | "tune";

export type ContextMenu = { x: number; y: number; clipId: string; at: number } | null;

type StudioState = {
  bpm: number;
  keyRoot: number;
  scale: ScaleName;
  tracks: Track[];
  clips: Clip[];
  selectedTrackId: string | null;
  selectedClipId: string | null;
  playing: boolean;
  recording: boolean;
  metronome: boolean;
  countIn: boolean;
  snapBeats: number;
  tool: Tool;
  pps: number; // pixels por segundo
  position: number; // posição do cursor quando parado
  loop: { start: number; end: number } | null;
  loopOn: boolean;
  masterVolume: number;
  latencyMs: number;
  lyrics: string;
  toast: string | null;
  clipboard: Clip | null;
  menu: ContextMenu;
  inspectorTab: InspectorTab;
  past: Snapshot[];
  future: Snapshot[];

  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  setBpm: (bpm: number) => void;
  setKey: (root: number, scale: ScaleName) => void;
  addTrack: (partial?: Partial<Track>) => string;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  updateFx: (id: string, patch: Partial<FxSettings>) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Omit<Clip, "id" | "gain" | "fadeIn" | "fadeOut"> & Partial<Clip>) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClip: (id: string, at: number) => void;
  duplicateClip: (id: string) => void;
  copyClip: (id: string) => void;
  paste: (at: number) => void;
  /** Remove o trecho [start,end) dos clips de uma faixa (take novo substitui o antigo). */
  carve: (trackId: string, start: number, end: number, exceptId?: string) => void;
  select: (trackId: string | null, clipId?: string | null) => void;
  set: (patch: Partial<StudioState>) => void;
  notify: (msg: string) => void;
};

const MIN_CLIP = 0.02;

export const useStudio = create<StudioState>((set, get) => ({
  bpm: 90,
  keyRoot: 9,
  scale: "minor",
  tracks: [],
  clips: [],
  selectedTrackId: null,
  selectedClipId: null,
  playing: false,
  recording: false,
  metronome: true,
  countIn: true,
  snapBeats: 1,
  tool: "select",
  pps: 40,
  position: 0,
  loop: null,
  loopOn: false,
  masterVolume: 0.9,
  latencyMs: 0,
  lyrics: "",
  toast: null,
  clipboard: null,
  menu: null,
  inspectorTab: "mixer",
  past: [],
  future: [],

  checkpoint: () => {
    const { tracks, clips, past } = get();
    const last = past[past.length - 1];
    if (last && last.tracks === tracks && last.clips === clips) return;
    set({ past: [...past.slice(-99), { tracks, clips }], future: [] });
  },
  undo: () => {
    const { past, future, tracks, clips } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ ...prev, past: past.slice(0, -1), future: [{ tracks, clips }, ...future], selectedClipId: null });
  },
  redo: () => {
    const { past, future, tracks, clips } = get();
    const next = future[0];
    if (!next) return;
    set({ ...next, future: future.slice(1), past: [...past, { tracks, clips }], selectedClipId: null });
  },

  setBpm: (bpm) => set({ bpm: Math.min(240, Math.max(40, Math.round(bpm) || 90)) }),
  setKey: (keyRoot, scale) => set({ keyRoot, scale }),

  addTrack: (partial) => {
    get().checkpoint();
    const id = uid();
    const n = get().tracks.length;
    const track: Track = {
      id,
      name: `Faixa ${n + 1}`,
      color: COLORS[n % COLORS.length],
      volume: 0.9,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
      monitor: false,
      fx: defaultFx(),
      ...partial,
    };
    set((s) => ({
      tracks: [...s.tracks.map((t) => (track.armed ? { ...t, armed: false } : t)), track],
      selectedTrackId: id,
    }));
    return id;
  },
  updateTrack: (id, patch) =>
    set((s) => ({
      tracks: s.tracks.map((t) => {
        if (patch.armed && t.id !== id) return { ...t, armed: false }; // só uma faixa armada
        return t.id === id ? { ...t, ...patch } : t;
      }),
    })),
  updateFx: (id, patch) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, preset: undefined, fx: { ...t.fx, ...patch } } : t)) })),
  removeTrack: (id) => {
    get().checkpoint();
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
      selectedTrackId: s.selectedTrackId === id ? null : s.selectedTrackId,
      selectedClipId: s.clips.find((c) => c.id === s.selectedClipId)?.trackId === id ? null : s.selectedClipId,
    }));
  },

  addClip: (clip) => {
    get().checkpoint();
    const id = uid();
    set((s) => ({ clips: [...s.clips, { gain: 1, fadeIn: 0, fadeOut: 0, ...clip, id }] }));
    return id;
  },
  updateClip: (id, patch) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeClip: (id) => {
    get().checkpoint();
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    }));
  },
  splitClip: (id, at) => {
    const c = get().clips.find((x) => x.id === id);
    if (!c || at <= c.start + MIN_CLIP || at >= c.start + c.duration - MIN_CLIP) return;
    get().checkpoint();
    const leftDur = at - c.start;
    const right: Clip = {
      ...c,
      id: uid(),
      start: at,
      offset: c.offset + leftDur,
      duration: c.duration - leftDur,
      fadeIn: 0,
    };
    set((s) => ({
      clips: [...s.clips.map((x) => (x.id === id ? { ...x, duration: leftDur, fadeOut: 0 } : x)), right],
      selectedClipId: right.id,
    }));
  },
  duplicateClip: (id) => {
    const c = get().clips.find((x) => x.id === id);
    if (!c) return;
    get().checkpoint();
    const copy = { ...c, id: uid(), start: c.start + c.duration };
    set((s) => ({ clips: [...s.clips, copy], selectedClipId: copy.id }));
  },
  copyClip: (id) => {
    const c = get().clips.find((x) => x.id === id);
    if (c) set({ clipboard: c });
  },
  paste: (at) => {
    const { clipboard, selectedTrackId, tracks } = get();
    if (!clipboard) return;
    const trackId = tracks.some((t) => t.id === selectedTrackId) ? selectedTrackId! : clipboard.trackId;
    if (!tracks.some((t) => t.id === trackId)) return;
    get().checkpoint();
    const copy = { ...clipboard, id: uid(), trackId, start: Math.max(0, at) };
    set((s) => ({ clips: [...s.clips, copy], selectedClipId: copy.id }));
  },
  carve: (trackId, start, end, exceptId) => {
    const out: Clip[] = [];
    for (const c of get().clips) {
      const cEnd = c.start + c.duration;
      if (c.trackId !== trackId || c.id === exceptId || cEnd <= start || c.start >= end) {
        out.push(c);
        continue;
      }
      if (c.start < start) out.push({ ...c, duration: start - c.start, fadeOut: 0 });
      if (cEnd > end) out.push({ ...c, id: uid(), start: end, offset: c.offset + (end - c.start), duration: cEnd - end, fadeIn: 0 });
    }
    set({ clips: out.filter((c) => c.duration > MIN_CLIP) });
  },

  select: (trackId, clipId = null) => set({ selectedTrackId: trackId, selectedClipId: clipId }),
  set: (patch) => set(patch),
  notify: (msg) => {
    set({ toast: msg });
    setTimeout(() => {
      if (get().toast === msg) set({ toast: null });
    }, 4000);
  },
}));

export function snapTime(t: number, bpm: number, beats: number) {
  if (!beats) return t;
  const step = (60 / bpm) * beats;
  return Math.round(t / step) * step;
}
