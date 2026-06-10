# ADR-0047: Ajustar largura dos selos e espaçamento dinâmico no card de psicólogo

## Status

Accepted

## Contexto

Após os refinamentos anteriores do card de psicólogo, os selos de benefícios permaneciam com largura fixa e sem
efeito visual complementar. O novo pedido solicitou:

1. largura dos selos ajustada ao conteúdo;
2. distância entre o último selo e o overlay igual à distância entre overlay e botão de compartilhar;
3. animação flutuante para os selos.

Usar apenas CSS não era suficiente para manter o mesmo espaçamento vertical com precisão em diferentes alturas de card e
acréscimo de overlays com comportamento responsivo.

## Decisão

- Alterei os selos para `width: fit-content` (com `max-width` responsivo), preservando `truncate` para textos longos e
evitando expansão indesejada do card.
- Mantive os selos fora do overlay, no container absoluto do card, com `left: 3.2%` e `z-index` acima do painel inferior.
- Implementei cálculo de posição por DOM para manter distância coerente:
  - medições de `overlay`, `share button`, card e altura total do bloco de selos;
  - posição superior dos selos = `overlayTop - overlayShareGap - tagsHeight`, onde `overlayShareGap` é a distância real
    medida entre overlay e botão de compartilhar.
- Adicionei animação de flutuação (`psychologist-tag-float`) em loop nos selos, com atraso escalonado por índice para
  criar efeito orgânico.
- Incluí ajuste de acessibilidade com `@media (prefers-reduced-motion: reduce)` para desativar animação quando necessário.

## Consequências

- O alinhamento vertical entre selos, overlay e botão de compartilhar permanece consistente em variações de tamanho de card.
- Os selos ganham comportamento mais fluido visualmente sem depender de valores fixos por breakpoint.
- Mantém-se o princípio de não sobrepor os selos ao overlay.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação visual local recomendada na tela de listagem de psicólogos (`/app/psychologists`).
