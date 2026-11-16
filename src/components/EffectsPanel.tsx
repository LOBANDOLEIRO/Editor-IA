"use client";
import { useEffect, useState } from "react";
import { MIC_MODELS } from "@/lib/audio/graph";
import { BUILTIN_PRESETS, NEUTRAL_FX, PRESET_GROUPS, deleteUserPreset, loadUserPresets, presetFx, saveUserPreset, type Preset } from "@/lib/presets";
import { useStudio } from "@/lib/store";
import type { DelayDiv, FxSettings, MicModel } from "@/lib/types";
import { FxBox, Slider, fmtDb, fmtHz, fmtPct, freqFromUnit, unitFromFreq } from "./ui";

const DIVS: [DelayDiv, string][] = [
  ["1/4", "1/4"],
  ["1/8", "1/8"],
  ["1/8d", "1/8 pontuada"],
  ["1/16", "1/16"],
  ["1/4t", "1/4 tercina"],
];

const QUICK = ["Rap – voz principal", "Trap – voz melódica", "Drill – voz agressiva", "Soul – voz quente"];

type OnKey = { [K in keyof FxSettings]: FxSettings[K] extends boolean ? (K extends `${string}On` ? K : never) : never }[keyof FxSettings];

export default function EffectsPanel() {
  const { tracks, selectedTrackId, updateFx, updateTrack, checkpoint, notify } = useStudio();
  const track = tracks.find((t) => t.id === selectedTrackId);
  const [user, setUser] = useState<Preset[]>([]);
  useEffect(() => setUser(loadUserPresets()), []);

  if (!track) return <p className="text-xs text-studio-dim">Selecione uma faixa (clique no nome dela) para editar os efeitos.</p>;
  const fx = track.fx;
  /** Mexer num controle liga o efeito correspondente. */
  const set = (on: OnKey, patch: Partial<FxSettings>) => updateFx(track.id, { ...patch, [on]: true });
  const toggle = (on: OnKey) => () => {
    checkpoint();
    updateFx(track.id, { [on]: !fx[on] });
  };
  const all = [...BUILTIN_PRESETS, ...user];
  const anyOn = (Object.keys(fx) as (keyof FxSettings)[]).some((k) => k.endsWith("On") && fx[k] === true);

  function applyPreset(name: string) {
    const p = all.find((x) => x.name === name);
    if (!p || !track) return;
    checkpoint();
    updateTrack(track.id, { fx: presetFx(p), preset: p.name });
  }
  function clearAll() {
    if (!track) return;
    checkpoint();
    updateTrack(track.id, { fx: { ...NEUTRAL_FX }, preset: undefined });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mb-0">Preset</span>
        <select className="input w-56" value={track.preset ?? ""} onChange={(e) => (e.target.value ? applyPreset(e.target.value) : undefined)}>
          <option value="">{anyOn ? "— personalizado —" : "— nenhum (tudo desligado) —"}</option>
          {PRESET_GROUPS.map((g) => {
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
          {QUICK.map((name) => (
            <button key={name} className={`btn py-1 ${track.preset === name ? "btn-on" : ""}`} onClick={() => applyPreset(name)}>
              {name.split(" – ")[0]}
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
            <button
              className="btn"
              onClick={() => {
                setUser(deleteUserPreset(track.preset!));
                updateTrack(track.id, { preset: undefined });
              }}
            >
              Excluir
            </button>
          )}
          <button className="btn" disabled={!anyOn} onClick={clearAll}>
            Desligar tudo
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FxBox title="Simular microfone" active={fx.micOn} onToggle={toggle("micOn")}>
          <label className="flex w-full items-center gap-1.5 text-[11px]">
            <input type="checkbox" checked={fx.micFix} onChange={(e) => set("micOn", { micFix: e.target.checked })} />
            Corrigir mic de headset / celular
          </label>
          <label className="block w-full">
            <span className="label">Caráter</span>
            <select className="input py-1" value={fx.micModel} onChange={(e) => set("micOn", { micModel: e.target.value as MicModel })}>
              {(Object.keys(MIC_MODELS) as MicModel[]).map((k) => (
                <option key={k} value={k}>
                  {MIC_MODELS[k].label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[10px] text-studio-dim">Aproxima o timbre com equalização; não transforma um microfone em outro.</p>
        </FxBox>
        <FxBox title="Noise gate (sala barulhenta)" active={fx.gateOn} onToggle={toggle("gateOn")}>
          <Slider label="Limiar" min={-70} max={-20} step={1} value={fx.gateThreshold} format={(v) => `${v} dB`} reset={-45} onChange={(v) => set("gateOn", { gateThreshold: v })} />
          <p className="text-[10px] text-studio-dim">Abaixa o som entre as frases. Suba o limiar até o ruído sumir nas pausas sem cortar o fim das palavras.</p>
        </FxBox>
        <FxBox title="De-esser (S e X chiados)" active={fx.deessOn} onToggle={toggle("deessOn")}>
          <Slider label="Quantidade" min={0} max={1} step={0.01} value={fx.deess} format={fmtPct} reset={0.5} onChange={(v) => set("deessOn", { deess: v })} />
        </FxBox>
        <FxBox title="Filtros" active={fx.filtersOn} onToggle={toggle("filtersOn")}>
          <Slider label="Corta graves" min={0} max={0.7} step={0.001} value={unitFromFreq(fx.hpFreq)} format={(u) => (u < 0.002 ? "off" : fmtHz(freqFromUnit(u)))} reset={unitFromFreq(90)} onChange={(u) => set("filtersOn", { hpFreq: u < 0.002 ? 20 : Math.round(freqFromUnit(u)) })} />
          <Slider label="Corta agudos" min={0.3} max={1} step={0.001} value={unitFromFreq(fx.lpFreq)} format={(u) => (u > 0.998 ? "off" : fmtHz(freqFromUnit(u)))} reset={1} onChange={(u) => set("filtersOn", { lpFreq: u > 0.998 ? 20000 : Math.round(freqFromUnit(u)) })} />
        </FxBox>
        <FxBox title="Equalizador" active={fx.eqOn} onToggle={toggle("eqOn")}>
          <Slider label="Graves" min={-12} max={12} value={fx.eqLow} format={fmtDb} reset={0} onChange={(v) => set("eqOn", { eqLow: v })} />
          <Slider label="Médios" min={-12} max={12} value={fx.eqMid} format={fmtDb} reset={0} onChange={(v) => set("eqOn", { eqMid: v })} />
          <Slider label="Agudos / brilho" min={-12} max={12} value={fx.eqHigh} format={fmtDb} reset={0} onChange={(v) => set("eqOn", { eqHigh: v })} />
        </FxBox>
        <FxBox title="Compressor" active={fx.compOn} onToggle={toggle("compOn")}>
          <Slider label="Limiar" min={-50} max={0} step={1} value={fx.compThreshold} format={(v) => `${v} dB`} reset={-18} onChange={(v) => set("compOn", { compThreshold: v })} />
          <Slider label="Razão" min={1} max={20} step={0.5} value={fx.compRatio} format={(v) => `${v}:1`} reset={4} onChange={(v) => set("compOn", { compRatio: v })} />
          <Slider label="Ganho" min={0} max={18} value={fx.compMakeup} format={fmtDb} reset={0} onChange={(v) => set("compOn", { compMakeup: v })} />
        </FxBox>
        <FxBox title="Saturação" active={fx.driveOn} onToggle={toggle("driveOn")}>
          <Slider label="Drive" min={0} max={1} step={0.01} value={fx.drive} format={fmtPct} reset={0.15} onChange={(v) => set("driveOn", { drive: v })} />
          <p className="text-[10px] text-studio-dim">Esquenta e dá presença; em excesso vira distorção.</p>
        </FxBox>
        <FxBox title="Realce (um botão)" active={fx.enhanceOn} onToggle={toggle("enhanceOn")}>
          <Slider label="Quantidade" min={0} max={1} step={0.01} value={fx.enhance} format={fmtPct} reset={0.4} onChange={(v) => set("enhanceOn", { enhance: v })} />
          <p className="text-[10px] text-studio-dim">Compressão, grave e brilho de uma vez: deixa "maior" e mais alto.</p>
        </FxBox>
        <FxBox title="Dobra estéreo" active={fx.doublerOn} onToggle={toggle("doublerOn")}>
          <Slider label="Quantidade" min={0} max={1} step={0.01} value={fx.doubler} format={fmtPct} reset={0.4} onChange={(v) => set("doublerOn", { doubler: v })} />
          <p className="text-[10px] text-studio-dim">Abre a voz para os lados, como se fossem dobras gravadas.</p>
        </FxBox>
        <FxBox title="Delay (no tempo)" active={fx.delayOn} onToggle={toggle("delayOn")}>
          <Slider label="Mix" min={0} max={0.8} step={0.01} value={fx.delayMix} format={fmtPct} reset={0.2} onChange={(v) => set("delayOn", { delayMix: v })} />
          <label className="block min-w-[120px] flex-1">
            <span className="label">Tempo</span>
            <select className="input py-1" value={fx.delayDiv} onChange={(e) => set("delayOn", { delayDiv: e.target.value as DelayDiv })}>
              {DIVS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Slider label="Repetições" min={0} max={0.85} step={0.01} value={fx.delayFeedback} format={fmtPct} reset={0.3} onChange={(v) => set("delayOn", { delayFeedback: v })} />
        </FxBox>
        <FxBox title="Reverb" active={fx.reverbOn} onToggle={toggle("reverbOn")}>
          <Slider label="Quantidade" min={0} max={1} step={0.01} value={fx.reverb} format={fmtPct} reset={0.2} onChange={(v) => set("reverbOn", { reverb: v })} />
        </FxBox>
      </div>
    </div>
  );
}
