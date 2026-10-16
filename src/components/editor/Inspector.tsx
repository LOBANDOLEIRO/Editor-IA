import { RefObject } from "react";
import { BACKGROUND_ID, Background, FONTS, ImageLayer, Layer, ShapeLayer, TextLayer } from "./types";
import { BTN, ColorField, ICON_BTN, INPUT, Icon, Section, Segmented, Slider, Toggle } from "./ui";
import { countWords } from "./titles";

type Patch = (patch: Partial<Layer>, key?: string) => void;

export function Inspector(props: {
  layer: Layer | null;
  background: Background;
  isBackground: boolean;
  formatW: number;
  formatH: number;
  textRef: RefObject<HTMLTextAreaElement | null>;
  onLayer: (id: string, patch: Partial<Layer>, key?: string) => void;
  onBackground: (patch: Partial<Background>, key?: string) => void;
  onPickBackground: () => void;
  onImageToBackground: (l: ImageLayer) => void;
}) {
  const { layer, background, isBackground } = props;

  if (!layer || isBackground) {
    return (
      <BackgroundPanel
        bg={background}
        onChange={props.onBackground}
        onPick={props.onPickBackground}
        highlighted={isBackground}
      />
    );
  }

  const set: Patch = (patch, key) => props.onLayer(layer.id, patch, key ?? `${layer.id}-${Object.keys(patch).join(",")}`);

  return (
    <>
      {layer.kind === "text" && <TextPanel l={layer} set={set} textRef={props.textRef} />}
      {layer.kind === "image" && <ImagePanel l={layer} set={set} toBackground={() => props.onImageToBackground(layer)} />}
      {layer.kind === "shape" && <ShapePanel l={layer} set={set} />}
      <Section title="Posição">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs">Centralizar</span>
          <div className="flex gap-1.5">
            <button type="button" className={BTN} onClick={() => set({ x: Math.round(props.formatW / 2) })} title="Centralizar na horizontal">
              <Icon name="center" /> Horizontal
            </button>
            <button type="button" className={BTN} onClick={() => set({ y: Math.round(props.formatH / 2) })} title="Centralizar na vertical">
              <Icon name="middle" /> Vertical
            </button>
          </div>
        </div>
        <Slider id="rot" label="Rotação" value={layer.rotation} min={-180} max={180} unit="°" onChange={(v) => set({ rotation: v })} />
        <Slider id="opac" label="Opacidade" value={Math.round(layer.opacity * 100)} min={5} max={100} unit="%" onChange={(v) => set({ opacity: v / 100 })} />
      </Section>
      <Section title="Sombra">
        <Slider id="sh-blur" label="Suavidade" value={layer.shadowBlur} min={0} max={100} onChange={(v) => set({ shadowBlur: v })} />
        <Slider id="sh-dist" label="Distância" value={layer.shadowDistance} min={0} max={50} onChange={(v) => set({ shadowDistance: v })} />
        <ColorField id="sh-color" label="Cor da sombra" value={layer.shadowColor} onChange={(v) => set({ shadowColor: v })} />
      </Section>
    </>
  );
}

function TextPanel({ l, set, textRef }: { l: TextLayer; set: Patch; textRef: RefObject<HTMLTextAreaElement | null> }) {
  const words = countWords(l.text);
  return (
    <>
      <Section
        title="Texto"
        aside={
          <span className={"font-mono text-[11px] tabular-nums " + (words > 5 ? "text-warn" : "text-muted")}>
            {words} {words === 1 ? "palavra" : "palavras"}
          </span>
        }
      >
        <textarea
          id="txt"
          ref={textRef}
          rows={2}
          value={l.text}
          onChange={(e) => set({ text: e.target.value, name: e.target.value.split("\n")[0].slice(0, 24) || "Texto" })}
          className={INPUT + " resize-y font-medium"}
          aria-label="Texto da camada"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="font" className="text-xs">
            Fonte
          </label>
          <select id="font" value={l.font} onChange={(e) => set({ font: e.target.value })} className={INPUT} style={{ fontFamily: `"${l.font}", sans-serif` }}>
            {FONTS.map((f) => (
              <option key={f.family} value={f.family} style={{ fontFamily: `"${f.family}"` }}>
                {f.family}
              </option>
            ))}
          </select>
        </div>
        <Slider id="size" label="Tamanho" value={l.size} min={16} max={400} unit=" px" onChange={(v) => set({ size: v })} />
        <div className="flex items-center justify-between gap-2">
          <Segmented
            label="Alinhamento"
            value={l.align}
            onChange={(v) => set({ align: v })}
            options={[
              { value: "left", label: <Icon name="alignLeft" />, title: "Alinhar à esquerda" },
              { value: "center", label: <Icon name="alignCenter" />, title: "Centralizar" },
              { value: "right", label: <Icon name="alignRight" />, title: "Alinhar à direita" },
            ]}
          />
          <div className="w-[120px]">
            <Toggle id="upper" label="CAIXA ALTA" checked={l.uppercase} onChange={(v) => set({ uppercase: v })} />
          </div>
        </div>
        <Slider id="ls" label="Espaço entre letras" value={l.letterSpacing} min={-10} max={40} onChange={(v) => set({ letterSpacing: v })} />
        <Slider id="lh" label="Altura da linha" value={l.lineHeight} min={0.7} max={1.6} step={0.01} digits={2} onChange={(v) => set({ lineHeight: v })} />
      </Section>
      <Section title="Cor">
        <ColorField id="tcolor" label={l.gradient ? "Cor de cima" : "Cor do texto"} value={l.color} onChange={(v) => set({ color: v })} />
        <Toggle id="tgrad" label="Degradê" checked={l.gradient} onChange={(v) => set({ gradient: v })} />
        {l.gradient && <ColorField id="tcolor2" label="Cor de baixo" value={l.color2} onChange={(v) => set({ color2: v })} />}
      </Section>
      <Section title="Contorno e destaque">
        <Slider id="stroke" label="Contorno" value={l.strokeWidth} min={0} max={30} unit=" px" onChange={(v) => set({ strokeWidth: v })} />
        {l.strokeWidth > 0 && <ColorField id="scolor" label="Cor do contorno" value={l.strokeColor} onChange={(v) => set({ strokeColor: v })} />}
        <Toggle id="box" label="Faixa atrás do texto" checked={l.box} onChange={(v) => set({ box: v })} />
        {l.box && <ColorField id="boxcolor" label="Cor da faixa" value={l.boxColor} onChange={(v) => set({ boxColor: v })} />}
      </Section>
    </>
  );
}

function ImagePanel({ l, set, toBackground }: { l: ImageLayer; set: Patch; toBackground: () => void }) {
  return (
    <Section title="Imagem">
      <Slider id="scale" label="Tamanho" value={Math.round(l.scale * 100)} min={2} max={400} unit="%" onChange={(v) => set({ scale: v / 100 })} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={() => set({ flipX: !l.flipX })}>
          <Icon name="flip" /> Espelhar
        </button>
        <button type="button" className={BTN} onClick={toBackground}>
          Usar como fundo
        </button>
      </div>
      <Slider id="outline" label="Contorno de adesivo" value={l.outlineWidth} min={0} max={40} unit=" px" onChange={(v) => set({ outlineWidth: v })} />
      {l.outlineWidth > 0 && <ColorField id="ocolor" label="Cor do contorno" value={l.outlineColor} onChange={(v) => set({ outlineColor: v })} />}
      <p className="text-xs leading-relaxed text-muted">
        O contorno de adesivo funciona com PNG de fundo transparente. Remova o fundo da foto antes (no Canva ou no remove.bg).
      </p>
    </Section>
  );
}

function ShapePanel({ l, set }: { l: ShapeLayer; set: Patch }) {
  const canFill = l.shape === "circle" || l.shape === "rect";
  return (
    <Section title={{ arrow: "Seta", circle: "Círculo", rect: "Caixa", disc: "Disco de vinil" }[l.shape]}>
      {l.shape === "disc" ? (
        <Slider id="dsize" label="Tamanho" value={Math.round(l.w)} min={60} max={1600} unit=" px" onChange={(v) => set({ w: v, h: v })} />
      ) : (
        <>
          <Slider id="sw" label="Largura" value={Math.round(l.w)} min={20} max={2000} unit=" px" onChange={(v) => set({ w: v })} />
          <Slider id="shh" label="Altura" value={Math.round(l.h)} min={20} max={2000} unit=" px" onChange={(v) => set({ h: v })} />
        </>
      )}
      <ColorField id="fill" label={l.shape === "disc" ? "Cor do selo" : "Cor"} value={l.color} onChange={(v) => set({ color: v })} />
      {canFill && <Toggle id="filled" label="Preenchido" checked={l.filled} onChange={(v) => set({ filled: v })} />}
      {canFill && !l.filled && (
        <Slider id="thick" label="Espessura" value={l.thickness} min={2} max={80} unit=" px" onChange={(v) => set({ thickness: v })} />
      )}
      {l.shape === "rect" && <Slider id="radius" label="Cantos arredondados" value={l.radius} min={0} max={200} onChange={(v) => set({ radius: v })} />}
      {l.shape !== "disc" && (
        <>
          <Slider id="soutline" label="Contorno" value={l.outlineWidth} min={0} max={30} unit=" px" onChange={(v) => set({ outlineWidth: v })} />
          {l.outlineWidth > 0 && <ColorField id="socolor" label="Cor do contorno" value={l.outlineColor} onChange={(v) => set({ outlineColor: v })} />}
        </>
      )}
    </Section>
  );
}

function BackgroundPanel({
  bg,
  onChange,
  onPick,
  highlighted,
}: {
  bg: Background;
  onChange: (patch: Partial<Background>, key?: string) => void;
  onPick: () => void;
  highlighted: boolean;
}) {
  const set = (patch: Partial<Background>) => onChange(patch, "bg-" + Object.keys(patch).join(","));
  return (
    <>
      {!highlighted && (
        <p className="px-4 pt-4 text-xs leading-relaxed text-muted">
          Clique num elemento da thumbnail para editar. Sem nada selecionado, você edita o fundo.
        </p>
      )}
      <Section title="Fundo">
        <ColorField id="bg1" label={bg.gradient ? "Cor inicial" : "Cor"} value={bg.color1} onChange={(v) => set({ color1: v })} />
        <Toggle id="bggrad" label="Degradê" checked={bg.gradient} onChange={(v) => set({ gradient: v })} />
        {bg.gradient && (
          <>
            <ColorField id="bg2" label="Cor final" value={bg.color2} onChange={(v) => set({ color2: v })} />
            <Slider id="bgangle" label="Direção" value={bg.angle} min={0} max={360} unit="°" onChange={(v) => set({ angle: v })} />
          </>
        )}
      </Section>
      <Section
        title="Foto de fundo"
        aside={
          bg.image ? (
            <button type="button" className={ICON_BTN} aria-label="Remover foto de fundo" title="Remover foto de fundo" onClick={() => set({ image: null })}>
              <Icon name="trash" />
            </button>
          ) : null
        }
      >
        <button type="button" className={BTN} onClick={onPick}>
          <Icon name="image" /> {bg.image ? "Trocar foto" : "Escolher foto"}
        </button>
        {bg.image && (
          <>
            <Slider id="bgzoom" label="Zoom" value={Math.round(bg.imageZoom * 100)} min={100} max={300} unit="%" onChange={(v) => set({ imageZoom: v / 100 })} />
            <Slider id="bgx" label="Enquadrar na horizontal" value={Math.round(bg.imageX * 100)} min={0} max={100} unit="%" onChange={(v) => set({ imageX: v / 100 })} />
            <Slider id="bgy" label="Enquadrar na vertical" value={Math.round(bg.imageY * 100)} min={0} max={100} unit="%" onChange={(v) => set({ imageY: v / 100 })} />
            <Slider id="bgblur" label="Desfoque" value={bg.blur} min={0} max={40} unit=" px" onChange={(v) => set({ blur: v })} />
          </>
        )}
      </Section>
      <Section title="Contraste">
        <Slider id="bgdark" label="Escurecer" value={bg.darken} min={0} max={85} unit="%" onChange={(v) => set({ darken: v })} />
        <Slider id="bgvig" label="Bordas escuras" value={bg.vignette} min={0} max={100} unit="%" onChange={(v) => set({ vignette: v })} />
      </Section>
    </>
  );
}

export function LayersPanel(props: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (l: Layer) => void;
  onMove: (id: string, dir: 1 | -1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { layers, selectedId } = props;
  const ordered = [...layers].reverse();
  const sel = layers.find((l) => l.id === selectedId) ?? null;
  const index = sel ? layers.indexOf(sel) : -1;
  const kindIcon = (l: Layer) => (l.kind === "text" ? "text" : l.kind === "image" ? "image" : l.shape);

  return (
    <Section
      title="Camadas"
      aside={
        <div className="flex items-center gap-0.5">
          <button type="button" className={ICON_BTN} disabled={!sel || index === layers.length - 1} onClick={() => sel && props.onMove(sel.id, 1)} aria-label="Trazer para frente" title="Trazer para frente">
            <Icon name="up" />
          </button>
          <button type="button" className={ICON_BTN} disabled={!sel || index === 0} onClick={() => sel && props.onMove(sel.id, -1)} aria-label="Mandar para trás" title="Mandar para trás">
            <Icon name="down" />
          </button>
          <button type="button" className={ICON_BTN} disabled={!sel} onClick={() => sel && props.onDuplicate(sel.id)} aria-label="Duplicar" title="Duplicar (Ctrl+D)">
            <Icon name="copy" />
          </button>
          <button type="button" className={ICON_BTN} disabled={!sel} onClick={() => sel && props.onRemove(sel.id)} aria-label="Excluir" title="Excluir (Delete)">
            <Icon name="trash" />
          </button>
        </div>
      }
    >
      <ul className="flex flex-col gap-0.5" aria-label="Lista de camadas">
        {ordered.map((l) => {
          const on = l.id === selectedId;
          return (
            <li key={l.id}>
              <div
                className={
                  "group flex items-center gap-2 rounded-md pr-1 transition-colors " +
                  (on ? "bg-accent-soft text-fg" : "hover:bg-raised")
                }
              >
                <button
                  type="button"
                  onClick={() => props.onSelect(l.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-pressed={on}
                >
                  <span className={on ? "text-accent" : "text-muted"}>
                    <Icon name={kindIcon(l)} />
                  </span>
                  <span className={"truncate " + (l.visible ? "" : "text-muted line-through")}>
                    {l.kind === "text" ? l.text.replace(/\n/g, " ") || "Texto vazio" : l.name}
                  </span>
                </button>
                <button
                  type="button"
                  className={ICON_BTN}
                  onClick={() => props.onToggle(l)}
                  aria-label={l.visible ? "Esconder camada" : "Mostrar camada"}
                  title={l.visible ? "Esconder" : "Mostrar"}
                >
                  <Icon name={l.visible ? "eye" : "eyeOff"} />
                </button>
              </div>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => props.onSelect(BACKGROUND_ID)}
            aria-pressed={selectedId === BACKGROUND_ID}
            className={
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
              (selectedId === BACKGROUND_ID ? "bg-accent-soft" : "hover:bg-raised")
            }
          >
            <span className={selectedId === BACKGROUND_ID ? "text-accent" : "text-muted"}>
              <Icon name="rect" />
            </span>
            Fundo
          </button>
        </li>
      </ul>
    </Section>
  );
}
