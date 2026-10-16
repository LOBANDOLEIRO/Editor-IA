"use client";

// Editor IA: criador de thumbnails com camadas (fundo, fotos, formas e textos).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inspector, LayersPanel } from "./Inspector";
import { LeftPanel, LeftTab } from "./LeftPanel";
import { FileSizes, Previews } from "./Previews";
import { canvasToBlob, capability, importImage, loadValue, SampleFn, saveFile, saveValue } from "./platform";
import { hitHandle, hitLayer, renderOverlay, renderScene, toLocal } from "./render";
import { adaptLayers, applyTemplate, defaultProject, makeImage, makeShape, makeText, Template, uid } from "./templates";
import { BACKGROUND_ID, Background, FONTS, FORMATS, FormatId, formatFor, ImageLayer, Layer, Project, ShapeKind, ShapeLayer, TextLayer } from "./types";
import { BTN, BTN_PRIMARY, ICON_BTN, Icon, Segmented } from "./ui";
import { useHistory } from "./useHistory";

const ACCENT = "#ffc53d";
const SAVE_KEY = "projeto-atual";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "thumbnail"
  );
}

function useFontsReady() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let alive = true;
    const bump = () => alive && setVersion((v) => v + 1);
    FONTS.forEach((f) => document.fonts.load(`${f.weight} 64px "${f.family}"`).then(bump, () => {}));
    document.fonts.ready.then(bump, () => {});
    return () => {
      alive = false;
    };
  }, []);
  return version;
}

function useImages(p: Project) {
  const cache = useRef(new Map<string, HTMLImageElement>());
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const srcs = new Set<string>();
    if (p.background.image) srcs.add(p.background.image);
    p.layers.forEach((l) => l.kind === "image" && srcs.add(l.src));
    srcs.forEach((src) => {
      if (cache.current.has(src)) return;
      const img = new Image();
      img.onload = () => setVersion((v) => v + 1);
      img.src = src;
      cache.current.set(src, img);
    });
  }, [p]);
  const get = useCallback((src: string) => {
    const img = cache.current.get(src);
    return img && img.complete && img.naturalWidth ? img : undefined;
  }, []);
  return { get, version };
}

export default function Editor() {
  const hist = useHistory<Project>(defaultProject);
  const { set: commit, undo, redo } = hist;
  const project = hist.state;
  const fmt = formatFor(project.formatId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<LeftTab>("criar");
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [guides, setGuides] = useState({ v: false, h: false });
  const [safeZone, setSafeZone] = useState(true);
  const [manualSave, setManualSave] = useState<{ url: string; name: string } | null>(null);
  const [display, setDisplay] = useState({ w: 640, h: 360 });
  const [sizes, setSizes] = useState<FileSizes | null>(null);
  const [videoTitle, setVideoTitle] = useState("Análise do álbum Ainda Tenho Fome, faixa a faixa");
  const [sample, setSample] = useState<SampleFn | null>(null);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);

  const fontsVersion = useFontsReady();
  const images = useImages(project);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanRef = useRef<HTMLCanvasElement | null>(null);
  const previews = useRef(new Set<HTMLCanvasElement>());
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<null | { mode: "move" | "resize"; key: string; dx: number; dy: number; dist: number; start: Layer }>(null);

  const selected = project.layers.find((l) => l.id === selectedId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // ---------- carregar e salvar o projeto ----------

  useEffect(() => {
    let alive = true;
    loadValue<Project>(SAVE_KEY).then((saved) => {
      if (!alive) return;
      if (saved && saved.version === 1 && Array.isArray(saved.layers) && saved.background) hist.replace(saved);
      setLoaded(true);
    });
    capability<SampleFn>("sample").then((s) => alive && s && setSample(() => s));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => saveValue(SAVE_KEY, project), 700);
    return () => clearTimeout(t);
  }, [project, loaded]);

  // ---------- tamanho do palco ----------

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const availW = Math.max(120, r.width - (wide ? 48 : 24));
      const availH = wide ? Math.max(120, r.height - 48) : Math.min(window.innerHeight * 0.62, 880);
      const k = Math.min(availW / fmt.w, availH / fmt.h);
      setDisplay({ w: Math.round(fmt.w * k), h: Math.round(fmt.h * k) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [fmt.w, fmt.h]);

  // ---------- desenho ----------

  const drawPreview = useCallback((c: HTMLCanvasElement) => {
    const clean = cleanRef.current;
    if (!clean || !c.clientWidth) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(clean, 0, 0, w, h);
  }, []);

  const registerPreview = useCallback(
    (c: HTMLCanvasElement | null) => {
      if (!c) {
        previews.current.forEach((p) => !p.isConnected && previews.current.delete(p));
        return;
      }
      previews.current.add(c);
      drawPreview(c);
    },
    [drawPreview]
  );

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (!cleanRef.current) cleanRef.current = document.createElement("canvas");
    const clean = cleanRef.current;
    if (clean.width !== fmt.w) clean.width = fmt.w;
    if (clean.height !== fmt.h) clean.height = fmt.h;
    if (c.width !== fmt.w) c.width = fmt.w;
    if (c.height !== fmt.h) c.height = fmt.h;
    renderScene(clean.getContext("2d")!, project, images.get);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, fmt.w, fmt.h);
    ctx.drawImage(clean, 0, 0);
    renderOverlay(ctx, project, {
      selectedId,
      ui: fmt.w / Math.max(1, display.w),
      guideV: guides.v,
      guideH: guides.h,
      safeZone,
      accent: ACCENT,
    });
    previews.current.forEach((p) => (p.isConnected ? drawPreview(p) : previews.current.delete(p)));
  }, [project, selectedId, fontsVersion, images.version, images.get, display.w, guides, safeZone, fmt.w, fmt.h, drawPreview]);

  // Tamanho do arquivo final, para o checklist.
  useEffect(() => {
    const t = setTimeout(async () => {
      const clean = cleanRef.current;
      if (!clean) return;
      const [jpg, png] = await Promise.all([canvasToBlob(clean, "image/jpeg", 0.92), canvasToBlob(clean, "image/png")]);
      if (jpg && png) setSizes({ jpg: jpg.size, png: png.size });
    }, 900);
    return () => clearTimeout(t);
  }, [project, fontsVersion, images.version]);

  // ---------- mudanças no projeto ----------

  const updateLayer = useCallback(
    (id: string, patch: Partial<Layer>, key: string | null = null) => {
      commit((p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) }), key);
    },
    [commit]
  );

  const updateBackground = useCallback(
    (patch: Partial<Background>, key: string | null = null) => {
      commit((p) => ({ ...p, background: { ...p.background, ...patch } }), key);
    },
    [commit]
  );

  const addLayer = useCallback(
    (l: Layer) => {
      commit((p) => {
        // Fotos entram atrás dos textos, para não cobrir o título.
        const firstText = l.kind === "image" ? p.layers.findIndex((x) => x.kind === "text") : -1;
        if (firstText < 0) return { ...p, layers: [...p.layers, l] };
        const layers = [...p.layers];
        layers.splice(firstText, 0, l);
        return { ...p, layers };
      });
      setSelectedId(l.id);
    },
    [commit]
  );

  const removeLayer = useCallback(
    (id: string) => {
      commit((p) => ({ ...p, layers: p.layers.filter((l) => l.id !== id) }));
      setSelectedId(null);
    },
    [commit]
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      const src = project.layers.find((l) => l.id === id);
      if (!src) return;
      const copy = { ...src, id: uid(), x: src.x + 30, y: src.y + 30 } as Layer;
      commit((p) => {
        const i = p.layers.findIndex((l) => l.id === id);
        const layers = [...p.layers];
        layers.splice(i + 1, 0, copy);
        return { ...p, layers };
      });
      setSelectedId(copy.id);
    },
    [project.layers, commit]
  );

  const moveLayer = useCallback(
    (id: string, dir: 1 | -1) => {
      commit((p) => {
        const i = p.layers.findIndex((l) => l.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= p.layers.length) return p;
        const layers = [...p.layers];
        [layers[i], layers[j]] = [layers[j], layers[i]];
        return { ...p, layers };
      });
    },
    [commit]
  );

  const addImageFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) return;
      setBusy(true);
      try {
        for (const file of imgs) {
          const img = await importImage(file);
          const scale = Math.min(1, (fmt.h * 0.85) / img.h, (fmt.w * 0.6) / img.w);
          const layer = makeImage({
            src: img.src,
            naturalW: img.w,
            naturalH: img.h,
            scale,
            name: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 24) || "Imagem",
            x: Math.round(fmt.w * 0.7),
            y: Math.round(fmt.h - (img.h * scale) / 2),
          });
          addLayer(layer);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Não deu para abrir essa imagem.");
      } finally {
        setBusy(false);
      }
    },
    [fmt.w, fmt.h, addLayer, showToast]
  );

  const setBackgroundFile = useCallback(
    async (file: File) => {
      try {
        const img = await importImage(file, 2400);
        updateBackground({ image: img.src, imageZoom: 1, imageX: 0.5, imageY: 0.5 });
        setSelectedId(BACKGROUND_ID);
      } catch {
        showToast("Não deu para abrir essa imagem.");
      }
    },
    [updateBackground, showToast]
  );

  const imageToBackground = useCallback(
    (l: ImageLayer) => {
      commit((p) => ({
        ...p,
        background: { ...p.background, image: l.src, imageZoom: 1, imageX: 0.5, imageY: 0.5 },
        layers: p.layers.filter((x) => x.id !== l.id),
      }));
      setSelectedId(BACKGROUND_ID);
    },
    [commit]
  );

  const changeFormat = useCallback(
    (id: FormatId) => {
      commit((p) => (p.formatId === id ? p : { ...p, formatId: id, layers: adaptLayers(p.layers, p.formatId, id) }));
    },
    [commit]
  );

  const pickTemplate = useCallback(
    (t: Template) => {
      commit((p) => applyTemplate(p, t));
      setSelectedId(null);
      showToast(`Modelo "${t.name}" aplicado. Ctrl+Z desfaz.`);
    },
    [commit, showToast]
  );

  const addText = useCallback(() => {
    addLayer(makeText({ x: fmt.w / 2, y: fmt.h / 2, size: Math.round((fmt.w / 1280) * 110), strokeWidth: 8, shadowBlur: 20, shadowDistance: 6 }));
    setTimeout(() => {
      textRef.current?.focus();
      textRef.current?.select();
    }, 50);
  }, [addLayer, fmt.w, fmt.h]);

  const addShape = useCallback(
    (shape: ShapeKind) => {
      const k = fmt.w / 1280;
      const sizes: Record<ShapeKind, Partial<ShapeLayer>> = {
        arrow: { w: 280 * k, h: 130 * k, outlineWidth: 8, outlineColor: "#ffffff" },
        circle: { w: 320 * k, h: 320 * k, thickness: 18 },
        rect: { w: 420 * k, h: 240 * k, thickness: 14 },
        disc: { w: 520 * k, h: 520 * k, color: "#c8452c", shadowBlur: 50, shadowDistance: 14 },
      };
      addLayer(makeShape({ shape, x: fmt.w / 2, y: fmt.h / 2, ...sizes[shape] }));
    },
    [addLayer, fmt.w, fmt.h]
  );

  const applyTitle = useCallback(
    (text: string, targetId: string | null) => {
      const target = project.layers.find((l) => l.id === targetId && l.kind === "text");
      if (target) {
        updateLayer(target.id, { text, name: text.slice(0, 24) } as Partial<TextLayer>);
        setSelectedId(target.id);
      } else {
        addLayer(makeText({ text, x: fmt.w / 2, y: fmt.h / 2, strokeWidth: 8, shadowBlur: 20, shadowDistance: 6 }));
      }
    },
    [project.layers, updateLayer, addLayer, fmt.w, fmt.h]
  );

  // ---------- exportar ----------

  const exportAs = useCallback(
    async (type: "png" | "jpg") => {
      const clean = cleanRef.current;
      if (!clean) return;
      setBusy(true);
      try {
        renderScene(clean.getContext("2d")!, project, images.get);
        let blob: Blob | null;
        if (type === "png") {
          blob = await canvasToBlob(clean, "image/png");
        } else {
          let q = 0.92;
          blob = await canvasToBlob(clean, "image/jpeg", q);
          while (blob && blob.size > 2_000_000 && q > 0.6) {
            q -= 0.08;
            blob = await canvasToBlob(clean, "image/jpeg", q);
          }
        }
        if (!blob) return showToast("Não deu para gerar a imagem. Tente de novo.");
        const firstText = project.layers.find((l): l is TextLayer => l.kind === "text" && l.visible)?.text ?? "thumbnail";
        const name = `${slug(firstText)}-${fmt.w}x${fmt.h}.${type}`;
        const result = await saveFile(name, blob);
        if (result === "saved") showToast(`Imagem salva: ${name}`);
        else if (result === "declined") showToast("Download cancelado.");
        else setManualSave({ url: URL.createObjectURL(blob), name });
      } finally {
        setBusy(false);
      }
    },
    [project, images.get, fmt.w, fmt.h, showToast]
  );

  // ---------- mouse e toque no palco ----------

  const toPoint = (e: React.PointerEvent | React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * fmt.w) / r.width, y: ((e.clientY - r.top) * fmt.h) / r.height };
  };
  const ui = fmt.w / Math.max(1, display.w);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const pt = toPoint(e);
    const key = "drag-" + Date.now();
    if (selected && selected.visible && hitHandle(selected, pt.x, pt.y, ui)) {
      const loc = toLocal(selected, pt.x, pt.y);
      drag.current = { mode: "resize", key, dx: 0, dy: 0, dist: Math.max(1, Math.hypot(loc.x, loc.y)), start: selected };
    } else {
      const hit = hitLayer(project, pt.x, pt.y);
      if (!hit) {
        setSelectedId(BACKGROUND_ID);
        drag.current = null;
        return;
      }
      setSelectedId(hit.id);
      drag.current = { mode: "move", key, dx: pt.x - hit.x, dy: pt.y - hit.y, dist: 1, start: hit };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toPoint(e);
    const d = drag.current;
    const c = e.currentTarget;
    if (!d) {
      if (selected && selected.visible && hitHandle(selected, pt.x, pt.y, ui)) c.style.cursor = "nwse-resize";
      else c.style.cursor = hitLayer(project, pt.x, pt.y) ? "move" : "default";
      return;
    }
    const s = d.start;
    if (d.mode === "move") {
      let x = pt.x - d.dx;
      let y = pt.y - d.dy;
      const snap = 10 * ui;
      const v = Math.abs(x - fmt.w / 2) < snap;
      const h = Math.abs(y - fmt.h / 2) < snap;
      if (v) x = fmt.w / 2;
      if (h) y = fmt.h / 2;
      if (v !== guides.v || h !== guides.h) setGuides({ v, h });
      updateLayer(s.id, { x: Math.round(x), y: Math.round(y) }, d.key);
      return;
    }
    const loc = toLocal(s, pt.x, pt.y);
    const k = Math.max(0.05, Math.hypot(loc.x, loc.y) / d.dist);
    if (s.kind === "text") updateLayer(s.id, { size: clamp(Math.round(s.size * k), 8, 800) }, d.key);
    else if (s.kind === "image") updateLayer(s.id, { scale: clamp(s.scale * k, 0.02, 8) }, d.key);
    else if (s.shape === "disc" || e.shiftKey) updateLayer(s.id, { w: Math.max(20, s.w * k), h: Math.max(20, s.h * k) }, d.key);
    else {
      const pad = 6 * ui;
      updateLayer(s.id, { w: Math.max(20, (Math.abs(loc.x) - pad) * 2), h: Math.max(20, (Math.abs(loc.y) - pad) * 2) }, d.key);
    }
  };

  const endDrag = () => {
    drag.current = null;
    if (guides.v || guides.h) setGuides({ v: false, h: false });
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = toPoint(e);
    const hit = hitLayer(project, pt.x, pt.y);
    if (hit?.kind === "text") {
      setSelectedId(hit.id);
      setTimeout(() => {
        textRef.current?.focus();
        textRef.current?.select();
      }, 30);
    }
  };

  // ---------- teclado, colar e soltar ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!selected) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeLayer(selected.id);
      } else if (mod && k === "d") {
        e.preventDefault();
        duplicateLayer(selected.id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateLayer(selected.id, { x: selected.x + dx, y: selected.y + dy }, "nudge-" + selected.id);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      addImageFiles(files);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [selected, undo, redo, removeLayer, duplicateLayer, updateLayer, addImageFiles]);

  const textLayers = useMemo(() => project.layers.filter((l): l is TextLayer => l.kind === "text"), [project.layers]);
  const targetTextId = selected?.kind === "text" ? selected.id : null;

  return (
    <div className="app flex min-h-full flex-col gap-3 lg:h-full">
      {/* ---------- barra superior ---------- */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-2xl leading-none tracking-wide">
            EDITOR <span className="text-accent">IA</span>
          </h1>
          <span className="hidden text-xs text-muted sm:inline">thumbnails que fazem clicar</span>
        </div>
        <Segmented<FormatId>
          label="Formato"
          value={project.formatId}
          onChange={changeFormat}
          options={FORMATS.map((f) => ({
            value: f.id,
            title: `${f.w} × ${f.h} · ${f.where}`,
            label: (
              <>
                {f.label}
                <span className="hidden font-mono text-[10px] text-muted md:inline">{f.ratio}</span>
              </>
            ),
          }))}
        />
        <div className="flex items-center gap-1">
          <button type="button" className={ICON_BTN + " h-8 w-8"} onClick={undo} disabled={!hist.canUndo} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
            <Icon name="undo" />
          </button>
          <button type="button" className={ICON_BTN + " h-8 w-8"} onClick={redo} disabled={!hist.canRedo} aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">
            <Icon name="redo" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={BTN} onClick={() => exportAs("png")} disabled={busy}>
            PNG
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={() => exportAs("jpg")} disabled={busy}>
            <Icon name="download" /> Baixar JPG
          </button>
        </div>
      </header>

      {/* ---------- bancada ---------- */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[272px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)_auto]">
        <aside className="order-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel lg:order-none lg:row-span-2">
          <LeftPanel
            tab={tab}
            onTab={setTab}
            formatId={project.formatId}
            fontsVersion={fontsVersion}
            onAddText={addText}
            onAddShape={addShape}
            onPickImage={() => imageInput.current?.click()}
            onTemplate={pickTemplate}
            textLayers={textLayers}
            targetTextId={targetTextId}
            onApplyTitle={applyTitle}
            videoTitle={videoTitle}
            onVideoTitle={setVideoTitle}
            sample={sample}
          />
        </aside>

        <section
          ref={stageRef}
          aria-label="Palco"
          className={
            "stage relative order-1 flex min-h-0 items-center justify-center overflow-hidden rounded-xl border bg-stage pb-9 pt-3 lg:order-none lg:py-0 " +
            (dropping ? "border-accent" : "border-line")
          }
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.items).some((i) => i.kind === "file")) {
              e.preventDefault();
              setDropping(true);
            }
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDropping(false);
            addImageFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label="Thumbnail em edição"
            style={{ width: display.w, height: display.h, touchAction: "none" }}
            className="block rounded-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={onDoubleClick}
          />
          {project.formatId === "youtube" && (
            <label className="absolute bottom-2 left-3 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted">
              <input type="checkbox" id="safe" checked={safeZone} onChange={(e) => setSafeZone(e.target.checked)} className="accent-[var(--accent)]" />
              Mostrar área da duração
            </label>
          )}
          <span className="absolute bottom-2 right-3 font-mono text-[11px] tabular-nums text-muted">
            {fmt.w} × {fmt.h}
          </span>
          {dropping && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
              <span className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">Solte para adicionar a imagem</span>
            </div>
          )}
        </section>

        <aside className="order-2 flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel lg:order-none lg:row-span-2">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Inspector
              layer={selected}
              background={project.background}
              isBackground={selectedId === BACKGROUND_ID}
              formatW={fmt.w}
              formatH={fmt.h}
              textRef={textRef}
              onLayer={updateLayer}
              onBackground={updateBackground}
              onPickBackground={() => bgInput.current?.click()}
              onImageToBackground={imageToBackground}
            />
          </div>
          <div className="max-h-[40%] min-h-[120px] overflow-y-auto border-t border-line">
            <LayersPanel
              layers={project.layers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggle={(l) => updateLayer(l.id, { visible: !l.visible })}
              onMove={moveLayer}
              onDuplicate={duplicateLayer}
              onRemove={removeLayer}
            />
          </div>
        </aside>

        <section aria-label="Prévia e checklist" className="order-4 overflow-hidden rounded-xl border border-line bg-panel lg:order-none lg:col-start-2 lg:max-h-[300px] lg:overflow-y-auto">
          <Previews project={project} format={fmt} videoTitle={videoTitle} register={registerPreview} sizes={sizes} />
        </section>
      </main>

      <input
        ref={imageInput}
        id="image-file"
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addImageFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={bgInput}
        id="bg-file"
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setBackgroundFile(f);
          e.target.value = "";
        }}
      />

      {toast && (
        <div role="status" className="toast fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-raised px-4 py-2.5 text-sm shadow-xl">
          {toast}
        </div>
      )}

      {manualSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4" role="dialog" aria-modal="true" aria-label="Salvar imagem">
          <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 overflow-auto rounded-xl border border-line bg-panel p-4">
            <p className="text-sm">
              O download automático não está disponível aqui. Clique com o botão direito na imagem (ou toque e segure no celular) e escolha <strong>Salvar imagem</strong>.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={manualSave.url} alt={manualSave.name} className="w-full rounded-md" />
            <div className="flex justify-end">
              <button
                type="button"
                className={BTN}
                onClick={() => {
                  URL.revokeObjectURL(manualSave.url);
                  setManualSave(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
