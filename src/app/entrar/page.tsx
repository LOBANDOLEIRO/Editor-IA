import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { safeNext } from "@/lib/safe-next";
import { authEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar — Editor IA" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 text-center text-lg font-bold">
        Editor<span className="text-cyan-400">IA</span>
      </Link>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h1 className="text-xl font-bold">Entrar ou criar conta</h1>
        <p className="mt-1 text-sm text-zinc-400">Sem senha: enviamos um código para o seu e-mail.</p>
        {erro === "link" ? (
          <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
            O link expirou ou já foi usado. Peça um novo código.
          </p>
        ) : null}
        {authEnabled ? (
          <LoginForm next={safeNext(next)} />
        ) : (
          <p className="mt-4 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
            Login desativado neste servidor (Supabase não configurado). Você pode usar o editor normalmente.
          </p>
        )}
      </div>
    </main>
  );
}
