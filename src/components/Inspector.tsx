"use client";
import { useState } from "react";
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
  const [size, setSize] = useState<0 | 1 | 2>(1);
  const height = size === 0 ? "h-[37px]" : size === 1 ? "h-[310px] max-h-[55dvh]" : "h-[68dvh]";

  return (
    <section className={`flex ${height} shrink-0 flex-col border-t border-studio-line bg-studio-panel`}>
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-studio-line px-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              set({ inspectorTab: id });
              if (size === 0) setSize(1);
            }}
            className={`whitespace-nowrap px-3 py-2 text-xs font-semibold ${inspectorTab === id ? "border-b-2 border-studio-accent text-studio-text" : "text-studio-dim hover:text-studio-text"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto hidden truncate pl-2 text-[11px] text-studio-dim md:inline">
          {track ? `Faixa: ${track.name}` : "Nenhuma faixa selecionada"}
          {clip ? ` · Clip: ${clip.name}` : ""}
        </span>
        <div className="ml-auto flex shrink-0 gap-1 md:ml-2">
          <button className="btn h-6 w-7 p-0" title="Recolher painel" disabled={size === 0} onClick={() => setSize((size - 1) as 0 | 1)}>
            ▾
          </button>
          <button className="btn h-6 w-7 p-0" title="Aumentar painel" disabled={size === 2} onClick={() => setSize((size + 1) as 1 | 2)}>
            ▴
          </button>
        </div>
      </div>
      <div className={`min-h-0 flex-1 overflow-auto p-3 ${size === 0 ? "hidden" : ""}`}>
        {inspectorTab === "mixer" && <Mixer />}
        {inspectorTab === "fx" && <EffectsPanel />}
        {inspectorTab === "clip" && <ClipPanel />}
        {inspectorTab === "tune" && <TunePanel />}
      </div>
    </section>
  );
}
