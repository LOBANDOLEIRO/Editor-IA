"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Player from "@/components/Player";
import VariableForm from "@/components/VariableForm";
import type { Plan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import { compositionDuration, compositionSize, readVariables, setVariableValue } from "@/lib/variables";

type UsageInfo = {
  authEnabled: boolean;
  aiEnabled: boolean;
  loggedIn: boolean;
  email?: string | null;
  plan?: Plan;
  remaining?: { videos: number; aiGenerations: number };
};

const FORMATS = [
  { id: "9:16", label: "Vertical 9:16 (Reels/TikTok)", width: 1080, height: 1920 },
  { id: "16:9", label: "Horizontal 16:9 (YouTube)", width: 1920, height: 1080 },
  { id: "1:1", label: "Quadrado 1:1 (Feed)", width: 1080, height: 1080 },
];

const DRAFT_KEY = "editor-ia:rascunho";

function loadDraft(): string | null {
  try {
    return window.localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

function saveDraft(html: string) {
  try {
    window.localStorage.setItem(DRAFT_KEY, html);
  } catch {
    // Sem espaço ou navegação privada: o rascunho só não fica salvo.
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function suggestName(html: string): string {
  const firstText = readVariables(html).find((v) => v.type === "string" && v.editor !== "image" && v.default);
  return String(firstText?.default ?? "Meu vídeo").slice(0, 80);
}

export default function Editor({
  initialTemplate,
  projectId: initialProjectId,
  authEnabled,
}: {
  initialTemplate?: string;
  projectId?: string;
  authEnabled: boolean;
}) {
  const [html, setHtml] = useState(() => (getTemplate(initialTemplate ?? "") ?? TEMPLATES[0]).html);
  const [previewHtml, setPreviewHtml] = useState(html);
  const [history, setHistory] = useState<string[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState(FORMATS[0].id);
  const [duration, setDuration] = useState(8);
  const [busy, setBusy] = useState<"ai" | "render" | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "ok" | "login"; text: string } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectName, setProjectName] = useState("");
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Abre um projeto salvo na conta.
  useEffect(() => {
    if (!initialProjectId || !authEnabled) return;
    createClient()
      .from("projects")
      .select("name, html")
      .eq("id", initialProjectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setMessage({ type: "error", text: "Vídeo não encontrado na sua conta." });
          setProjectId(undefined);
          return;
        }
        setHtml(data.html);
        setPreviewHtml(data.html);
        setSavedHtml(data.html);
        setProjectName(data.name);
      });
  }, [initialProjectId, authEnabled]);

  // Recupera o rascunho salvo (só quando não veio um template nem projeto pela URL).
  useEffect(() => {
    if (initialTemplate || initialProjectId) return;
    const draft = loadDraft();
    if (draft && draft.includes("data-composition-id")) {
      setHtml(draft);
      setPreviewHtml(draft);
    }
  }, [initialTemplate, initialProjectId]);

  // Atualiza a prévia e o rascunho um pouco depois de parar de digitar.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewHtml(html);
      saveDraft(html);
    }, 500);
    return () => clearTimeout(timer);
  }, [html]);

  const refreshUsage = useCallback(async () => {
    const res = await fetch("/api/usage", { cache: "no-store" });
    if (res.ok) setUsage(await res.json());
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const variables = useMemo(() => readVariables(html), [html]);
  const size = compositionSize(html);
  const seconds = compositionDuration(html);

  function replaceHtml(next: string) {
    setHistory((h) => [...h.slice(-19), html]);
    setHtml(next);
    setPreviewHtml(next);
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setHtml(previous);
    setPreviewHtml(previous);
  }

  // Com login ligado, IA, render e salvar exigem conta. O rascunho fica no
  // navegador, então nada se perde ao ir para a tela de login.
  function needsLogin(action: string): boolean {
    if (!usage?.authEnabled || usage.loggedIn) return false;
    setMessage({ type: "login", text: `Entre na sua conta para ${action}. É grátis.` });
    return true;
  }

  async function save() {
    if (needsLogin("salvar seus vídeos")) return;
    setSaving(true);
    setMessage(null);
    const name = projectName.trim() || suggestName(html);
    const supabase = createClient();
    const { data, error } = projectId
      ? await supabase.from("projects").update({ name, html }).eq("id", projectId).select("id").single()
      : await supabase.from("projects").insert({ name, html }).select("id").single();
    setSaving(false);
    if (error || !data) {
      setMessage({ type: "error", text: "Não foi possível salvar. Tente de novo." });
      return;
    }
    setProjectName(name);
    setSavedHtml(html);
    setMessage({ type: "ok", text: "Salvo em Meus vídeos." });
    if (!projectId) {
      setProjectId(data.id);
      // Atualiza a URL sem remontar o editor.
      window.history.replaceState(null, "", `/editor?projeto=${data.id}`);
    }
  }

  async function runAi(mode: "create" | "edit") {
    if (needsLogin("usar a IA")) return;
    if (!prompt.trim()) {
      setMessage({ type: "error", text: "Escreva o que você quer no campo da IA." });
      return;
    }
    setBusy("ai");
    setMessage(null);
    const fmt = FORMATS.find((f) => f.id === format)!;
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "edit"
            ? { mode, prompt, html }
            : { mode, prompt, width: fmt.width, height: fmt.height, duration },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA.");
      replaceHtml(data.html);
      setPrompt("");
      setMessage({ type: "ok", text: mode === "edit" ? "Vídeo ajustado!" : "Vídeo criado!" });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
      refreshUsage();
    }
  }

  async function renderMp4() {
    if (needsLogin("baixar o vídeo em MP4")) return;
    setBusy("render");
    setMessage(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erro ao renderizar.");
      download(await res.blob(), "video.mp4");
      setMessage({ type: "ok", text: "Vídeo pronto! O download começou." });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
      refreshUsage();
    }
  }

  const panel = "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4";
  const button =
    "rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <Link href="/" className="font-bold">
          Editor<span className="text-cyan-400">IA</span>
        </Link>
        <div className="flex items-center gap-3 text-right text-xs text-zinc-400">
          {usage?.plan && usage.remaining ? (
            <span>
              Plano {usage.plan.name} · {usage.remaining.videos} vídeos · {usage.remaining.aiGenerations} IA
            </span>
          ) : null}
          {usage?.authEnabled ? (
            usage.loggedIn ? (
              <>
                <Link href="/projetos" className="font-semibold text-white">
                  Meus vídeos
                </Link>
                <form action="/auth/sair" method="post">
                  <button type="submit" className="hover:text-white">
                    Sair
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/entrar?next=/editor"
                className="rounded-full bg-white px-3 py-1.5 font-semibold text-zinc-900"
              >
                Entrar
              </Link>
            )
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row-reverse">
        {/* Prévia: no celular fica fixa no topo enquanto você edita. */}
        <section className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 p-3 lg:static lg:flex-1 lg:border-b-0 lg:p-6">
          <div className="mx-auto flex h-[42vh] items-center justify-center lg:h-[calc(100vh-140px)]">
            <Player html={previewHtml} />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">
            {size.width}×{size.height} · {seconds ? `${seconds}s` : "duração automática"}
          </p>
        </section>

        <aside className="w-full space-y-4 p-4 lg:h-[calc(100vh-57px)] lg:w-[420px] lg:overflow-y-auto">
          {message ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "error"
                  ? "bg-red-500/15 text-red-300"
                  : message.type === "login"
                    ? "bg-cyan-400/15 text-cyan-200"
                    : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {message.text}
              {message.type === "login" ? (
                <Link href="/entrar?next=/editor" className="ml-2 font-semibold underline">
                  Entrar
                </Link>
              ) : null}
            </div>
          ) : null}

          {authEnabled ? (
            <div className={`${panel} flex items-center gap-2`}>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={suggestName(html)}
                maxLength={120}
                aria-label="Nome do vídeo"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={`${button} shrink-0 bg-white text-zinc-900`}
              >
                {saving ? "Salvando…" : savedHtml !== null && savedHtml === html ? "Salvo ✓" : "Salvar"}
              </button>
            </div>
          ) : null}

          <div className={panel}>
            <h2 className="mb-3 font-semibold">Modelos</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => replaceHtml(t.html)}
                  className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-left text-sm hover:border-cyan-400"
                >
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-xs text-zinc-500">{t.format}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={panel}>
            <h2 className="mb-1 font-semibold">IA</h2>
            {usage && !usage.aiEnabled ? (
              <p className="mb-3 text-xs text-amber-300">IA desativada neste servidor (falta ANTHROPIC_API_KEY).</p>
            ) : (
              <p className="mb-3 text-xs text-zinc-500">
                Descreva um vídeo novo ou peça um ajuste no vídeo aberto.
              </p>
            )}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ex.: deixe o preço piscando em vermelho e troque o fundo por um gradiente roxo"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => runAi("edit")}
              className={`${button} mt-2 w-full bg-cyan-400 text-zinc-900`}
            >
              {busy === "ai" ? "A IA está trabalhando… (até 1 min)" : "Ajustar vídeo atual"}
            </button>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-zinc-400">Criar um vídeo do zero com a IA</summary>
              <div className="mt-3 space-y-2">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  {FORMATS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center justify-between text-sm text-zinc-400">
                  Duração: {duration}s
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-1/2"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => runAi("create")}
                  className={`${button} w-full border border-cyan-400 text-cyan-300`}
                >
                  Criar do zero
                </button>
              </div>
            </details>
          </div>

          <div className={panel}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Campos</h2>
              <button
                type="button"
                onClick={undo}
                disabled={history.length === 0}
                className="text-sm text-zinc-400 hover:text-white disabled:opacity-40"
              >
                ↶ Desfazer
              </button>
            </div>
            <VariableForm variables={variables} onChange={(id, value) => setHtml((h) => setVariableValue(h, id, value))} />
          </div>

          <div className={panel}>
            <h2 className="mb-3 font-semibold">Exportar</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={renderMp4}
                className={`${button} bg-white text-zinc-900`}
              >
                {busy === "render" ? "Renderizando…" : "Baixar MP4"}
              </button>
              <button
                type="button"
                onClick={() => download(new Blob([html], { type: "text/html" }), "index.html")}
                className={`${button} border border-zinc-700`}
              >
                Baixar HTML
              </button>
            </div>
            {usage?.plan?.watermark ? (
              <p className="mt-2 text-xs text-zinc-500">No plano Grátis o MP4 sai com marca d&apos;água.</p>
            ) : null}
            <p className="mt-2 text-xs text-zinc-500">
              Com o HTML você renderiza no seu computador, sem limite:{" "}
              <code className="text-zinc-400">npx hyperframes render</code>
            </p>
          </div>

          <div className={panel}>
            <button type="button" onClick={() => setShowCode((s) => !s)} className="text-sm text-zinc-400 hover:text-white">
              {showCode ? "Esconder código" : "Ver/editar código HTML (avançado)"}
            </button>
            {showCode ? (
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                spellCheck={false}
                rows={14}
                className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs"
              />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
