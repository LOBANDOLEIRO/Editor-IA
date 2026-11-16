"use client";
import { useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { useStudio } from "@/lib/store";
import type { Track } from "@/lib/types";
import { armTrack } from "@/lib/transport";
import { useMeter } from "./TrackHeader";

const vertical: React.CSSProperties = { writingMode: "vertical-lr", direction: "rtl", width: 18, height: 120 };

function Fader({ value, max, onChange, onReset }: { value: number; max: number; onChange: (v: number) => void; onReset: () => void }) {
  const checkpoint = useStudio((s) => s.checkpoint);
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={0.01}
      value={value}
      style={vertical}
      onPointerDown={checkpoint}
      onDoubleClick={onReset}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function Meter({ read }: { read: () => number }) {
  const ref = useRef<HTMLDivElement>(null);
  useMeter(ref, read, true);
  return (
    <div className="relative h-[120px] w-2 overflow-hidden rounded bg-studio-bg">
      <div ref={ref} className="absolute bottom-0 w-full" style={{ height: 0 }} />
    </div>
  );
}

const gainDb = (v: number) => (v <= 0.0001 ? "-∞" : `${(20 * Math.log10(v)).toFixed(1)}`);

function Strip({ t }: { t: Track }) {
  const { updateTrack, select, selectedTrackId, set } = useStudio();
  const armed = useRef(t.armed);
  armed.current = t.armed;
  return (
    <div
      className={`flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-md border p-2 ${selectedTrackId === t.id ? "border-studio-accent/60 bg-studio-panel2" : "border-studio-line bg-studio-bg/40"}`}
      onMouseDown={() => select(t.id, null)}
    >
      <div className="h-1 w-full rounded" style={{ background: t.color }} />
      <p className="w-full truncate text-center text-[11px] font-semibold">{t.name}</p>
      <button className="w-full truncate rounded bg-studio-bg px-1 py-0.5 text-[9px] text-studio-dim hover:text-studio-accent" onClick={() => set({ inspectorTab: "fx" })}>
        {t.preset ?? "FX"}
      </button>
      <div className="flex items-end gap-1.5">
        <Fader value={t.volume} max={1.5} onChange={(v) => updateTrack(t.id, { volume: v })} onReset={() => updateTrack(t.id, { volume: 0.9 })} />
        <Meter read={() => (armed.current ? engine.micLevel() : engine.trackLevel(t.id))} />
      </div>
      <span className="font-mono text-[9px] text-studio-dim">{gainDb(t.volume)} dB</span>
      <input
        type="range"
        min={-1}
        max={1}
        step={0.01}
        value={t.pan}
        className="w-full"
        title="Pan"
        onDoubleClick={() => updateTrack(t.id, { pan: 0 })}
        onChange={(e) => updateTrack(t.id, { pan: Number(e.target.value) })}
      />
      <div className="flex gap-0.5">
        <button className={`h-5 w-5 rounded text-[9px] font-bold ${t.mute ? "bg-sky-500 text-black" : "bg-studio-bg text-studio-dim"}`} onClick={() => updateTrack(t.id, { mute: !t.mute })}>
          M
        </button>
        <button className={`h-5 w-5 rounded text-[9px] font-bold ${t.solo ? "bg-yellow-400 text-black" : "bg-studio-bg text-studio-dim"}`} onClick={() => updateTrack(t.id, { solo: !t.solo })}>
          S
        </button>
        <button className={`h-5 w-5 rounded text-[9px] font-bold ${t.armed ? "bg-studio-rec text-white" : "bg-studio-bg text-studio-dim"}`} onClick={() => void armTrack(t.id, !t.armed)}>
          ●
        </button>
      </div>
    </div>
  );
}

export default function Mixer() {
  const { tracks, masterVolume, set, latencyMs } = useStudio();
  return (
    <div className="flex h-full gap-2 overflow-x-auto lg:overflow-visible">
      <div className="flex shrink-0 gap-2 pb-1 lg:min-w-0 lg:flex-1 lg:shrink lg:overflow-x-auto">
        {tracks.length === 0 && <p className="self-center text-xs text-studio-dim">As faixas aparecem aqui como canais de mixer.</p>}
        {tracks.map((t) => (
          <Strip key={t.id} t={t} />
        ))}
      </div>
      <div className="flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-md border border-studio-accent/40 bg-studio-panel2 p-2">
        <div className="h-1 w-full rounded bg-studio-accent" />
        <p className="text-[11px] font-bold">MASTER</p>
        <span className="text-[9px] text-studio-dim">limitador</span>
        <div className="flex items-end gap-1.5">
          <Fader value={masterVolume} max={1.2} onChange={(v) => set({ masterVolume: v })} onReset={() => set({ masterVolume: 0.9 })} />
          <Meter read={() => engine.masterLevel()} />
        </div>
        <span className="font-mono text-[9px] text-studio-dim">{gainDb(masterVolume)} dB</span>
      </div>
      <div className="w-48 shrink-0 space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-3 text-[11px]">
        <h4 className="panel-title">Gravação</h4>
        <p className="text-[10px] leading-relaxed text-studio-dim">
          Arme a faixa (●) para ver o nível do microfone. 🎧 liga o retorno com efeitos — use fone para não microfonar.
        </p>
        <label className="block">
          <span className="label">Compensação de latência</span>
          <div className="flex items-center gap-1">
            <input type="number" className="input py-1 font-mono" step={5} value={latencyMs} onChange={(e) => set({ latencyMs: Number(e.target.value) || 0 })} />
            <span className="text-studio-dim">ms</span>
          </div>
        </label>
        <p className="text-[10px] text-studio-dim">Se a voz sair atrasada em relação ao beat, aumente; adiantada, diminua.</p>
      </div>
    </div>
  );
}
