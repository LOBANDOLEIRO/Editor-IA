"use client";
import { create } from "zustand";
import type { Clip, FxSettings, ScaleName, Track } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

const COLORS = ["#f97316", "#22d3ee", "#a3e635", "#e879f9", "#facc15", "#60a5fa", "#f87171", "#34d399"];

export const defaultFx = (): FxSettings => ({
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compOn: false,
  compThreshold: -18,
  compRatio: 4,
  compMakeup: 0,
  reverb: 0,
});

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
  snap: boolean;
  pps: number; // pixels por segundo
  position: number; // posição do cursor quando parado
  latencyMs: number; // compensação extra de gravação
  lyrics: string;
  toast: string | null;

  setBpm: (bpm: number) => void;
  setKey: (root: number, scale: ScaleName) => void;
  addTrack: (partial?: Partial<Track>) => string;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  updateFx: (id: string, patch: Partial<FxSettings>) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Omit<Clip, "id">) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClip: (id: string, at: number) => void;
  select: (trackId: string | null, clipId?: string | null) => void;
  set: (patch: Partial<StudioState>) => void;
  notify: (msg: string) => void;
};

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
  snap: true,
  pps: 40,
  position: 0,
  latencyMs: 0,
  lyrics: "",
  toast: null,

  setBpm: (bpm) => set({ bpm: Math.min(240, Math.max(40, Math.round(bpm) || 90)) }),
  setKey: (keyRoot, scale) => set({ keyRoot, scale }),

  addTrack: (partial) => {
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
      fx: defaultFx(),
      ...partial,
    };
    set((s) => ({ tracks: [...s.tracks, track], selectedTrackId: id }));
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
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, fx: { ...t.fx, ...patch } } : t)) })),
  removeTrack: (id) =>
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
      selectedTrackId: s.selectedTrackId === id ? null : s.selectedTrackId,
      selectedClipId: s.clips.find((c) => c.id === s.selectedClipId)?.trackId === id ? null : s.selectedClipId,
    })),

  addClip: (clip) => {
    const id = uid();
    set((s) => ({ clips: [...s.clips, { ...clip, id }] }));
    return id;
  },
  updateClip: (id, patch) => set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  removeClip: (id) =>
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    })),
  splitClip: (id, at) => {
    const c = get().clips.find((x) => x.id === id);
    if (!c || at <= c.start + 0.01 || at >= c.start + c.duration - 0.01) return;
    const leftDur = at - c.start;
    const right: Clip = {
      ...c,
      id: uid(),
      start: at,
      offset: c.offset + leftDur,
      duration: c.duration - leftDur,
    };
    set((s) => ({
      clips: [...s.clips.map((x) => (x.id === id ? { ...x, duration: leftDur } : x)), right],
      selectedClipId: right.id,
    }));
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
