# ADR-0037: Ajustes de densidade e legibilidade no cabeÃ§alho de psicÃ³logo

## Status

Accepted

## Task relacionada

TASK-18

## Contexto

Durante os ajustes de listagem e perfil profissional foi identificado overflow visual quando o nome do
psicÃ³logo Ã© muito extenso. Em telas estreitas, o nome empurrava elementos fixos e o selo de
verificaÃ§Ã£o podia sumir fora da linha/área visÃ­vel.

AlÃ©m disso, o topo da ediÃ§Ã£o do perfil profissional (etapa de configuraÃ§Ã£o) tinha fundo herdado de
`bg-surface`, causando contraste inconsistente com a borda do card. O ajuste solicitado era manter
o topo branco dentro da borda.

## DecisÃ£o

- No componente de card de psicÃ³logo (`frontend/src/components/psychologists/psychologist-card.tsx`) o
  nome do profissional passa a usar `line-clamp-2` com truncamento por elipse no mÃ¡ximo de duas linhas,
  preservando sempre o `VerifiedBadgeIcon` em uma coluna fixa ao lado.
- No cabeÃ§alho do perfil pÃºblico (`frontend/src/app/app/psychologist/[id]/logic.tsx`), a linha com nome
  tambÃ©m adota limite de duas linhas com elipse para o mesmo comportamento visual de overflow.
- No cabeÃ§alho superior da tela de ediÃ§Ã£o do perfil profissional (`frontend/src/app/app/professional/profile/setup/logic.tsx`),
  o fundo da caixa superior foi alterado para `bg-white` para manter contraste branco dentro da borda.

## ConsequÃªncias

- Os elementos fixos (badge de verificaÃ§Ã£o, botÃµes de aÃ§Ã£o e metadados adjacentes) deixam de ser deslocados por
  nomes longos.
- O fluxo permanece sem alteraÃ§Ãµes de estado, contrato de dados ou validaÃ§Ãµes de backend.

## ValidaÃ§Ã£o

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
