"use client";
import { useEffect, useRef, useState } from "react";
import { engine } from "@/lib/audio/engine";
import type { NoteEdit } from "@/lib/dsp/pitch";
import { midiToName } from "@/lib/music";

const GUTTER = 36;

type Props = {
  detected: Float32Array;
  output: Float32Array | null;
  frameDur: number;
  frameOffset: number;
  /** trecho do buffer mostrado (s) */
  range: [number, number];
  /** posição da timeline correspondente a range[0] */
  timelineStart: number;
  root: number;
  steps: number[];
  notes?: NoteEdit[];
  selectedId?: number | null;
  fine?: boolean;
  onSelect?: (id: number | null) => void;
  onNoteTarget?: (id: number, target: number) => void;
  onCommit?: () => void;
  onSeek?: (bufferTime: number) => void;
};

/** Piano roll de afinação: curva cantada, curva corrigida e (opcional) blocos de nota arrastáveis. */
export default function PitchEditor(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<[number, number]>(p.range);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const props = useRef(p);
  props.current = p;
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => setView(p.range), [p.range[0], p.range[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // faixa de notas visível (fixa por trecho, para os blocos não "pularem" ao arrastar)
  const [lo, hi] = (() => {
    let a = Infinity;
    let b = -Infinity;
    const i0 = Math.max(0, Math.floor((p.range[0] - p.frameOffset) / p.frameDur));
    const i1 = Math.min(p.detected.length, Math.ceil((p.range[1] - p.frameOffset) / p.frameDur));
    for (let i = i0; i < i1; i++) {
      const m = p.detected[i];
      if (Number.isNaN(m)) continue;
      if (m < a) a = m;
      if (m > b) b = m;
    }
    if (!Number.isFinite(a)) return [48, 72];
    return [Math.floor(a) - 5, Math.ceil(b) + 5];
  })();

  const geo = useRef({ lo, hi, w: 0, h: 0 });
  geo.current = { lo, hi, w: size.w, h: size.h };
  const xOf = (t: number) => GUTTER + ((t - viewRef.current[0]) / (viewRef.current[1] - viewRef.current[0])) * (geo.current.w - GUTTER);
  const tOf = (x: number) => viewRef.current[0] + ((x - GUTTER) / (geo.current.w - GUTTER)) * (viewRef.current[1] - viewRef.current[0]);
  const yOf = (m: number) => geo.current.h - ((m - geo.current.lo) / (geo.current.hi - geo.current.lo)) * geo.current.h;
  const semiPx = () => geo.current.h / (geo.current.hi - geo.current.lo);
  const tFrame = (i: number) => props.current.frameOffset + i * props.current.frameDur;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ro = new ResizeObserver(() => {
      const r = cv.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  // desenho
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);
    const { w: W, h: H } = size;
    g.fillStyle = "#0d0f14";
    g.fillRect(0, 0, W, H);

    g.font = "10px monospace";
    const rowH = semiPx();
    for (let n = lo; n <= hi; n++) {
      const inScale = p.steps.includes((((n - p.root) % 12) + 12) % 12);
      g.fillStyle = inScale ? "rgba(255,122,26,0.09)" : "rgba(255,255,255,0.015)";
      g.fillRect(GUTTER, yOf(n + 0.5), W - GUTTER, rowH);
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(GUTTER, yOf(n + 0.5), W - GUTTER, 1);
      if (rowH >= 9 || n % 2 === 0) {
        g.fillStyle = inScale ? "#e6e8ee" : "#4b5263";
        g.fillText(midiToName(n), 3, yOf(n) + 3);
      }
    }

    g.save();
    g.beginPath();
    g.rect(GUTTER, 0, W - GUTTER, H);
    g.clip();

    // blocos de nota
    if (p.notes) {
      for (const n of p.notes) {
        const x1 = xOf(tFrame(n.start));
        const x2 = xOf(tFrame(n.end));
        if (x2 < GUTTER || x1 > W) continue;
        const sel = n.id === p.selectedId;
        const moved = Math.abs(n.target - n.center) > 0.05 || n.flatten > 0;
        // sombra da nota original
        if (Math.abs(n.target - n.center) > 0.3) {
          g.fillStyle = "rgba(139,146,165,0.18)";
          g.fillRect(x1, yOf(n.center + 0.5), Math.max(2, x2 - x1), rowH);
        }
        g.fillStyle = sel ? "rgba(255,122,26,0.75)" : moved ? "rgba(255,122,26,0.42)" : "rgba(96,165,250,0.35)";
        const y = yOf(n.target + 0.5);
        g.beginPath();
        g.roundRect(x1, y + 1, Math.max(3, x2 - x1 - 1), Math.max(3, rowH - 2), 4);
        g.fill();
        if (sel) {
          g.strokeStyle = "#fff";
          g.lineWidth = 1.5;
          g.stroke();
        }
      }
    }

    const line = (arr: Float32Array, color: string, width: number) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      let pen = false;
      const i0 = Math.max(0, Math.floor((view[0] - p.frameOffset) / p.frameDur) - 1);
      const i1 = Math.min(arr.length, Math.ceil((view[1] - p.frameOffset) / p.frameDur) + 1);
      for (let i = i0; i < i1; i++) {
        const m = arr[i];
        if (Number.isNaN(m)) {
          pen = false;
          continue;
        }
        if (!pen) g.moveTo(xOf(tFrame(i)), yOf(m));
        else g.lineTo(xOf(tFrame(i)), yOf(m));
        pen = true;
      }
      g.stroke();
    };
    line(p.detected, "rgba(160,167,185,0.75)", 1.25);
    if (p.output) line(p.output, "#ff7a1a", 2);
    g.restore();
  }, [p.detected, p.output, p.notes, p.selectedId, p.root, p.steps, p.frameDur, p.frameOffset, view, size, lo, hi]); // eslint-disable-line react-hooks/exhaustive-deps

  // cursor de reprodução
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = headRef.current;
      if (el) {
        const t = engine.getPosition() - props.current.timelineStart + props.current.range[0];
        const x = xOf(t);
        const visible = x >= GUTTER && x <= geo.current.w;
        el.style.display = visible ? "block" : "none";
        if (visible) el.style.transform = `translateX(${x}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clampView(a: number, b: number): [number, number] {
    const [r0, r1] = props.current.range;
    const full = r1 - r0;
    const span = Math.min(full, Math.max(0.25, b - a));
    let s = a;
    if (s < r0) s = r0;
    if (s + span > r1) s = r1 - span;
    return [s, s + span];
  }
  function zoom(factor: number, atT?: number) {
    const [a, b] = viewRef.current;
    const c = atT ?? (a + b) / 2;
    setView(clampView(c - (c - a) * factor, c + (b - c) * factor));
  }

  // roda do mouse = zoom
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const dt = (e.deltaX / (geo.current.w - GUTTER)) * (viewRef.current[1] - viewRef.current[0]);
        setView(clampView(viewRef.current[0] + dt, viewRef.current[1] + dt));
      } else zoom(e.deltaY < 0 ? 0.85 : 1 / 0.85, tOf(e.clientX - r.left));
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ponteiros: arrastar nota, arrastar fundo (mover a vista), pinça (zoom)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<
    | { kind: "note"; id: number; y0: number; target0: number; moved: boolean }
    | { kind: "pan"; x0: number; view0: [number, number]; moved: boolean }
    | { kind: "pinch"; dist0: number; view0: [number, number]; center: number }
    | null
  >(null);

  function hitNote(x: number, y: number, pad: number) {
    const notes = props.current.notes;
    if (!notes) return null;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const x1 = xOf(tFrame(n.start));
      const x2 = xOf(tFrame(n.end));
      const y1 = yOf(n.target + 0.5);
      if (x >= x1 - pad && x <= x2 + pad && y >= y1 - pad && y <= y1 + semiPx() + pad) return n;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x, y });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { kind: "pinch", dist0: Math.max(10, Math.abs(a.x - b.x)), view0: viewRef.current, center: tOf((a.x + b.x) / 2) };
      return;
    }
    const n = hitNote(x, y, e.pointerType === "touch" ? 8 : 2);
    if (n) {
      props.current.onSelect?.(n.id);
      drag.current = { kind: "note", id: n.id, y0: y, target0: n.target, moved: false };
    } else {
      drag.current = { kind: "pan", x0: x, view0: viewRef.current, moved: false };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x, y });
    const d = drag.current;
    if (!d) {
      e.currentTarget.style.cursor = hitNote(x, y, 2) ? "ns-resize" : "grab";
      return;
    }
    if (d.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const f = d.dist0 / Math.max(10, Math.abs(a.x - b.x));
      const [v0, v1] = d.view0;
      setView(clampView(d.center - (d.center - v0) * f, d.center + (v1 - d.center) * f));
    } else if (d.kind === "note") {
      if (!d.moved && Math.abs(y - d.y0) < 4) return;
      d.moved = true;
      let target = d.target0 - (y - d.y0) / semiPx();
      if (!(props.current.fine || e.altKey)) target = Math.round(target);
      target = Math.max(geo.current.lo, Math.min(geo.current.hi, target));
      props.current.onNoteTarget?.(d.id, target);
    } else if (d.kind === "pan") {
      if (!d.moved && Math.abs(x - d.x0) < 4) return;
      d.moved = true;
      const dt = ((d.x0 - x) / (geo.current.w - GUTTER)) * (d.view0[1] - d.view0[0]);
      setView(clampView(d.view0[0] + dt, d.view0[1] + dt));
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.kind === "pinch") {
      if (pointers.current.size < 2) drag.current = null;
      return;
    }
    drag.current = null;
    if (!d) return;
    if (d.kind === "note") {
      if (d.moved) props.current.onCommit?.();
      else {
        const n = props.current.notes?.find((k) => k.id === d.id);
        if (n) props.current.onSeek?.(tFrame(n.start));
      }
    } else if (d.kind === "pan" && !d.moved && x > GUTTER) {
      props.current.onSelect?.(null);
      props.current.onSeek?.(tOf(x));
    }
  }

  const zoomed = view[1] - view[0] < p.range[1] - p.range[0] - 0.01;

  return (
    <div className="relative min-h-[150px] w-full flex-1 overflow-hidden rounded-md border border-studio-line">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div ref={headRef} className="pointer-events-none absolute bottom-0 left-0 top-0 hidden w-px bg-white/80" />
      <div className="absolute right-1.5 top-1.5 flex gap-1">
        <button className="btn h-7 w-7 bg-black/60 p-0" title="Menos zoom" onClick={() => zoom(1.5)}>
          −
        </button>
        <button className="btn h-7 w-7 bg-black/60 p-0" title="Mais zoom" onClick={() => zoom(1 / 1.5)}>
          +
        </button>
        {zoomed && (
          <button className="btn h-7 bg-black/60 px-2 py-0" title="Ver o clip inteiro" onClick={() => setView(p.range)}>
            tudo
          </button>
        )}
      </div>
    </div>
  );
}
