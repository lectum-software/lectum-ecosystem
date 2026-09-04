# ADR-0485: Vídeo expandido inline sem fullscreen nativo

## Status

Accepted

## Task relacionada

TASK-169 — Remover tag nativa no vídeo expandido

## Contexto

O fullscreen nativo do navegador/OS em mobile pode exibir uma faixa própria com o domínio da página e
instruções para sair da tela cheia. No caso reportado em homologação, a mensagem começava por
`homolog.lectum.com.br — Para sair da tela cheia...`. Como essa faixa não pertence ao DOM da aplicação,
não é confiável nem correto tentar escondê-la via CSS, e ela conflita com a experiência visual imersiva
da Lectum.

A aplicação já possui `VerticalVideoPlayer` com controles persistentes próprios para vídeos de comunidade
e para o modo imersivo do feed de psicólogos. O comportamento desejado é ampliar o player mantendo o
usuário dentro da UI da Lectum, sem entregar a experiência para controles nativos do browser.

## Decisão

- Vídeos de conteúdo que usam `controlsVariant="persistent"`, `persistentControlsLayout="media"` e
  `fullscreenVariant="content"` deixam de chamar `requestFullscreen` ou `webkitEnterFullscreen`.
- Para esses casos, o botão `Ampliar vídeo` alterna um estado inline do React que aplica um overlay fixo
  em tela, com fundo do player, `object-contain`, controles persistentes e botão próprio de saída.
- O estado inline bloqueia a rolagem do `body` enquanto estiver ativo e também pode ser fechado por `Esc`.
- Usos futuros que não optarem por `fullscreenVariant="content"` + layout `media` continuam podendo usar
  o helper de fullscreen nativo existente.
- No feed de psicólogos, o modo imersivo deixa de habilitar `video.controls = true` de forma transitória;
  os controles exibidos permanecem os customizados/persistentes do produto.

## Alternativas consideradas

### Esconder a faixa nativa por CSS

Rejeitada. A faixa é renderizada pelo navegador/OS, fora do DOM controlado pela aplicação. Qualquer tentativa
de mascará-la seria frágil, específica de browser e sem garantia em iOS/Android.

### Manter fullscreen nativo com `navigationUI: "hide"`

Rejeitada para vídeos de conteúdo. Mesmo pedindo `navigationUI: "hide"`, browsers mobile podem mostrar
orientações próprias, domínio ou controles do sistema. A experiência visual continuaria instável.

### Remover totalmente o botão de ampliar

Rejeitada. O usuário ainda precisa de uma forma de ver o vídeo ampliado; trocar para overlay inline preserva
a funcionalidade e evita a tag nativa.

## Consequências

- A expansão de conteúdo passa a ser previsível e controlada pela UI Lectum, sem a tag do domínio do navegador.
- O player mantém acessibilidade por rótulos próprios e botão de saída visível.
- O comportamento independe de backend, schema, env e provider.
- Rollback simples reverte este commit, voltando ao fullscreen nativo e ao risco conhecido da faixa do browser.

## Validação

- Teste automatizado do helper que decide expansão inline para conteúdo.
- Teste estático garantindo que o feed de psicólogos não habilite `video.controls = true`.
- `frontend check`, `frontend build`, `pnpm check`, browser local mobile e smoke de homologação em `/psicologos`.
