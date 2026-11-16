"use client";
import { useStudio, type InspectorTab } from "@/lib/store";
import ClipPanel from "./ClipPanel";
import EffectsPanel from "./EffectsPanel";
import Mixer from "./Mixer";
import TunePanel from "./TunePanel";

const TABS: [InspectorTab, string][] = [
  ["mixer", "🎚 Mixer"],
  ["fx", "✦ Efeitos & presets"],
  ["clip", "▭ Clip"],
  ["tune", "♪ Afinação"],
];

export default function Inspector() {
  const { tracks, clips, selectedTrackId, selectedClipId, inspectorTab, set } = useStudio();
  const track = tracks.find((t) => t.id === selectedTrackId);
  const clip = clips.find((c) => c.id === selectedClipId);

  return (
    <section className="flex h-[310px] shrink-0 flex-col border-t border-studio-line bg-studio-panel">
      <div className="flex items-center gap-1 border-b border-studio-line px-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => set({ inspectorTab: id })}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold ${inspectorTab === id ? "border-b-2 border-studio-accent text-studio-text" : "text-studio-dim hover:text-studio-text"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto truncate pl-2 text-[11px] text-studio-dim">
          {track ? `Faixa: ${track.name}` : "Nenhuma faixa selecionada"}
          {clip ? ` · Clip: ${clip.name}` : ""}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {inspectorTab === "mixer" && <Mixer />}
        {inspectorTab === "fx" && <EffectsPanel />}
        {inspectorTab === "clip" && <ClipPanel />}
        {inspectorTab === "tune" && <TunePanel />}
      </div>
    </section>
  );
}
