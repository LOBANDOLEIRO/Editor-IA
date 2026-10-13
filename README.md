# Editor IA

Editor de vídeos online feito com [HyperFrames](https://github.com/heygen-com/hyperframes) (open source, Apache 2.0). Funciona no celular e no computador.

- **Templates prontos**: promoção para Reels (9:16), abertura de vídeo (16:9) e frase/citação (1:1).
- **Campos editáveis**: textos, cores e imagens, com prévia ao vivo pelo player oficial do HyperFrames.
- **IA (opcional)**: cria um vídeo do zero ou ajusta o vídeo aberto ("deixe o preço piscando em vermelho").
- **Exportar**: MP4 renderizado no servidor ou o HTML, para renderizar no próprio computador.
- **Contas**: login sem senha (código de 6 dígitos ou link por e-mail) e "Meus vídeos" para salvar e reabrir projetos.
- **Planos com limites**: Grátis, Criador e Pro, com contagem mensal de vídeos e de gerações com IA.

## Rodar localmente

Requisitos: Node.js 22 ou mais novo e FFmpeg (`apt install ffmpeg` ou `brew install ffmpeg`).

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY para ligar a IA
npm run dev                  # http://localhost:3000
```

Sem `ANTHROPIC_API_KEY` o editor funciona normalmente com os templates. Só os botões de IA ficam desativados.

Sem as variáveis do Supabase o app roda em **modo local**: não tem login, o plano vem de `DEFAULT_PLAN` e o uso fica em `.data/usage.json`. Serve para desenvolver, não para produção.

## Login e banco (Supabase)

### Em produção

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano grátis serve para começar).
2. Rode a migração do banco. Pode ser pelo **SQL Editor**, colando o conteúdo de `supabase/migrations/20261013000000_contas_uso_projetos.sql`, ou pela CLI: `npx supabase link` e depois `npx supabase db push`.
3. Em **Authentication > URL Configuration**, coloque o domínio do site em *Site URL* (ex.: `https://seusite.com.br`).
4. Em **Authentication > Email Templates**, troque o modelo **Magic Link** e o **Confirm signup** pelo conteúdo de `supabase/templates/magic_link.html`. Assim o e-mail traz o código de 6 dígitos e o link de entrada.
5. Configure um SMTP próprio em **Authentication > SMTP** (Resend, SendGrid, Amazon SES...). O e-mail padrão do Supabase tem limite de poucos envios por hora.
6. Copie a URL do projeto e a *publishable key* para `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Para mudar o plano de alguém antes do pagamento existir, edite a coluna `plan` da tabela `profiles` no painel (`gratis`, `criador` ou `pro`).

### Localmente (precisa de Docker)

```bash
npx supabase start   # sobe banco, auth e caixa de e-mail de teste
```

Copie a `API URL` e a `Publishable key` mostradas para o `.env.local`. Os e-mails de login aparecem em http://127.0.0.1:54324.

### O que fica no banco

| Tabela | Conteúdo | Quem pode mexer |
|---|---|---|
| `profiles` | e-mail e plano de cada conta (criado automaticamente no cadastro) | usuário só lê; o plano muda pelo painel ou, depois, pelo pagamento |
| `usage` | vídeos e gerações com IA por mês | usuário só lê; o servidor soma pela função `increment_usage`, que nunca diminui |
| `projects` | vídeos salvos (HTML completo) | só o dono lê, edita e apaga |

As regras de acesso (RLS) foram testadas: um usuário não consegue trocar o próprio plano, zerar o próprio uso nem ver, editar ou apagar projetos de outra pessoa.

## Como funciona

| Parte | Onde roda | Arquivo |
|---|---|---|
| Templates (HTML + GSAP) | navegador | `src/lib/templates.ts` |
| Campos editáveis | lidos de `data-composition-variables` no HTML | `src/lib/variables.ts` |
| Prévia | `<hyperframes-player>` em iframe isolado | `src/components/Player.tsx` |
| IA | servidor, API do Claude | `src/lib/ai.ts`, `src/app/api/ai/route.ts` |
| Render MP4 | servidor, CLI `hyperframes render` (Chromium + FFmpeg) | `src/lib/render.ts`, `src/app/api/render/route.ts` |
| Planos e limites | servidor + Supabase | `src/lib/plans.ts`, `src/lib/usage.ts` |
| Login | Supabase Auth | `src/app/entrar`, `src/app/auth`, `src/middleware.ts` |
| Meus vídeos | Supabase (tabela `projects`) | `src/app/projetos`, `src/components/ProjectList.tsx` |

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

- [x] Login de usuário (Supabase Auth).
- [x] Guardar plano e uso mensal no banco.
- [x] Salvar projetos na conta do usuário.
- [ ] Pagamento da assinatura (Stripe, Mercado Pago ou Hotmart): um webhook com a chave de serviço do Supabase atualiza `profiles.plan`.
- [ ] Upload de vídeos e áudio, e legendas automáticas.
