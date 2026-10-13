# Checklist: escolher os produtos no painel (modo manual)

Meta da primeira leva: **12 a 15 produtos**, cerca de 5 por nicho (carro, casa, ate30).

## Filtro (todos obrigatórios)

- [ ] Comissão **≥ 7%** (somando a comissão extra / "Comissão Xtra" da loja)
- [ ] Nota da loja ≥ 4,7 e muitas vendas (de preferência mais de 1 mil)
- [ ] Preço até ~R$ 80. Com 7%, isso dá R$ 2 a 6 por pedido. Para chegar a R$ 4–10 por pedido, misture alguns de R$ 60 a 150 com comissão alta
- [ ] O anúncio tem **fotos boas** (de preferência com o produto em uso) ou vídeo
- [ ] Dá para explicar em 1 frase o problema que o produto resolve (isso vira o gancho)
- [ ] Evitar: eletrônico sem marca que costuma quebrar, roupa (tamanho gera devolução), qualquer coisa que exija prometer resultado

## Para cada produto escolhido

1. Gere o **link de afiliado** no painel (aba Ofertas → "Obter link").
2. Adicione uma linha ao `entrada/produtos.csv` (dá para abrir no Excel e salvar como CSV UTF-8):

   ```
   id,nicho,nome,preco,preco_antigo,comissao,link_afiliado,plataforma
   001,carro,Aspirador portátil sem fio,49.90,99.90,10,https://s.shopee.com.br/xxxx,shopee
   ```

   - `id`: 001, 002, 003... (nunca repetir)
   - `nicho`: `carro`, `casa` ou `ate30`
   - `comissao`: só o número (10 = 10%)
3. Salve de 3 a 5 fotos (ou um vídeo curto) do anúncio em `entrada/midia/001/`, `entrada/midia/002/` etc.

## Depois

Mande para o Claude a lista (nome + preço + 1 linha do que o produto faz, ou só o CSV). Ele devolve o `entrada/roteiros.json` pronto.
