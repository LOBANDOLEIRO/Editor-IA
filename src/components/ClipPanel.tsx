"use client";
import { engine } from "@/lib/audio/engine";
import { formatTime } from "@/lib/music";
import { useStudio } from "@/lib/store";
import { normalizeClip } from "@/lib/transport";
import { FxBox, Slider } from "./ui";

export default function ClipPanel() {
  const { clips, selectedClipId, updateClip, splitClip, duplicateClip, removeClip, checkpoint, set } = useStudio();
  const clip = clips.find((c) => c.id === selectedClipId);
  if (!clip) return <p className="text-xs text-studio-dim">Clique num clip da timeline para editar volume, fades e cortes.</p>;
  const db = 20 * Math.log10(Math.max(clip.gain, 1e-4));
  const maxFade = Math.max(0.01, Math.min(10, clip.duration));

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <FxBox title="Clip">
        <label className="block w-full">
          <span className="label">Nome</span>
          <input className="input" value={clip.name} onFocus={checkpoint} onChange={(e) => updateClip(clip.id, { name: e.target.value })} />
        </label>
        <p className="w-full text-[11px] text-studio-dim">
          Início {formatTime(clip.start)} · duração {clip.duration.toFixed(2)}s
        </p>
        <Slider label="Volume do clip" min={-24} max={18} step={0.1} value={db} format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`} reset={0} onChange={(v) => updateClip(clip.id, { gain: Math.pow(10, v / 20) })} />
      </FxBox>
      <FxBox title="Fades">
        <Slider label="Fade in" min={0} max={maxFade} step={0.01} value={clip.fadeIn} format={(v) => `${v.toFixed(2)}s`} reset={0} onChange={(v) => updateClip(clip.id, { fadeIn: Math.min(v, clip.duration - clip.fadeOut) })} />
        <Slider label="Fade out" min={0} max={maxFade} step={0.01} value={clip.fadeOut} format={(v) => `${v.toFixed(2)}s`} reset={0} onChange={(v) => updateClip(clip.id, { fadeOut: Math.min(v, clip.duration - clip.fadeIn) })} />
        <p className="w-full text-[10px] text-studio-dim">Dica: arraste os quadradinhos brancos no topo do clip.</p>
      </FxBox>
      <FxBox title="Edição">
        <div className="grid w-full grid-cols-2 gap-1.5">
          <button className="btn" onClick={() => splitClip(clip.id, engine.getPosition())}>
            ✂ Cortar no cursor (S)
          </button>
          <button className="btn" onClick={() => duplicateClip(clip.id)}>
            ⧉ Duplicar (Ctrl+D)
          </button>
          <button className="btn" onClick={() => normalizeClip(clip.id)}>
            ⇲ Normalizar
          </button>
          <button className="btn" onClick={() => set({ inspectorTab: "tune" })}>
            ♪ Corrigir afinação
          </button>
          <button className="btn col-span-2 hover:border-studio-rec hover:text-studio-rec" onClick={() => removeClip(clip.id)}>
            🗑 Apagar clip (Del)
          </button>
        </div>
      </FxBox>
    </div>
  );
}
