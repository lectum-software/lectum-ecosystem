# ADR-0051: Posicionamento dinâmico de botões do card relativo ao overlay real

## Status

Accepted

## Task relacionada

TASK-XX

## Contexto

Com o overlay inferior do card de psicólogo variando de tamanho conforme conteúdo responsivo, os botões de favoritar e compartilhar eram posicionados por uma altura fixa (26%), podendo ficar sobrepostos ao overlay em alguns cenários.

## Decisão

Passar a usar a altura real medida do overlay no cálculo de posição desses botões:

- medir `overlayRef` via `getBoundingClientRect()`;
- atualizar uma propriedade CSS `--psychologist-overlay-height` com o valor real (`px`) do overlay;
- manter os offsets existentes (`OVERLAY_FAVORITE_OFFSET` e `OVERLAY_SHARE_GAP`) para preservar o padrão visual.

## Consequências

- **Impacto positivo:** evita sobreposição do botão de compartilhamento (e do favorito) quando o overlay cresce ou encolhe.
- **Trade-off:** depende de medição pós-render, exigindo recalculo no resize/recalls de layout.
- **Riscos:** pequenas mudanças de posição no primeiro frame até a primeira medição ser aplicada; mitigado com recálculo imediato (`requestAnimationFrame`) no mount e listeners de `resize`.

## Validação

- `pnpm --dir frontend check`

## Pendências

- Nenhuma.
