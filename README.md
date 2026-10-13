# Editor IA

Editor de vídeos online feito com [HyperFrames](https://github.com/heygen-com/hyperframes) (open source, Apache 2.0). Funciona no celular e no computador.

- **Templates prontos**: promoção para Reels (9:16), abertura de vídeo (16:9) e frase/citação (1:1).
- **Campos editáveis**: textos, cores e imagens, com prévia ao vivo pelo player oficial do HyperFrames.
- **IA (opcional)**: cria um vídeo do zero ou ajusta o vídeo aberto ("deixe o preço piscando em vermelho").
- **Exportar**: MP4 renderizado no servidor ou o HTML, para renderizar no próprio computador.
- **Planos com limites**: Grátis, Criador e Pro, com contagem mensal de vídeos e de gerações com IA.

## Rodar localmente

Requisitos: Node.js 22 ou mais novo e FFmpeg (`apt install ffmpeg` ou `brew install ffmpeg`).

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY para ligar a IA
npm run dev                  # http://localhost:3000
```

Sem `ANTHROPIC_API_KEY` o editor funciona normalmente com os templates. Só os botões de IA ficam desativados.

## Como funciona

| Parte | Onde roda | Arquivo |
|---|---|---|
| Templates (HTML + GSAP) | navegador | `src/lib/templates.ts` |
| Campos editáveis | lidos de `data-composition-variables` no HTML | `src/lib/variables.ts` |
| Prévia | `<hyperframes-player>` em iframe isolado | `src/components/Player.tsx` |
| IA | servidor, API do Claude | `src/lib/ai.ts`, `src/app/api/ai/route.ts` |
| Render MP4 | servidor, CLI `hyperframes render` (Chromium + FFmpeg) | `src/lib/render.ts`, `src/app/api/render/route.ts` |
| Planos e limites | servidor | `src/lib/plans.ts`, `src/lib/usage.ts` |

As imagens enviadas são reduzidas no navegador (até 1600 px) e ficam embutidas no HTML. Antes de enviar o HTML para a IA, cada imagem é trocada por um marcador curto (`hf-asset://N`) e depois devolvida. Assim a imagem não gasta tokens.

### Renderizar sem o servidor

O botão **Baixar HTML** salva o `index.html` do vídeo. Num computador com Node 22 e FFmpeg:

```bash
mkdir meu-video && mv index.html meu-video/
npx hyperframes render meu-video -o video.mp4
```

## Custos da IA

Os modelos são escolhidos em `.env.local`:

- Padrão: `claude-opus-5-5` para criar e ajustar (melhor qualidade).
- Mais barato: `AI_MODEL_CREATE=claude-sonnet-5-5` e `AI_MODEL_EDIT=claude-haiku-5-5`.

O prompt de sistema usa cache, e os ajustes usam esforço baixo (`effort: low`) para gastar menos.

## Hospedagem

- **Site + IA**: funciona em qualquer hospedagem Node, inclusive Vercel.
- **Render MP4**: precisa de um servidor com FFmpeg e espaço para o Chromium (VPS, Railway, Fly.io, Render.com, Docker). **Não funciona em serverless** (Vercel/Netlify Functions). Se precisar de um Chrome específico, use `HYPERFRAMES_BROWSER_PATH`.
- O render no servidor executa o HTML do usuário num Chromium. Rode-o num container isolado, sem acesso à rede interna.

## Próximos passos

- [ ] Login de usuário (ex.: Supabase Auth). Hoje o usuário é um cookie anônimo e o plano vem de `DEFAULT_PLAN`.
- [ ] Pagamento da assinatura (Stripe, Mercado Pago ou Hotmart), marcando o plano do usuário.
- [ ] Guardar o uso mensal num banco de dados (hoje fica em `.data/usage.json`).
- [ ] Salvar projetos na conta do usuário.
- [ ] Upload de vídeos e áudio, e legendas automáticas.
