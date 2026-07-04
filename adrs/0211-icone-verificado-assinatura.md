# ADR-0211: Ícone verificado na assinatura profissional

## Status

Accepted

## Task relacionada

TASK-33

## Contexto

A tela `/app/professional/billing` exibia um `ShieldCheck` no card do plano atual. O produto pediu que esse ícone fosse substituído pelo selo de verificado já usado na Lectum, preservando a consistência visual com perfis, comunidade e demais pontos onde o estado de verificação profissional aparece.

## Decisão

Usar o componente existente `VerifiedBadgeIcon` em `frontend/src/app/app/professional/billing/logic.tsx` no ícone principal do card de assinatura, removendo o `ShieldCheck` desse ponto.

## Consequências

- A tela de assinatura passa a reutilizar o selo oficial de verificado da Lectum.
- Nenhum pacote novo, asset temporário ou componente paralelo foi criado.
- A alteração é visual e não muda regras de entitlement, verificação CFP, assinatura ou gateway.

## Validação

- Referência visual consultada: `_product/proto/Minhas Assinatura - Psicólogo.jpg`.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3109`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessão e `/auth/login` retornou `200`.

## Pendências

- Nenhuma.
