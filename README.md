# Editor IA — estúdio de beats com Lyria

Estúdio multitrack no navegador (estilo DAW) que:

- **gera beats com IA** (Lyria 3.5 / Lyria 3 Pro) pelo **Google Flow Music**, via [useapi.net](https://useapi.net/docs/api-flowmusic-v1);
- **separa o beat em stems** (bateria, baixo, melodia e vocal) e abre cada uma numa faixa;
- **grava a sua voz** pelo microfone por cima do beat, com metrônomo, contagem de 1 compasso e compensação de latência;
- tem um **corretor de afinação** estilo autotune/Newtone: tom e escala, velocidade de correção (de robótico a natural), intensidade, mix e gráfico da afinação cantada × corrigida;
- tem **mixer por faixa** (volume, pan, mudo, solo, EQ de 3 bandas, compressor e reverb);
- **gera letras** com a IA do Flow Music;
- **exporta a mixagem em WAV**.

> ⚠️ O useapi.net **não é oficial nem afiliado ao Google**. Ele automatiza a sua conta Flow Music; pode parar de funcionar se o Google mudar algo, e esse uso pode ir contra os termos do Google. Para uso pessoal/protótipo funciona bem; para um produto com usuários, considere a Gemini API oficial (`lyria-3.5`), que entrega só a música mixada (sem stems).

## Como rodar

```bash
npm install
cp .env.example .env.local   # coloque o USEAPI_TOKEN
npm run dev                   # http://localhost:3000
```

1. Crie uma conta em [useapi.net](https://useapi.net/docs/start-here/setup-useapi) e copie o token (`user:1234-...`).
2. Conecte a sua conta Flow Music no useapi ([guia](https://useapi.net/docs/start-here/setup-flowmusic)).
3. Coloque o token em `USEAPI_TOKEN` no `.env.local` (fica só no servidor, nunca vai para o navegador).

Sem token, o botão **Beat demo** sintetiza um beat localmente para você testar o estúdio, a gravação e o corretor.

## Atalhos

| Tecla | Ação |
| --- | --- |
| Espaço | Play / pausa |
| R | Gravar na faixa armada (cria uma faixa “Voz” se não houver) |
| Enter | Voltar ao início |
| V / C | Ferramenta selecionar / tesoura |
| S | Cortar o clip selecionado no cursor |
| Ctrl+Z / Ctrl+Shift+Z | Desfazer / refazer |
| Ctrl+C / Ctrl+V / Ctrl+D | Copiar / colar no cursor / duplicar clip |
| Delete | Apagar o clip selecionado |
| L | Liga/desliga o loop (arraste na régua para criar a região) |
| M | Metrônomo |
| + / − ou Ctrl+roda | Zoom |
| Alt + arrastar | Mover/aparar sem grudar na grade |

## Edição na timeline

- **Mover:** arraste o clip (inclusive para outra faixa).
- **Aparar:** arraste as bordas esquerda/direita do clip.
- **Fades:** arraste os quadradinhos brancos no topo do clip selecionado.
- **Cortar:** tesoura (C) e clique, ou S no cursor, ou botão direito → *Cortar aqui*.
- **Botão direito no clip:** cortar, duplicar, copiar, normalizar, fades rápidos, apagar.
- **Loop:** arraste na régua; ótimo para repetir um trecho enquanto ensaia.
- Arraste um arquivo de áudio para a timeline para importar.

## Efeitos, presets e mixer

- Cada faixa tem: corta-graves/corta-agudos, EQ de 3 bandas, compressor, saturação, delay sincronizado ao BPM e reverb.
- Presets prontos: *Voz limpa, Voz trap, Voz rap, Voz R&B, Ad-libs, Rádio/telefone, Lo-fi, Catedral, Bateria punch, 808, Melodia ao fundo*. Você pode salvar os seus (ficam no navegador).
- Aba **Mixer**: canais com fader, medidor de nível, pan, mudo/solo/gravar e master com limitador.
- Ao armar uma faixa (●) aparece o nível do microfone; 🎧 liga o retorno da voz **já com os efeitos**.
- Gravar por cima de um trecho substitui o take antigo naquele trecho (dá para desfazer).

## Fluxo para a voz

1. Gere o beat (aba **Beat IA**) e abra as stems.
2. Escreva ou gere a letra (aba **Letra**); ela aparece na tela enquanto você grava.
3. Arme uma faixa (●) e grave (**R**). Use fone de ouvido para o beat não vazar no microfone.
4. Se a voz ficar adiantada ou atrasada em relação ao beat, ajuste **Latência (ms)** no topo.
5. Selecione o take → **Corretor de afinação** → *Analisar voz* → escolha o tom/preset → *Aplicar correção*. *Restaurar original* desfaz.

## Estrutura

```
src/
  app/api/flow/*      rotas server-side para o useapi.net (gerar, job, stems, letra)
  app/api/audio       proxy dos arquivos de áudio (só storage.googleapis.com)
  lib/audio/          motor Web Audio (transporte, metrônomo, gravação via AudioWorklet, mix offline, WAV)
  lib/dsp/pitch.ts    corretor: detecção de pitch (YIN) + correção na escala + TD-PSOLA
  workers/            Web Worker do corretor (não trava a interface)
  components/         interface do estúdio
```

## Próximos passos possíveis

- Conversão para a **sua voz** (modelo RVC treinado com a sua voz) a partir do vocal da IA.
- Afinação em tempo real ao gravar (monitoramento com autotune).
- Salvar/abrir projetos, seleção de vários clips, automação de volume, escolha do microfone.
- Ferramentas de edição do Flow Music: estender, substituir trecho e cover/remix.
