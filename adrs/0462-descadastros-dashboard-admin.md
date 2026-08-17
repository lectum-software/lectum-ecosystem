# ADR-0462: Descadastros nos dashboards Admin

## Status

Accepted

## Task relacionada

TASK-53, TASK-60

## Contexto

Os dashboards Admin de psicólogos e pacientes já exibiam visão geral com total, segmentos de status/plano, novos cadastros e séries temporais, mas não havia um contador explícito para usuários que excluíram a própria conta. A exclusão de conta no produto é soft delete em `user`, preservando `role`, `deleted=true`, `deletedAt` e `account_status="deleted"` para auditoria operacional, sem expor PII ou reativar dados excluídos na UI.

## Decisão

Adicionar o contador **Descadastros** nos dashboards Admin de psicólogos e pacientes, calculado por `user.deleted=true`, `user.account_status="deleted"`, `user.deletedAt` preenchido e `role` correspondente ao dashboard.

O valor do card considera exclusões no período selecionado, comparando com o período anterior via a mesma função de métricas dos demais cards. A série temporal inclui `deleted_accounts` como contagem por dia/mês agregável, sem transformar descadastro em base acumulada e sem recolocar usuários excluídos nos totais ativos.

## Consequências

- O Admin passa a distinguir crescimento bruto de perdas por exclusão de conta.
- Totais de pacientes/psicólogos seguem contando somente contas não excluídas, mantendo a semântica atual.
- O período **Todo o período** passa a considerar também o menor `deletedAt` quando houver apenas descadastros anteriores à base não excluída.
- A métrica usa dados reais existentes e não cria tracking paralelo, backfill, seed ou mock.

## Produção e rollout

- Sem alteração de Prisma schema, migrations, buckets, seeds ou env vars.
- Contrato backend é aditivo: adiciona `cards.deleted_accounts` e `series/timeline.points[].deleted_accounts`.
- Durante rollout, versões antigas do Admin continuam funcionando porque ignoram campos extras; a nova UI exige backend atualizado para renderizar o novo card.
- Deploy segue fluxo padrão por push em `homolog`, smoke de Admin `/version`, backend `/ping`, `/health`, `/ready` e validação posterior antes de promoção por PR.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke local dos services de dashboard confirmando `deleted_accounts` nos cards e nas séries.
- Browser local do Admin em `/psicologos` e `/pacientes`.

## Pendências

- Nenhuma pendência externa.
