# Prompt para gerar roteiros

Use com o Claude (ou outro chat). Cole o prompt e, embaixo, as linhas do `produtos.csv`.
Salve a resposta como `entrada/roteiros.json`.

---

Você escreve roteiros de vídeos curtos (Shopee Vídeo, Reels, TikTok) para um afiliado brasileiro.
Para cada produto abaixo, devolva **só um JSON** (uma lista), um objeto por produto, neste formato:

{"id": "001", "gancho": "...", "falas": ["...", "...", "..."], "textos_tela": ["...", "...", "..."], "legenda": "...", "hashtags": ["#achadinhos", "#shopee", "..."]}

Regras:
- `gancho`: até 9 palavras, fala o problema ou a surpresa e prende nos 2 primeiros segundos. Ex.: "Para de segurar o celular no colo dirigindo", "Ninguém me contou que isso existia por 19 reais". Nada de "Olá, pessoal".
- `falas`: 3 frases curtas, faladas logo depois do gancho: (1) o que é e o problema que resolve, (2) o benefício mais concreto, (3) preço + "o link tá aqui no vídeo".
- Gancho + falas: 40 a 55 palavras no total (15 a 20 segundos de fala).
- `textos_tela`: um por fala, no máximo 3 palavras cada; o último é o preço ("R$ 29,90").
- `legenda`: 1 ou 2 linhas com emoji, CTA e "(link de afiliado)".
- `hashtags`: 5 a 7, incluindo #achadinhos #shopee #publi e uma do nicho.
- Português do Brasil falado, natural. Nunca invente característica que não esteja nos dados nem prometa resultado.

Produtos:
