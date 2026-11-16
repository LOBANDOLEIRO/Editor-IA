"use client";
import { useStudio } from "@/lib/store";
import { normalizeClip } from "@/lib/transport";

/** Menu de contexto (botão direito) dos clips. */
export default function ClipMenu() {
  const s = useStudio();
  const m = s.menu;
  if (!m) return null;
  const clip = s.clips.find((c) => c.id === m.clipId);
  if (!clip) return null;
  const close = () => s.set({ menu: null });
  const items: [string, string, () => void][] = [
    ["✂ Cortar aqui", "C", () => s.splitClip(clip.id, m.at)],
    ["⧉ Duplicar", "Ctrl+D", () => s.duplicateClip(clip.id)],
    ["⎘ Copiar", "Ctrl+C", () => s.copyClip(clip.id)],
    ["⇲ Normalizar volume", "", () => normalizeClip(clip.id)],
    [
      "◢ Fade in/out curtos",
      "",
      () => {
        s.checkpoint();
        s.updateClip(clip.id, { fadeIn: Math.min(0.05, clip.duration / 4), fadeOut: Math.min(0.08, clip.duration / 4) });
      },
    ],
    ["🗑 Apagar", "Del", () => s.removeClip(clip.id)],
  ];
  return (
    <div
      className="fixed z-50 min-w-[200px] overflow-hidden rounded-md border border-studio-line bg-studio-panel2 py-1 text-xs shadow-2xl"
      style={{ left: Math.min(m.x, window.innerWidth - 220), top: Math.min(m.y, window.innerHeight - 220) }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="truncate px-3 py-1 text-[10px] uppercase tracking-wider text-studio-dim">{clip.name}</p>
      {items.map(([label, key, fn]) => (
        <button
          key={label}
          className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-studio-accent hover:text-black"
          onClick={() => {
            fn();
            close();
          }}
        >
          <span>{label}</span>
          <span className="text-[10px] opacity-60">{key}</span>
        </button>
      ))}
    </div>
  );
}
