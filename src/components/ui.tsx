"use client";
import { useStudio } from "@/lib/store";

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  format,
  onChange,
  reset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  reset?: number;
}) {
  const checkpoint = useStudio((s) => s.checkpoint);
  return (
    <label className="block min-w-[120px] flex-1">
      <span className="label flex justify-between">
        {label}
        <span className="font-mono normal-case text-studio-text">{format ? format(value) : value.toFixed(step < 1 ? 1 : 0)}</span>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={checkpoint}
        onDoubleClick={() => reset !== undefined && onChange(reset)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function FxBox({
  title,
  active,
  onToggle,
  children,
}: {
  title: string;
  active?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 rounded-md border bg-studio-panel2 p-3 ${active ? "border-studio-accent/50" : "border-studio-line"}`}>
      <div className="flex items-center justify-between">
        <h4 className="panel-title">{title}</h4>
        {onToggle && (
          <button
            className={`h-4 w-8 rounded-full p-0.5 transition ${active ? "bg-studio-accent" : "bg-studio-bg"}`}
            onClick={onToggle}
            title={active ? "Desligar" : "Ligar"}
          >
            <span className={`block h-3 w-3 rounded-full bg-white transition ${active ? "translate-x-4" : ""}`} />
          </button>
        )}
      </div>
      <div className={`flex flex-wrap gap-3 ${active === false ? "opacity-45" : ""}`}>{children}</div>
    </div>
  );
}

export const fmtDb = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`;
export const fmtHz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);
export const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

/** Escala logarítmica para frequência num slider 0..1 */
export const freqFromUnit = (u: number) => 20 * Math.pow(1000, u);
export const unitFromFreq = (f: number) => Math.log(f / 20) / Math.log(1000);
