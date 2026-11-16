"use client";
import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { useStudio } from "@/lib/store";
import type { Track } from "@/lib/types";
import { armTrack } from "@/lib/transport";

export function useMeter(ref: React.RefObject<HTMLDivElement>, read: () => number, vertical = false) {
  useEffect(() => {
    let raf = 0;
    let level = 0;
    const loop = () => {
      level = Math.max(read(), level * 0.88);
      const el = ref.current;
      if (el) {
        const pct = `${Math.min(100, Math.sqrt(level) * 100)}%`;
        if (vertical) el.style.height = pct;
        else el.style.width = pct;
        el.style.background = level > 0.95 ? "#ef4444" : level > 0.6 ? "#facc15" : "#22c55e";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function TrackHeader({ track: t, compact }: { track: Track; compact?: boolean }) {
  const { updateTrack, removeTrack, select, selectedTrackId, checkpoint, set } = useStudio();
  const selected = selectedTrackId === t.id;
  const meterRef = useRef<HTMLDivElement>(null);
  const armedRef = useRef(t.armed);
  armedRef.current = t.armed;
  useMeter(meterRef, () => (armedRef.current ? engine.micLevel() : engine.trackLevel(t.id)));

  return (
    <div
      className={`flex h-full flex-col justify-between border-b border-r border-studio-line px-2 py-1.5 ${selected ? "bg-studio-panel2" : "bg-studio-panel"}`}
      onMouseDown={() => select(t.id, null)}
    >
      <div className="flex items-center gap-1.5">
        <input
          hidden={compact}
          type="color"
          value={t.color}
          title="Cor da faixa"
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          onChange={(e) => updateTrack(t.id, { color: e.target.value })}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
          value={t.name}
          onFocus={checkpoint}
          onChange={(e) => updateTrack(t.id, { name: e.target.value })}
        />
        <button
          className="rounded px-1 text-[10px] font-bold text-studio-dim hover:text-studio-accent"
          title="Efeitos da faixa"
          onClick={() => {
            select(t.id, null);
            set({ inspectorTab: "fx" });
          }}
        >
          FX
        </button>
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
          title="Armar para gravação (mostra o nível do microfone)"
          onClick={() => void armTrack(t.id, !t.armed)}
        >
          ●
        </button>
        <button
          className={`h-5 w-6 rounded text-[10px] ${t.monitor ? "bg-emerald-500 text-black" : "bg-studio-bg text-studio-dim"} disabled:opacity-30`}
          title="Retorno: ouvir sua voz com os efeitos (use fone!)"
          disabled={!t.armed}
          onClick={() => updateTrack(t.id, { monitor: !t.monitor })}
        >
          🎧
        </button>
        <input
          hidden={compact}
          type="range"
          min={0}
          max={1.5}
          step={0.01}
          value={t.volume}
          title={`Volume ${Math.round(t.volume * 100)}%`}
          className="ml-1 w-full min-w-0"
          onPointerDown={checkpoint}
          onDoubleClick={() => updateTrack(t.id, { volume: 0.9 })}
          onChange={(e) => updateTrack(t.id, { volume: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center gap-1 text-[10px] text-studio-dim">
        <span className="w-6" hidden={compact}>Pan</span>
        <input
          hidden={compact}
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={t.pan}
          className="w-20 min-w-0"
          onPointerDown={checkpoint}
          onDoubleClick={() => updateTrack(t.id, { pan: 0 })}
          onChange={(e) => updateTrack(t.id, { pan: Number(e.target.value) })}
        />
        <span className="w-7 text-right font-mono" hidden={compact}>{t.pan === 0 ? "C" : t.pan < 0 ? `L${Math.round(-t.pan * 100)}` : `R${Math.round(t.pan * 100)}`}</span>
        <div className={`h-1.5 flex-1 overflow-hidden rounded bg-studio-bg ${compact ? "" : "ml-1"}`} title={t.armed ? "Nível do microfone" : "Nível da faixa"}>
          <div ref={meterRef} className="h-full" style={{ width: 0 }} />
        </div>
      </div>
    </div>
  );
}
