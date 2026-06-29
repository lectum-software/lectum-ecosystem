# ADR-0181: Controles imersivos do video de descoberta de psicologos

## Status

Accepted

## Task relacionada

TASK-13/TASK-40 (ajuste pos-conclusao em `/psychologists`)

## Contexto

A pagina publica de descoberta de psicologos usa um player customizado, diferente do player base dos videos em comunidades. A barra de progresso do player customizado aceitava seek tambem com a UI visivel e atualizava `currentTime` continuamente durante o arraste, causando instabilidade de frame em alguns navegadores. Alem disso, quando o video estava mutado, somente o toque no icone central ativava o som e entrava no modo imersivo, apesar do icone ser apenas uma pista visual.

## Decisao

- Com UI visivel, a barra de progresso permanece como indicador passivo e nao recebe eventos de seek.
- Com UI escondida/imersiva, o player customizado habilita os controles nativos do elemento `video`, como no player base usado nas comunidades, para que o navegador cuide diretamente do seek/progresso.
- O scrubber customizado nao e renderizado no modo imersivo e a camada transparente de toque nao bloqueia os controles nativos.
- Ao entrar no modo imersivo, o elemento `video` ativa `controls` imediatamente para exibir play/pause, volume e barra de progresso nativos.
- O video em modo imersivo recebe `data-psychologists-native-controls="true"` e uma regra CSS de melhor esforco para manter os controles nativos sempre visiveis nos navegadores Chromium/WebKit.
- Como navegadores podem ocultar os controles nativos durante a reproducao, o modo imersivo tambem renderiza controles persistentes sem painel de fundo, com play/pause, progresso arrastavel via `input[type="range"]`, tempo, mute/unmute e tela cheia.
- No modo imersivo, tocar na area do video acima da regiao dos controles nativos retorna a UI padrao; a faixa inferior fica livre para interacao com o controle nativo.
- Quando o video estiver mutado, pausado ou sem volume, tocar em qualquer area nao interativa do video reproduz com som e esconde a UI, mantendo o icone central como affordance visual.
- Com UI visivel, o duplo toque/clique na area do video favorita o psicologo sem depender do botao lateral de favorito.

## Consequencias

- Reduz conflito entre toque para entrar no modo imersivo e seek acidental com UI visivel.
- Remove a fonte de reinicio/glitch causada pelo scrubber customizado em mobile.
- Mantem o player customizado necessario para o feed de psicologos, mas reutiliza o comportamento nativo confiavel do player de comunidade para progresso no modo imersivo.
- O modo imersivo mantem `video.controls` ativo, mas a interacao principal passa pela faixa persistente Lectum para evitar auto-hide dos controles do navegador.
- A visibilidade permanente dos controles nativos depende do navegador; em Chromium/WebKit a regra de pseudo-elementos forca painel, enclosure e controles visiveis, enquanto outros motores podem ignorar a customizacao por se tratar de UI nativa.
- A faixa persistente evita depender do auto-hide do navegador e garante controles visiveis o tempo todo, mantendo `video.controls` ativo como fallback nativo; o seek passa a usar o controle range nativo do navegador em vez do scrubber por `div`/pointer.
- O toque simples na area do video com UI visivel passa a aguardar uma janela curta para diferenciar duplo toque de acao simples.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendencias

- Validar manualmente em dispositivo/navegador mobile real com videos de psicologos publicados para confirmar o comportamento nativo de seek no Safari/Chrome mobile.
