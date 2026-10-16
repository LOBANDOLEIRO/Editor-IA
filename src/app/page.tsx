"use client";

import dynamic from "next/dynamic";

// O editor usa canvas e IndexedDB, então roda só no navegador.
const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <p className="app text-sm text-muted">Abrindo o editor…</p>,
});

export default function Page() {
  return <Editor />;
}
