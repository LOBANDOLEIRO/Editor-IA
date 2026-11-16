"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { addBuffer, getBuffer, removeBuffer } from "@/lib/audio/buffers";
import { engine } from "@/lib/audio/engine";
import { nearestScaleNote, noteCorrection, segmentNotes, type NoteEdit, type TuneParams } from "@/lib/dsp/pitch";
import { analyzeBuffer, applyNotes, applyTune, curveFor, type CurveResult } from "@/lib/dsp/tuner";
import { NOTE_NAMES_PT, SCALES, keyLabel, midiToName } from "@/lib/music";
import { useStudio } from "@/lib/store";
import type { ScaleName } from "@/lib/types";
import { seek } from "@/lib/transport";
import PitchEditor from "./PitchEditor";

const PRESETS: { label: string; speed: number; amount: number }[] = [
  { label: "Natural", speed: 70, amount: 0.8 },
  { label: "Pop", speed: 25, amount: 1 },
  { label: "Trap / robótico", speed: 0, amount: 1 },
];

type Analysis = CurveResult & { key?: { root: number; minor: boolean } | null };
type Mode = "auto" | "notes";

// Guardados fora do React para sobreviver à troca de clip/aba.
const analyses = new Map<string, Analysis>();
const noteEdits = new Map<string, NoteEdit[]>();
const clipMode = new Map<string, Mode>();

const cents = (m: number) => {
  const c = Math.round((m - Math.round(m)) * 100);
  return `${midiToName(m)}${c ? ` ${c > 0 ? "+" : ""}${c}c` : ""}`;
};

export default function TunePanel() {
  const { clips, selectedClipId, keyRoot, scale, updateClip, notify } = useStudio();
  const clip = clips.find((c) => c.id === selectedClipId);
  const clipId = clip?.id ?? null;
  const srcKey = clip ? clip.originalBufferId ?? clip.bufferId : null;

  const [mode, setModeState] = useState<Mode>("auto");
  const [root, setRoot] = useState(keyRoot);
  const [scaleName, setScaleName] = useState<ScaleName>(scale);
  const [speed, setSpeed] = useState(25);
  const [amount, setAmount] = useState(1);
  const [mix, setMix] = useState(1);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [autoCurve, setAutoCurve] = useState<Float32Array | null>(null);
  const [notes, setNotes] = useState<NoteEdit[]>([]);
  const [selId, setSelId] = useState<number | null>(null);
  const [fine, setFine] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const [busy, setBusy] = useState<"analyze" | "apply" | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRoot(keyRoot);
    setScaleName(scale);
  }, [keyRoot, scale]);

  const steps = SCALES[scaleName].steps;
  const params: TuneParams = { root, steps, speedMs: speed, amount, mix };
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // ao trocar de clip: carrega (ou faz) a análise e as notas guardadas
  useEffect(() => {
    setSelId(null);
    setDirty(false);
    setAutoCurve(null);
    if (!clipId || !srcKey) {
      setAnalysis(null);
      setNotes([]);
      return;
    }
    setModeState(clipMode.get(clipId) ?? "auto");
    let cancelled = false;
    const load = (an: Analysis) => {
      if (cancelled) return;
      setAnalysis(an);
      let ns = noteEdits.get(clipId);
      if (!ns) {
        ns = segmentNotes(an.detected);
        noteEdits.set(clipId, ns);
      }
      setNotes(ns);
    };
    const cached = analyses.get(srcKey);
    if (cached) return load(cached);
    const buf = getBuffer(srcKey);
    if (!buf) return;
    setAnalysis(null);
    setBusy("analyze");
    analyzeBuffer(srcKey, buf, paramsRef.current)
      .then((r) => {
        analyses.set(srcKey, r);
        load(r);
      })
      .catch((e) => notify(`Erro na análise: ${(e as Error).message}`))
      .finally(() => !cancelled && setBusy(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipId, srcKey]);

  // curva do modo automático
  useEffect(() => {
    if (!analysis || !srcKey || mode !== "auto") return;
    const t = setTimeout(() => {
      curveFor(srcKey, paramsRef.current)
        .then((r) => setAutoCurve(r.corrected))
        .catch(() => undefined);
    }, 60);
    return () => clearTimeout(t);
  }, [root, scaleName, speed, amount, analysis, srcKey, mode]);

  // curva do modo nota por nota (calculada na hora)
  const noteCurve = useMemo(
    () => (analysis && mode === "notes" ? noteCorrection(analysis.detected, notes, analysis.frameDur).corrected : null),
    [analysis, notes, mode],
  );

  function setMode(m: Mode) {
    setModeState(m);
    if (clipId) clipMode.set(clipId, m);
  }

  function editNotes(fn: (n: NoteEdit) => NoteEdit, onlyId?: number | null, commit = true) {
    setNotes((prev) => {
      const next = prev.map((n) => (onlyId == null || n.id === onlyId ? fn(n) : n));
      if (clipId) noteEdits.set(clipId, next);
      return next;
    });
    if (commit) setDirty(true);
  }

  // ---------- aplicar ----------
  const seq = useRef(0);
  const latest = useRef({ notes, mode, clipId, srcKey });
  latest.current = { notes, mode, clipId, srcKey };

  async function apply() {
    const { notes: ns, mode: m, clipId: id, srcKey: key } = latest.current;
    const buf = key ? getBuffer(key) : undefined;
    if (!buf || !key || !id) return;
    const token = ++seq.current;
    setBusy("apply");
    setDirty(false);
    try {
      const ctx = engine.ensure();
      const out = m === "auto" ? await applyTune(key, buf, paramsRef.current, ctx) : await applyNotes(key, buf, ns, ctx);
      if (token !== seq.current) return; // já existe uma edição mais nova
      const st = useStudio.getState();
      const cur = st.clips.find((c) => c.id === id);
      if (!cur) return;
      if (!cur.tuned) st.checkpoint();
      const oldId = cur.bufferId;
      st.updateClip(id, { bufferId: addBuffer(out), originalBufferId: key, tuned: true });
      // libera o áudio corrigido anterior se ninguém mais usa (nem o desfazer)
      const s2 = useStudio.getState();
      const used = (list: { bufferId: string; originalBufferId?: string }[]) => list.some((c) => c.bufferId === oldId || c.originalBufferId === oldId);
      if (oldId !== key && !used(s2.clips) && ![...s2.past, ...s2.future].some((snap) => used(snap.clips))) removeBuffer(oldId);
    } catch (e) {
      notify(`Erro ao aplicar: ${(e as Error).message}`);
    } finally {
      if (token === seq.current) setBusy(null);
    }
  }

  // aplicar automaticamente (modo nota por nota)
  useEffect(() => {
    if (!dirty || !autoApply || mode !== "notes" || !analysis) return;
    const t = setTimeout(() => void apply(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, notes, autoApply, mode, analysis]);

  function restore() {
    if (!clip?.originalBufferId) return;
    seq.current++;
    useStudio.getState().checkpoint();
    updateClip(clip.id, { bufferId: clip.originalBufferId, originalBufferId: undefined, tuned: false });
    setDirty(false);
  }

  if (!clip) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-studio-dim">
        Selecione um clip de voz (gravado ou importado) na timeline para corrigir a afinação.
      </div>
    );
  }

  const sel = notes.find((n) => n.id === selId) ?? null;
  const range: [number, number] = [clip.offset, clip.offset + clip.duration];
  const toScale = (n: NoteEdit): NoteEdit => ({ ...n, target: nearestScaleNote(n.center, root, steps), flatten: Math.max(n.flatten, 0.5) });
  const suggested = analysis?.key;

  const keySelects = (
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
      {suggested && (
        <button
          className="col-span-2 rounded bg-studio-bg px-2 py-1 text-left text-[10px] text-studio-dim hover:text-studio-text"
          onClick={() => {
            setRoot(suggested.root);
            setScaleName(suggested.minor ? "minor" : "major");
          }}
        >
          Tom detectado na voz: <b className="text-studio-text">{keyLabel(suggested.root, suggested.minor ? "minor" : "major")}</b> — usar
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:flex-row">
      <div className="w-full shrink-0 space-y-2.5 lg:w-72 lg:overflow-y-auto lg:pr-1">
        <div className="flex rounded-md border border-studio-line text-xs font-semibold">
          <button className={`flex-1 rounded-l-md py-1.5 ${mode === "auto" ? "bg-studio-accent text-black" : "text-studio-dim"}`} onClick={() => setMode("auto")}>
            Autotune
          </button>
          <button className={`flex-1 rounded-r-md py-1.5 ${mode === "notes" ? "bg-studio-accent text-black" : "text-studio-dim"}`} onClick={() => setMode("notes")}>
            Nota por nota
          </button>
        </div>
        {keySelects}

        {mode === "auto" ? (
          <>
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
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button className="btn-accent" disabled={!analysis} onClick={() => editNotes(toScale)}>
                ✦ Tudo na escala
              </button>
              <button className="btn" disabled={!analysis} onClick={() => editNotes((n) => ({ ...n, target: n.center, flatten: 0 }))}>
                Zerar tudo
              </button>
            </div>
            <div className={`space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-2 ${sel ? "" : "opacity-50"}`}>
              <p className="text-[11px]">
                {sel ? (
                  <>
                    Cantada <b>{cents(sel.center)}</b> → alvo <b className="text-studio-accent">{cents(sel.target)}</b>
                  </>
                ) : (
                  "Toque numa nota para editar; arraste para cima/baixo."
                )}
              </p>
              <div className="grid grid-cols-4 gap-1">
                <button className="btn px-1" disabled={!sel} title="Subir 1 semitom" onClick={() => editNotes((n) => ({ ...n, target: Math.round(n.target) + 1 }), selId)}>
                  ▲
                </button>
                <button className="btn px-1" disabled={!sel} title="Descer 1 semitom" onClick={() => editNotes((n) => ({ ...n, target: Math.round(n.target) - 1 }), selId)}>
                  ▼
                </button>
                <button className="btn px-1" disabled={!sel} title="Nota da escala mais próxima" onClick={() => editNotes(toScale, selId)}>
                  Escala
                </button>
                <button className="btn px-1" disabled={!sel} title="Como foi cantada" onClick={() => editNotes((n) => ({ ...n, target: n.center, flatten: 0 }), selId)}>
                  Original
                </button>
              </div>
              <label className="block">
                <span className="label flex justify-between">
                  Achatar oscilação / vibrato <span className="font-mono normal-case text-studio-text">{Math.round((sel?.flatten ?? 0) * 100)}%</span>
                </span>
                <input
                  type="range"
                  className="w-full"
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!sel}
                  value={sel?.flatten ?? 0}
                  onChange={(e) => editNotes((n) => ({ ...n, flatten: Number(e.target.value) }), selId)}
                />
              </label>
              <label className="block">
                <span className="label flex justify-between">
                  Entrada da nota <span className="font-mono normal-case text-studio-text">{sel?.transitionMs ?? 30} ms</span>
                </span>
                <input
                  type="range"
                  className="w-full"
                  min={0}
                  max={150}
                  step={1}
                  disabled={!sel}
                  value={sel?.transitionMs ?? 30}
                  onChange={(e) => editNotes((n) => ({ ...n, transitionMs: Number(e.target.value) }), selId)}
                />
                <span className="flex justify-between text-[9px] text-studio-dim">
                  <span>seca</span>
                  <span>deslizando</span>
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              <label className="flex items-center gap-1.5" title="Arrastar em cents em vez de semitons (ou segure Alt)">
                <input type="checkbox" checked={fine} onChange={(e) => setFine(e.target.checked)} /> Ajuste fino
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} /> Aplicar ao editar
              </label>
            </div>
          </>
        )}
      </div>

      <div className="order-first flex min-h-[230px] min-w-0 shrink-0 flex-col gap-2 lg:order-none lg:min-h-0 lg:flex-1 lg:shrink">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-accent" disabled={!analysis || busy === "analyze"} onClick={() => void apply()}>
            {busy === "apply" ? "Processando…" : mode === "auto" ? "Aplicar autotune" : "Aplicar"}
          </button>
          <button className="btn" disabled={!clip.tuned} onClick={restore}>
            Restaurar original
          </button>
          <span className="text-[10px] text-studio-dim">
            {busy === "analyze" ? (
              "Analisando a voz…"
            ) : (
              <>
                <span className="mr-1 inline-block h-0.5 w-3 bg-studio-dim align-middle" /> cantado
                <span className="mx-1 ml-3 inline-block h-0.5 w-3 bg-studio-accent align-middle" /> corrigido
                {mode === "notes" && dirty && !autoApply && <b className="ml-3 text-studio-accent">alterações não aplicadas</b>}
              </>
            )}
          </span>
        </div>
        {analysis ? (
          <PitchEditor
            detected={analysis.detected}
            output={mode === "auto" ? autoCurve : noteCurve}
            frameDur={analysis.frameDur}
            frameOffset={analysis.frameOffset}
            range={range}
            timelineStart={clip.start}
            root={root}
            steps={steps}
            notes={mode === "notes" ? notes : undefined}
            selectedId={selId}
            fine={fine}
            onSelect={setSelId}
            onNoteTarget={(id, target) => editNotes((n) => ({ ...n, target }), id, false)}
            onCommit={() => setDirty(true)}
            onSeek={(t) => seek(clip.start + (t - clip.offset))}
          />
        ) : (
          <div className="flex min-h-[150px] flex-1 items-center justify-center rounded-md border border-studio-line text-xs text-studio-dim">
            {busy === "analyze" ? "Analisando a voz…" : "Sem análise."}
          </div>
        )}
      </div>
    </div>
  );
}
