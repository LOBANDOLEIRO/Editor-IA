// Modelo de dados do editor: formatos, fontes, camadas e projeto.

export type FormatId = "youtube" | "square" | "portrait" | "story";

export interface Format {
  id: FormatId;
  label: string;
  ratio: string;
  w: number;
  h: number;
  where: string;
}

export const FORMATS: Format[] = [
  { id: "youtube", label: "YouTube", ratio: "16:9", w: 1280, h: 720, where: "Miniatura de vídeo" },
  { id: "square", label: "Quadrado", ratio: "1:1", w: 1080, h: 1080, where: "Post do Instagram" },
  { id: "portrait", label: "Retrato", ratio: "4:5", w: 1080, h: 1350, where: "Feed do Instagram" },
  { id: "story", label: "Vertical", ratio: "9:16", w: 1080, h: 1920, where: "Reels, Shorts e TikTok" },
];

export function formatFor(id: FormatId): Format {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0];
}

export interface FontDef {
  family: string;
  weight: number;
}

// Fontes carregadas do Google Fonts (ver layout.tsx). Todas funcionam no canvas.
export const FONTS: FontDef[] = [
  { family: "Anton", weight: 400 },
  { family: "Bebas Neue", weight: 400 },
  { family: "Archivo Black", weight: 400 },
  { family: "Montserrat", weight: 900 },
  { family: "Oswald", weight: 700 },
  { family: "Luckiest Guy", weight: 400 },
  { family: "Bangers", weight: 400 },
  { family: "Permanent Marker", weight: 400 },
];

export function fontFor(family: string): FontDef {
  return FONTS.find((f) => f.family === family) ?? FONTS[0];
}

interface LayerBase {
  id: string;
  name: string;
  x: number; // centro, em px do formato
  y: number;
  rotation: number; // graus
  opacity: number; // 0..1
  visible: boolean;
  shadowBlur: number;
  shadowDistance: number;
  shadowColor: string;
}

export interface TextLayer extends LayerBase {
  kind: "text";
  text: string;
  font: string;
  size: number;
  color: string;
  gradient: boolean;
  color2: string;
  strokeWidth: number;
  strokeColor: string;
  align: "left" | "center" | "right";
  uppercase: boolean;
  lineHeight: number;
  letterSpacing: number;
  box: boolean;
  boxColor: string;
}

export interface ImageLayer extends LayerBase {
  kind: "image";
  src: string; // data URL
  naturalW: number;
  naturalH: number;
  scale: number;
  flipX: boolean;
  outlineWidth: number;
  outlineColor: string;
}

export type ShapeKind = "arrow" | "circle" | "rect" | "disc";

export interface ShapeLayer extends LayerBase {
  kind: "shape";
  shape: ShapeKind;
  w: number;
  h: number;
  color: string;
  filled: boolean;
  thickness: number;
  outlineWidth: number;
  outlineColor: string;
  radius: number;
}

export type Layer = TextLayer | ImageLayer | ShapeLayer;

export interface Background {
  color1: string;
  color2: string;
  gradient: boolean;
  angle: number;
  image: string | null;
  imageZoom: number;
  imageX: number; // 0..1, ponto focal
  imageY: number;
  blur: number;
  darken: number; // 0..100
  vignette: number; // 0..100
}

export interface Project {
  version: 1;
  formatId: FormatId;
  background: Background;
  layers: Layer[];
}

export const BACKGROUND_ID = "__fundo";
