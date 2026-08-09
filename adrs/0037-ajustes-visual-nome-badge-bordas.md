# ADR-0037: Ajustes de densidade e legibilidade no cabeçalho de psicólogo

## Status

Accepted

## Task relacionada

TASK-18

## Contexto

Durante os ajustes de listagem e perfil profissional foi identificado overflow visual quando o nome do
psicólogo é muito extenso. Em telas estreitas, o nome empurrava elementos fixos e o selo de
verificação podia sumir fora da linha/área visível.

Além disso, o topo da edição do perfil profissional (etapa de configuração) tinha fundo herdado de
`bg-surface`, causando contraste inconsistente com a borda do card. O ajuste solicitado era manter
o topo branco dentro da borda.

## Decisão

- No componente de card de psicólogo (`frontend/src/components/psychologists/psychologist-card.tsx`) o
  nome do profissional passa a usar `line-clamp-2` com truncamento por elipse no máximo de duas linhas,
  preservando sempre o `VerifiedBadgeIcon` em uma coluna fixa ao lado.
- No cabeçalho do perfil público (`frontend/src/app/app/psychologist/[id]/logic.tsx`), a linha com nome
  também adota limite de duas linhas com elipse para o mesmo comportamento visual de overflow.
- No cabeçalho superior da tela de edição do perfil profissional (`frontend/src/app/app/professional/profile/setup/logic.tsx`),
  o fundo da caixa superior foi alterado para `bg-white` para manter contraste branco dentro da borda.

## Consequências

- Os elementos fixos (badge de verificação, botões de ação e metadados adjacentes) deixam de ser deslocados por
  nomes longos.
- O fluxo permanece sem alterações de estado, contrato de dados ou validações de backend.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
