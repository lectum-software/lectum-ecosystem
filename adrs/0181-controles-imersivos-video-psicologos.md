# ADR-0181: Controles imersivos do video de descoberta de psicologos

## Status

Accepted

## Task relacionada

TASK-13/TASK-40 (ajuste pos-conclusao em `/psychologists`)

## Contexto

A pagina publica de descoberta de psicologos usa um player customizado, diferente do player base dos videos em comunidades. A barra de progresso do player customizado aceitava seek tambem com a UI visivel e atualizava `currentTime` continuamente durante o arraste, causando instabilidade de frame em alguns navegadores. Alem disso, quando o video estava mutado, somente o toque no icone central ativava o som e entrava no modo imersivo, apesar do icone ser apenas uma pista visual.

## Decisao

- Com UI visivel, a barra de progresso permanece como indicador passivo e nao recebe eventos de seek.
- Com UI escondida/imersiva, o video passa pelo `VerticalVideoPlayer`, o mesmo player base usado nas comunidades, usando a variante persistente para manter controles visiveis e seek por pointer events diretamente no `video.currentTime`.
- O scrubber customizado antigo do feed nao e renderizado no modo imersivo e a camada transparente de toque nao cobre a area dos controles persistentes.
- Ao entrar no modo imersivo, os controles persistentes do `VerticalVideoPlayer` ficam visiveis o tempo todo, sem depender do auto-hide dos controles nativos do navegador.
- O modo imersivo nao tenta forcar a UI nativa por CSS; quando a visibilidade permanente e obrigatoria, os controles persistentes ficam dentro do player compartilhado e nao como overlay avulso do feed.
- No modo imersivo, tocar na area do video fora dos controles retorna os elementos da UI Lectum; o botao `X` continua como affordance explicita.
- No modo imersivo, os controles nativos do elemento `video` devem ficar desligados para evitar duplicacao visual com a variante persistente; como a tela ja esta expandida nesse modo, nao ha botao de fullscreen nos controles persistentes.
- Durante o arraste da barra persistente, o player pausa temporariamente o video, aplica `currentTime` diretamente e retoma se o video estava tocando, para estabilizar tambem o primeiro video ativo carregado na pagina.
- Se o primeiro seek persistente nao alterar o `currentTime` em tempo util, o player baixa a midia como `Blob` e troca para um `Blob URL` local como fallback de seek para videos publicos pequenos de apresentacao.
- Em desktop, a rail externa de acoes (perfil, favorito, compartilhar e WhatsApp) permanece visivel no modo imersivo porque nao bloqueia os controles do video.
- Quando o video estiver mutado, pausado ou sem volume, tocar em qualquer area nao interativa do video reproduz com som e esconde a UI, mantendo o icone central como affordance visual.
- Com UI visivel, o duplo toque/clique na area do video alterna o favorito/desfavorito sem depender do botao lateral de favorito.
- Ao entrar no modo imersivo, coach marks ativos de "Minha Busca" ou "WhatsApp" sao fechados junto com a UI, sem marcar automaticamente uma nova dica como vista.

## Consequencias

- Reduz conflito entre toque para entrar no modo imersivo e seek acidental com UI visivel.
- Remove a fonte de reinicio/glitch causada pelo scrubber antigo do feed em mobile.
- Mantem a UI customizada do feed de psicologos, mas reutiliza o `VerticalVideoPlayer` de comunidade para o elemento de video e para os controles persistentes do modo imersivo.
- O toque na area do video em modo imersivo retorna os elementos da UI Lectum via callback do player compartilhado, sem depender do comportamento de auto-hide dos controles nativos do navegador.
- O toque simples na area do video com UI visivel passa a aguardar uma janela curta para diferenciar duplo toque de acao simples.
- Dicas contextuais nao competem visualmente com o player imersivo; se a dica ja estava ativa, ela e descartada apenas no estado local da sessao.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Complemento 2026-08-15 - progresso acima da bottom nav no Android

### Contexto

Screenshots enviados pelo usuario mostraram que a barra de progresso do feed de psicologos aparecia no iOS, mas ficava
invisivel no Android. A barra era posicionada por um offset fixo baseado em `64px + env(safe-area-inset-bottom)`,
enquanto a bottom nav compartilhada do `PrivateTemplate` calcula sua altura real por
`--lectum-mobile-bottom-nav-height`. Em Android, onde o safe-area inferior e normalmente zero, o offset fixo podia deixar
a barra dentro da area branca da navegacao e abaixo do stacking context da nav.

### Decisao

- O feed de psicologos passa a posicionar a barra customizada usando `--lectum-mobile-bottom-nav-height`, a mesma fonte
  de verdade da bottom nav compartilhada.
- O offset desktop continua `0px`, preservando a barra no rodape do card desktop.
- O modo imersivo continua usando os controles persistentes do `VerticalVideoPlayer`; a barra customizada segue
  restrita a UI visivel do feed.

### Consequencias

- A barra fica imediatamente acima da navegacao inferior em Android e iOS, sem depender de safe-area para corrigir a
  altura da nav.
- A mudanca evita duplicar calculo de altura de navegacao na tela de psicologos e reduz divergencia futura caso a bottom
  nav mude de tamanho.
- Nao ha mudanca de backend, schema, API, dados persistidos, packages ou analytics.

## Pendencias

- Validar manualmente em dispositivo/navegador mobile real com videos de psicologos publicados para confirmar o seek persistente no Safari/Chrome mobile.
