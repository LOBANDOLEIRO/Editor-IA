"use client";
import { create } from "zustand";
import type { FlowClip } from "../types";

export class FlowError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error;
    const msg = typeof e === "string" ? e : e?.message ?? `Erro ${res.status}`;
    throw new FlowError(friendly(res.status, msg), res.status);
  }
  return data as T;
}

function friendly(status: number, msg: string) {
  if (status === 402) return "Sem créditos na conta Flow Music.";
  if (status === 429) return "Contas Flow Music ocupadas — tente de novo em instantes.";
  if (status === 422) return `A IA recusou gerar este áudio (${msg}).`;
  if (status === 503) return msg;
  return msg;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type JobRecord = {
  jobid: string;
  status: "pending" | "completed" | "failed";
  clips?: FlowClip[];
  error?: { code: string; message: string };
};

export const flowApi = {
  status: () => api<{ configured: boolean }>("/api/flow/status"),
  generate: (b: { prompt: string; instrumental: boolean; model: string; lyrics?: string }) =>
    api<JobRecord>("/api/flow/generate", post(b)),
  job: (id: string) => api<JobRecord>(`/api/flow/job?id=${encodeURIComponent(id)}`),
  lyrics: (b: { prompt: string; structure?: string }) =>
    api<{ title: string | null; lyrics: string; sound_prompt?: string }>("/api/flow/lyrics", post(b)),
  /** Stems é síncrono; em 504 a separação continua no servidor, então tentamos de novo. */
  async stems(clip: string, tries = 4): Promise<FlowClip[]> {
    for (let i = 0; ; i++) {
      try {
        const r = await api<{ clips: FlowClip[] }>("/api/flow/stems", post({ clip }));
        return r.clips;
      } catch (e) {
        if (e instanceof FlowError && e.status === 504 && i < tries - 1) {
          await new Promise((r) => setTimeout(r, 10_000));
          continue;
        }
        throw e;
      }
    }
  },
};

export const audioProxy = (url: string) => `/api/audio?url=${encodeURIComponent(url)}`;

// ---------- biblioteca de gerações (persistida no navegador) ----------
export type LibraryEntry = {
  jobid: string;
  prompt: string;
  model: string;
  bpm: number;
  createdAt: number;
  status: "pending" | "completed" | "failed";
  error?: string;
  clips: FlowClip[];
  stems: Record<string, FlowClip[]>;
  stemStatus: Record<string, "running" | "error" | undefined>;
};

const LS_KEY = "editor-ia:library:v1";

function load(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LibraryEntry[]).map((e) => ({ ...e, stemStatus: {} })) : [];
  } catch {
    return [];
  }
}

function save(entries: LibraryEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* sem storage */
  }
}

type LibState = {
  entries: LibraryEntry[];
  loaded: boolean;
  init: () => void;
  upsert: (jobid: string, patch: Partial<LibraryEntry>) => void;
  remove: (jobid: string) => void;
};

export const useLibrary = create<LibState>((set, get) => ({
  entries: [],
  loaded: false,
  init: () => {
    if (!get().loaded) set({ entries: load(), loaded: true });
  },
  upsert: (jobid, patch) => {
    const entries = get().entries;
    const i = entries.findIndex((e) => e.jobid === jobid);
    const next =
      i >= 0
        ? entries.map((e) => (e.jobid === jobid ? { ...e, ...patch } : e))
        : [{ jobid, prompt: "", model: "", bpm: 90, createdAt: Date.now(), status: "pending" as const, clips: [], stems: {}, stemStatus: {}, ...patch }, ...entries];
    set({ entries: next });
    save(next);
  },
  remove: (jobid) => {
    const next = get().entries.filter((e) => e.jobid !== jobid);
    set({ entries: next });
    save(next);
  },
}));
