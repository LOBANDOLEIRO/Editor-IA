"use client";
import { useState } from "react";
import { flowApi } from "@/lib/flow/client";
import { useStudio } from "@/lib/store";

export default function LyricsPanel() {
  const { lyrics, set, notify } = useStudio();
  const [theme, setTheme] = useState("");
  const [structure, setStructure] = useState("Verso 1 / Refrão / Verso 2 / Refrão / Ponte / Refrão");
  const [soundPrompt, setSoundPrompt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const r = await flowApi.lyrics({
        prompt: `${theme}. Letra em português do Brasil.`,
        structure,
      });
      set({ lyrics: (r.title ? `# ${r.title}\n` : "") + r.lyrics });
      setSoundPrompt(r.sound_prompt ?? null);
    } catch (e) {
      notify(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="panel-title">Letra</h3>
      <div>
        <span className="label">Tema</span>
        <textarea
          className="input h-16 resize-none"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="ex.: superação, saí da quebrada e venci, tom confiante"
        />
      </div>
      <div>
        <span className="label">Estrutura</span>
        <input className="input" value={structure} onChange={(e) => setStructure(e.target.value)} />
      </div>
      <button className="btn-accent w-full py-2" disabled={busy || !theme.trim()} onClick={() => void generate()}>
        {busy ? "Escrevendo…" : "✎ Gerar letra com IA"}
      </button>
      {soundPrompt && (
        <p className="rounded bg-studio-bg p-2 text-[10px] text-studio-dim">
          <b className="text-studio-text">Sugestão de som:</b> {soundPrompt}
        </p>
      )}
      <div>
        <span className="label">Sua letra (editável — fica visível enquanto você grava)</span>
        <textarea
          className="input h-[22rem] resize-y font-mono leading-relaxed"
          value={lyrics}
          onChange={(e) => set({ lyrics: e.target.value })}
          placeholder={"[Verso 1]\nEscreva aqui ou gere com a IA…"}
        />
      </div>
    </div>
  );
}
