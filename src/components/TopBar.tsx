"use client";
import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { NOTE_NAMES_PT, SCALES, formatBars, formatTime } from "@/lib/music";
import { SNAP_OPTIONS, useStudio } from "@/lib/store";
import type { ScaleName } from "@/lib/types";
import { exportMix, record, seek, stop, togglePlay } from "@/lib/transport";

function Divider() {
  return <div className="mx-1 h-7 w-px bg-studio-line" />;
}

export default function TopBar({ sidebar, onToggleSidebar }: { sidebar: boolean; onToggleSidebar: () => void }) {
  const s = useStudio();
  const timeRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLSpanElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let level = 0;
    const loop = () => {
      const pos = engine.getPosition();
      const bpm = useStudio.getState().bpm;
      if (timeRef.current) timeRef.current.textContent = pos < 0 ? "contagem…" : formatTime(pos);
      if (barsRef.current) barsRef.current.textContent = pos < 0 ? `-${Math.ceil((-pos * bpm) / 60)}` : formatBars(pos, bpm);
      level = Math.max(engine.masterLevel(), level * 0.9);
      if (meterRef.current) {
        meterRef.current.style.width = `${Math.min(100, level * 100)}%`;
        meterRef.current.style.background = level > 0.95 ? "#ef4444" : level > 0.7 ? "#facc15" : "#22c55e";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-studio-line bg-studio-panel px-2">
      <button className={`btn w-9 ${sidebar ? "btn-on" : ""}`} title="Mostrar/ocultar painel da IA" onClick={onToggleSidebar}>
        ☰
      </button>
      <div className="mr-1 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-studio-accent text-sm font-black text-black">IA</div>
        <span className="hidden whitespace-nowrap text-sm font-bold tracking-tight 2xl:inline">Editor IA</span>
      </div>

      <Divider />
      {/* transporte */}
      <button className="btn w-9" title="Voltar ao início (Enter)" onClick={() => void stop().then(() => seek(0))}>
        ⏮
      </button>
      <button className={`btn w-10 text-sm ${s.playing && !s.recording ? "btn-on" : ""}`} title="Play/Pausa (Espaço)" onClick={() => void togglePlay()}>
        {s.playing ? "❚❚" : "▶"}
      </button>
      <button
        className={`btn w-10 text-sm ${s.recording ? "animate-pulse border-studio-rec bg-studio-rec text-white" : "text-studio-rec"}`}
        title="Gravar na faixa armada (R)"
        onClick={() => void record()}
      >
        ●
      </button>
      <button
        className={`btn ${s.loopOn ? "btn-on" : ""}`}
        title="Loop (L) — arraste na régua para definir a região"
        disabled={!s.loop}
        onClick={() => s.set({ loopOn: !s.loopOn })}
      >
        ⟲<span className="hidden 2xl:inline"> Loop</span>
      </button>

      <div className="flex items-baseline gap-2 rounded-md border border-studio-line bg-black px-3 py-1 font-mono">
        <span ref={barsRef} className="w-12 text-lg leading-none text-studio-accent">
          1.1
        </span>
        <span ref={timeRef} className="w-16 text-[11px] text-studio-dim">
          0:00.0
        </span>
      </div>

      <label className="flex items-center gap-1 text-[10px] uppercase text-studio-dim">
        BPM
        <input type="number" className="input w-14 py-1 font-mono" value={s.bpm} min={40} max={240} onChange={(e) => s.setBpm(Number(e.target.value))} />
      </label>
      <select className="input w-auto py-1" title="Tom do projeto" value={s.keyRoot} onChange={(e) => s.setKey(Number(e.target.value), s.scale)}>
        {NOTE_NAMES_PT.map((n, i) => (
          <option key={n} value={i}>
            {n}
          </option>
        ))}
      </select>
      <select className="input w-28 py-1" title="Escala do projeto" value={s.scale} onChange={(e) => s.setKey(s.keyRoot, e.target.value as ScaleName)}>
        {Object.entries(SCALES).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </select>

      <Divider />
      <button className={`btn ${s.metronome ? "btn-on" : ""}`} title="Metrônomo (M)" onClick={() => s.set({ metronome: !s.metronome })}>
        ♩<span className="hidden 2xl:inline"> Metrônomo</span>
      </button>
      <button className={`btn ${s.countIn ? "btn-on" : ""}`} title="Contagem de 1 compasso antes de gravar" onClick={() => s.set({ countIn: !s.countIn })}>
        1234
      </button>

      <Divider />
      {/* ferramentas */}
      <div className="flex rounded-md border border-studio-line">
        <button
          className={`px-2.5 py-1.5 text-xs ${s.tool === "select" ? "bg-studio-accent text-black" : "text-studio-dim"}`}
          title="Selecionar / mover / aparar (V)"
          onClick={() => s.set({ tool: "select" })}
        >
          ⬉
        </button>
        <button
          className={`px-2.5 py-1.5 text-xs ${s.tool === "cut" ? "bg-studio-accent text-black" : "text-studio-dim"}`}
          title="Tesoura: clique num clip para cortar (C)"
          onClick={() => s.set({ tool: "cut" })}
        >
          ✂
        </button>
      </div>
      <select className="input w-auto py-1" title="Grade (snap)" value={s.snapBeats} onChange={(e) => s.set({ snapBeats: Number(e.target.value) })}>
        {SNAP_OPTIONS.map((o) => (
          <option key={o.beats} value={o.beats}>
            ⊞ {o.label}
          </option>
        ))}
      </select>
      <button className="btn w-8" title="Desfazer (Ctrl+Z)" disabled={!s.past.length} onClick={s.undo}>
        ↶
      </button>
      <button className="btn w-8" title="Refazer (Ctrl+Shift+Z)" disabled={!s.future.length} onClick={s.redo}>
        ↷
      </button>
      <button className="btn w-8" title="Diminuir zoom (−)" onClick={() => s.set({ pps: Math.max(6, s.pps / 1.4) })}>
        −
      </button>
      <button className="btn w-8" title="Aumentar zoom (+)" onClick={() => s.set({ pps: Math.min(400, s.pps * 1.4) })}>
        +
      </button>

      <div className="flex-1" />
      <div className="hidden flex-col gap-1 2xl:flex" title="Volume master (também no Mixer)">
        <input
          type="range"
          min={0}
          max={1.2}
          step={0.01}
          value={s.masterVolume}
          className="w-20"
          onChange={(e) => s.set({ masterVolume: Number(e.target.value) })}
        />
        <div className="h-1 w-20 overflow-hidden rounded bg-studio-bg">
          <div ref={meterRef} className="h-full" style={{ width: 0 }} />
        </div>
      </div>
      <button className="btn-accent whitespace-nowrap" title="Exportar mixagem em WAV" onClick={() => void exportMix()}>
        ⤓<span className="hidden xl:inline"> Exportar</span>
      </button>
    </header>
  );
}
