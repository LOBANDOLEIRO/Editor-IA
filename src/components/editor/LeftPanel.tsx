import { memo, useEffect, useMemo, useRef, useState } from "react";
import { renderScene } from "./render";
import { adaptLayers, Template, TEMPLATES } from "./templates";
import { countWords, ideasPrompt, TITLE_FORMULAS, TitleIdea } from "./titles";
import { FormatId, formatFor, ShapeKind, TextLayer } from "./types";
import { BTN, BTN_PRIMARY, INPUT, Icon, Section, Segmented } from "./ui";
import type { SampleFn } from "./platform";

export type LeftTab = "criar" | "titulos" | "vender";

export function LeftPanel(props: {
  tab: LeftTab;
  onTab: (t: LeftTab) => void;
  formatId: FormatId;
  fontsVersion: number;
  onAddText: () => void;
  onAddShape: (s: ShapeKind) => void;
  onPickImage: () => void;
  onTemplate: (t: Template) => void;
  textLayers: TextLayer[];
  targetTextId: string | null;
  onApplyTitle: (text: string, targetId: string | null) => void;
  videoTitle: string;
  onVideoTitle: (s: string) => void;
  sample: SampleFn | null;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-line px-4 py-3">
        <Segmented<LeftTab>
          label="Painel"
          size="md"
          value={props.tab}
          onChange={props.onTab}
          options={[
            { value: "criar", label: "Criar" },
            { value: "titulos", label: "Textos" },
            { value: "vender", label: "Ganhar dinheiro" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {props.tab === "criar" && (
          <>
            <Section title="Adicionar">
              <div className="grid grid-cols-3 gap-2">
                <AddButton icon="text" label="Texto" onClick={props.onAddText} />
                <AddButton icon="image" label="Imagem" onClick={props.onPickImage} />
                <AddButton icon="arrow" label="Seta" onClick={() => props.onAddShape("arrow")} />
                <AddButton icon="circle" label="Círculo" onClick={() => props.onAddShape("circle")} />
                <AddButton icon="rect" label="Caixa" onClick={() => props.onAddShape("rect")} />
                <AddButton icon="disc" label="Vinil" onClick={() => props.onAddShape("disc")} />
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Você também pode arrastar fotos para a tela ou colar com Ctrl+V.
              </p>
            </Section>
            <Section title="Modelos">
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <TemplateCard key={t.id} t={t} formatId={props.formatId} fontsVersion={props.fontsVersion} onPick={props.onTemplate} />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted">Trocar de modelo mantém as fotos que você já colocou.</p>
            </Section>
          </>
        )}
        {props.tab === "titulos" && <TitlesTab {...props} />}
        {props.tab === "vender" && <MoneyTab />}
      </div>
    </div>
  );
}

function AddButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-raised px-2 py-3 text-xs font-medium text-fg transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon name={icon} className="h-5 w-5 text-accent" />
      {label}
    </button>
  );
}

const TemplateCard = memo(function TemplateCard({
  t,
  formatId,
  fontsVersion,
  onPick,
}: {
  t: Template;
  formatId: FormatId;
  fontsVersion: number;
  onPick: (t: Template) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fmt = formatFor(formatId);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const built = t.build();
    const full = document.createElement("canvas");
    full.width = fmt.w;
    full.height = fmt.h;
    renderScene(full.getContext("2d")!, { version: 1, formatId, background: built.background, layers: adaptLayers(built.layers, "youtube", formatId) }, () => undefined);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(c.clientWidth * dpr) || 240;
    c.height = Math.round((c.width * fmt.h) / fmt.w);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(full, 0, 0, c.width, c.height);
  }, [t, formatId, fmt.w, fmt.h, fontsVersion]);

  return (
    <button
      type="button"
      onClick={() => onPick(t)}
      className="group flex flex-col gap-1.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="block w-full overflow-hidden rounded-md border border-line transition-colors group-hover:border-accent" style={{ aspectRatio: `${fmt.w} / ${fmt.h}`, maxHeight: 220 }}>
        <canvas ref={ref} className="block h-full w-full object-cover" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium">{t.name}</span>
    </button>
  );
});

// ---------- textos ----------

function TitlesTab(props: {
  textLayers: TextLayer[];
  targetTextId: string | null;
  onApplyTitle: (text: string, targetId: string | null) => void;
  videoTitle: string;
  onVideoTitle: (s: string) => void;
  sample: SampleFn | null;
}) {
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<TitleIdea[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "error">("idle");
  const [message, setMessage] = useState("");
  const [aiOff, setAiOff] = useState(false);
  const [target, setTarget] = useState<string | null>(props.targetTextId);
  const ctl = useRef<AbortController | null>(null);
  const asked = useRef(0);

  useEffect(() => {
    if (props.targetTextId) setTarget(props.targetTextId);
  }, [props.targetTextId]);

  // Sem escolha feita, o alvo é o maior texto (normalmente o título principal).
  const biggest = props.textLayers.reduce<TextLayer | null>((best, l) => (!best || l.size > best.size ? l : best), null);
  const targetLayer = props.textLayers.find((l) => l.id === target) ?? biggest;

  async function generate() {
    if (!props.sample || !topic.trim()) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setStatus("thinking");
    setMessage("");
    try {
      const fresh = asked.current > 0;
      asked.current += 1;
      const result = await props.sample.json<TitleIdea[]>(ideasPrompt(topic, props.videoTitle), {
        modelTier: "quick",
        signal: c.signal,
        ...(fresh ? { cache: false } : {}),
      });
      const clean = (Array.isArray(result) ? result : [])
        .filter((i) => i && typeof i.texto === "string")
        .map((i) => ({ texto: String(i.texto).toUpperCase().slice(0, 60), porque: String(i.porque ?? "").slice(0, 120) }))
        .slice(0, 8);
      setIdeas(clean);
      setStatus("idle");
      if (!clean.length) setMessage("Nenhuma ideia veio no formato esperado. Tente de novo.");
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "cancelled") return setStatus("idle");
      if (code === "not_granted" || code === "sampling_disabled" || code === "not_declared" || code === "capability_disabled" || code === "capability_removed") {
        setAiOff(true);
        setStatus("idle");
        return;
      }
      setStatus("error");
      setMessage(
        code === "rate_limited"
          ? "Muitos pedidos seguidos. Espere um pouco e tente de novo."
          : code === "refused"
            ? "Esse assunto não deu certo. Descreva o vídeo de outro jeito."
            : "A conexão falhou. Tente de novo."
      );
    }
  }

  const apply = (text: string) => props.onApplyTitle(text, targetLayer?.id ?? null);

  return (
    <>
      <Section title="Seu vídeo">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vtitle" className="text-xs">
            Título no YouTube
          </label>
          <input id="vtitle" className={INPUT} value={props.videoTitle} onChange={(e) => props.onVideoTitle(e.target.value)} placeholder="Aparece na prévia do celular" />
        </div>
        {props.sample && !aiOff && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="topic" className="text-xs">
              Sobre o que é o vídeo?
            </label>
            <textarea
              id="topic"
              rows={2}
              className={INPUT + " resize-y"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex.: review do álbum novo, faixa a faixa"
            />
            <div className="flex gap-2">
              <button type="button" className={BTN_PRIMARY} disabled={!topic.trim() || status === "thinking"} onClick={generate}>
                <Icon name="sparkle" /> {ideas.length ? "Gerar outras" : "Gerar ideias com IA"}
              </button>
              {status === "thinking" && (
                <button type="button" className={BTN} onClick={() => ctl.current?.abort()}>
                  Parar
                </button>
              )}
            </div>
            {status === "thinking" && <p className="text-xs text-muted">Pensando…</p>}
            {message && <p className={"text-xs " + (status === "error" ? "text-bad" : "text-muted")}>{message}</p>}
          </div>
        )}
      </Section>

      {props.textLayers.length > 1 && (
        <div className="flex flex-col gap-1.5 border-b border-line px-4 py-3">
          <label htmlFor="target" className="text-xs">
            Aplicar no texto
          </label>
          <select id="target" className={INPUT} value={targetLayer?.id ?? ""} onChange={(e) => setTarget(e.target.value)}>
            {[...props.textLayers].reverse().map((l) => (
              <option key={l.id} value={l.id}>
                {l.text.replace(/\n/g, " ").slice(0, 40) || "Texto vazio"}
              </option>
            ))}
          </select>
        </div>
      )}

      {ideas.length > 0 && (
        <Section title="Ideias da IA">
          <ul className="flex flex-col gap-1.5">
            {ideas.map((i, n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => apply(i.texto)}
                  className="flex w-full flex-col gap-0.5 rounded-md border border-line bg-raised px-3 py-2 text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="font-display text-lg leading-tight tracking-wide">{i.texto}</span>
                  {i.porque && <span className="text-xs text-muted">{i.porque}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Fórmulas que dão clique">
        <p className="text-xs leading-relaxed text-muted">
          Texto de thumbnail funciona melhor com até 5 palavras e sem repetir o título. Clique para usar.
        </p>
        {TITLE_FORMULAS.map((g) => (
          <div key={g.group} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted">{g.group}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => apply(s)}
                  className="rounded border border-line bg-raised px-2 py-1 font-display text-sm tracking-wide transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {targetLayer && (
          <p className="text-xs text-muted">
            Texto atual: <span className="text-fg">{targetLayer.text.replace(/\n/g, " ")}</span> · {countWords(targetLayer.text)} palavras
          </p>
        )}
      </Section>
    </>
  );
}

// ---------- ganhar dinheiro ----------

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const WEEKS_PER_MONTH = 52 / 12;

function MoneyTab() {
  const [price, setPrice] = useState(50);
  const [perWeek, setPerWeek] = useState(10);
  const [goal, setGoal] = useState(3000);

  const monthly = useMemo(() => price * perWeek * WEEKS_PER_MONTH, [price, perWeek]);
  const neededPerWeek = price > 0 ? Math.ceil(goal / WEEKS_PER_MONTH / price) : 0;

  return (
    <>
      <Section title="Calculadora">
        <p className="text-xs leading-relaxed text-muted">Valores de exemplo. Coloque o seu preço e o seu ritmo.</p>
        <div className="grid grid-cols-2 items-end gap-3">
          <NumberField id="price" label="Preço por thumb" prefix="R$" value={price} onChange={setPrice} />
          <NumberField id="perweek" label="Thumbs por semana" value={perWeek} onChange={setPerWeek} />
        </div>
        <div className="rounded-lg border border-line bg-bg px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">Por mês</div>
          <div className="font-display text-4xl leading-tight tracking-wide text-accent tabular-nums">{brl.format(monthly)}</div>
          <div className="text-xs text-muted tabular-nums">{brl.format(monthly * 12)} por ano</div>
        </div>
        <NumberField id="goal" label="Quanto você quer ganhar por mês" prefix="R$" value={goal} onChange={setGoal} />
        <p className="text-sm">
          Para chegar lá, venda <strong className="tabular-nums text-accent">{neededPerWeek}</strong> thumbnails por semana a {brl.format(price)}.
        </p>
      </Section>
      <Section title="Como conseguir clientes">
        <ol className="flex list-decimal flex-col gap-2.5 pl-4 text-sm leading-relaxed marker:text-muted">
          <li>Monte um portfólio: refaça 10 thumbnails de vídeos reais do seu nicho e mostre o antes e o depois.</li>
          <li>Procure canais pequenos que postam toda semana e ainda fazem a própria thumbnail.</li>
          <li>Ofereça um pacote mensal (por exemplo, 8 thumbnails) em vez de vender uma por vez.</li>
          <li>Peça para o cliente acompanhar a taxa de cliques (CTR) no YouTube Studio e use o resultado para subir o preço.</li>
        </ol>
      </Section>
      <Section title="No seu próprio canal">
        <p className="text-sm leading-relaxed">
          A thumbnail decide se a pessoa clica. Teste duas versões do mesmo vídeo com o recurso de testar miniaturas do YouTube Studio e fique com a que tiver mais tempo de exibição.
        </p>
      </Section>
    </>
  );
}

function NumberField({ id, label, value, onChange, prefix }: { id: string; label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs">
        {label}
      </label>
      <div className="flex items-center rounded-md border border-line bg-bg focus-within:border-accent">
        {prefix && <span className="pl-2.5 text-xs text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full min-w-0 bg-transparent px-2.5 py-1.5 text-sm tabular-nums text-fg focus:outline-none"
        />
      </div>
    </div>
  );
}
