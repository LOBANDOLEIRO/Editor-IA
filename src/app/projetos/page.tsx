import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProjectList from "@/components/ProjectList";
import { authEnabled } from "@/lib/supabase/config";
import { getAccount } from "@/lib/usage";

export const metadata: Metadata = { title: "Meus vídeos — Editor IA" };

export default async function ProjetosPage() {
  if (!authEnabled) redirect("/editor");
  const account = await getAccount();
  if (!account) redirect("/entrar?next=/projetos");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="font-bold">
          Editor<span className="text-cyan-400">IA</span>
        </Link>
        <Link href="/editor?novo=1" className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-900">
          + Novo vídeo
        </Link>
      </header>
      <h1 className="text-2xl font-bold">Meus vídeos</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-400">
        {account.email} · Plano {account.plan.name}
      </p>
      <ProjectList />
    </main>
  );
}
