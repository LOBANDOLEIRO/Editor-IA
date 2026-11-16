"use client";
import dynamic from "next/dynamic";

// O estúdio usa Web Audio / microfone: só no navegador.
const Studio = dynamic(() => import("@/components/Studio"), {
  ssr: false,
  loading: () => <div className="grid h-screen place-items-center text-sm text-studio-dim">Carregando estúdio…</div>,
});

export default function Page() {
  return <Studio />;
}
