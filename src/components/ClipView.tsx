"use client";
import { useEffect, useRef } from "react";
import { PEAKS_PER_SEC, getBuffer, getPeaks } from "@/lib/audio/buffers";
import { snapTime, useStudio } from "@/lib/store";
import type { Clip } from "@/lib/types";

const MAX_CANVAS = 8000;
const EDGE = 7; // px de área para aparar
const HEAD = 16; // altura da barra de título

type Mode = "move" | "trimL" | "trimR" | "fadeIn" | "fadeOut";

export default function ClipView({ clip, color, laneH }: { clip: Clip; color: string; laneH: number }) {
  const { pps, select, selectedClipId, tool } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selected = selectedClipId === clip.id;
  const w = Math.max(4, clip.duration * pps);
  const h = laneH - 8;

  useEffect(() => {
    const cv = canvasRef.current;
    const peaks = getPeaks(clip.bufferId);
    if (!cv || !peaks) return;
    const cw = Math.min(MAX_CANVAS, Math.ceil(w));
    const ch = h - HEAD;
    cv.width = cw;
    cv.height = ch;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = color;
    const first = clip.offset * PEAKS_PER_SEC;
    const count = clip.duration * PEAKS_PER_SEC;
    const mid = ch / 2;
    const gain = Math.min(4, clip.gain);
    for (let x = 0; x < cw; x++) {
      const a = Math.floor(first + (x / cw) * count);
      const b = Math.max(a + 1, Math.floor(first + ((x + 1) / cw) * count));
      let lo = 0;
      let hi = 0;
      for (let i = a; i < b && i * 2 + 1 < peaks.length; i++) {
        if (peaks[i * 2] < lo) lo = peaks[i * 2];
        if (peaks[i * 2 + 1] > hi) hi = peaks[i * 2 + 1];
      }
      const y1 = mid - Math.min(1, hi * gain) * mid;
      const y2 = mid - Math.max(-1, lo * gain) * mid;
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [clip.bufferId, clip.offset, clip.duration, clip.gain, w, h, color]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = useStudio.getState();
    select(clip.trackId, clip.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // tesoura
    if (s.tool === "cut") {
      const at = snapTime(clip.start + localX / s.pps, s.bpm, e.altKey ? 0 : s.snapBeats);
      s.splitClip(clip.id, at);
      return;
    }

    const fadeInX = clip.fadeIn * s.pps;
    const fadeOutX = w - clip.fadeOut * s.pps;
    let mode: Mode = "move";
    if (localY < HEAD && Math.abs(localX - Math.max(6, fadeInX)) < 7) mode = "fadeIn";
    else if (localY < HEAD && Math.abs(localX - Math.min(w - 6, fadeOutX)) < 7) mode = "fadeOut";
    else if (localX < EDGE) mode = "trimL";
    else if (localX > w - EDGE) mode = "trimR";

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...clip };
    const bufDur = getBuffer(clip.bufferId)?.duration ?? clip.offset + clip.duration;
    const trackIds = s.tracks.map((t) => t.id);
    const origIdx = trackIds.indexOf(clip.trackId);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let moved = false;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      if (!moved) s.checkpoint();
      moved = true;
      const st = useStudio.getState();
      const snapB = ev.altKey ? 0 : st.snapBeats;
      const dt = dx / st.pps;
      if (mode === "move") {
        const start = Math.max(0, snapTime(orig.start + dt, st.bpm, snapB));
        const idx = Math.min(trackIds.length - 1, Math.max(0, origIdx + Math.round(dy / laneH)));
        st.updateClip(clip.id, { start, trackId: trackIds[idx] });
      } else if (mode === "trimL") {
        let start = snapTime(orig.start + dt, st.bpm, snapB);
        start = Math.max(orig.start - orig.offset, Math.min(orig.start + orig.duration - 0.05, start), 0);
        const d = start - orig.start;
        st.updateClip(clip.id, { start, offset: orig.offset + d, duration: orig.duration - d, fadeIn: Math.min(orig.fadeIn, orig.duration - d) });
      } else if (mode === "trimR") {
        let endT = snapTime(orig.start + orig.duration + dt, st.bpm, snapB);
        endT = Math.min(orig.start + (bufDur - orig.offset), Math.max(orig.start + 0.05, endT));
        const duration = endT - orig.start;
        st.updateClip(clip.id, { duration, fadeOut: Math.min(orig.fadeOut, duration) });
      } else if (mode === "fadeIn") {
        st.updateClip(clip.id, { fadeIn: Math.max(0, Math.min(orig.duration - orig.fadeOut, orig.fadeIn + dt)) });
      } else if (mode === "fadeOut") {
        st.updateClip(clip.id, { fadeOut: Math.max(0, Math.min(orig.duration - orig.fadeIn, orig.fadeOut - dt)) });
      }
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (tool === "cut") {
      e.currentTarget.style.cursor = "crosshair";
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const fi = Math.max(6, clip.fadeIn * pps);
    const fo = Math.min(w - 6, w - clip.fadeOut * pps);
    e.currentTarget.style.cursor =
      y < HEAD && (Math.abs(x - fi) < 7 || Math.abs(x - fo) < 7) ? "ew-resize" : x < EDGE || x > w - EDGE ? "col-resize" : "grab";
  }

  const fiW = clip.fadeIn * pps;
  const foW = clip.fadeOut * pps;

  return (
    <div
      className={`absolute top-[4px] select-none overflow-hidden rounded-md border ${selected ? "border-white shadow-[0_0_0_1px_white]" : "border-black/50"}`}
      style={{ left: clip.start * pps, width: w, height: h, background: `${color}22` }}
      onPointerDown={onPointerDown}
      onMouseMove={onMouseMove}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        select(clip.trackId, clip.id);
        useStudio.getState().set({ menu: { x: e.clientX, y: e.clientY, clipId: clip.id, at: clip.start + (e.clientX - r.left) / pps } });
      }}
    >
      <div className="flex items-center gap-1 truncate px-1.5 text-[10px] font-semibold text-white" style={{ height: HEAD, background: `${color}66` }}>
        {clip.tuned && <span title="Afinação corrigida">♪</span>}
        {clip.name}
        {Math.abs(clip.gain - 1) > 0.01 && <span className="font-mono opacity-70">{(20 * Math.log10(clip.gain)).toFixed(1)}dB</span>}
      </div>
      <canvas ref={canvasRef} className="pointer-events-none block" style={{ width: w, height: h - HEAD }} />
      {/* fades */}
      <svg className="pointer-events-none absolute left-0 top-0" width={w} height={h}>
        {fiW > 0 && <polygon points={`0,${HEAD} ${fiW},${HEAD} 0,${h}`} fill="rgba(0,0,0,0.45)" />}
        {foW > 0 && <polygon points={`${w - foW},${HEAD} ${w},${HEAD} ${w},${h}`} fill="rgba(0,0,0,0.45)" />}
        {fiW > 0 && <line x1={0} y1={h} x2={fiW} y2={HEAD} stroke="white" strokeOpacity={0.6} />}
        {foW > 0 && <line x1={w - foW} y1={HEAD} x2={w} y2={h} stroke="white" strokeOpacity={0.6} />}
      </svg>
      {selected && tool === "select" && w > 30 && (
        <>
          <div className="pointer-events-none absolute top-[3px] h-2.5 w-2.5 rounded-sm border border-black bg-white" style={{ left: Math.max(1, fiW - 5) }} />
          <div className="pointer-events-none absolute top-[3px] h-2.5 w-2.5 rounded-sm border border-black bg-white" style={{ left: Math.min(w - 11, w - foW - 5) }} />
          <div className="pointer-events-none absolute bottom-1 left-0 top-5 w-1 rounded-r bg-white/60" />
          <div className="pointer-events-none absolute bottom-1 right-0 top-5 w-1 rounded-l bg-white/60" />
        </>
      )}
    </div>
  );
}
