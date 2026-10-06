# Estilo: Colagem de papel "Vox"

Referência guardada para produzirmos depois com **Claude + HyperFrames**.

- Reel de origem: https://www.instagram.com/reel/DeJ_gTHs-FB/ (@sanji.chien)
- Fluxo dele: Claude + `vox-motion-graphics.skill` + Higgsfield MCP (aparece também "HyperFrames by HeyGen" nos conectores)
- Quadros de referência: [`referencias/`](referencias/)

| Arquivo | O que mostra |
|---|---|
| `t01s.jpg` | Abertura: etiquetas amarelas "LOOK / AT THIS / ANIMATION", faixa amarela nos olhos, motion blur |
| `t09s.jpg` | Recorte de pessoa + prédio recortado sobre jornal antigo |
| `t19s.jpg` | Colagem montada do Charles Dickens |
| `t36s.jpg` | Composição final do Dickens |
| `t40s.jpg` | Mesmo template com outro prompt: "make it Dostoevsky" |

## Elementos visuais

- **Fundo:** papel bege/kraft texturizado, ou página de jornal antigo (NYT) desbotada.
- **Pessoas:** fotos P&B recortadas (contorno irregular, às vezes borda branca), várias versões do mesmo personagem em ângulos diferentes.
- **Contexto:** monumentos e objetos recortados ligados ao personagem (Big Ben, London Eye, Tower Bridge, livro "Oliver Twist" / São Basílio, máquina de escrever).
- **Acentos de cor:** amarelo vivo (fita, faixa nos olhos) ou círculo laranja atrás do personagem. Resto quase todo dessaturado.
- **Texturas:** halftone (retícula), grão, fita adesiva, papel rasgado, grade de linhas finas.
- **Tipografia:**
  - Etiquetas de fita amarela com serifa preta pesada, levemente rotacionadas ("LOOK AT THIS ANIMATION").
  - Etiqueta de papel rasgado com sans geométrica: sobrenome em bold grande, nome em light ("CHARLES / DICKENS").
- **Formato:** vertical 9:16.

## Movimento

- Camadas entrando em sequência (stagger): fundo → monumentos → personagens → etiqueta do nome.
- Pop-in com escala + leve rotação e overshoot (`back.out`).
- Parallax: camadas em profundidades diferentes se movendo em velocidades diferentes.
- Motion blur em entradas rápidas.
- Etiquetas "carimbadas" palavra por palavra.
- Partes do corpo recortadas que se mexem estilo fantoche (ex.: braço girando).
- Textura de papel com leve "boil"/tremor para parecer stop-motion.

## Como faremos com HyperFrames

- **HyperFrames (HTML + CSS + GSAP → MP4):** toda a animação, texturas (CSS/SVG filters), tipografia, etiquetas.
- **Assets (fora do HyperFrames):** fotos de acervo/domínio público ou geração de imagem (Higgsfield, Flux etc.) + remoção de fundo (rembg / remove.bg) para gerar PNGs recortados.
- **Template parametrizado:** `personagem`, `nome`, `sobrenome`, lista de assets de contexto, cor de acento → trocar personagem = trocar dados e renderizar de novo ("make it Dostoevsky").
