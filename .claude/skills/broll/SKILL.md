---
name: broll
description: Planeja b-rolls para vídeos e gera prompts prontos para colar no Gemini / Google Flow (Veo). Use quando o usuário pedir b-roll, lista de takes, shot list, cenas de apoio ou prompts para Veo/Gemini a partir de um roteiro, tema ou vídeo.
---

# B-roll para Veo (Gemini / Flow)

O Claude planeja e organiza; o Veo só executa. O Veo não lembra de gerações
anteriores, então a consistência vem de repetir o mesmo "DNA visual" em todo prompt.

## Fluxo

1. **Entender o vídeo**: peça (ou leia) o roteiro, a transcrição ou o tema. Pergunte só o
   que faltar: formato (9:16 ou 16:9), público, tom e se há pessoa/personagem recorrente.
2. **Criar o projeto** em `projetos/<slug>/broll.json`, seguindo `projetos/_modelo/broll.json`.
   - `estilo` é o DNA visual: preencha uma vez e com precisão (paleta, luz, lente, textura).
   - `personagens`: descrição física fixa, escrita para ser repetida palavra por palavra.
   - Cada take liga-se a um trecho do roteiro (`trecho_roteiro`) e tem função clara.
3. **Gerar `projetos/<slug>/prompts.md`**: um bloco por take, pronto para copiar.
4. **Revisar com o usuário** e ajustar o JSON (nunca só o .md: o JSON é a fonte da verdade;
   o .md é sempre regenerado a partir dele).
5. Quando os vídeos voltarem, registre em `status` e `arquivo` de cada take
   (`pendente` → `gerado` → `aprovado` / `refazer`, com `obs` do que corrigir).

## Como escrever o prompt de cada take (inglês, prosa)

Monte nesta ordem, em um parágrafo:

1. Tipo de plano + movimento de câmera (`slow dolly-in`, `handheld`, `static wide shot`, `top-down`, `macro`).
2. Sujeito + ação concreta (um só acontecimento; 8s é curto).
3. Ambiente e detalhes de cenário.
4. Luz e hora do dia.
5. Bloco de estilo do projeto, **copiado literalmente** de `estilo.bloco_prompt`.
6. Personagem, se houver, **copiado literalmente** de `personagens[].bloco_prompt`.
7. Áudio: `Audio: ...` (ambiente/efeitos; o Veo gera som). Diga `no dialogue, no music` se for o caso.
8. Fim: `No text, no subtitles, no logos, no watermarks.`

Regras:
- Um take = uma ideia visual. Divida ações compostas em takes separados.
- Prefira verbos e coisas visíveis a adjetivos abstratos ("vapor subindo da xícara" > "aconchegante").
- B-roll não deve ter rostos falando para a câmera nem texto na tela (texto se põe na edição).
- Se o mesmo elemento aparece em vários takes, gere primeiro uma imagem de referência
  (Gemini/Nano Banana) e indique em `referencia` para usar como frame inicial ou ingrediente no Flow.
- Se o usuário trabalha em 9:16, pense a composição centralizada e vertical.

## Formato do `prompts.md`

~~~markdown
# <Projeto> — prompts de b-roll
Formato: 9:16 · Duração: 8s · Estilo: <resumo de 1 linha>

## T01 — <título curto>
Trecho: "<trecho do roteiro>"
Referência: <arquivo ou "nenhuma">

```
<prompt em inglês>
```
~~~
