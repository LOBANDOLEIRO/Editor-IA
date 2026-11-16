"use client";
import { useStudio } from "@/lib/store";
import type { Track } from "@/lib/types";

export default function TrackHeader({ track: t }: { track: Track }) {
  const { updateTrack, removeTrack, select, selectedTrackId } = useStudio();
  const selected = selectedTrackId === t.id;
  return (
    <div
      className={`flex h-full flex-col justify-between border-b border-r border-studio-line px-2 py-1.5 ${selected ? "bg-studio-panel2" : "bg-studio-panel"}`}
      onMouseDown={() => select(t.id, null)}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-1.5 shrink-0 rounded-sm" style={{ background: t.color }} />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
          value={t.name}
          onChange={(e) => updateTrack(t.id, { name: e.target.value })}
        />
        <button className="text-[11px] text-studio-dim hover:text-studio-rec" title="Excluir faixa" onClick={() => removeTrack(t.id)}>
          ✕
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          className={`h-5 w-6 rounded text-[10px] font-bold ${t.mute ? "bg-sky-500 text-black" : "bg-studio-bg text-studio-dim"}`}
          title="Mudo"
          onClick={() => updateTrack(t.id, { mute: !t.mute })}
        >
          M
        </button>
        <button
          className={`h-5 w-6 rounded text-[10px] font-bold ${t.solo ? "bg-yellow-400 text-black" : "bg-studio-bg text-studio-dim"}`}
          title="Solo"
          onClick={() => updateTrack(t.id, { solo: !t.solo })}
        >
          S
        </button>
        <button
          className={`h-5 w-6 rounded text-[10px] font-bold ${t.armed ? "bg-studio-rec text-white" : "bg-studio-bg text-studio-dim"}`}
          title="Armar para gravação"
          onClick={() => updateTrack(t.id, { armed: !t.armed })}
        >
          ●
        </button>
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.01}
          value={t.volume}
          title={`Volume ${Math.round(t.volume * 100)}%`}
          className="ml-1 w-full min-w-0"
          onChange={(e) => updateTrack(t.id, { volume: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-1 text-[10px] text-studio-dim">
        <span className="w-6">Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={t.pan}
          className="w-full min-w-0"
          onDoubleClick={() => updateTrack(t.id, { pan: 0 })}
          onChange={(e) => updateTrack(t.id, { pan: Number(e.target.value) })}
        />
        <span className="w-7 text-right font-mono">{t.pan === 0 ? "C" : t.pan < 0 ? `L${Math.round(-t.pan * 100)}` : `R${Math.round(t.pan * 100)}`}</span>
      </div>
    </div>
  );
}
