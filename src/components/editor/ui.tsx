import { ReactNode } from "react";

export const BTN =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-line bg-raised text-xs font-medium text-fg " +
  "hover:border-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-accent text-accent-ink text-xs font-semibold " +
  "hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg " +
  "disabled:opacity-40 disabled:cursor-not-allowed";

export const ICON_BTN =
  "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted hover:text-fg hover:bg-raised " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30 disabled:cursor-not-allowed";

export const INPUT =
  "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-fg placeholder:text-muted " +
  "focus:outline-none focus:border-accent";

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4 last:border-b-0">
      <header className="flex min-h-[20px] items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Slider(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  digits?: number;
  onChange: (v: number) => void;
}) {
  const { id, label, value, min, max, step = 1, unit = "", digits = 0, onChange } = props;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono text-[11px] tabular-nums text-muted">
          {value.toFixed(digits)}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

const SWATCHES = ["#ffffff", "#111111", "#ffe600", "#ff2b2b", "#f0dabd", "#2fd27a", "#2d7bff", "#ff8a00"];

export function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const current = value.toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1">
        <input
          id={id}
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="mr-1 h-7 w-9 cursor-pointer rounded border border-line bg-transparent p-0.5"
        />
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Usar a cor ${c}`}
            title={c}
            onClick={() => onChange(c)}
            className={
              "h-[22px] w-[22px] rounded-full border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
              (current === c ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : "")
            }
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
      <span>{label}</span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full border border-line bg-raised transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="pointer-events-none absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full bg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-accent-ink" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const { label, value, options, onChange, size = "sm" } = props;
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-bg p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={
              (size === "md" ? "h-8 px-3 text-xs " : "h-7 px-2.5 text-xs ") +
              "inline-flex items-center gap-1.5 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
              (on ? "bg-raised text-fg shadow-[inset_0_0_0_1px_var(--line)]" : "text-muted hover:text-fg")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const PATHS: Record<string, ReactNode> = {
  undo: <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: <path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  flip: <path d="M12 3v18M8 7 3 12l5 5V7ZM16 7l5 5-5 5V7Z" />,
  text: <path d="M5 6V4h14v2M12 4v16M9 20h6" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  arrow: <path d="M3 12h14M12 6l6 6-6 6" />,
  circle: <circle cx="12" cy="12" r="8" />,
  rect: <rect x="4" y="6" width="16" height="12" rx="2" />,
  disc: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  center: <path d="M12 3v18M7 8h10v8H7z" />,
  middle: <path d="M3 12h18M8 7h8v10H8z" />,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
