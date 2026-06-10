# ADR-0053: Posicionar selos de forma ascendente em relação ao overlay do card

## Status

Accepted

## Task relacionada

TASK-XX

## Contexto

Após a posição dinâmica dos botões de ação (favoritar/compartilhar) acompanhar a altura real do overlay, os selos ainda permaneciam com posição baseada na combinação de `overlay + botão`, o que podia afastá-los do overlay quando ele mudava.

## Decisão

Ajustar o posicionamento dos selos para usar a altura real do overlay e empilhar do fundo para o topo:

- manter a medição de `overlayRect` já existente para obter `overlayHeightPx`;
- recomputar `tagTopOffsetPx` como `overlayTop - tagContainerHeight - margem`;
- usar `flex-col-reverse` no container de selos para que a primeira etiqueta visualmente inicie próxima ao overlay e as demais fiquem acima.

## Consequências

- **Impacto positivo:** com múltiplos selos, o primeiro (mais relevante no topo da lista) fica mais próximo do overlay, enquanto os próximos sobem acima dele.
- **Trade-off:** depende de medida pós-renderização do container para `tagTopOffsetPx`.
- **Riscos:** em cenários sem tempo de layout ainda pode haver um frame de recalibração.

## Validação

- `pnpm --dir frontend check`

## Pendências

- Nenhuma.
