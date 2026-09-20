# TASK-192 - Guarda de foco para reproducao de videos em stream

## Contexto

Os videos da Lectum usam Cloudflare Stream e podem gerar custo por tempo de visualizacao. O autoplay mudo deve continuar existindo, mas nenhum video deve permanecer tocando quando o usuario claramente nao esta vendo o conteudo, como ao trocar de aba, minimizar o navegador/app no celular, bloquear a tela ou rolar o player para fora da area visivel.

## Escopo

- Frontend only.
- Player vertical compartilhado, videos de feed/comunidades e cards de psicologos.
- Sem alteracao de contrato com backend, servico `video/`, banco, storage, env ou packages.

## Criterios de aceite

- [x] Videos pausam automaticamente quando a pagina perde visibilidade, a janela perde foco, ocorre `pagehide`/freeze ou o player deixa de estar visivel o suficiente na viewport.
- [x] A regra de autoplay mudo e preservada apenas quando a pagina esta visivel, focada e o player esta em area visivel.
- [x] Pausas automaticas de guarda nao sao tratadas como pausa manual do usuario no autoplay do feed.
- [x] Videos que estavam tocando antes da pausa automatica podem retomar ao recuperar foco/visibilidade, sem retomar videos pausados manualmente.
- [x] Tracking de atencao existente continua compativel e nao contabiliza foco ausente como visualizacao ativa.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.
- [x] Testes focados e validacao frontend executados antes do versionamento.

## Evidencia

- Implementado `useActiveVideoPlaybackGuard` com Page Visibility API, `window.blur/focus`, `pagehide/pageshow`, `freeze` e `IntersectionObserver`.
- Integrado ao `VerticalVideoPlayer` compartilhado, ao card de psicologos e ao autoplay de comunidades.
- ADR: `adrs/0518-guarda-foco-playback-videos-stream.md`.
