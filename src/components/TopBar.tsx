"use client";
import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { NOTE_NAMES_PT, SCALES, formatBars, formatTime } from "@/lib/music";
import { useStudio } from "@/lib/store";
import type { ScaleName } from "@/lib/types";
import { exportMix, record, seek, stop, togglePlay } from "@/lib/transport";

export default function TopBar() {
  const s = useStudio();
  const timeRef = useRef<HTMLSpanElement>(null);
  const barsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pos = engine.getPosition();
      const bpm = useStudio.getState().bpm;
      if (timeRef.current) timeRef.current.textContent = pos < 0 ? "contagem" : formatTime(pos);
      if (barsRef.current) barsRef.current.textContent = formatBars(pos, bpm);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-studio-line bg-studio-panel px-3">
      <div className="mr-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-studio-accent text-sm font-black text-black">IA</div>
        <span className="text-sm font-bold tracking-tight">Editor IA</span>
      </div>

      <div className="flex items-center gap-1">
        <button className="btn w-9" title="Voltar ao início (Enter)" onClick={() => void stop().then(() => seek(0))}>
          ⏮
        </button>
        <button className={`btn w-9 ${s.playing && !s.recording ? "btn-on" : ""}`} title="Play/Pausa (Espaço)" onClick={() => void togglePlay()}>
          {s.playing ? "❚❚" : "▶"}
        </button>
        <button
          className={`btn w-9 ${s.recording ? "animate-pulse border-studio-rec bg-studio-rec text-white" : "text-studio-rec"}`}
          title="Gravar na faixa armada (R)"
          onClick={() => void record()}
        >
          ●
        </button>
      </div>

      <div className="flex items-baseline gap-3 rounded-md border border-studio-line bg-studio-bg px-3 py-1 font-mono">
        <span ref={barsRef} className="w-12 text-base text-studio-accent">
          1.1
        </span>
        <span ref={timeRef} className="w-20 text-xs text-studio-dim">
          0:00.0
        </span>
      </div>

      <label className="flex items-center gap-1 text-[11px] text-studio-dim">
        BPM
        <input
          type="number"
          className="input w-16 py-1 font-mono"
          value={s.bpm}
          min={40}
          max={240}
          onChange={(e) => s.setBpm(Number(e.target.value))}
        />
      </label>

      <label className="flex items-center gap-1 text-[11px] text-studio-dim">
        Tom
        <select className="input w-auto py-1" value={s.keyRoot} onChange={(e) => s.setKey(Number(e.target.value), s.scale)}>
          {NOTE_NAMES_PT.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
        <select className="input w-auto py-1" value={s.scale} onChange={(e) => s.setKey(s.keyRoot, e.target.value as ScaleName)}>
          {Object.entries(SCALES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>

      <button className={`btn ${s.metronome ? "btn-on" : ""}`} title="Metrônomo e contagem (M)" onClick={() => s.set({ metronome: !s.metronome })}>
        𝅘𝅥 Metrônomo
      </button>
      <button className={`btn ${s.snap ? "btn-on" : ""}`} title="Grudar clips na grade" onClick={() => s.set({ snap: !s.snap })}>
        ⊞ Grade
      </button>

      <div className="flex items-center gap-1">
        <button className="btn w-8" title="Diminuir zoom" onClick={() => s.set({ pps: Math.max(8, s.pps / 1.4) })}>
          −
        </button>
        <button className="btn w-8" title="Aumentar zoom" onClick={() => s.set({ pps: Math.min(400, s.pps * 1.4) })}>
          +
        </button>
      </div>

      <label className="flex items-center gap-1 text-[11px] text-studio-dim" title="Ajuste fino se a voz gravada sair adiantada/atrasada">
        Latência
        <input
          type="number"
          className="input w-16 py-1 font-mono"
          value={s.latencyMs}
          step={5}
          onChange={(e) => s.set({ latencyMs: Number(e.target.value) || 0 })}
        />
        ms
      </label>

      <div className="flex-1" />
      <button className="btn-accent" onClick={() => void exportMix()}>
        ⤓ Exportar WAV
      </button>
    </header>
  );
}
