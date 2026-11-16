"use client";
import { useEffect, useRef, useState } from "react";
import { synthDemoStems } from "@/lib/audio/demo";
import { audioProxy, flowApi, useLibrary, type LibraryEntry } from "@/lib/flow/client";
import { keyForPrompt, keyLabel } from "@/lib/music";
import { useStudio } from "@/lib/store";
import type { FlowClip } from "@/lib/types";
import { addBufferToNewTrack, loadUrlToTrack } from "@/lib/transport";

const GENRES = [
  "Trap",
  "Boom bap",
  "Drill",
  "Funk carioca",
  "Brega funk",
  "Lo-fi hip hop",
  "R&B",
  "Reggaeton",
  "Afrobeats",
  "Phonk",
  "Pop",
  "Pagode",
  "Piseiro",
  "House",
];

const STEM_INFO: Record<string, { name: string; color: string }> = {
  drums: { name: "Bateria", color: "#f97316" },
  bass: { name: "Baixo", color: "#22d3ee" },
  other: { name: "Melodia", color: "#a3e635" },
  vocals: { name: "Vocal IA", color: "#e879f9" },
};

export default function GeneratorPanel() {
  const { bpm, keyRoot, scale, setBpm, notify, lyrics } = useStudio();
  const lib = useLibrary();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [genre, setGenre] = useState("Trap");
  const [mood, setMood] = useState("sombrio, 808 pesado");
  const [extra, setExtra] = useState("");
  const [model, setModel] = useState("lyria-3.5");
  const [instrumental, setInstrumental] = useState(true);
  const [autoStems, setAutoStems] = useState(true);
  const [wav, setWav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    lib.init();
    flowApi
      .status()
      .then((r) => setConfigured(r.configured))
      .catch(() => setConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prompt = [
    `${genre} beat`,
    mood.trim(),
    `${bpm} BPM`,
    `key of ${keyForPrompt(keyRoot, scale)}`,
    instrumental ? "instrumental only, no vocals" : "",
    extra.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  async function generate() {
    setBusy(true);
    try {
      const job = await flowApi.generate({
        prompt,
        instrumental,
        model,
        lyrics: !instrumental && lyrics.trim() ? lyrics : undefined,
      });
      lib.upsert(job.jobid, { prompt, model, bpm, createdAt: Date.now(), status: "pending", clips: [], stems: {}, stemStatus: {} });
      notify("Gerando beat… leva ~1–2 min.");
    } catch (e) {
      notify(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  // acompanha jobs pendentes (inclusive após recarregar a página)
  const pendingIds = lib.entries.filter((e) => e.status === "pending").map((e) => e.jobid).join("|");
  const autoRef = useRef(autoStems);
  autoRef.current = autoStems;
  useEffect(() => {
    if (!pendingIds) return;
    const ids = pendingIds.split("|");
    const t = setInterval(async () => {
      for (const id of ids) {
        try {
          const job = await flowApi.job(id);
          if (job.status === "completed") {
            useLibrary.getState().upsert(id, { status: "completed", clips: job.clips ?? [] });
            notify("Beat pronto!");
            if (autoRef.current) for (const c of job.clips ?? []) void splitStems(id, c);
          } else if (job.status === "failed") {
            useLibrary.getState().upsert(id, { status: "failed", error: job.error?.message ?? "falhou" });
          }
        } catch (e) {
          const status = (e as { status?: number }).status;
          if (status === 404) useLibrary.getState().upsert(id, { status: "failed", error: "job expirou" });
        }
      }
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds]);

  async function splitStems(jobid: string, c: FlowClip) {
    const entry = () => useLibrary.getState().entries.find((e) => e.jobid === jobid)!;
    if (entry().stems[c.clip]?.length) return;
    useLibrary.getState().upsert(jobid, { stemStatus: { ...entry().stemStatus, [c.clip]: "running" } });
    try {
      const stems = await flowApi.stems(c.clip);
      useLibrary.getState().upsert(jobid, {
        stems: { ...entry().stems, [c.clip]: stems },
        stemStatus: { ...entry().stemStatus, [c.clip]: undefined },
      });
    } catch (e) {
      useLibrary.getState().upsert(jobid, { stemStatus: { ...entry().stemStatus, [c.clip]: "error" } });
      notify(`Stems: ${(e as Error).message}`);
    }
  }

  async function openInStudio(entry: LibraryEntry, c: FlowClip, useStems: boolean) {
    setLoading(c.clip);
    try {
      if (entry.bpm) setBpm(entry.bpm);
      const stems = entry.stems[c.clip];
      const url = (x: FlowClip) => audioProxy(wav ? x.wav_url : x.audio_url);
      if (useStems && stems?.length) {
        const order = ["drums", "bass", "other", "vocals"];
        const sorted = [...stems].sort((a, b) => order.indexOf(a.stem_type ?? "") - order.indexOf(b.stem_type ?? ""));
        await Promise.all(
          sorted
            // beat instrumental: o stem de vocal sai praticamente vazio
            .filter((st) => !(st.stem_type === "vocals" && entry.prompt.includes("instrumental only")))
            .map((st) => {
              const info = STEM_INFO[st.stem_type ?? "other"] ?? { name: st.title ?? "Stem", color: "#60a5fa" };
              return loadUrlToTrack(url(st), info.name, info.color);
            }),
        );
      } else {
        await loadUrlToTrack(url(c), c.title ?? "Beat");
      }
      notify("Beat carregado no estúdio.");
    } catch (e) {
      notify(String((e as Error).message));
    } finally {
      setLoading(null);
    }
  }

  async function demo() {
    setLoading("demo");
    try {
      const stems = await synthDemoStems(bpm, keyRoot);
      const colors = ["#f97316", "#22d3ee", "#a3e635"];
      stems.forEach((st, i) => addBufferToNewTrack(st.buffer, st.name, colors[i]));
      notify("Beat demo criado (sintetizado, sem IA).");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 p-3">
      {configured === false && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-200">
          Flow Music não configurado. Defina <code className="font-mono">USEAPI_TOKEN</code> no <code className="font-mono">.env.local</code> e
          conecte sua conta Flow Music no useapi.net. Enquanto isso, use o <b>beat demo</b>.
        </div>
      )}

      <section className="space-y-3">
        <h3 className="panel-title">Gerar beat com Lyria</h3>
        <div>
          <span className="label">Gênero</span>
          <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Clima / instrumentos</span>
          <input className="input" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="ex.: melódico, piano triste, 808 deslizante" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-studio-dim">
          <div className="rounded-md border border-studio-line bg-studio-bg px-2 py-1.5">
            <span className="label mb-0">BPM</span>
            <span className="font-mono text-studio-text">{bpm}</span>
          </div>
          <div className="rounded-md border border-studio-line bg-studio-bg px-2 py-1.5">
            <span className="label mb-0">Tom</span>
            <span className="text-studio-text">{keyLabel(keyRoot, scale)}</span>
          </div>
        </div>
        <div>
          <span className="label">Detalhes extras</span>
          <textarea
            className="input h-16 resize-none"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="ex.: intro de 4 compassos, drop no refrão, hi-hats rápidos"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="label">Modelo</span>
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="lyria-3.5">Lyria 3.5</option>
              <option value="lyria-3-pro">Lyria 3 Pro</option>
            </select>
          </div>
          <div className="space-y-1 pt-4 text-[11px]">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={instrumental} onChange={(e) => setInstrumental(e.target.checked)} /> Só instrumental
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={autoStems} onChange={(e) => setAutoStems(e.target.checked)} /> Separar stems
            </label>
          </div>
        </div>
        {!instrumental && (
          <p className="text-[10px] text-studio-dim">
            {lyrics.trim() ? "Vai usar a letra da aba Letra." : "Sem letra na aba Letra: a IA escreve uma."}
          </p>
        )}
        <details className="text-[10px] text-studio-dim">
          <summary className="cursor-pointer">Prompt enviado</summary>
          <p className="mt-1 rounded bg-studio-bg p-2 font-mono">{prompt}</p>
        </details>
        <button className="btn-accent w-full py-2" disabled={busy || !configured} onClick={() => void generate()}>
          {busy ? "Enviando…" : "✦ Gerar beat"}
        </button>
        <button className="btn w-full" disabled={loading === "demo"} onClick={() => void demo()}>
          Beat demo (offline, sem IA)
        </button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="panel-title">Seus beats</h3>
          <label className="flex items-center gap-1 text-[10px] text-studio-dim" title="WAV tem qualidade máxima, mas baixa mais devagar">
            <input type="checkbox" checked={wav} onChange={(e) => setWav(e.target.checked)} /> WAV
          </label>
        </div>
        {lib.entries.length === 0 && <p className="text-[11px] text-studio-dim">Nada gerado ainda.</p>}
        {lib.entries.map((entry) => (
          <div key={entry.jobid} className="space-y-2 rounded-md border border-studio-line bg-studio-panel2 p-2">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-[11px] text-studio-dim">{entry.prompt}</p>
              <button className="text-[11px] text-studio-dim hover:text-studio-rec" title="Remover da lista" onClick={() => lib.remove(entry.jobid)}>
                ✕
              </button>
            </div>
            {entry.status === "pending" && <p className="animate-pulse text-[11px] text-studio-accent">Gerando…</p>}
            {entry.status === "failed" && <p className="text-[11px] text-studio-rec">Falhou: {entry.error}</p>}
            {entry.clips.map((c, i) => {
              const stems = entry.stems[c.clip];
              const st = entry.stemStatus[c.clip];
              return (
                <div key={c.clip} className="space-y-1.5 rounded border border-studio-line bg-studio-bg p-2">
                  <div className="flex items-center gap-2">
                    {c.image_url && <img src={c.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {String.fromCharCode(65 + i)} · {c.title ?? "Sem título"}
                      </p>
                      <p className="text-[10px] text-studio-dim">{c.duration_s ? `${Math.round(c.duration_s)}s` : ""}</p>
                    </div>
                  </div>
                  <audio controls preload="none" src={audioProxy(c.audio_url)} className="h-7 w-full" />
                  <div className="flex flex-wrap gap-1">
                    {stems?.length ? (
                      <button className="btn-accent flex-1" disabled={!!loading} onClick={() => void openInStudio(entry, c, true)}>
                        {loading === c.clip ? "Carregando…" : `Abrir ${stems.length} stems`}
                      </button>
                    ) : (
                      <button className="btn flex-1" disabled={st === "running"} onClick={() => void splitStems(entry.jobid, c)}>
                        {st === "running" ? "Separando stems…" : st === "error" ? "Tentar stems de novo" : "Separar stems"}
                      </button>
                    )}
                    <button className="btn" disabled={!!loading} onClick={() => void openInStudio(entry, c, false)}>
                      Faixa única
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}
