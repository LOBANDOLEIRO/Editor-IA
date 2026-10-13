"use client";

import type { CompositionVariable } from "@/lib/variables";

// Formulário montado a partir das variáveis declaradas na composição.

const MAX_IMAGE_SIDE = 1600;

async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // PNG mantém a transparência (ex.: produto sem fundo); o resto vira JPEG, que é bem menor.
  return file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}

export default function VariableForm({
  variables,
  onChange,
}: {
  variables: CompositionVariable[];
  onChange: (id: string, value: string | number) => void;
}) {
  if (variables.length === 0) {
    return <p className="text-sm text-zinc-500">Este vídeo não tem campos editáveis. Use a IA para ajustar.</p>;
  }

  return (
    <div className="space-y-4">
      {variables.map((v) => {
        const label = v.label || v.id;
        const value = v.default ?? "";
        const inputClass =
          "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-base outline-none focus:border-cyan-400";

        if (v.editor === "image") {
          return (
            <div key={v.id}>
              <span className="mb-1 block text-sm text-zinc-400">{label}</span>
              <div className="flex items-center gap-3">
                {value ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(value)} alt="" className="h-14 w-14 rounded-lg bg-zinc-800 object-contain" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">
                    vazio
                  </div>
                )}
                <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:border-cyan-400">
                  Enviar imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) onChange(v.id, await resizeImage(file));
                      e.target.value = "";
                    }}
                  />
                </label>
                {value ? (
                  <button type="button" className="text-sm text-zinc-400 hover:text-white" onClick={() => onChange(v.id, "")}>
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
          );
        }

        if (v.type === "color") {
          return (
            <label key={v.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-400">{label}</span>
              <input
                type="color"
                value={String(value) || "#000000"}
                onChange={(e) => onChange(v.id, e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-zinc-700 bg-transparent"
              />
            </label>
          );
        }

        if (v.type === "number") {
          return (
            <label key={v.id} className="block">
              <span className="mb-1 block text-sm text-zinc-400">{label}</span>
              <input
                type="number"
                value={String(value)}
                onChange={(e) => onChange(v.id, e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass}
              />
            </label>
          );
        }

        const long = String(value).length > 40 || v.editor === "textarea";
        return (
          <label key={v.id} className="block">
            <span className="mb-1 block text-sm text-zinc-400">{label}</span>
            {long ? (
              <textarea
                rows={3}
                value={String(value)}
                onChange={(e) => onChange(v.id, e.target.value)}
                className={inputClass}
              />
            ) : (
              <input
                type="text"
                value={String(value)}
                onChange={(e) => onChange(v.id, e.target.value)}
                className={inputClass}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
