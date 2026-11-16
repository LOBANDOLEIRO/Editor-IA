"use client";
import { useEffect, useState } from "react";
import { BUILTIN_PRESETS, deleteUserPreset, loadUserPresets, presetFx, saveUserPreset, type Preset } from "@/lib/presets";
import { useStudio } from "@/lib/store";
import type { DelayDiv } from "@/lib/types";
import { FxBox, Slider, fmtDb, fmtHz, fmtPct, freqFromUnit, unitFromFreq } from "./ui";

const DIVS: [DelayDiv, string][] = [
  ["1/4", "1/4"],
  ["1/8", "1/8"],
  ["1/8d", "1/8 pontuada"],
  ["1/16", "1/16"],
  ["1/4t", "1/4 tercina"],
];

export default function EffectsPanel() {
  const { tracks, selectedTrackId, updateFx, updateTrack, checkpoint, notify } = useStudio();
  const track = tracks.find((t) => t.id === selectedTrackId);
  const [user, setUser] = useState<Preset[]>([]);
  useEffect(() => setUser(loadUserPresets()), []);

  if (!track) return <p className="text-xs text-studio-dim">Selecione uma faixa (clique no nome dela) para editar os efeitos.</p>;
  const fx = track.fx;
  const set = (patch: Partial<typeof fx>) => updateFx(track.id, patch);
  const all = [...BUILTIN_PRESETS, ...user];
  const groups = ["Voz", "Beat", "Criativo", "Meus"] as const;

  function applyPreset(name: string) {
    const p = all.find((x) => x.name === name);
    if (!p || !track) return;
    checkpoint();
    updateTrack(track.id, { fx: presetFx(p), preset: p.name === "Sem efeitos" ? undefined : p.name });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mb-0">Preset</span>
        <select className="input w-56" value={track.preset ?? ""} onChange={(e) => applyPreset(e.target.value)}>
          <option value="">{track.preset ? track.preset : "— personalizado —"}</option>
          {groups.map((g) => {
            const list = all.filter((p) => p.group === g);
            return list.length ? (
              <optgroup key={g} label={g === "Meus" ? "Meus presets" : g}>
                {list.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
        <div className="flex flex-wrap gap-1">
          {BUILTIN_PRESETS.filter((p) => p.group === "Voz").slice(1, 5).map((p) => (
            <button key={p.name} className={`btn py-1 ${track.preset === p.name ? "btn-on" : ""}`} onClick={() => applyPreset(p.name)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button
            className="btn"
            onClick={() => {
              const name = window.prompt("Nome do preset:", track.preset ?? `${track.name} preset`);
              if (!name?.trim()) return;
              setUser(saveUserPreset(name.trim(), fx));
              updateTrack(track.id, { preset: name.trim() });
              notify(`Preset “${name.trim()}” salvo.`);
            }}
          >
            💾 Salvar preset
          </button>
          {user.some((p) => p.name === track.preset) && (
            <button className="btn" onClick={() => setUser(deleteUserPreset(track.preset!))}>
              Excluir
            </button>
          )}
          <button className="btn" onClick={() => applyPreset("Sem efeitos")}>
            Zerar
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <FxBox title="Filtros" active={fx.hpFreq > 21 || fx.lpFreq < 19999}>
          <Slider label="Corta graves" min={0} max={0.7} step={0.001} value={unitFromFreq(fx.hpFreq)} format={(u) => (u < 0.002 ? "off" : fmtHz(freqFromUnit(u)))} reset={0} onChange={(u) => set({ hpFreq: u < 0.002 ? 20 : Math.round(freqFromUnit(u)) })} />
          <Slider label="Corta agudos" min={0.3} max={1} step={0.001} value={unitFromFreq(fx.lpFreq)} format={(u) => (u > 0.998 ? "off" : fmtHz(freqFromUnit(u)))} reset={1} onChange={(u) => set({ lpFreq: u > 0.998 ? 20000 : Math.round(freqFromUnit(u)) })} />
        </FxBox>
        <FxBox title="Equalizador" active={!!(fx.eqLow || fx.eqMid || fx.eqHigh)}>
          <Slider label="Graves" min={-12} max={12} value={fx.eqLow} format={fmtDb} reset={0} onChange={(v) => set({ eqLow: v })} />
          <Slider label="Médios" min={-12} max={12} value={fx.eqMid} format={fmtDb} reset={0} onChange={(v) => set({ eqMid: v })} />
          <Slider label="Agudos / brilho" min={-12} max={12} value={fx.eqHigh} format={fmtDb} reset={0} onChange={(v) => set({ eqHigh: v })} />
        </FxBox>
        <FxBox title="Compressor" active={fx.compOn} onToggle={() => { checkpoint(); set({ compOn: !fx.compOn }); }}>
          <Slider label="Limiar" min={-50} max={0} step={1} value={fx.compThreshold} format={(v) => `${v} dB`} reset={-18} onChange={(v) => set({ compThreshold: v })} />
          <Slider label="Razão" min={1} max={20} step={0.5} value={fx.compRatio} format={(v) => `${v}:1`} reset={4} onChange={(v) => set({ compRatio: v })} />
          <Slider label="Ganho" min={0} max={18} value={fx.compMakeup} format={fmtDb} reset={0} onChange={(v) => set({ compMakeup: v })} />
        </FxBox>
        <FxBox title="Saturação" active={fx.drive > 0}>
          <Slider label="Drive" min={0} max={1} step={0.01} value={fx.drive} format={fmtPct} reset={0} onChange={(v) => set({ drive: v })} />
          <p className="text-[10px] text-studio-dim">Esquenta e dá presença; em excesso vira distorção.</p>
        </FxBox>
        <FxBox title="Delay (no tempo)" active={fx.delayMix > 0}>
          <Slider label="Mix" min={0} max={0.8} step={0.01} value={fx.delayMix} format={fmtPct} reset={0} onChange={(v) => set({ delayMix: v })} />
          <label className="block min-w-[120px] flex-1">
            <span className="label">Tempo</span>
            <select className="input py-1" value={fx.delayDiv} onChange={(e) => set({ delayDiv: e.target.value as DelayDiv })}>
              {DIVS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Slider label="Repetições" min={0} max={0.85} step={0.01} value={fx.delayFeedback} format={fmtPct} reset={0.3} onChange={(v) => set({ delayFeedback: v })} />
        </FxBox>
        <FxBox title="Reverb" active={fx.reverb > 0}>
          <Slider label="Quantidade" min={0} max={1} step={0.01} value={fx.reverb} format={fmtPct} reset={0} onChange={(v) => set({ reverb: v })} />
          <p className="text-[10px] text-studio-dim">Duplo clique em qualquer controle volta ao padrão.</p>
        </FxBox>
      </div>
    </div>
  );
}
