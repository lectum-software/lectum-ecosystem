# ADR-0329 - Contadores de tracao e engajamento no detalhe Admin do psicologo

## Status

Accepted

## Contexto

A aba **Geral** do detalhe administrativo do psicologo exibia cinco contadores independentes: Ranking, Avaliacao, Cliques no WhatsApp, Favoritado e Visualizacoes de perfil. O produto solicitou reduzir a leitura de tracao para um unico contador e adicionar um contador de **Engajamento**.

Ja existia uma fonte real para essa decisao no endpoint `GET /api/admin/private/psychologists/:id/statistics`: `business.traction` traz o resultado individual de tracao e `community.engagement_diagnosis` traz o diagnostico geral de engajamento comunitario.

## Decisao

A aba **Geral** passa a renderizar quatro contadores, nesta ordem: **Ranking**, **Avaliacoes**, **Tracao** e **Engajamento**.

- **Ranking** e **Avaliacoes** continuam usando `detail.general.metrics` e `detail.header.rating_count` retornados pelo endpoint de detalhe.
- **Tracao** usa `business.traction.label` do endpoint real de estatisticas no periodo `all` como metrica de destaque, sem recalcular a classificacao no frontend.
- Os sinais **WhatsApp**, **Favoritado** e **Visualizacoes** deixam de aparecer no resumo da aba **Geral**; eles continuam disponiveis nas estatisticas detalhadas do psicologo.
- **Engajamento** usa `community.engagement_diagnosis.label` do mesmo endpoint de estatisticas, preservando a regra documentada de melhor diagnostico entre comunidades ativas.

## Consequencias

- O resumo fica mais executivo e evita repetir tres cards que pertencem ao mesmo conceito de tracao.
- A UI evita divergencia de regra porque nao reimplementa a classificacao de tracao nem a agregacao de engajamento no cliente.
- Ha uma query adicional real na aba Geral para buscar estatisticas do psicologo no periodo `all`; ela reutiliza TanStack Query e o endpoint existente, sem endpoint paralelo, mock, schema Prisma, migration, package novo ou backfill.
- Em estado de carregamento/erro, os contadores mostram somente estado honesto (`Carregando`/`Indisponivel`) em vez de dados estimados.

## Task relacionada

TASK-55 - Detalhe administrativo do psicologo: Geral e Perfil/Cadastro.

## Validacao

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos tentativas intermediarias bloqueadas por outro `next build` em andamento e uma tentativa bloqueada por falta de espaco em disco (`ENOSPC`). Perfis temporarios de browser em `.tmp/chrome-*` foram removidos para liberar espaco antes da validacao final.
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.

## Atualizacao 2026-07-28 - Tração sem sinais internos

O produto solicitou remover **WhatsApp**, **Favoritado** e **Visualizacoes de perfil** de dentro do contador **Tracao**. O card passa a exibir somente o resultado real de tracao, mantendo os sinais detalhados fora do resumo da aba **Geral**.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "../adrs/0329-admin-psicologo-contadores-tracao-engajamento.md" "../_product/tasks/TASK-55-detalhe-psicologo-geral-perfil-admin.md"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.
