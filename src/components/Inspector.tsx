"use client";
import { useState } from "react";
import { useStudio } from "@/lib/store";
import TunePanel from "./TunePanel";

function Knob({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = "",
  onChange,
  reset = 0,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  reset?: number;
}) {
  return (
    <label className="block min-w-[110px] flex-1">
      <span className="label flex justify-between">
        {label}
        <span className="font-mono normal-case text-studio-text">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onDoubleClick={() => onChange(reset)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function Inspector() {
  const [tab, setTab] = useState<"fx" | "tune">("tune");
  const { tracks, clips, selectedTrackId, selectedClipId, updateFx } = useStudio();
  const track = tracks.find((t) => t.id === selectedTrackId);
  const clip = clips.find((c) => c.id === selectedClipId);

  return (
    <section className="flex h-[300px] shrink-0 flex-col border-t border-studio-line bg-studio-panel">
      <div className="flex items-center gap-1 border-b border-studio-line px-2">
        {(
          [
            ["tune", "Corretor de afinação"],
            ["fx", "Mixer & efeitos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-2 text-xs font-semibold ${tab === id ? "border-b-2 border-studio-accent text-studio-text" : "text-studio-dim"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto truncate text-[11px] text-studio-dim">
          {track ? `Faixa: ${track.name}` : "Selecione uma faixa"}
          {clip ? ` · Clip: ${clip.name}` : ""}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "tune" && <TunePanel />}
        {tab === "fx" &&
          (track ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-3">
                <h4 className="panel-title">Equalizador</h4>
                <div className="flex flex-wrap gap-3">
                  <Knob label="Graves" unit=" dB" min={-12} max={12} value={track.fx.eqLow} onChange={(v) => updateFx(track.id, { eqLow: v })} />
                  <Knob label="Médios" unit=" dB" min={-12} max={12} value={track.fx.eqMid} onChange={(v) => updateFx(track.id, { eqMid: v })} />
                  <Knob label="Agudos" unit=" dB" min={-12} max={12} value={track.fx.eqHigh} onChange={(v) => updateFx(track.id, { eqHigh: v })} />
                </div>
              </div>
              <div className="space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="panel-title">Compressor</h4>
                  <button className={`btn py-0.5 ${track.fx.compOn ? "btn-on" : ""}`} onClick={() => updateFx(track.id, { compOn: !track.fx.compOn })}>
                    {track.fx.compOn ? "Ligado" : "Desligado"}
                  </button>
                </div>
                <div className={`flex flex-wrap gap-3 ${track.fx.compOn ? "" : "opacity-40"}`}>
                  <Knob label="Limiar" unit=" dB" min={-50} max={0} step={1} reset={-18} value={track.fx.compThreshold} onChange={(v) => updateFx(track.id, { compThreshold: v })} />
                  <Knob label="Razão" unit=":1" min={1} max={20} step={0.5} reset={4} value={track.fx.compRatio} onChange={(v) => updateFx(track.id, { compRatio: v })} />
                  <Knob label="Ganho" unit=" dB" min={0} max={18} value={track.fx.compMakeup} onChange={(v) => updateFx(track.id, { compMakeup: v })} />
                </div>
              </div>
              <div className="space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-3">
                <h4 className="panel-title">Reverb</h4>
                <Knob label="Envio" min={0} max={1} step={0.01} value={track.fx.reverb} onChange={(v) => updateFx(track.id, { reverb: v })} />
                <p className="text-[10px] text-studio-dim">Duplo clique num controle volta ao padrão.</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-studio-dim">Selecione uma faixa para ajustar EQ, compressor e reverb.</p>
          ))}
      </div>
    </section>
  );
}
