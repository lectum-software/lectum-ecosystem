# ADR-0197: Scrollbar mobile opt-in nas telas principais

## Status

Accepted

## Task relacionada

TASK-43

## Contexto

A Lectum já tem telas mobile-first com navegação e leitura contínuas, especialmente o feed de comunidade, o feed dentro de comunidade e a descoberta vertical de psicólogos. Para aproximar essas telas da experiência de aplicativo, a barra visual de rolagem pode ser percebida como ruído no mobile. Ao mesmo tempo, remover scrollbars globalmente prejudicaria feedback no desktop e poderia reduzir a descoberta de conteúdo rolável em containers internos como modais, menus, selects, filtros e listas limitadas.

Em 2026-07-07, foi identificado na rota pública `/psychologists` que a scrollbar nativa do container vertical de vídeos ficava visualmente colada ao card de vídeo no desktop, criando ruído ao lado do conteúdo principal mesmo com controles próprios de navegação na tela.

A referência visual ativa permanece Builder Quick Copy + `_product/proto`. Nesta execução, o Quick Copy não estava disponível como ferramenta MCP chamável no ambiente, então foram usadas as imagens locais indicadas em `PROTO-INVENTORY.md`: `Feed Comunidade.jpg`, `Dentro da Comunidade.jpg` e `Psicólogos.jpg`.

## Decisão

Adotar ocultação de scrollbar visual por opt-in, apenas para scroll principal de telas app-like no mobile/tablet (`max-width: 1023px`). A classe `.lectum-mobile-main-scrollbar-hidden` é aplicada somente nos shells principais de feed/comunidade e psicólogos. A regra CSS usa `html/body:has(.lectum-mobile-main-scrollbar-hidden)` para ocultar a scrollbar do viewport quando a tela opt-in está montada, sem selecionar descendentes com overflow próprio.

No feed vertical de psicólogos, a ocultação visual do container `.psychologists-video-feed` passa a valer em todos os breakpoints. O scroll continua funcional por wheel/gesto/setas e pelos controles próprios da tela; somente a barra nativa do container deixa de aparecer ao lado do vídeo. Essa exceção não altera o viewport global em desktop nem containers internos como filtros, menus e listas.

## Consequências

- Mobile/tablet ganha sensação mais app-like nas telas principais de leitura contínua.
- Desktop preserva feedback de posição de rolagem no viewport global das telas opt-in, mas o feed vertical de psicólogos deixa de exibir a barra nativa para manter o vídeo limpo.
- Containers internos não herdam a nova regra e continuam com comportamento próprio.
- O uso de `:has()` depende de navegadores modernos, compatíveis com o alvo atual do app; navegadores sem suporte simplesmente mantêm a scrollbar visível.
- Novas telas principais devem optar explicitamente pela classe, evitando efeito colateral global.

## Validação

- `pnpm --dir frontend check` concluído sem erros.
- `pnpm --dir frontend build` concluído sem erros.
- Browser local via Chrome headless em `http://localhost:3000/` e `http://localhost:3000/psychologists`:
  - mobile 390x844: `html/body` calculou `scrollbar-width: none` nas telas opt-in; `psychologists-video-feed` calculou `scrollbar-width: none`.
  - desktop 1440x1000: `html/body` calculou `scrollbar-width: auto`; `psychologists-video-feed` calculou `scrollbar-width: auto`.
- Ajuste 2026-07-07 em `http://localhost:3000/psychologists`:
  - `pnpm --dir frontend check` concluído sem erros.
  - `pnpm --dir frontend build` concluído sem erros.
  - Browser local em desktop validou `.psychologists-video-feed` com `scrollbar-width: none`, mantendo a rolagem funcional.

## Pendências

- Nenhuma pendência externa.
