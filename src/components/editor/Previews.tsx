import { layerBox, timestampZone, worldBounds } from "./render";
import { countWords } from "./titles";
import { Format, Project } from "./types";

export interface FileSizes {
  jpg: number;
  png: number;
}

const kb = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1000)} KB`);

export function Previews(props: {
  project: Project;
  format: Format;
  videoTitle: string;
  register: (c: HTMLCanvasElement | null) => void;
  sizes: FileSizes | null;
}) {
  const { format: fmt } = props;
  const vertical = fmt.h > fmt.w;
  const title = props.videoTitle.trim() || "Título do seu vídeo aparece aqui";
  return (
    <div className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">No celular, em tamanho real</h3>
        {vertical ? (
          <div className="flex items-end gap-3">
            <div className="relative w-[118px] shrink-0 overflow-hidden rounded-lg" style={{ aspectRatio: `${fmt.w} / ${fmt.h}` }}>
              <canvas ref={props.register} className="block h-full w-full" aria-label="Prévia vertical" />
            </div>
            <p className="min-w-0 text-xs leading-relaxed text-muted">
              Tamanho de capa na aba Shorts e no perfil. Se você não consegue ler aqui, o público também não consegue.
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex w-full max-w-[340px] flex-col gap-2">
              <Thumb register={props.register} fmt={fmt} showTime={fmt.id === "youtube"} className="w-full rounded-xl" />
              <div className="flex gap-2.5">
                <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-raised" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug">{title}</p>
                  <p className="text-[11px] text-muted">Seu canal · 12 mil visualizações · há 2 horas</p>
                </div>
              </div>
            </div>
            <div className="flex max-w-[340px] gap-2">
              <Thumb register={props.register} fmt={fmt} showTime={fmt.id === "youtube"} className="w-[168px] shrink-0 rounded-lg" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{title}</p>
                <p className="text-[11px] text-muted">Seu canal</p>
                <p className="text-[11px] text-muted">Vídeos sugeridos</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Checklist project={props.project} fmt={fmt} sizes={props.sizes} />
    </div>
  );
}

function Thumb({ register, fmt, showTime, className }: { register: (c: HTMLCanvasElement | null) => void; fmt: Format; showTime: boolean; className: string }) {
  return (
    <div className={"relative overflow-hidden " + className} style={{ aspectRatio: `${fmt.w} / ${fmt.h}` }}>
      <canvas ref={register} className="block h-full w-full" aria-label="Prévia da thumbnail" />
      {showTime && (
        <span className="absolute bottom-1 right-1 rounded bg-[rgba(0,0,0,0.8)] px-1 py-px font-mono text-[10px] font-medium text-[#fff]">12:34</span>
      )}
    </div>
  );
}

type Status = "ok" | "warn" | "bad";

function Checklist({ project, fmt, sizes }: { project: Project; fmt: Format; sizes: FileSizes | null }) {
  const texts = project.layers.filter((l) => l.visible && l.kind === "text" && l.text.trim());
  const words = texts.reduce((n, l) => n + (l.kind === "text" ? countWords(l.text) : 0), 0);
  // Tamanho equivalente numa thumb de 1280 px de largura.
  const minSize = texts.reduce((m, l) => (l.kind === "text" ? Math.min(m, (l.size * 1280) / fmt.w) : m), Infinity);
  const z = timestampZone(fmt.w, fmt.h);
  const underClock = project.layers.some((l) => {
    if (!l.visible || l.kind !== "text") return false;
    const b = worldBounds(l);
    return b.right > z.left && b.bottom > z.top && layerBox(l).w > 0;
  });

  const items: { status: Status; title: string; detail: string }[] = [];

  items.push(
    fmt.id === "youtube"
      ? { status: "ok", title: "1280 × 720 px", detail: "Tamanho recomendado pelo YouTube." }
      : { status: "ok", title: `${fmt.w} × ${fmt.h} px`, detail: `${fmt.ratio} para ${fmt.where.toLowerCase()}.` }
  );

  items.push(
    words === 0
      ? { status: "warn", title: "Sem texto", detail: "Funciona em alguns nichos, mas 2 a 5 palavras costumam ajudar." }
      : words <= 6
        ? { status: "ok", title: `Texto curto · ${words} palavras`, detail: "Dá para ler num relance." }
        : words <= 9
          ? { status: "warn", title: `${words} palavras`, detail: "Tente cortar para 5. O título já explica o resto." }
          : { status: "bad", title: `${words} palavras`, detail: "Texto demais para uma tela de celular." }
  );

  if (texts.length) {
    items.push(
      minSize >= 48
        ? { status: "ok", title: "Letras grandes", detail: "Todo texto continua legível pequeno." }
        : minSize >= 32
          ? { status: "warn", title: "Algum texto pequeno", detail: "Confira a prévia ao lado. Aumente se estiver difícil de ler." }
          : { status: "bad", title: "Texto pequeno demais", detail: "Some no celular. Aumente ou apague." }
    );
  }

  if (fmt.id === "youtube") {
    items.push(
      underClock
        ? { status: "warn", title: "Texto no canto do tempo", detail: "O YouTube cobre o canto de baixo à direita com a duração do vídeo." }
        : { status: "ok", title: "Canto do tempo livre", detail: "Nada importante fica embaixo da duração." }
    );
  }

  if (sizes) {
    const limit = 2_000_000;
    items.push(
      sizes.jpg <= limit
        ? { status: "ok", title: `JPG ${kb(sizes.jpg)} · PNG ${kb(sizes.png)}`, detail: sizes.png <= limit ? "Os dois cabem no limite de 2 MB do YouTube." : "Envie em JPG: o PNG passa de 2 MB." }
        : { status: "bad", title: `JPG ${kb(sizes.jpg)}`, detail: "Acima de 2 MB. O botão JPG reduz a qualidade até caber." }
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Pronta para publicar?</h3>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.title} className="flex gap-2.5">
            <StatusDot status={i.status} />
            <div className="min-w-0">
              <p className="text-xs font-medium">{i.title}</p>
              <p className="text-xs leading-snug text-muted">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const label = { ok: "Certo", warn: "Atenção", bad: "Problema" }[status];
  const color = { ok: "bg-good", warn: "bg-warn", bad: "bg-bad" }[status];
  const mark = { ok: "✓", warn: "!", bad: "×" }[status];
  return (
    <span className={"mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-bg " + color} aria-label={label} title={label}>
      {mark}
    </span>
  );
}
