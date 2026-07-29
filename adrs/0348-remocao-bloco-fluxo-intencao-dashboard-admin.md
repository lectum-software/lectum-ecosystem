# ADR-0348: Remocao do bloco Fluxo de intencao e conversao no Dashboard Admin

## Status

Accepted - 2026-07-29

## Contexto

O Dashboard Admin recebeu o bloco **Fluxo de intencao e conversao** nas TASK-91 a TASK-93. Apos validacao visual em localhost, o fundador solicitou remover esse bloco da rota /dashboard para reduzir a tela executiva e deixar a **Visao geral** seguida diretamente pelos blocos operacionais existentes.

A remocao e uma decisao de UX do Dashboard Admin. Nao houve novo requisito de metrica, tracking, contrato externo, package ou banco.

## Decisao

- Remover do frontend Admin a renderizacao do bloco **Fluxo de intencao e conversao** em /dashboard.
- Remover helpers/imports locais usados apenas pela matriz visual e pelo modo **Exemplo visual local**.
- Manter o contrato intent_conversion_flow no endpoint GET /api/admin/private/dashboard/summary por compatibilidade, evitando uma mudanca backend desnecessaria nesta task curta.
- Nao criar mock, seed, backfill ou endpoint alternativo.

## Consequencias

- O Dashboard Admin fica mais enxuto e volta a priorizar cards de visao geral, atividade e denuncias.
- O backend ainda pode calcular/retornar intent_conversion_flow; uma task futura pode remover o contrato se o produto decidir eliminar definitivamente a metrica do backend.
- Nao ha migration, alteracao de Prisma, dependencia nova ou impacto no detalhe estatistico do psicologo.

## Task relacionada

- _product/tasks/TASK-94-remocao-bloco-fluxo-intencao-conversao-dashboard-admin.md

## Validacoes

- pnpm --dir admin check
- NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build
- pnpm check (tentado; bloqueado por alteracoes backend fora do escopo reaparecendo no workspace durante a execucao)
- Browser local/headless autenticado em http://localhost:3002/dashboard nos viewports 390px e 1366px.
