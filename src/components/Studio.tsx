"use client";
import { useEffect, useState } from "react";
import { engine } from "@/lib/audio/engine";
import { useStudio } from "@/lib/store";
import { record, seek, stop, togglePlay } from "@/lib/transport";
import TopBar from "./TopBar";
import GeneratorPanel from "./GeneratorPanel";
import LyricsPanel from "./LyricsPanel";
import Timeline from "./Timeline";
import Inspector from "./Inspector";

export default function Studio() {
  const [tab, setTab] = useState<"beat" | "letra">("beat");
  const toast = useStudio((s) => s.toast);

  // mantém o motor de áudio sincronizado com o estado
  useEffect(() => {
    return useStudio.subscribe((s, prev) => {
      if (s.tracks !== prev.tracks) engine.syncTracks(s.tracks);
      if (s.bpm !== prev.bpm) engine.bpm = s.bpm;
      if (s.metronome !== prev.metronome) engine.metronomeOn = s.metronome;
      if (s.clips !== prev.clips && s.playing && !s.recording) void engine.restart(s.clips, s.tracks);
    });
  }, []);

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const s = useStudio.getState();
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      } else if (e.key === "r" || e.key === "R") {
        void record();
      } else if (e.key === "Enter") {
        void stop().then(() => seek(0));
      } else if (e.key === "m" || e.key === "M") {
        s.set({ metronome: !s.metronome });
      } else if ((e.key === "s" || e.key === "S") && s.selectedClipId) {
        s.splitClip(s.selectedClipId, engine.getPosition());
      } else if ((e.key === "Delete" || e.key === "Backspace") && s.selectedClipId) {
        s.removeClip(s.selectedClipId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-studio-bg">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-80 shrink-0 flex-col border-r border-studio-line bg-studio-panel">
          <div className="flex border-b border-studio-line">
            {(
              [
                ["beat", "Beat IA"],
                ["letra", "Letra"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 py-2.5 text-xs font-semibold ${tab === id ? "border-b-2 border-studio-accent text-studio-text" : "text-studio-dim"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={tab === "beat" ? "" : "hidden"}>
              <GeneratorPanel />
            </div>
            <div className={tab === "letra" ? "" : "hidden"}>
              <LyricsPanel />
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <Timeline />
          <Inspector />
        </main>
      </div>
      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-studio-line bg-studio-panel2 px-4 py-2 text-xs shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
