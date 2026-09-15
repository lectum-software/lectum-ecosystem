# ADR-0460 — Restaurar plano gratuito após cancelamento de assinatura paga

## Status

Aceito — 2026-08-15

## Contexto

Psicólogos que escolhiam o Plano Profissional, tinham a assinatura confirmada e ainda não haviam
concluído as etapas obrigatórias do fluxo pago podiam ficar presos em telas como endereço de
faturamento se a assinatura fosse cancelada antes da regularização dessas etapas. O plano pago já não
conferia entitlement, mas também não existia necessariamente uma assinatura gratuita ativa para
representar o plano vigente.

## Decisão

- Todo cancelamento real de assinatura profissional Mercado Pago passa a restaurar um plano efetivo:
  - preserva outra assinatura profissional ativa, como cortesia administrativa;
  - reutiliza um Plano Gratuito ativo, se existir;
  - reativa uma assinatura gratuita anterior, se existir;
  - cria uma assinatura `free_signup` ativa quando o psicólogo veio direto do checkout pago e nunca
    teve plano gratuito.
- A restauração é idempotente e fica centralizada no módulo de billing, sendo chamada por sync manual,
  webhook, cancelamento do psicólogo, cancelamento administrativo e leitura de plano atual para
  corrigir estados legados já publicados.
- A tela de endereço de faturamento deixa de exibir bloqueio de checkout quando o plano atual já é
  gratuito, cancelado ou inexistente; nesses casos, redireciona para a próxima etapa gratuita
  aplicável.

## Consequências

- O usuário volta ao Plano Gratuito e as telas obrigatórias pagas deixam de bloquear a navegação após
  cancelamento real da assinatura.
- Não há migration, env nova, reset, seed ou mock; a correção usa apenas registros existentes e
  criação idempotente do plano gratuito ativo.
- Assinaturas canceladas continuam preservadas para histórico financeiro/admin, mas deixam de ser o
  plano efetivo do psicólogo.

## Task relacionada

- Ajuste pós-feedback da TASK-156 — Régua de cobrança e regularização da assinatura.

## Validações

- `pnpm --dir backend test`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm check:version` após bump para `0.1.128`
