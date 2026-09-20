# ADR-0518 - Guarda de foco para playback de videos em stream

## Status

Aceita em 2026-09-20.

## Contexto

Os videos reproduzidos via Stream podem gerar custo enquanto continuam tocando. Autoplay mudo e uma regra de produto valida, mas nao deve manter consumo quando o usuario troca de aba, minimiza o app/navegador, perde foco da janela ou rola o player para fora da viewport.

## Decisao

Centralizar uma guarda client-side reutilizavel para playback ativo:

- pausar videos em `visibilitychange`, `blur`, `pagehide` e `freeze`;
- exigir atencao real do documento por `documentHasUserAttention()` antes de tocar ou retomar;
- observar a visibilidade do proprio elemento `<video>` com `IntersectionObserver`;
- marcar pausas automaticas com `data-lectum-paused-by-focus-guard` para que o autoplay de comunidades nao confunda essa pausa com intencao manual do usuario;
- retomar apenas videos que estavam tocando antes da pausa automatica, preservando pausas manuais.

A integracao fica no `VerticalVideoPlayer` compartilhado e no card de psicologos, alem de reforcar o orquestrador de autoplay das comunidades para nunca iniciar playback sem atencao ativa.

## Consequencias

- Reduz risco de cobranca por consumo em background sem alterar backend, Stream, storage ou contratos de API.
- Preserva autoplay mudo quando o player esta realmente elegivel: pagina visivel, janela focada e video visivel.
- A protecao e client-side e nao substitui controles de sessao/heartbeat no backend caso uma medicao financeira mais rigida seja adicionada no futuro.
- Nao adiciona env, package ou migration.

## Rollback

Reverter o commit que adiciona a guarda e suas integracoes. O comportamento volta ao autoplay anterior, sem impacto em dados persistidos.
