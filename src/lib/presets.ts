import type { FxSettings } from "./types";

/** Tudo desligado. Os valores abaixo são só o ponto de partida de cada controle quando você liga o efeito. */
export const NEUTRAL_FX: FxSettings = {
  gateOn: false,
  gateThreshold: -45,
  deessOn: false,
  deess: 0.5,
  micOn: false,
  micFix: false,
  micModel: "none",
  filtersOn: false,
  hpFreq: 90,
  lpFreq: 20000,
  eqOn: false,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compOn: false,
  compThreshold: -18,
  compRatio: 4,
  compMakeup: 0,
  driveOn: false,
  drive: 0.15,
  enhanceOn: false,
  enhance: 0.4,
  doublerOn: false,
  doubler: 0.4,
  delayOn: false,
  delayMix: 0.2,
  delayDiv: "1/8",
  delayFeedback: 0.3,
  reverbOn: false,
  reverb: 0.2,
};

export const PRESET_GROUPS = ["Rap", "Trap", "Drill", "Soul / R&B", "Geral", "Beat", "Criativo", "Meus"] as const;
export type PresetGroup = (typeof PRESET_GROUPS)[number];
export type Preset = { name: string; group: PresetGroup; fx: Partial<FxSettings> };

// blocos reutilizados
const gate = (thr = -45) => ({ gateOn: true, gateThreshold: thr });
const deess = (v = 0.5) => ({ deessOn: true, deess: v });
const hp = (f: number, lp = 20000) => ({ filtersOn: true, hpFreq: f, lpFreq: lp });
const eq = (l: number, m: number, h: number) => ({ eqOn: true, eqLow: l, eqMid: m, eqHigh: h });
const comp = (thr: number, ratio: number, makeup: number) => ({ compOn: true, compThreshold: thr, compRatio: ratio, compMakeup: makeup });
const drive = (v: number) => ({ driveOn: true, drive: v });
const enhance = (v: number) => ({ enhanceOn: true, enhance: v });
const doubler = (v: number) => ({ doublerOn: true, doubler: v });
const delay = (mix: number, div: FxSettings["delayDiv"], fb: number) => ({ delayOn: true, delayMix: mix, delayDiv: div, delayFeedback: fb });
const reverb = (v: number) => ({ reverbOn: true, reverb: v });

export const BUILTIN_PRESETS: Preset[] = [
  // ---------- Rap ----------
  { name: "Rap – voz principal", group: "Rap", fx: { ...gate(), ...deess(0.45), ...hp(100), ...eq(-1, 1, 3), ...comp(-24, 5, 7), ...drive(0.1), ...reverb(0.05) } },
  { name: "Rap – boom bap quente", group: "Rap", fx: { ...gate(), ...deess(0.4), ...hp(90, 14000), ...eq(1, 1.5, 1), ...comp(-22, 4, 6), ...drive(0.3), ...reverb(0.08) } },
  { name: "Rap – dobras", group: "Rap", fx: { ...gate(), ...deess(0.6), ...hp(160), ...eq(-4, 0, 2), ...comp(-28, 6, 6), ...doubler(0.7), ...reverb(0.1) } },
  // ---------- Trap ----------
  { name: "Trap – voz melódica", group: "Trap", fx: { ...gate(), ...deess(0.55), ...hp(120), ...eq(-3, -2, 5), ...comp(-26, 6, 8), ...drive(0.12), ...enhance(0.35), ...delay(0.18, "1/8", 0.35), ...reverb(0.2) } },
  { name: "Trap – voz seca na cara", group: "Trap", fx: { ...gate(), ...deess(0.5), ...hp(110), ...eq(-2, 0, 4), ...comp(-28, 8, 9), ...drive(0.18), ...enhance(0.3) } },
  { name: "Trap – ad-libs", group: "Trap", fx: { ...gate(-40), ...deess(0.5), ...hp(250), ...eq(-6, 0, 4), ...comp(-24, 6, 6), ...doubler(0.5), ...delay(0.3, "1/8d", 0.45), ...reverb(0.3) } },
  // ---------- Drill ----------
  { name: "Drill – voz agressiva", group: "Drill", fx: { ...gate(), ...deess(0.5), ...hp(110), ...eq(-2, 2, 3), ...comp(-30, 8, 10), ...drive(0.3), ...reverb(0.04) } },
  { name: "Drill – voz sombria", group: "Drill", fx: { ...gate(), ...deess(0.45), ...hp(90, 12000), ...eq(2, 0, -1), ...comp(-26, 6, 8), ...drive(0.25), ...delay(0.12, "1/4", 0.25), ...reverb(0.15) } },
  { name: "Drill – ad-libs", group: "Drill", fx: { ...gate(-40), ...hp(300, 9000), ...eq(-6, 3, 0), ...comp(-24, 8, 6), ...drive(0.4), ...doubler(0.6), ...delay(0.25, "1/4t", 0.4), ...reverb(0.35) } },
  // ---------- Soul / R&B ----------
  { name: "Soul – voz quente", group: "Soul / R&B", fx: { ...gate(-50), ...deess(0.4), ...hp(80), ...eq(1.5, -1, 2.5), ...comp(-20, 3, 4), ...drive(0.12), ...delay(0.08, "1/4", 0.2), ...reverb(0.28) } },
  { name: "R&B – voz aérea", group: "Soul / R&B", fx: { ...gate(-50), ...deess(0.55), ...hp(110), ...eq(-2, -2, 6), ...comp(-22, 3, 5), ...enhance(0.3), ...delay(0.15, "1/4", 0.4), ...reverb(0.35) } },
  { name: "Soul – coro / backing", group: "Soul / R&B", fx: { ...gate(-48), ...deess(0.6), ...hp(180), ...eq(-4, -1, 2), ...comp(-26, 4, 5), ...doubler(0.8), ...reverb(0.4) } },
  // ---------- Geral ----------
  { name: "Voz limpa", group: "Geral", fx: { ...gate(-50), ...deess(0.4), ...hp(90), ...eq(-2, -1, 3), ...comp(-20, 3, 4), ...reverb(0.12) } },
  { name: "Só limpar (gate + de-esser)", group: "Geral", fx: { ...gate(), ...deess(0.5), ...hp(90) } },
  { name: "Headset → estúdio", group: "Geral", fx: { micOn: true, micFix: true, micModel: "condenser", ...gate(), ...deess(0.5), ...comp(-22, 3, 4) } },
  // ---------- Beat ----------
  { name: "Bateria punch", group: "Beat", fx: { ...eq(3, -2, 2), ...comp(-18, 4, 3), ...drive(0.1) } },
  { name: "808 / baixo gordo", group: "Beat", fx: { ...hp(25, 8000), ...eq(4, -2, 0), ...drive(0.25), ...comp(-16, 3, 2) } },
  { name: "Melodia ao fundo", group: "Beat", fx: { ...hp(200), ...eq(0, -3, -2), ...reverb(0.25) } },
  { name: "Beat com brilho (realce)", group: "Beat", fx: { ...enhance(0.5) } },
  // ---------- Criativo ----------
  { name: "Rádio / telefone", group: "Criativo", fx: { ...hp(500, 3200), ...eq(0, 6, 0), ...comp(-24, 8, 6), ...drive(0.35) } },
  { name: "Lo-fi", group: "Criativo", fx: { ...hp(60, 6000), ...eq(0, 0, -3), ...drive(0.3), ...reverb(0.15) } },
  { name: "Catedral", group: "Criativo", fx: { ...hp(150), ...eq(0, 0, 2), ...reverb(0.8), ...delay(0.2, "1/4", 0.5) } },
];

const LS_KEY = "editor-ia:presets:v1";

export function loadUserPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Preset[]).map((p) => ({ ...p, group: "Meus" as const })) : [];
  } catch {
    return [];
  }
}

function store(list: Preset[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* sem storage */
  }
  return list;
}

export function saveUserPreset(name: string, fx: FxSettings) {
  return store([...loadUserPresets().filter((p) => p.name !== name), { name, group: "Meus", fx }]);
}

export function deleteUserPreset(name: string) {
  return store(loadUserPresets().filter((p) => p.name !== name));
}

export function presetFx(p: Preset): FxSettings {
  const fx: Partial<FxSettings> = { ...p.fx };
  // presets salvos antes das chaves liga/desliga: liga o que tinha valor
  if (!Object.keys(fx).some((k) => k.endsWith("On") && k !== "compOn")) {
    const d = (k: keyof FxSettings) => fx[k] as number | undefined;
    if ((d("hpFreq") ?? 20) > 21 || (d("lpFreq") ?? 20000) < 19999) fx.filtersOn = true;
    if (d("eqLow") || d("eqMid") || d("eqHigh")) fx.eqOn = true;
    if ((d("drive") ?? 0) > 0) fx.driveOn = true;
    if ((d("delayMix") ?? 0) > 0) fx.delayOn = true;
    if ((d("reverb") ?? 0) > 0) fx.reverbOn = true;
  }
  return { ...NEUTRAL_FX, ...fx };
}
