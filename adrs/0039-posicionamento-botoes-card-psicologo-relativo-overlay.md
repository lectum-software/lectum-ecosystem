# ADR-0039: Posicionamento relativo dos botões de ação do card de psicólogo

## Status

Accepted

## Task relacionada

Ajuste operacional do card de psicólogo (solicitação de consistência visual).

## Contexto

O card vertical de psicólogo possui overlay inferior com altura base em `min-height`.  
Os botões de Favoritar e Compartilhar eram posicionados por percentuais fixos (`57%` e `57% + x`) do topo do card.
Quando a altura do overlay era alterada, os botões perdiam o alinhamento relativo visual com esse painel.

## Decisão

- Mantive a altura base do overlay em uma única constante de componente (`PSYCHOLOGIST_OVERLAY_HEIGHT`) no arquivo `frontend/src/components/psychologists/psychologist-card.tsx`.
- Passei a posicionar os dois ícones usando a mesma referência do overlay:
  - `top: calc(100% - (var(--psychologist-overlay-height) + overlay_offset))`
- Atualizei o overlay para usar `minHeight: PSYCHOLOGIST_OVERLAY_HEIGHT` (removendo a repetição do valor fixo em Tailwind), garantindo um único ponto de alteração caso a altura do overlay mude no futuro.
- Mantive a distância vertical entre os ícones (gap) equivalente ao comportamento existente via deslocamento já usado antes do ajuste.

## Consequências

- Alterar a altura do overlay no componente passa a mover os dois ícones em conjunto, preservando seu posicionamento relativo.
- A manutenção fica centralizada: uma alteração de altura no overlay exige ajuste em `PSYCHOLOGIST_OVERLAY_HEIGHT`, sem múltiplos pontos de edição.
- Risco baixo: a relação dos offsets ainda é relativa e pode exigir ajuste fino de valores caso o layout seja reequilibrado em outro ponto da UI.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Nenhuma pendência no momento.
