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
import ClipMenu from "./ClipMenu";

export default function Studio() {
  const [tab, setTab] = useState<"beat" | "letra">("beat");
  const [sidebar, setSidebar] = useState(true);
  const toast = useStudio((s) => s.toast);

  // mantém o motor de áudio sincronizado com o estado
  useEffect(() => {
    return useStudio.subscribe((s, prev) => {
      if (s.bpm !== prev.bpm) engine.bpm = s.bpm;
      if (s.tracks !== prev.tracks || s.bpm !== prev.bpm) engine.syncTracks(s.tracks);
      if (s.metronome !== prev.metronome) engine.metronomeOn = s.metronome;
      if (s.masterVolume !== prev.masterVolume) engine.setMasterVolume(s.masterVolume);
      const loopChanged = s.loop !== prev.loop || s.loopOn !== prev.loopOn;
      if ((s.clips !== prev.clips || loopChanged) && s.playing && !s.recording) {
        void engine.restart(s.clips, s.tracks, s.loopOn ? s.loop : null);
      }
    });
  }, []);

  // atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const s = useStudio.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        s.undo();
      } else if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        s.redo();
      } else if (mod && k === "c" && s.selectedClipId) {
        s.copyClip(s.selectedClipId);
        s.notify("Clip copiado.");
      } else if (mod && k === "v") {
        e.preventDefault();
        s.paste(engine.getPosition());
      } else if (mod && k === "d" && s.selectedClipId) {
        e.preventDefault();
        s.duplicateClip(s.selectedClipId);
      } else if (mod) {
        return;
      } else if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      } else if (k === "r") {
        void record();
      } else if (e.key === "Enter") {
        void stop().then(() => seek(0));
      } else if (k === "m") {
        s.set({ metronome: !s.metronome });
      } else if (k === "l") {
        if (s.loop) s.set({ loopOn: !s.loopOn });
        else s.notify("Arraste na régua para criar a região de loop.");
      } else if (k === "v") {
        s.set({ tool: "select" });
      } else if (k === "c") {
        s.set({ tool: "cut" });
      } else if (k === "s" && s.selectedClipId) {
        s.splitClip(s.selectedClipId, engine.getPosition());
      } else if ((e.key === "Delete" || e.key === "Backspace") && s.selectedClipId) {
        s.removeClip(s.selectedClipId);
      } else if (e.key === "+" || e.key === "=") {
        s.set({ pps: Math.min(400, s.pps * 1.25) });
      } else if (e.key === "-") {
        s.set({ pps: Math.max(6, s.pps / 1.25) });
      } else if (e.key === "Escape") {
        s.set({ menu: null, tool: "select" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-studio-bg" onClick={() => useStudio.getState().menu && useStudio.getState().set({ menu: null })}>
      <TopBar sidebar={sidebar} onToggleSidebar={() => setSidebar(!sidebar)} />
      <div className="flex min-h-0 flex-1">
        <aside className={`${sidebar ? "flex" : "hidden"} w-80 shrink-0 flex-col border-r border-studio-line bg-studio-panel`}>
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
      <ClipMenu />
      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-studio-line bg-studio-panel2 px-4 py-2 text-xs shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
