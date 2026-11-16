"use client";
import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio/engine";
import { snapTime, useStudio } from "@/lib/store";
import { addBufferToNewTrack, seek } from "@/lib/transport";
import { useIsMobile } from "@/lib/useIsMobile";
import ClipView from "./ClipView";
import TrackHeader from "./TrackHeader";

export const LANE_H = 84;
const RULER_H = 30;

export default function Timeline() {
  const { tracks, clips, pps, bpm, recording, lyrics, addTrack, select, selectedTrackId, notify, loop, loopOn, tool, snapBeats } = useStudio();
  const mobile = useIsMobile();
  const HEADER_W = mobile ? 118 : 240;
  const headerW = useRef(HEADER_W);
  headerW.current = HEADER_W;
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const end = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  const total = Math.max(120, end + 40);
  const width = total * pps;
  const beatDur = 60 / bpm;
  const barDur = 4 * beatDur;
  const bars = Math.ceil(total / barDur);
  const labelEvery = Math.max(1, Math.ceil(44 / (barDur * pps)));
  const showBeats = beatDur * pps > 14;

  // cursor de reprodução + rolagem automática
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const pos = Math.max(0, engine.getPosition());
      const x = pos * useStudio.getState().pps;
      if (headRef.current) headRef.current.style.transform = `translateX(${headerW.current + x}px)`;
      const sc = scrollRef.current;
      if (sc && engine.playing) {
        const viewW = sc.clientWidth - headerW.current;
        if (x > sc.scrollLeft + viewW - 40 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 80);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Ctrl/Cmd + roda = zoom centrado no mouse
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const s = useStudio.getState();
      const rect = sc.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - headerW.current + sc.scrollLeft;
      const t = mouseX / s.pps;
      const next = Math.min(400, Math.max(6, s.pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      s.set({ pps: next });
      requestAnimationFrame(() => {
        sc.scrollLeft = Math.max(0, t * next - (e.clientX - rect.left - headerW.current));
      });
    };
    sc.addEventListener("wheel", onWheel, { passive: false });
    return () => sc.removeEventListener("wheel", onWheel);
  }, []);

  /** Régua: clique = mover cursor; arrastar = criar região de loop. */
  function onRulerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const toTime = (cx: number) => Math.max(0, (cx - rect.left) / pps);
    const t0 = toTime(e.clientX);
    const snapB = snapBeats || 1;
    let dragging = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - e.clientX) < 5) return;
      dragging = true;
      const a = snapTime(t0, bpm, snapB);
      const b = snapTime(toTime(ev.clientX), bpm, snapB);
      if (Math.abs(b - a) > 0.01) useStudio.getState().set({ loop: { start: Math.min(a, b), end: Math.max(a, b) }, loopOn: true });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      if (!dragging) seek(t0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  async function importFile(file: File) {
    try {
      const buf = await engine.decode(await file.arrayBuffer());
      addBufferToNewTrack(buf, file.name.replace(/\.[^.]+$/, ""));
    } catch {
      notify("Não consegui ler esse arquivo de áudio.");
    }
  }

  const gridBg = showBeats
    ? `repeating-linear-gradient(to right, #2c3242 0 1px, transparent 1px ${barDur * pps}px), repeating-linear-gradient(to right, #1c2029 0 1px, transparent 1px ${beatDur * pps}px)`
    : `repeating-linear-gradient(to right, #2c3242 0 1px, transparent 1px ${barDur * pps}px)`;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void importFile(f);
      }}
    >
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: HEADER_W + width, minHeight: "100%" }}>
          {/* régua */}
          <div className="sticky top-0 z-20 flex" style={{ height: RULER_H }}>
            <div
              className="sticky left-0 z-30 flex shrink-0 items-center justify-between border-b border-r border-studio-line bg-studio-panel px-3 text-[10px] uppercase tracking-wider text-studio-dim"
              style={{ width: HEADER_W }}
            >
              <span className="truncate">{mobile ? `${tracks.length} faixas` : `Playlist · ${tracks.length} faixas`}</span>
            </div>
            <div className="relative cursor-pointer touch-none select-none border-b border-studio-line bg-studio-panel" style={{ width }} onPointerDown={onRulerDown}>
              {loop && (
                <div
                  className={`absolute bottom-0 top-0 border-x ${loopOn ? "border-studio-accent bg-studio-accent/25" : "border-studio-dim bg-white/5"}`}
                  style={{ left: loop.start * pps, width: (loop.end - loop.start) * pps }}
                />
              )}
              {Array.from({ length: bars }, (_, b) => (
                <div key={b} className="absolute top-0 h-full" style={{ left: b * barDur * pps }}>
                  <div className={`h-full border-l ${b % labelEvery === 0 ? "border-studio-dim/60" : "border-studio-line"}`} />
                  {b % labelEvery === 0 && <span className="absolute left-1 top-1 font-mono text-[10px] text-studio-dim">{b + 1}</span>}
                  {showBeats &&
                    [1, 2, 3].map((k) => (
                      <div key={k} className="absolute bottom-0 h-1.5 border-l border-studio-line" style={{ left: k * beatDur * pps }} />
                    ))}
                </div>
              ))}
            </div>
          </div>

          {/* faixas */}
          {tracks.map((t) => (
            <div key={t.id} className="flex" style={{ height: LANE_H }}>
              <div className="sticky left-0 z-10 shrink-0" style={{ width: HEADER_W }}>
                <TrackHeader track={t} compact={mobile} />
              </div>
              <div
                className={`relative border-b border-studio-line ${selectedTrackId === t.id ? "bg-white/[0.035]" : ""} ${tool === "cut" ? "cursor-crosshair" : ""}`}
                style={{ width, backgroundImage: gridBg }}
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget || e.button !== 0) return;
                  select(t.id, null);
                  const r = e.currentTarget.getBoundingClientRect();
                  seek((e.clientX - r.left) / pps);
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
          <div className="sticky left-0 flex max-w-[100vw] flex-wrap gap-2 p-3" style={{ width: HEADER_W + 480 }}>
            <button className="btn" onClick={() => addTrack({ name: "Voz", armed: true, color: "#f43f5e" })}>
              🎤 + Faixa de voz
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              ♫ + Importar áudio
            </button>
            <span className="hidden self-center text-[10px] text-studio-dim md:inline">ou arraste um arquivo de áudio para cá</span>
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
            <div className="pointer-events-none absolute inset-x-0 top-28 space-y-1 text-center text-sm text-studio-dim" style={{ paddingLeft: HEADER_W }}>
              <p>Gere um beat na barra lateral (ou use o beat demo) para começar.</p>
              <p className="text-xs">Depois arme uma faixa de voz e aperte R para gravar.</p>
            </div>
          )}

          {/* cursor */}
          <div ref={headRef} className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-studio-accent" style={{ left: 0 }}>
            <div className="-ml-[6px] h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-studio-accent" />
          </div>
        </div>
      </div>

      {recording && lyrics.trim() && (
        <div className="absolute right-4 top-10 z-30 max-h-[70%] w-72 overflow-auto rounded-lg border border-studio-line bg-black/85 p-3 font-mono text-xs leading-relaxed backdrop-blur">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-studio-rec">● gravando</p>
          <pre className="whitespace-pre-wrap">{lyrics}</pre>
        </div>
      )}
    </div>
  );
}
