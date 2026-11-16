"use client";
import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { useStudio } from "@/lib/store";
import { addBufferToNewTrack, seek } from "@/lib/transport";
import ClipView from "./ClipView";
import TrackHeader from "./TrackHeader";

export const LANE_H = 84;
const HEADER_W = 232;
const RULER_H = 28;

export default function Timeline() {
  const { tracks, clips, pps, bpm, recording, lyrics, addTrack, select, selectedTrackId, notify } = useStudio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const end = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  const total = Math.max(90, end + 30);
  const width = total * pps;
  const barDur = (4 * 60) / bpm;
  const bars = Math.ceil(total / barDur);
  const labelEvery = Math.max(1, Math.ceil(44 / (barDur * pps)));

  // cursor de reprodução + rolagem automática
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pos = Math.max(0, engine.getPosition());
      const x = pos * useStudio.getState().pps;
      if (headRef.current) headRef.current.style.transform = `translateX(${HEADER_W + x}px)`;
      const sc = scrollRef.current;
      if (sc && engine.playing) {
        const viewW = sc.clientWidth - HEADER_W;
        if (x > sc.scrollLeft + viewW - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 80);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seekFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - r.left) / pps);
  };

  async function importFile(file: File) {
    try {
      const buf = await engine.decode(await file.arrayBuffer());
      addBufferToNewTrack(buf, file.name.replace(/\.[^.]+$/, ""));
    } catch {
      notify("Não consegui ler esse arquivo de áudio.");
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: HEADER_W + width, minHeight: "100%" }}>
          {/* régua */}
          <div className="sticky top-0 z-20 flex" style={{ height: RULER_H }}>
            <div
              className="sticky left-0 z-30 flex shrink-0 items-center border-b border-r border-studio-line bg-studio-panel px-3 text-[10px] uppercase tracking-wider text-studio-dim"
              style={{ width: HEADER_W }}
            >
              {tracks.length} faixas
            </div>
            <div className="relative cursor-pointer border-b border-studio-line bg-studio-panel" style={{ width }} onMouseDown={seekFromEvent}>
              {Array.from({ length: bars }, (_, b) =>
                b % labelEvery === 0 ? (
                  <div key={b} className="absolute top-0 h-full border-l border-studio-line pl-1 pt-1 font-mono text-[10px] text-studio-dim" style={{ left: b * barDur * pps }}>
                    {b + 1}
                  </div>
                ) : null,
              )}
            </div>
          </div>

          {/* faixas */}
          {tracks.map((t) => (
            <div key={t.id} className="flex" style={{ height: LANE_H }}>
              <div className="sticky left-0 z-10 shrink-0" style={{ width: HEADER_W }}>
                <TrackHeader track={t} />
              </div>
              <div
                className={`relative border-b border-studio-line ${selectedTrackId === t.id ? "bg-white/[0.03]" : ""}`}
                style={{
                  width,
                  backgroundImage: `repeating-linear-gradient(to right, #262b38 0 1px, transparent 1px ${barDur * pps}px)`,
                }}
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  select(t.id, null);
                  seekFromEvent(e);
                }}
              >
                {clips
                  .filter((c) => c.trackId === t.id)
                  .map((c) => (
                    <ClipView key={c.id} clip={c} color={t.color} laneH={LANE_H} />
                  ))}
              </div>
            </div>
          ))}

          {/* adicionar faixas */}
          <div className="sticky left-0 flex gap-2 p-3" style={{ width: HEADER_W + 400 }}>
            <button className="btn" onClick={() => addTrack({ name: "Voz", armed: true, color: "#f43f5e" })}>
              + Faixa de voz
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              + Importar áudio
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {tracks.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-24 text-center text-sm text-studio-dim" style={{ paddingLeft: HEADER_W }}>
              Gere um beat na barra lateral (ou use o beat demo) para começar.
            </div>
          )}

          {/* cursor */}
          <div ref={headRef} className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-studio-accent" style={{ left: 0 }}>
            <div className="-ml-[5px] h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-studio-accent" />
          </div>
        </div>
      </div>

      {recording && lyrics.trim() && (
        <div className="absolute right-4 top-10 z-30 max-h-[70%] w-72 overflow-auto rounded-lg border border-studio-line bg-black/80 p-3 font-mono text-xs leading-relaxed backdrop-blur">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-studio-rec">● gravando</p>
          <pre className="whitespace-pre-wrap">{lyrics}</pre>
        </div>
      )}
    </div>
  );
}
