# ADR-0255: Ocultar concessão de cortesia quando o plano atual já é profissional

## Status

Accepted

## Task relacionada

TASK-56

## Contexto

Na aba Admin `Plano e pagamentos`, o card `Conceder cortesia` continuava visível quando o psicólogo já possuía `Plano Profissional` vigente. Mesmo bloqueado por regra de gateway, esse estado criava ambiguidade operacional porque cortesia é um mecanismo de concessão para quem ainda não possui plano profissional ativo.

A referência visual da área continua sendo `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png`. O Builder/Quick Copy não estava exposto como ferramenta callable neste ambiente, então a validação usou as imagens locais e a rota Admin local.

## Decisão

- A UI Admin não renderiza mais a ação/card `Conceder cortesia` quando o plano atual tiver assinatura profissional vigente.
- A detecção considera `plan.id`, ausência de cortesia ativa, `plan.is_paid`, `plan_slug="profissional"` ou `plan_name="Plano Profissional"`.
- Cortesia ativa segue usando o fluxo existente de `Revogar cortesia`; plano gratuito ou ausência de plano continuam elegíveis a exibir a concessão quando `courtesy.can_grant` permitir.

## Consequências

- Reduz ruído e evita que o Admin tente conceder uma cortesia para quem já possui plano profissional.
- Não altera backend, gateway, assinatura, schema Prisma, migrations ou pacote.
- A validação de domínio existente no backend continua protegendo o endpoint de concessão contra estados bloqueados.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm check`
- `git diff --check`
- Browser local/rota Admin: `GET http://localhost:3002/psicologos/cmrglzdds000ajkuhqedavedb?tab=plano` retornou `200`. A validação visual autenticada ficou limitada porque a sessão Admin do navegador do usuário não é exposta à automação deste ambiente; a evidência funcional principal veio de typecheck/build e da condição de renderização compilada.

## Pendências

- Nenhuma pendência externa.
