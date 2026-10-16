// Modelos prontos e funções para criar camadas.

import {
  Background,
  FormatId,
  formatFor,
  ImageLayer,
  Layer,
  Project,
  ShapeLayer,
  TextLayer,
} from "./types";

let counter = 0;
export function uid() {
  counter += 1;
  return Math.random().toString(36).slice(2, 8) + counter.toString(36);
}

function base(name: string, x: number, y: number) {
  return {
    id: uid(),
    name,
    x,
    y,
    rotation: 0,
    opacity: 1,
    visible: true,
    shadowBlur: 0,
    shadowDistance: 0,
    shadowColor: "#000000",
  };
}

export function makeText(p: Partial<TextLayer> = {}): TextLayer {
  return {
    ...base("Texto", 640, 360),
    kind: "text",
    text: "SEU TEXTO",
    font: "Anton",
    size: 120,
    color: "#ffffff",
    gradient: false,
    color2: "#ffb300",
    strokeWidth: 0,
    strokeColor: "#000000",
    align: "center",
    uppercase: true,
    lineHeight: 1,
    letterSpacing: 0,
    box: false,
    boxColor: "#ffe600",
    ...p,
  };
}

export function makeShape(p: Partial<ShapeLayer> & Pick<ShapeLayer, "shape">): ShapeLayer {
  const names = { arrow: "Seta", circle: "Círculo", rect: "Caixa", disc: "Disco" } as const;
  return {
    ...base(names[p.shape], 640, 360),
    kind: "shape",
    w: 300,
    h: 300,
    color: "#ff2b2b",
    filled: false,
    thickness: 18,
    outlineWidth: 0,
    outlineColor: "#ffffff",
    radius: 24,
    ...p,
  };
}

export function makeImage(
  p: Pick<ImageLayer, "src" | "naturalW" | "naturalH"> & Partial<ImageLayer>
): ImageLayer {
  return {
    ...base("Imagem", 640, 360),
    kind: "image",
    scale: 1,
    flipX: false,
    outlineWidth: 0,
    outlineColor: "#ffffff",
    ...p,
  };
}

export function makeBackground(p: Partial<Background> = {}): Background {
  return {
    color1: "#1b1b1f",
    color2: "#000000",
    gradient: true,
    angle: 120,
    image: null,
    imageZoom: 1,
    imageX: 0.5,
    imageY: 0.5,
    blur: 0,
    darken: 0,
    vignette: 35,
    ...p,
  };
}

export interface Template {
  id: string;
  name: string;
  build: () => { background: Background; layers: Layer[] };
}

// Todos os modelos são desenhados em 1280×720 e adaptados a outros formatos.
export const TEMPLATES: Template[] = [
  {
    id: "album",
    name: "Análise de álbum",
    build: () => ({
      background: makeBackground({ color1: "#3a2216", color2: "#0b0806", angle: 140, vignette: 55 }),
      layers: [
        makeShape({ shape: "disc", x: 960, y: 380, w: 620, h: 620, color: "#c8452c", shadowBlur: 60, shadowColor: "#000000", shadowDistance: 18 }),
        makeText({ name: "Título", text: "AINDA TENHO\nFOME", x: 400, y: 320, size: 150, lineHeight: 0.95, align: "left", color: "#F0DABD", shadowBlur: 30, shadowDistance: 10, shadowColor: "#000000" }),
        makeText({ name: "Subtítulo", text: "ANÁLISE ÁLBUM DJONGA", font: "Bebas Neue", x: 330, y: 525, size: 56, letterSpacing: 6, align: "left", color: "#1a120c", box: true, boxColor: "#F0DABD" }),
      ],
    }),
  },
  {
    id: "reacao",
    name: "Reação",
    build: () => ({
      background: makeBackground({ color1: "#ffd400", color2: "#ff7a00", angle: 90, vignette: 25 }),
      layers: [
        makeShape({ shape: "circle", x: 950, y: 380, w: 440, h: 440, color: "#ff1f1f", thickness: 22, outlineWidth: 6, outlineColor: "#ffffff" }),
        makeShape({ shape: "arrow", x: 610, y: 520, w: 260, h: 120, rotation: -18, color: "#ff1f1f", outlineWidth: 8, outlineColor: "#ffffff", shadowBlur: 20, shadowDistance: 6 }),
        makeText({ name: "Título", text: "EU NÃO\nACREDITEI", font: "Luckiest Guy", x: 340, y: 270, size: 120, lineHeight: 1.02, color: "#ffffff", strokeWidth: 12, strokeColor: "#000000", shadowBlur: 0, shadowDistance: 10 }),
      ],
    }),
  },
  {
    id: "top10",
    name: "Top 10",
    build: () => ({
      background: makeBackground({ color1: "#0a1c3d", color2: "#1f56b8", angle: 200, vignette: 45 }),
      layers: [
        makeText({ name: "Número", text: "TOP 10", x: 430, y: 300, size: 230, color: "#fff27a", gradient: true, color2: "#ff9d00", strokeWidth: 10, strokeColor: "#08142b", shadowBlur: 40, shadowDistance: 14 }),
        makeText({ name: "Subtítulo", text: "QUE VOCÊ PRECISA VER", font: "Archivo Black", x: 430, y: 495, size: 50, color: "#08142b", box: true, boxColor: "#ffffff" }),
      ],
    }),
  },
  {
    id: "versus",
    name: "Antes x Depois",
    build: () => ({
      background: makeBackground({ color1: "#111111", gradient: false, vignette: 0 }),
      layers: [
        makeShape({ shape: "rect", name: "Lado A", x: 320, y: 360, w: 640, h: 720, color: "#3b3b40", filled: true, radius: 0 }),
        makeShape({ shape: "rect", name: "Lado B", x: 960, y: 360, w: 640, h: 720, color: "#11804f", filled: true, radius: 0 }),
        makeText({ name: "Antes", text: "ANTES", font: "Bebas Neue", x: 320, y: 110, size: 110, letterSpacing: 4, color: "#ffffff", shadowBlur: 20, shadowDistance: 6 }),
        makeText({ name: "Depois", text: "DEPOIS", font: "Bebas Neue", x: 960, y: 110, size: 110, letterSpacing: 4, color: "#ffffff", shadowBlur: 20, shadowDistance: 6 }),
        makeShape({ shape: "circle", name: "Selo", x: 640, y: 380, w: 190, h: 190, color: "#ffd400", filled: true, outlineWidth: 8, outlineColor: "#111111" }),
        makeText({ name: "VS", text: "VS", x: 640, y: 380, size: 96, color: "#111111" }),
      ],
    }),
  },
  {
    id: "grana",
    name: "Dinheiro",
    build: () => ({
      background: makeBackground({ color1: "#04271a", color2: "#0e6b44", angle: 160, vignette: 50 }),
      layers: [
        makeText({ name: "Valor", text: "R$ 10 MIL", x: 420, y: 300, size: 190, color: "#d9ff7a", gradient: true, color2: "#2fd27a", strokeWidth: 8, strokeColor: "#022014", shadowBlur: 45, shadowDistance: 12 }),
        makeText({ name: "Pergunta", text: "POR MÊS?", font: "Archivo Black", x: 420, y: 480, size: 70, color: "#04271a", box: true, boxColor: "#ffffff" }),
        makeShape({ shape: "arrow", x: 1000, y: 260, w: 300, h: 140, rotation: -50, color: "#d9ff7a", outlineWidth: 8, outlineColor: "#04271a" }),
      ],
    }),
  },
  {
    id: "tutorial",
    name: "Tutorial",
    build: () => ({
      background: makeBackground({ color1: "#f6f4ee", color2: "#d9d5ca", angle: 90, vignette: 10 }),
      layers: [
        makeText({ name: "Título", text: "COMO FAZER", font: "Montserrat", x: 420, y: 290, size: 108, color: "#141414" }),
        makeText({ name: "Destaque", text: "EM 5 MINUTOS", font: "Montserrat", x: 420, y: 430, size: 80, color: "#141414", box: true, boxColor: "#ffd400", rotation: -3 }),
      ],
    }),
  },
];

/** Redimensiona camadas de um formato para outro mantendo a composição. */
export function adaptLayers(layers: Layer[], from: FormatId, to: FormatId): Layer[] {
  if (from === to) return layers;
  const a = formatFor(from);
  const b = formatFor(to);
  const sx = b.w / a.w;
  const sy = b.h / a.h;
  // Tamanhos seguem a largura: cabe em qualquer formato e ida e volta não encolhe nada.
  const s = sx;
  return layers.map((l) => {
    const moved = { ...l, x: l.x * sx, y: l.y * sy };
    if (moved.kind === "text") {
      return { ...moved, size: moved.size * s, strokeWidth: moved.strokeWidth * s, letterSpacing: moved.letterSpacing * s };
    }
    if (moved.kind === "image") {
      return { ...moved, scale: moved.scale * s, outlineWidth: moved.outlineWidth * s };
    }
    // Faixas que cobrem a tela toda (ex.: Antes x Depois) acompanham o formato.
    if (moved.shape === "rect" && moved.filled && moved.h >= a.h * 0.95) {
      return { ...moved, w: moved.w * sx, h: moved.h * sy };
    }
    return { ...moved, w: moved.w * s, h: moved.h * s, thickness: moved.thickness * s, outlineWidth: moved.outlineWidth * s };
  });
}

/** Aplica um modelo mantendo as fotos que a pessoa já colocou. */
export function applyTemplate(current: Project, t: Template): Project {
  const built = t.build();
  const layers = adaptLayers(built.layers, "youtube", current.formatId);
  const photos = current.layers.filter((l) => l.kind === "image");
  const decor = layers.filter((l) => l.kind === "shape" && (l.shape === "rect" || l.shape === "disc"));
  const front = layers.filter((l) => !decor.includes(l));
  const old = current.background;
  return {
    ...current,
    background: old.image
      ? { ...built.background, image: old.image, imageZoom: old.imageZoom, imageX: old.imageX, imageY: old.imageY, darken: Math.max(built.background.darken, 35) }
      : built.background,
    layers: [...decor, ...photos, ...front],
  };
}

export function defaultProject(): Project {
  const t = TEMPLATES[0].build();
  return { version: 1, formatId: "youtube", background: t.background, layers: t.layers };
}
