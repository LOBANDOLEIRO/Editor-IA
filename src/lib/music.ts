import type { ScaleName } from "./types";

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const NOTE_NAMES_PT = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"];

export const SCALES: Record<ScaleName, { label: string; steps: number[] }> = {
  major: { label: "Maior", steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: "Menor natural", steps: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor: { label: "Menor harmônica", steps: [0, 2, 3, 5, 7, 8, 11] },
  dorian: { label: "Dórico", steps: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: "Frígio", steps: [0, 1, 3, 5, 7, 8, 10] },
  pentatonicMajor: { label: "Pentatônica maior", steps: [0, 2, 4, 7, 9] },
  pentatonicMinor: { label: "Pentatônica menor", steps: [0, 3, 5, 7, 10] },
  blues: { label: "Blues", steps: [0, 3, 5, 6, 7, 10] },
  chromatic: { label: "Cromática", steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

export function keyLabel(root: number, scale: ScaleName) {
  return `${NOTE_NAMES_PT[root]} ${SCALES[scale].label.toLowerCase()}`;
}

export function keyForPrompt(root: number, scale: ScaleName) {
  const mode = scale === "major" || scale === "pentatonicMajor" ? "major" : "minor";
  return `${NOTE_NAMES[root]} ${mode}`;
}

export function midiToName(m: number) {
  const n = Math.round(m);
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

export function formatTime(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export function formatBars(sec: number, bpm: number) {
  const beat = 60 / bpm;
  const totalBeats = Math.floor(Math.max(0, sec) / beat);
  return `${Math.floor(totalBeats / 4) + 1}.${(totalBeats % 4) + 1}`;
}
