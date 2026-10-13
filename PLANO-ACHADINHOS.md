# Plano: fábrica de vídeos de achadinhos (afiliado Shopee + TikTok)

Briefing para a sessão do Claude Code rodando **no PC local** (com Pinokio).
Objetivo: gerar dezenas de vídeos verticais de produto durante a noite e deixá-los prontos para postar.

## Contexto

- Afiliado Shopee já cadastrado (≈ R$ 300 de comissão desde dezembro).
- Metricool conectado ao Instagram **@lobandoleiro** e à página do Facebook. TikTok ainda **não** conectado.
- Pinokio instalado no PC. Runway não será usado (cancelar para economizar).
- Meta de volume: ~100 vídeos únicos/mês, postados em 3 redes (~300 posts).
- Orçamento: zero. Tudo local e gratuito.

## Onde cada link funciona (importante)

| Canal | Link de produto | Como postar |
|---|---|---|
| **Shopee Vídeo** (app Shopee) | Produto da Shopee marcado direto no vídeo | Manual pelo celular. Não há API pública para afiliado; não automatizar com robô (risco de banir a conta) |
| **TikTok** | Produto do **TikTok Shop** (carrinho amarelo). Link externo da Shopee é limitado | Agendar pelo Metricool; marcar o produto do TikTok Shop no app |
| **Instagram / Facebook** | Link da Shopee na **bio** (página vitrine) ou nos Stories | Agendar pelo Metricool |
| **Grupos de WhatsApp / Telegram** | Link direto da Shopee | Manual ou mensagem agendada |

Ou seja: produto Shopee → Shopee Vídeo + Instagram/Facebook + grupos. Produto TikTok Shop → TikTok.

## Teste de nichos (semanas 1–2)

Postar 3 nichos em paralelo e depois concentrar 80% no que der mais cliques e vendas:

1. **Acessórios para carro** (o dono entende do assunto)
2. **Cozinha e casa** (alto volume de vendas)
3. **Achadinhos até R$ 30** (compra por impulso)

Alternativa a considerar: **beleza/skincare**, que segundo blogs de afiliados paga comissões mais altas. Conferir a tabela real no painel de afiliados antes de decidir.

## Busca automática de produtos: API de Afiliados da Shopee

A Shopee tem uma **API de afiliados** (GraphQL, assinada com HMAC-SHA256) que permite, com a conta do próprio afiliado:

- buscar ofertas de produtos, lojas e marcas por palavra-chave/categoria, com preço, comissão, vendas e imagens (`productOfferV2`, `shopOfferV2`)
- gerar o link curto de afiliado de qualquer produto (`generateShortLink`)
- puxar relatórios de conversão (vendas e comissão por link/sub-ID)

Passos:
1. No painel do Shopee Afiliados, pedir acesso à **Open API** e anotar o **AppID** e a **Secret**.
2. Guardar as credenciais **só no PC**, em um arquivo `.env` fora do Git (adicionar ao `.gitignore`). Nunca colar no chat nem subir para o GitHub.
3. Conferir os nomes atuais das consultas e campos na documentação oficial antes de programar. Bibliotecas da comunidade (ex.: `saapi` em Python) servem de referência, não são oficiais.

Script `buscar_produtos.py` (roda antes do lote noturno):
- para cada nicho, buscar ofertas por palavras-chave (ex.: carro: "suporte celular carro", "aspirador automotivo"; casa: "organizador cozinha"; até R$ 30: filtrar por preço)
- ranquear por **vendas × taxa de comissão**, com nota mínima da loja
- baixar imagens para `entrada/midia/<id>/`, gerar o link curto com sub-ID por nicho (ex.: `carro`, `casa`, `ate30`) para medir o que vende
- escrever o `entrada/produtos.csv`

Sem acesso à API ainda: escolher os produtos manualmente no painel (aba de ofertas / maior comissão) e preencher o CSV. **Não fazer scraping do site da Shopee**: viola os termos e pode bloquear a conta de afiliado.

## Pipeline noturno (rodar no PC)

```
entrada/produtos.csv  ──►  1. roteiros (LLM)  ──►  2. voz (TTS)  ──►  3. clipes  ──►  4. montagem (ffmpeg)  ──►  saida/ (Google Drive)
```

### Estrutura de pastas

```
achadinhos/
  entrada/produtos.csv
  entrada/midia/<id>/        # fotos e vídeos do anúncio do produto
  trabalho/<id>/             # roteiro.json, voz.wav, clipes intermediários
  saida/<data>/<id>.mp4      # pasta sincronizada com o Google Drive
  saida/<data>/<id>.txt      # legenda + hashtags prontas para colar
```

### `produtos.csv`

```
id,nicho,nome,preco,preco_antigo,link_afiliado,plataforma,midia
001,carro,Suporte magnético de celular,29.90,59.90,https://s.shopee.com.br/xxxx,shopee,entrada/midia/001
```

### Etapa 1: roteiros

Para cada produto, gerar `roteiro.json`:

```json
{
  "gancho": "Achei isso na Shopee por R$ 29 e meu carro mudou",
  "falas": ["frase 1", "frase 2", "frase 3"],
  "textos_tela": ["R$ 29,90", "Frete grátis", "Link na bio"],
  "legenda": "texto do post com CTA",
  "hashtags": ["#achadinhos", "#shopee", "#achadinhosshopee"]
}
```

Regras: gancho nos 2 primeiros segundos; 15–25 s no total; preço na tela; nunca prometer o que o produto não faz.

### Etapa 2: voz

TTS local com voz em português do Brasil (ex.: Kokoro pelo Pinokio; conferir as vozes pt-BR disponíveis). Um `voz.wav` por roteiro.

### Etapa 3: clipes

- **Padrão (rápido, sem GPU):** fotos e vídeos reais do anúncio com zoom e pan via ffmpeg. ~1 min por vídeo, dá para 100+ por noite.
- **Opcional (GPU):** imagem → vídeo com Wan / LTX Video / FramePack no Pinokio, só para planos de abertura. É lento (vários minutos por clipe). **Não deixar a IA deformar o produto**: o comprador precisa ver o produto real, senão vira propaganda enganosa e devolução.

### Etapa 4: montagem

ffmpeg (ou MoviePy) em 1080×1920:
- clipes + voz + música de fundo sem direitos autorais, em volume baixo
- legenda queimada gerada **a partir do próprio roteiro**, com tempo pela duração de cada fala (dispensa o Whisper)
- textos de preço/CTA nos tempos de `textos_tela`
- salvar `saida/<data>/<id>.mp4` e o `.txt` com legenda e hashtags

Rodar em lote à noite (ex.: Agendador de Tarefas do Windows), com log por produto e sem parar o lote se um item falhar.

## Postagem

- **Instagram / Facebook / TikTok:** a sessão na nuvem lê os vídeos do Google Drive e agenda pelo Metricool, 2–4 por dia por rede, nos melhores horários. Conectar o TikTok no Metricool.
- **Shopee Vídeo:** subir manualmente pelo celular, marcando o produto (≈ 10 min/dia).
- Página vitrine com todos os links de afiliado para a bio do Instagram.

## Regras

- Identificar como publicidade/afiliado (ex.: "link de afiliado", #publi).
- Marcar conteúdo gerado por IA quando a rede pedir.
- Sem conteúdo sensual para vender produto (derruba alcance e bane conta).
- Sem bots que postem ou cliquem no app da Shopee/TikTok.

## Expectativa realista

- Mês 1: R$ 100–500. Meses 2–4: R$ 500–2.000 se um nicho pegar.
- R$ 5.000/mês exige ~1.000–1.700 vendas/mês (comissão média R$ 3–5), ou seja, milhões de visualizações. Meta de 6–12 meses de constância.
- Medir toda semana no painel de afiliados: cliques, vendas e comissão por nicho e por vídeo.
