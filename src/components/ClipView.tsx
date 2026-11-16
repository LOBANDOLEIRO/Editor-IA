"use client";
import { useEffect, useRef } from "react";
import { PEAKS_PER_SEC, getPeaks } from "@/lib/audio/buffers";
import { useStudio } from "@/lib/store";
import type { Clip } from "@/lib/types";

const MAX_CANVAS = 8000;

export default function ClipView({ clip, color, laneH }: { clip: Clip; color: string; laneH: number }) {
  const { pps, bpm, snap, select, selectedClipId, updateClip } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selected = selectedClipId === clip.id;
  const w = Math.max(4, clip.duration * pps);
  const h = laneH - 10;

  useEffect(() => {
    const cv = canvasRef.current;
    const peaks = getPeaks(clip.bufferId);
    if (!cv || !peaks) return;
    const cw = Math.min(MAX_CANVAS, Math.ceil(w));
    const ch = h - 16;
    cv.width = cw;
    cv.height = ch;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = color;
    const first = clip.offset * PEAKS_PER_SEC;
    const count = clip.duration * PEAKS_PER_SEC;
    const mid = ch / 2;
    for (let x = 0; x < cw; x++) {
      const a = Math.floor(first + (x / cw) * count);
      const b = Math.max(a + 1, Math.floor(first + ((x + 1) / cw) * count));
      let lo = 0;
      let hi = 0;
      for (let i = a; i < b && i * 2 + 1 < peaks.length; i++) {
        if (peaks[i * 2] < lo) lo = peaks[i * 2];
        if (peaks[i * 2 + 1] > hi) hi = peaks[i * 2 + 1];
      }
      const y1 = mid - hi * mid;
      const y2 = mid - lo * mid;
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [clip.bufferId, clip.offset, clip.duration, w, h, color]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    const s = useStudio.getState();
    select(clip.trackId, clip.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const origStart = clip.start;
    const trackIds = s.tracks.map((t) => t.id);
    const origIdx = trackIds.indexOf(clip.trackId);
    const beat = 60 / bpm;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let moved = false;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;
      let start = Math.max(0, origStart + dx / pps);
      if (snap && !ev.altKey) start = Math.round(start / (beat / 2)) * (beat / 2);
      const idx = Math.min(trackIds.length - 1, Math.max(0, origIdx + Math.round(dy / laneH)));
      updateClip(clip.id, { start, trackId: trackIds[idx] });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  return (
    <div
      className={`absolute top-[5px] cursor-grab overflow-hidden rounded-md border active:cursor-grabbing ${selected ? "border-white" : "border-black/40"}`}
      style={{ left: clip.start * pps, width: w, height: h, background: `${color}26` }}
      onPointerDown={onPointerDown}
      title="Arraste para mover · Alt = sem grade · S divide no cursor · Delete apaga"
    >
      <div className="flex h-4 items-center gap-1 truncate px-1.5 text-[10px] font-semibold" style={{ background: `${color}55` }}>
        {clip.tuned && <span title="Afinação corrigida">♪</span>}
        {clip.name}
      </div>
      <canvas ref={canvasRef} className="block" style={{ width: w, height: h - 16 }} />
    </div>
  );
}
