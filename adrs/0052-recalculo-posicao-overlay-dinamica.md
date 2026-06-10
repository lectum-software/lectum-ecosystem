# ADR-0052: Recalcular posição dos botões conforme mudanças dinâmicas do overlay

## Status

Accepted

## Task relacionada

TASK-XX

## Contexto

A posição de favoritar/compartilhar já passou a considerar a altura do overlay via medição em pixels, mas esse valor ainda precisava ser atualizado também quando o próprio overlay muda de tamanho por conteúdo interno (linhas de texto, layout responsivo local), sem disparo de resize de janela.

## Decisão

Adicionar observação do próprio elemento `overlayRef` com `ResizeObserver` (além do card), garantindo recálculo contínuo de:

- `overlayHeightPx`;
- `tagTopOffsetPx`.

Com isso, os botões permanecem posicionados acima do overlay em qualquer variação de tamanho durante o ciclo de render.

## Consequências

- **Impacto positivo:** evita regressão visual de sobreposição em mudanças de conteúdo/altura do overlay após o carregamento inicial.
- **Trade-off:** mais observadores de resize em tela com muitos cards, com custo mínimo por serem operações leves de leitura de layout.
- **Riscos:** nenhum funcionalmente relevante identificado para a interação atual.

## Validação

- `pnpm --dir frontend check`

## Pendências

- Nenhuma.
