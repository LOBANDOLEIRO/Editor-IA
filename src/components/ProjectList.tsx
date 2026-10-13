"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProjectRow = { id: string; name: string; updated_at: string };

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("projects")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("Não foi possível carregar seus vídeos.");
        else setProjects(data as ProjectRow[]);
      });
  }, []);

  async function remove(project: ProjectRow) {
    if (!window.confirm(`Apagar "${project.name}"? Isso não pode ser desfeito.`)) return;
    const { error } = await createClient().from("projects").delete().eq("id", project.id);
    if (error) setError("Não foi possível apagar.");
    else setProjects((list) => list?.filter((p) => p.id !== project.id) ?? null);
  }

  if (error) return <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>;
  if (!projects) return <p className="text-sm text-zinc-500">Carregando…</p>;
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
        Você ainda não salvou nenhum vídeo.{" "}
        <Link href="/editor?novo=1" className="text-cyan-400 underline">
          Criar o primeiro
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/60">
      {projects.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href={`/editor?projeto=${p.id}`} className="min-w-0 flex-1">
            <span className="block truncate font-medium">{p.name}</span>
            <span className="block text-xs text-zinc-500">
              Editado em {new Date(p.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </Link>
          <button type="button" onClick={() => remove(p)} className="text-sm text-zinc-500 hover:text-red-300">
            Apagar
          </button>
        </li>
      ))}
    </ul>
  );
}
