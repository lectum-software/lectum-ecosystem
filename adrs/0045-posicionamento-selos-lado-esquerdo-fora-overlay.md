# ADR-0045: Alinhar selos em coluna fora do overlay no lado esquerdo do card

## Status

Accepted

## Task relacionada

Refinamento visual do card de psicólogo para manter os selos de benefício fora do overlay, na margem esquerda.

## Contexto

Após os ajustes de overlay e posicionamento dos botões de ação, o produto passou a solicitar que os selos (`Aceita convênios`, `Valor social`, `Desconto 1ª sessão`) se mantivessem fora do painel inferior e simetricamente opostos aos botões de favoritar/compartilhar.

## Decisão

- Mantive o bloco de selos em posição absoluta no container geral do card (não no overlay):
  - `left: 3.2%`
  - `top: calc(100% - (var(--psychologist-overlay-height) + OVERLAY_FAVORITE_OFFSET))`
  - `gap: clamp(8px, 2vw, 10px)`
- Estruturei os selos em coluna vertical (`flex-col`) e com `z-index` acima do overlay.
- Padronizei largura e texto para evitar expansão automática por conteúdo:
  - largura fixa por faixa responsiva (`min(45vw, 180px)`)
  - truncamento (`truncate`, `overflow-hidden`, `whitespace-nowrap`)
  - altura e `font-size` responsivos já existentes.
- Mantive o bloqueio de clique dos selos para preservar comportamento de leitura apenas.

## Consequências

- Selos ficam visualmente fora do overlay e alinhados no lado esquerdo, enquanto as ações de favoritar/compartilhar permanecem no lado direito.
- Evita sobreposição do conteúdo do overlay com os selos e reduz variação de layout em diferentes tamanhos de tela.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação visual local na rota `/app/psychologists`.

