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
| M | Metrônomo liga/desliga |
| S | Dividir o clip selecionado no cursor |
| Delete | Apagar o clip selecionado |
| Alt + arrastar | Mover clip sem grudar na grade |

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
- Quantização de tempo da voz, salvar/abrir projetos, desfazer/refazer.
- Ferramentas de edição do Flow Music: estender, substituir trecho e cover/remix.
