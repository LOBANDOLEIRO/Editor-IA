// Integrações com o navegador: salvar arquivo, guardar o projeto e pedir
// ideias ao Claude quando o editor roda como Artifact no claude.ai.

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

export interface SampleFn {
  json<T>(input: string, opts?: { modelTier?: "quick" | "default" | "complex"; cache?: boolean; signal?: AbortSignal }): Promise<T>;
}

interface Downloads {
  save(req: { filename: string; data: Blob }): Promise<{ status: string }>;
}

export async function capability<T>(name: string): Promise<T | null> {
  try {
    if (typeof window === "undefined" || !window.claude?.use) return null;
    return ((await window.claude.use(name)) as T | null) ?? null;
  } catch {
    return null;
  }
}

export type SaveOutcome = "saved" | "declined" | "unavailable";

/** Baixa o arquivo. No claude.ai o visitante confirma o download. */
export async function saveFile(filename: string, blob: Blob): Promise<SaveOutcome> {
  const downloads = await capability<Downloads>("downloads");
  if (downloads) {
    try {
      await downloads.save({ filename, data: blob });
      return "saved";
    } catch (e) {
      const code = (e as { code?: string })?.code;
      return code === "declined" ? "declined" : "unavailable";
    }
  }
  if (typeof window !== "undefined" && window.claude) return "unavailable";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}

// ---------- IndexedDB (cabe imagens grandes, ao contrário do localStorage) ----------

const DB_NAME = "editor-ia";
const STORE = "kv";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

export async function loadValue<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveValue(key: string, value: unknown): Promise<boolean> {
  try {
    const db = await openDb();
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ---------- imagens ----------

export interface LoadedImage {
  src: string;
  w: number;
  h: number;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não deu para abrir essa imagem."));
    img.src = src;
  });
}

/** Lê a imagem e reduz para no máximo 2048 px, mantendo a transparência. */
export async function importImage(file: Blob, maxSide = 2048): Promise<LoadedImage> {
  const raw = await readAsDataUrl(file);
  const img = await decode(raw);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const k = Math.min(1, maxSide / Math.max(w, h));
  if (k === 1) return { src: raw, w, h };
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const keepAlpha = file.type !== "image/jpeg";
  const src = c.toDataURL(keepAlpha ? "image/png" : "image/jpeg", 0.92);
  return { src, w: c.width, h: c.height };
}

export function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b), type, quality));
}
