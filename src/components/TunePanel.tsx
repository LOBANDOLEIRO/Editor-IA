"use client";
import { useEffect, useRef, useState } from "react";
import { addBuffer, getBuffer } from "@/lib/audio/buffers";
import { engine } from "@/lib/audio/engine";
import type { TuneParams } from "@/lib/dsp/pitch";
import { analyzeBuffer, applyTune, curveFor, type CurveResult } from "@/lib/dsp/tuner";
import { NOTE_NAMES_PT, SCALES, keyLabel, midiToName } from "@/lib/music";
import { useStudio } from "@/lib/store";
import type { ScaleName } from "@/lib/types";

const PRESETS: { label: string; speed: number; amount: number }[] = [
  { label: "Natural", speed: 70, amount: 0.8 },
  { label: "Pop", speed: 25, amount: 1 },
  { label: "Trap / robótico", speed: 0, amount: 1 },
];

export default function TunePanel() {
  const { clips, selectedClipId, keyRoot, scale, updateClip, notify } = useStudio();
  const clip = clips.find((c) => c.id === selectedClipId);
  const srcKey = clip ? clip.originalBufferId ?? clip.bufferId : null;

  const [root, setRoot] = useState(keyRoot);
  const [scaleName, setScaleName] = useState<ScaleName>(scale);
  const [speed, setSpeed] = useState(25);
  const [amount, setAmount] = useState(1);
  const [mix, setMix] = useState(1);
  const [curve, setCurve] = useState<CurveResult | null>(null);
  const [analyzedKey, setAnalyzedKey] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<{ root: number; minor: boolean } | null>(null);
  const [busy, setBusy] = useState<"analyze" | "apply" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // acompanha o tom do projeto
  useEffect(() => {
    setRoot(keyRoot);
    setScaleName(scale);
  }, [keyRoot, scale]);

  const params: TuneParams = { root, steps: SCALES[scaleName].steps, speedMs: speed, amount, mix };
  const ready = analyzedKey !== null && analyzedKey === srcKey;

  // recalcula a curva quando os parâmetros mudam
  useEffect(() => {
    if (!ready || !srcKey) return;
    const t = setTimeout(() => {
      curveFor(srcKey, params).then(setCurve).catch(() => undefined);
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, scaleName, speed, amount, ready, srcKey]);

  // desenha o "piano roll" de afinação
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, rect.width * dpr);
    cv.height = Math.max(1, rect.height * dpr);
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    g.fillStyle = "#0d0f14";
    g.fillRect(0, 0, W, H);
    if (!curve || !ready) {
      g.fillStyle = "#8b92a5";
      g.font = "12px sans-serif";
      g.fillText(clip ? "Clique em “Analisar voz” para ver a afinação." : "Selecione um clip de voz na timeline.", 16, H / 2);
      return;
    }
    const det = curve.detected;
    let lo = Infinity;
    let hi = -Infinity;
    for (const m of det) {
      if (Number.isNaN(m)) continue;
      lo = Math.min(lo, m);
      hi = Math.max(hi, m);
    }
    if (!Number.isFinite(lo)) {
      g.fillStyle = "#8b92a5";
      g.fillText("Nenhuma voz detectada neste clip.", 16, H / 2);
      return;
    }
    lo = Math.floor(lo) - 2;
    hi = Math.ceil(hi) + 2;
    const left = 40;
    const y = (m: number) => H - ((m - lo) / (hi - lo)) * H;
    const x = (i: number) => left + (i / det.length) * (W - left);
    // linhas de notas
    const steps = SCALES[scaleName].steps;
    g.font = "10px monospace";
    for (let n = lo; n <= hi; n++) {
      const inScale = steps.includes((((n - root) % 12) + 12) % 12);
      g.fillStyle = inScale ? "rgba(255,122,26,0.10)" : "rgba(255,255,255,0.02)";
      const yy = y(n + 0.5);
      g.fillRect(left, yy, W - left, y(n - 0.5) - yy);
      g.fillStyle = inScale ? "#e6e8ee" : "#4b5263";
      if ((hi - lo) < 30 || n % 2 === 0) g.fillText(midiToName(n), 4, y(n) + 3);
    }
    const line = (arr: Float32Array, color: string, width: number) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      let pen = false;
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (Number.isNaN(m)) {
          pen = false;
          continue;
        }
        if (!pen) g.moveTo(x(i), y(m));
        else g.lineTo(x(i), y(m));
        pen = true;
      }
      g.stroke();
    };
    line(curve.detected, "rgba(139,146,165,0.8)", 1.5);
    line(curve.corrected, "#ff7a1a", 2);
  }, [curve, ready, clip, root, scaleName]);

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-studio-dim">
        Selecione um clip de voz (gravado ou importado) para corrigir a afinação.
      </div>
    );
  }

  async function analyze() {
    const buf = srcKey ? getBuffer(srcKey) : undefined;
    if (!buf || !srcKey) return;
    setBusy("analyze");
    try {
      const r = await analyzeBuffer(srcKey, buf, params);
      setCurve(r);
      setAnalyzedKey(srcKey);
      setSuggested(r.key ?? null);
    } catch (e) {
      notify(`Erro na análise: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    const buf = srcKey ? getBuffer(srcKey) : undefined;
    if (!buf || !srcKey || !clip) return;
    setBusy("apply");
    try {
      const out = await applyTune(srcKey, buf, params, engine.ensure());
      const id = addBuffer(out);
      updateClip(clip.id, { bufferId: id, originalBufferId: srcKey, tuned: true });
      notify("Afinação aplicada. Dê play para ouvir.");
    } catch (e) {
      notify(`Erro ao aplicar: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  function restore() {
    if (clip?.originalBufferId) updateClip(clip.id, { bufferId: clip.originalBufferId, originalBufferId: undefined, tuned: false });
  }

  return (
    <div className="flex h-full gap-3">
      <div className="w-72 shrink-0 space-y-2.5 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="label">Tom</span>
            <select className="input" value={root} onChange={(e) => setRoot(Number(e.target.value))}>
              {NOTE_NAMES_PT.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Escala</span>
            <select className="input" value={scaleName} onChange={(e) => setScaleName(e.target.value as ScaleName)}>
              {Object.entries(SCALES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {suggested && ready && (
          <button
            className="w-full rounded bg-studio-bg px-2 py-1 text-left text-[10px] text-studio-dim hover:text-studio-text"
            onClick={() => {
              setRoot(suggested.root);
              setScaleName(suggested.minor ? "minor" : "major");
            }}
          >
            Tom detectado na voz: <b className="text-studio-text">{keyLabel(suggested.root, suggested.minor ? "minor" : "major")}</b> — usar
          </button>
        )}
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className={`btn flex-1 px-1 ${speed === p.speed && amount === p.amount ? "btn-on" : ""}`}
              onClick={() => {
                setSpeed(p.speed);
                setAmount(p.amount);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="label flex justify-between">
            Velocidade de correção <span className="font-mono normal-case text-studio-text">{speed} ms</span>
          </span>
          <input type="range" className="w-full" min={0} max={200} step={1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <span className="flex justify-between text-[9px] text-studio-dim">
            <span>robótico</span>
            <span>natural</span>
          </span>
        </label>
        <label className="block">
          <span className="label flex justify-between">
            Intensidade <span className="font-mono normal-case text-studio-text">{Math.round(amount * 100)}%</span>
          </span>
          <input type="range" className="w-full" min={0} max={1} step={0.01} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <label className="block">
          <span className="label flex justify-between">
            Mix (seco/corrigido) <span className="font-mono normal-case text-studio-text">{Math.round(mix * 100)}%</span>
          </span>
          <input type="range" className="w-full" min={0} max={1} step={0.01} value={mix} onChange={(e) => setMix(Number(e.target.value))} />
        </label>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" disabled={busy !== null} onClick={() => void analyze()}>
            {busy === "analyze" ? "Analisando…" : ready ? "Reanalisar" : "① Analisar voz"}
          </button>
          <button className="btn-accent" disabled={!ready || busy !== null} onClick={() => void apply()}>
            {busy === "apply" ? "Processando…" : "② Aplicar correção"}
          </button>
          <button className="btn" disabled={!clip.tuned || busy !== null} onClick={restore}>
            Restaurar original
          </button>
          <span className="text-[10px] text-studio-dim">
            <span className="mr-1 inline-block h-0.5 w-3 bg-studio-dim align-middle" /> cantado
            <span className="mx-1 ml-3 inline-block h-0.5 w-3 bg-studio-accent align-middle" /> corrigido
          </span>
        </div>
        <canvas ref={canvasRef} className="min-h-0 w-full flex-1 rounded-md border border-studio-line" />
      </div>
    </div>
  );
}
