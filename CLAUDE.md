# Editor IA — edição de vídeo do @lobandoleiro

Repositório de edição de vídeos para Instagram (Reels) e afins, feito com
[HyperFrames](https://github.com/heygen-com/hyperframes) + ffmpeg. O criador edita de ponta a
ponta com o Claude: cortes, legendas, cor, motions, b-rolls e trilha. Responda em português.

## Fluxo proxy → nuvem → PC

Os brutos têm 700 MB–1,5 GB+, grandes demais para o GitHub e para o container da nuvem.
Por isso, **na nuvem se edita sobre um proxy leve e o render final em alta acontece no PC**,
reaplicando exatamente as mesmas decisões.

1. **PC**: `node ferramentas/preparar.mjs "<bruto.mp4>" <nome> --transcrever --enviar`
   gera `projetos/<nome>/proxy/fonte.mp4` (lado menor 720p, mesmo fps, ~1 Mbps), salva
   `projeto.json` (com o caminho do original no PC), transcreve em pt e dá push (proxy via Git LFS).
2. **Nuvem** (esta sessão), dentro de `projetos/<nome>/`:
   - `node ferramentas/fonte.mjs <nome> proxy`: coloca o proxy em `media/fonte.mp4`
     (o hook de início de sessão já faz isso).
   - Decide os cortes e grava em `cortes.json` (tempos do bruto, em segundos) →
     `node ferramentas/cortar.mjs <nome>` → `media/cortado.mp4`.
   - `node ferramentas/compor.mjs <nome>`: cria `index.html` tocando `media/cortado.mp4`.
   - Legendas, motions, b-rolls, cor e trilha entram na composição HyperFrames (skills abaixo).
   - Preview: `npx hyperframes render -q draft -o previews/v<N>.mp4`. Faça commit e push.
3. **PC**: `git pull && node ferramentas/finalizar.mjs <nome> [--4k]`, que troca o proxy pelo
   original, reaplica os cortes em alta e renderiza `renders/final.mp4` com qualidade `delivery`.

### Regras que mantêm o render final igual ao preview

- **Nunca** comitar originais nem `media/` e `renders/` (estão no `.gitignore`).
- A composição sempre usa `media/cortado.mp4`; nunca aponte para o proxy diretamente.
- Cortes e cor de base ficam **só** em `cortes.json` (`trechos`, `cor`, `lut`), nunca num
  arquivo pré-cortado à mão: o PC precisa reaplicar no original.
- Toda mídia derivada do vídeo (ex.: máscara/recorte da pessoa para legenda atrás do corpo,
  `remove-background`) precisa ser gerada por um comando listado em `projeto.json` →
  `"derivados": [["npx","hyperframes","remove-background", ...]]`, para o PC regerar em alta.
- Posições e tamanhos em pixels do canvas (1080×1920 / 1920×1080), nunca do proxy.
- Assets próprios (b-roll, música, logo) em `projetos/<nome>/assets/` (mp4/mp3/wav vão por LFS).
  Mantenha cada arquivo pequeno: o LFS do GitHub tem cota.

## Limitações da rede na nuvem (e contornos)

| Bloqueado              | Efeito                                       | Contorno                                                                                     |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cdn.jsdelivr.net`     | GSAP/libs das composições não carregam       | `node ferramentas/vendorizar-cdn.mjs <nome>` (rode após criar/editar HTML ou `hyperframes add`) |
| `huggingface.co`       | whisper não baixa modelo → sem transcrição   | transcrever no PC (`--transcrever`) ou liberar o domínio no ambiente                         |
| `api.heygen.com`       | catálogo de músicas/SFX da HeyGen indisponível | trilha via Lyria (`GEMINI_API_KEY` no ambiente) ou música enviada em `assets/`             |
| `drive.usercontent.google.com` | não dá para baixar vídeo do Drive    | usar o fluxo proxy + Git LFS acima                                                           |

`raw.githubusercontent.com` (registry de blocos do HyperFrames), npm, PyPI e
`storage.googleapis.com` (Chrome headless) funcionam.

## Skills instaladas (`.claude/skills/`)

Entrada sempre por **`/hyperframes`**, que roteia para a skill certa.

- **Legendas**: `embedded-captions` (35 estilos, inclusive legenda atrás da pessoa); `media-use`
  cuida da transcrição.
- **Motions / overlays**: `motion-graphics` (títulos cinéticos, lower-thirds, callouts, overlays
  sociais), `talking-head-recut` (cards sincronizados com a fala, PiP, citações, dados),
  `hyperframes-registry` (efeitos e transições prontos: glitch, film grain, flash…).
- **Montagem / b-roll**: `general-video` (multi-cena, montagens, remix de footage).
- **Trilha**: `media-use` (BGM/SFX: busca ou geração via Lyria/MusicGen), `hyperframes-audio`
  (mixagem, ducking sob a voz, fades, EQ), `music-to-video` (edição no beat).
- **Cor**: `media-use` (grades/LUTs) + `npx hyperframes grade-compare`.
- **Base**: `hyperframes-core`, `hyperframes-cli`, `hyperframes-animation`, `hyperframes-creative`,
  `hyperframes-keyframes`.

Não rode `npx hyperframes skills update` por conta própria. As skills ficam versionadas aqui;
atualize só quando o usuário pedir e commite o resultado.

## Estilo do canal

_(preencher com o criador: fonte e cor das legendas, ritmo de corte, paleta, vinheta, CTA final,
referências dos últimos vídeos)_
