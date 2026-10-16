// Desenho da thumbnail no canvas. Tudo em px do formato (ex.: 1280×720),
// então a prévia e o arquivo exportado saem idênticos.

import {
  Background,
  fontFor,
  formatFor,
  ImageLayer,
  Layer,
  Project,
  ShapeLayer,
  TextLayer,
} from "./types";

export type ImageLookup = (src: string) => HTMLImageElement | undefined;

export interface Box {
  w: number;
  h: number;
}

const TAU = Math.PI * 2;

let measureCanvas: HTMLCanvasElement | null = null;
function measureCtx(): CanvasRenderingContext2D {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  return measureCanvas.getContext("2d")!;
}

function supportsLetterSpacing(ctx: CanvasRenderingContext2D) {
  return typeof (ctx as unknown as { letterSpacing?: unknown }).letterSpacing === "string";
}

function supportsFilter(ctx: CanvasRenderingContext2D) {
  return typeof (ctx as unknown as { filter?: unknown }).filter === "string";
}

function setFont(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const f = fontFor(l.font);
  ctx.font = `${f.weight} ${l.size}px "${f.family}", Impact, "Arial Black", sans-serif`;
  if (supportsLetterSpacing(ctx)) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${l.letterSpacing}px`;
  }
}

interface TextInfo {
  lines: string[];
  widths: number[];
  lineH: number;
  maxW: number;
  capH: number;
  padX: number;
  spacing: number;
}

function measureText(l: TextLayer): TextInfo {
  const ctx = measureCtx();
  setFont(ctx, l);
  const spacing = supportsLetterSpacing(ctx) ? l.letterSpacing : 0;
  const lines = (l.uppercase ? l.text.toUpperCase() : l.text).split("\n");
  // A largura medida inclui o espaçamento depois da última letra; tiramos.
  const widths = lines.map((s) => Math.max(0, ctx.measureText(s).width - (s ? spacing : 0)));
  const capH = ctx.measureText("H").actualBoundingBoxAscent || l.size * 0.72;
  return {
    lines,
    widths,
    lineH: l.size * l.lineHeight,
    maxW: Math.max(1, ...widths),
    capH,
    padX: l.box ? l.size * 0.22 : 0,
    spacing,
  };
}

export function layerBox(l: Layer): Box {
  switch (l.kind) {
    case "text": {
      const m = measureText(l);
      const extra = l.strokeWidth * 2;
      const boxPad = l.box ? l.size * 0.16 : 0;
      return {
        w: m.maxW + m.padX * 2 + extra,
        h: m.lines.length * m.lineH + extra + boxPad,
      };
    }
    case "image":
      return {
        w: l.naturalW * l.scale + l.outlineWidth * 2,
        h: l.naturalH * l.scale + l.outlineWidth * 2,
      };
    case "shape":
      return { w: l.w, h: l.h };
  }
}

/** Caixa alinhada aos eixos (já com rotação), em px do formato. */
export function worldBounds(l: Layer) {
  const b = layerBox(l);
  const a = (l.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const hw = (b.w * c + b.h * s) / 2;
  const hh = (b.w * s + b.h * c) / 2;
  return { left: l.x - hw, right: l.x + hw, top: l.y - hh, bottom: l.y + hh };
}

export function toLocal(l: Layer, px: number, py: number) {
  const dx = px - l.x;
  const dy = py - l.y;
  const a = (-l.rotation * Math.PI) / 180;
  return {
    x: dx * Math.cos(a) - dy * Math.sin(a),
    y: dx * Math.sin(a) + dy * Math.cos(a),
  };
}

export function hitLayer(p: Project, px: number, py: number): Layer | null {
  for (let i = p.layers.length - 1; i >= 0; i--) {
    const l = p.layers[i];
    if (!l.visible) continue;
    const b = layerBox(l);
    const pt = toLocal(l, px, py);
    if (Math.abs(pt.x) <= b.w / 2 && Math.abs(pt.y) <= b.h / 2) return l;
  }
  return null;
}

const SEL_PAD = 6;

export function hitHandle(l: Layer, px: number, py: number, ui: number) {
  const b = layerBox(l);
  const pt = toLocal(l, px, py);
  const hx = b.w / 2 + SEL_PAD * ui;
  const hy = b.h / 2 + SEL_PAD * ui;
  return Math.hypot(pt.x - hx, pt.y - hy) <= 16 * ui;
}

/** Zona onde o YouTube cobre a miniatura com a duração do vídeo. */
export function timestampZone(w: number, h: number) {
  return { left: w * 0.8, top: h * 0.84, right: w, bottom: h };
}

// ---------- fundo ----------

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bg: Background,
  W: number,
  H: number,
  getImage: ImageLookup
) {
  if (bg.gradient) {
    const a = (bg.angle * Math.PI) / 180;
    const r = Math.abs((W / 2) * Math.cos(a)) + Math.abs((H / 2) * Math.sin(a));
    const g = ctx.createLinearGradient(
      W / 2 - Math.cos(a) * r,
      H / 2 - Math.sin(a) * r,
      W / 2 + Math.cos(a) * r,
      H / 2 + Math.sin(a) * r
    );
    g.addColorStop(0, bg.color1);
    g.addColorStop(1, bg.color2);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg.color1;
  }
  ctx.fillRect(0, 0, W, H);

  const img = bg.image ? getImage(bg.image) : undefined;
  if (img && img.naturalWidth) {
    const blurOn = bg.blur > 0 && supportsFilter(ctx);
    // Com desfoque a borda fica transparente; ampliamos um pouco para esconder.
    const grow = blurOn ? 1 + (bg.blur * 4) / Math.min(W, H) : 1;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * bg.imageZoom * grow;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.save();
    if (blurOn) ctx.filter = `blur(${bg.blur}px)`;
    ctx.drawImage(img, (W - dw) * bg.imageX, (H - dh) * bg.imageY, dw, dh);
    ctx.restore();
  }

  if (bg.darken > 0) {
    ctx.fillStyle = `rgba(0,0,0,${bg.darken / 100})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (bg.vignette > 0) {
    const g = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.3,
      W / 2,
      H / 2,
      Math.hypot(W, H) / 2
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${bg.vignette / 100})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- sombra ----------

function applyShadow(ctx: CanvasRenderingContext2D, l: Layer) {
  if (l.shadowBlur <= 0 && l.shadowDistance <= 0) return;
  ctx.shadowColor = l.shadowColor;
  ctx.shadowBlur = l.shadowBlur;
  ctx.shadowOffsetX = l.shadowDistance * 0.5;
  ctx.shadowOffsetY = l.shadowDistance;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ---------- texto ----------

function drawText(ctx: CanvasRenderingContext2D, l: TextLayer) {
  const m = measureText(l);
  setFont(ctx, l);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = l.align;
  const totalH = m.lines.length * m.lineH;
  const anchorX = l.align === "left" ? -m.maxW / 2 : l.align === "right" ? m.maxW / 2 : 0;
  // Compensa o espaçamento extra que o canvas põe depois da última letra.
  const shiftX = l.align === "center" ? m.spacing / 2 : l.align === "right" ? m.spacing : 0;

  const lineCenter = (i: number) => -totalH / 2 + m.lineH * (i + 0.5);

  if (l.box) {
    ctx.save();
    applyShadow(ctx, l);
    ctx.fillStyle = l.boxColor;
    const bh = m.capH + l.size * 0.34;
    m.lines.forEach((line, i) => {
      if (!line.trim()) return;
      const w = m.widths[i] + m.padX * 2;
      const left =
        l.align === "left"
          ? -m.maxW / 2 - m.padX
          : l.align === "right"
            ? m.maxW / 2 + m.padX - w
            : -w / 2;
      ctx.fillRect(left, lineCenter(i) - bh / 2, w, bh);
    });
    ctx.restore();
  }

  m.lines.forEach((line, i) => {
    if (!line) return;
    const baseline = lineCenter(i) + m.capH / 2;
    const x = anchorX + shiftX;
    let fill: string | CanvasGradient = l.color;
    if (l.gradient) {
      const g = ctx.createLinearGradient(0, baseline - m.capH, 0, baseline);
      g.addColorStop(0, l.color);
      g.addColorStop(1, l.color2);
      fill = g;
    }
    if (l.strokeWidth > 0) {
      ctx.save();
      if (!l.box) applyShadow(ctx, l);
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = l.strokeWidth * 2;
      ctx.strokeStyle = l.strokeColor;
      ctx.strokeText(line, x, baseline);
      ctx.restore();
      ctx.fillStyle = fill;
      ctx.fillText(line, x, baseline);
    } else {
      ctx.save();
      if (!l.box) applyShadow(ctx, l);
      ctx.fillStyle = fill;
      ctx.fillText(line, x, baseline);
      ctx.restore();
    }
  });
}

// ---------- imagem (com contorno de adesivo) ----------

const silhouettes = new Map<string, HTMLCanvasElement>();
let scratch: HTMLCanvasElement | null = null;

function silhouette(img: HTMLImageElement, src: string, color: string) {
  const key = color + "|" + src.length + "|" + src.slice(-64);
  let c = silhouettes.get(key);
  if (c) return c;
  if (silhouettes.size > 24) silhouettes.clear();
  c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  silhouettes.set(key, c);
  return c;
}

function drawImageLayer(ctx: CanvasRenderingContext2D, l: ImageLayer, getImage: ImageLookup) {
  const img = getImage(l.src);
  if (!img || !img.naturalWidth) return;
  const w = l.naturalW * l.scale;
  const h = l.naturalH * l.scale;
  ctx.save();
  if (l.flipX) ctx.scale(-1, 1);
  if (l.outlineWidth > 0) {
    const pad = Math.ceil(l.outlineWidth) + 2;
    const cw = Math.ceil(w) + pad * 2;
    const ch = Math.ceil(h) + pad * 2;
    if (!scratch) scratch = document.createElement("canvas");
    scratch.width = cw;
    scratch.height = ch;
    const o = scratch.getContext("2d")!;
    const sil = silhouette(img, l.src, l.outlineColor);
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      o.drawImage(sil, pad + Math.cos(a) * l.outlineWidth, pad + Math.sin(a) * l.outlineWidth, w, h);
    }
    o.drawImage(sil, pad, pad, w, h);
    o.drawImage(img, pad, pad, w, h);
    applyShadow(ctx, l);
    ctx.drawImage(scratch, -cw / 2, -ch / 2);
  } else {
    applyShadow(ctx, l);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

// ---------- formas ----------

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function paint(ctx: CanvasRenderingContext2D, l: ShapeLayer, filled: boolean) {
  ctx.lineJoin = "round";
  if (filled) {
    if (l.outlineWidth > 0) {
      ctx.save();
      applyShadow(ctx, l);
      ctx.lineWidth = l.outlineWidth * 2;
      ctx.strokeStyle = l.outlineColor;
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = l.color;
      ctx.fill();
    } else {
      ctx.save();
      applyShadow(ctx, l);
      ctx.fillStyle = l.color;
      ctx.fill();
      ctx.restore();
    }
  } else {
    if (l.outlineWidth > 0) {
      ctx.save();
      applyShadow(ctx, l);
      ctx.lineWidth = l.thickness + l.outlineWidth * 2;
      ctx.strokeStyle = l.outlineColor;
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = l.thickness;
      ctx.strokeStyle = l.color;
      ctx.stroke();
    } else {
      ctx.save();
      applyShadow(ctx, l);
      ctx.lineWidth = l.thickness;
      ctx.strokeStyle = l.color;
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawShape(ctx: CanvasRenderingContext2D, l: ShapeLayer) {
  const { w, h } = l;
  switch (l.shape) {
    case "arrow": {
      const head = Math.min(w * 0.5, h * 1.05);
      const shaft = h * 0.4;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -shaft / 2);
      ctx.lineTo(w / 2 - head, -shaft / 2);
      ctx.lineTo(w / 2 - head, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w / 2 - head, h / 2);
      ctx.lineTo(w / 2 - head, shaft / 2);
      ctx.lineTo(-w / 2, shaft / 2);
      ctx.closePath();
      paint(ctx, l, true);
      break;
    }
    case "circle": {
      const inset = l.filled ? l.outlineWidth : l.thickness / 2 + l.outlineWidth;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, w / 2 - inset), Math.max(1, h / 2 - inset), 0, 0, TAU);
      paint(ctx, l, l.filled);
      break;
    }
    case "rect": {
      const inset = l.filled ? l.outlineWidth : l.thickness / 2 + l.outlineWidth;
      roundRectPath(ctx, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, l.radius);
      paint(ctx, l, l.filled);
      break;
    }
    case "disc": {
      // Disco de vinil: sulcos, brilho e selo central na cor escolhida.
      const r = Math.min(w, h) / 2;
      ctx.save();
      applyShadow(ctx, l);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fillStyle = "#0d0c0f";
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.clip();
      ctx.lineWidth = Math.max(1, r * 0.004);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      for (let rr = r * 0.4; rr < r * 0.97; rr += Math.max(3, r * 0.022)) {
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, TAU);
        ctx.stroke();
      }
      const sheen = ctx.createLinearGradient(-r, -r, r, r);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.42, "rgba(255,255,255,0.13)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0)");
      sheen.addColorStop(0.62, "rgba(255,255,255,0.08)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.34, 0, TAU);
      ctx.fillStyle = l.color;
      ctx.fill();
      ctx.lineWidth = r * 0.012;
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.035, 0, TAU);
      ctx.fillStyle = "#0d0c0f";
      ctx.fill();
      break;
    }
  }
}

// ---------- cena ----------

/** Desenha a thumbnail limpa (sem seleção), exatamente como será exportada. */
export function renderScene(ctx: CanvasRenderingContext2D, p: Project, getImage: ImageLookup) {
  const f = formatFor(p.formatId);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  clearShadow(ctx);
  ctx.clearRect(0, 0, f.w, f.h);
  drawBackground(ctx, p.background, f.w, f.h, getImage);
  for (const l of p.layers) {
    if (!l.visible) continue;
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.globalAlpha = l.opacity;
    if (l.kind === "text") drawText(ctx, l);
    else if (l.kind === "image") drawImageLayer(ctx, l, getImage);
    else drawShape(ctx, l);
    ctx.restore();
  }
  ctx.restore();
}

export interface OverlayOptions {
  selectedId: string | null;
  ui: number; // px do formato por px de tela
  guideV: boolean;
  guideH: boolean;
  safeZone: boolean;
  accent: string;
}

/** Desenha só na tela: seleção, guias de centro e zona do tempo do vídeo. */
export function renderOverlay(ctx: CanvasRenderingContext2D, p: Project, o: OverlayOptions) {
  const f = formatFor(p.formatId);
  const u = o.ui;
  ctx.save();
  if (o.safeZone && p.formatId === "youtube") {
    const z = timestampZone(f.w, f.h);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(z.left, z.top, z.right - z.left, z.bottom - z.top);
    ctx.font = `600 ${Math.min(13 * u, (z.right - z.left) / 9)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("duração do vídeo", (z.left + z.right) / 2, (z.top + z.bottom) / 2);
  }
  ctx.strokeStyle = o.accent;
  ctx.lineWidth = 1.5 * u;
  if (o.guideV) {
    ctx.beginPath();
    ctx.moveTo(f.w / 2, 0);
    ctx.lineTo(f.w / 2, f.h);
    ctx.stroke();
  }
  if (o.guideH) {
    ctx.beginPath();
    ctx.moveTo(0, f.h / 2);
    ctx.lineTo(f.w, f.h / 2);
    ctx.stroke();
  }
  const sel = p.layers.find((l) => l.id === o.selectedId);
  if (sel && sel.visible) {
    const b = layerBox(sel);
    const pad = SEL_PAD * u;
    ctx.translate(sel.x, sel.y);
    ctx.rotate((sel.rotation * Math.PI) / 180);
    ctx.setLineDash([7 * u, 5 * u]);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3 * u;
    ctx.strokeRect(-b.w / 2 - pad, -b.h / 2 - pad, b.w + pad * 2, b.h + pad * 2);
    ctx.strokeStyle = o.accent;
    ctx.lineWidth = 1.5 * u;
    ctx.strokeRect(-b.w / 2 - pad, -b.h / 2 - pad, b.w + pad * 2, b.h + pad * 2);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(b.w / 2 + pad, b.h / 2 + pad, 8 * u, 0, TAU);
    ctx.fillStyle = o.accent;
    ctx.fill();
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  }
  ctx.restore();
}
