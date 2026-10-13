"use client";

import { useEffect, useState } from "react";
import { compositionSize } from "@/lib/variables";

// Prévia com o player oficial do HyperFrames (<hyperframes-player>).
// O HTML roda num iframe isolado (sandbox opaco), já que pode ter sido
// escrito pela IA.

export default function Player({ html }: { html: string }) {
  const [ready, setReady] = useState(false);
  const { width, height } = compositionSize(html);

  useEffect(() => {
    import("@hyperframes/player").then(() => setReady(true));
  }, []);

  return (
    <div
      className="relative mx-auto h-full max-w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {ready ? (
        <hyperframes-player
          key={html}
          srcdoc={html}
          width={String(width)}
          height={String(height)}
          controls=""
          autoplay=""
          loop=""
          muted=""
          sandbox-origin="opaque"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">Carregando prévia…</div>
      )}
    </div>
  );
}
