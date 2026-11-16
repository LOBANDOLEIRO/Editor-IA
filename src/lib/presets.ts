import type { FxSettings } from "./types";

export const NEUTRAL_FX: FxSettings = {
  hpFreq: 20,
  lpFreq: 20000,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compOn: false,
  compThreshold: -18,
  compRatio: 4,
  compMakeup: 0,
  drive: 0,
  delayMix: 0,
  delayDiv: "1/8",
  delayFeedback: 0.3,
  reverb: 0,
};

export type Preset = { name: string; group: "Voz" | "Beat" | "Criativo" | "Meus"; fx: Partial<FxSettings> };

export const BUILTIN_PRESETS: Preset[] = [
  { name: "Sem efeitos", group: "Voz", fx: {} },
  {
    name: "Voz limpa",
    group: "Voz",
    fx: { hpFreq: 90, eqLow: -2, eqMid: -1, eqHigh: 3, compOn: true, compThreshold: -20, compRatio: 3, compMakeup: 4, reverb: 0.12 },
  },
  {
    name: "Voz trap",
    group: "Voz",
    fx: { hpFreq: 120, eqLow: -3, eqMid: -2, eqHigh: 5, compOn: true, compThreshold: -26, compRatio: 6, compMakeup: 8, drive: 0.15, delayMix: 0.18, delayDiv: "1/8", delayFeedback: 0.35, reverb: 0.18 },
  },
  {
    name: "Voz rap (seca)",
    group: "Voz",
    fx: { hpFreq: 100, eqLow: -1, eqMid: 1, eqHigh: 3, compOn: true, compThreshold: -24, compRatio: 5, compMakeup: 7, drive: 0.1, reverb: 0.05 },
  },
  {
    name: "Voz R&B (aérea)",
    group: "Voz",
    fx: { hpFreq: 110, eqLow: -2, eqMid: -2, eqHigh: 6, compOn: true, compThreshold: -22, compRatio: 3, compMakeup: 5, delayMix: 0.15, delayDiv: "1/4", delayFeedback: 0.4, reverb: 0.35 },
  },
  {
    name: "Ad-libs",
    group: "Voz",
    fx: { hpFreq: 250, eqLow: -6, eqHigh: 4, compOn: true, compThreshold: -24, compRatio: 6, compMakeup: 6, delayMix: 0.3, delayDiv: "1/8d", delayFeedback: 0.45, reverb: 0.3 },
  },
  {
    name: "Rádio / telefone",
    group: "Criativo",
    fx: { hpFreq: 500, lpFreq: 3200, eqMid: 6, compOn: true, compThreshold: -24, compRatio: 8, compMakeup: 6, drive: 0.35 },
  },
  { name: "Lo-fi", group: "Criativo", fx: { hpFreq: 60, lpFreq: 6000, eqHigh: -3, drive: 0.3, reverb: 0.15 } },
  { name: "Catedral", group: "Criativo", fx: { hpFreq: 150, eqHigh: 2, reverb: 0.8, delayMix: 0.2, delayDiv: "1/4", delayFeedback: 0.5 } },
  { name: "Bateria punch", group: "Beat", fx: { eqLow: 3, eqMid: -2, eqHigh: 2, compOn: true, compThreshold: -18, compRatio: 4, compMakeup: 3, drive: 0.1 } },
  { name: "808 / baixo gordo", group: "Beat", fx: { lpFreq: 8000, eqLow: 4, eqMid: -2, drive: 0.25, compOn: true, compThreshold: -16, compRatio: 3, compMakeup: 2 } },
  { name: "Melodia ao fundo", group: "Beat", fx: { hpFreq: 200, eqMid: -3, eqHigh: -2, reverb: 0.25 } },
];

const LS_KEY = "editor-ia:presets:v1";

export function loadUserPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

export function saveUserPreset(name: string, fx: FxSettings) {
  const list = loadUserPresets().filter((p) => p.name !== name);
  list.push({ name, group: "Meus", fx });
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* sem storage */
  }
  return list;
}

export function deleteUserPreset(name: string) {
  const list = loadUserPresets().filter((p) => p.name !== name);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* sem storage */
  }
  return list;
}

export function presetFx(p: Preset): FxSettings {
  return { ...NEUTRAL_FX, ...p.fx };
}
