# ADR-0329 - Contadores de conversão e engajamento no detalhe Admin do psicologo

## Status

Accepted

## Contexto

A aba **Geral** do detalhe administrativo do psicologo exibia cinco contadores independentes: Ranking, Avaliacao, Cliques no WhatsApp, Favoritado e Visualizacoes de perfil. O produto solicitou reduzir a leitura de conversão para um unico contador e adicionar um contador de **Engajamento**.

Ja existia uma fonte real para essa decisao no endpoint `GET /api/admin/private/psychologists/:id/statistics`: `business.profile_conversion` traz o resultado individual de conversão e `community.engagement_diagnosis` traz o diagnostico geral de engajamento comunitario.

## Decisao

A aba **Geral** passa a renderizar quatro contadores, nesta ordem: **Ranking**, **Avaliacoes**, **Conversão** e **Engajamento**.

- **Ranking** e **Avaliacoes** continuam usando `detail.general.metrics` e `detail.header.rating_count` retornados pelo endpoint de detalhe.
- **Conversão** usa `business.profile_conversion.label` do endpoint real de estatisticas no periodo `all` como metrica de destaque, sem recalcular a classificacao no frontend.
- Os sinais **WhatsApp**, **Favoritado** e **Visualizacoes** deixam de aparecer no resumo da aba **Geral**; eles continuam disponiveis nas estatisticas detalhadas do psicologo.
- **Engajamento** usa `community.engagement_diagnosis.label` do mesmo endpoint de estatisticas, preservando a regra documentada de melhor diagnostico entre comunidades ativas.

## Consequencias

- O resumo fica mais executivo e evita repetir tres cards que pertencem ao mesmo conceito de conversão.
- A UI evita divergencia de regra porque nao reimplementa a classificacao de conversão nem a agregacao de engajamento no cliente.
- Ha uma query adicional real na aba Geral para buscar estatisticas do psicologo no periodo `all`; ela reutiliza TanStack Query e o endpoint existente, sem endpoint paralelo, mock, schema Prisma, migration, package novo ou backfill.
- Em estado de carregamento/erro, os contadores mostram somente estado honesto (`Carregando`/`Indisponivel`) em vez de dados estimados.

## Task relacionada

TASK-55 - Detalhe administrativo do psicologo: Geral e Perfil/Cadastro.

## Validacao

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos tentativas intermediarias bloqueadas por outro `next build` em andamento e uma tentativa bloqueada por falta de espaco em disco (`ENOSPC`). Perfis temporarios de browser em `.tmp/chrome-*` foram removidos para liberar espaco antes da validacao final.
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.

## Atualizacao 2026-07-28 - Conversão sem sinais internos

O produto solicitou remover **WhatsApp**, **Favoritado** e **Visualizacoes de perfil** de dentro do contador **Conversão**. O card passa a exibir somente o resultado real de conversão, mantendo os sinais detalhados fora do resumo da aba **Geral**.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "../adrs/0329-admin-psicologo-contadores-conversao-engajamento.md" "../_product/tasks/TASK-55-detalhe-psicologo-geral-perfil-admin.md"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.

## Atualizacao 2026-08-03 - Resumo Geral sem textos auxiliares de baixa confianca

O produto solicitou enxugar os cards superiores da aba **Geral** do detalhe Admin do psicologo.

Decisao complementar:

- Quando a conversao esta em `insufficient_data`, o card **Conversao** exibe somente o resultado principal, sem renderizar a posicao de plataforma "Sem comparacao durante adaptacao" nem a frase de dias minimos de adaptacao.
- O card **Engajamento** exibe somente o diagnostico principal retornado por `community.engagement_diagnosis.label`, sem a legenda fixa "Diagnostico geral nas comunidades".
- O contador de **Avaliacoes** mantem a media real como destaque e passa a exibir a quantidade real de avaliacoes na mesma linha, ao lado da nota, reduzindo altura e ruido visual.

Consequencia:

- O resumo evita explicar ausencia de base no mesmo nivel visual dos indicadores principais, sem alterar contrato, calculo, tracking, backend, schema Prisma, package ou dado persistido.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check -- "admin/src/app/(admin)/psicologos/[id]/client.tsx"`
- Smoke HTTP local: GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf retornou 200.
