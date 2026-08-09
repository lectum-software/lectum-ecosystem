# TASK-123 - Donut de Atividade no dashboard Admin de psicologos

## Status

Completed

## Contexto

Depois da TASK-122, o bloco **Atividade, visibilidade, engajamento, favoritos e conversao dos psicologos** em `/psicologos` usa carrossel horizontal para os donuts agregados. Em 2026-07-31, o usuario pediu explicitamente para adicionar um grafico donut de **Atividade** nessa area, antes dos demais sinais.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando o carrossel de donuts em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Adicionar um donut agregado de **Atividade** ao dashboard Admin de psicologos, usando apenas acoes reais do periodo e respeitando o filtro por plano do bloco.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-76: seletor global de periodo do Admin.
- TASK-87: padronizacao de graficos donut no Admin.
- TASK-111: definicao vigente de Atividade como acoes brutas reais (`posts + respostas`).
- TASK-122: carrossel dos donuts e bloco **Padrao da plataforma**.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Adicionar ao contrato do dashboard `profile_activity` com categorias, totais, thresholds e fonte.
- Classificar psicologos por volume real de acoes autorais nas comunidades no periodo:
  - **Muito ativo**: 12 ou mais acoes;
  - **Ativo**: 6 a 11 acoes;
  - **Pouco ativo**: 3 a 5 acoes;
  - **Sem base**: menos de 3 acoes.
- Contar acoes como `community_post.author_id` + `post_reply.author_id`, filtradas pelo periodo selecionado, sem seed, mock ou backfill.
- Reutilizar o filtro por plano do bloco para `Todos`, `Assinantes`, `Gratuitos` e `Cortesia`.
- Renderizar o card **Atividade** no inicio do carrossel, com donut, legenda e **Padrao da plataforma** mostrando a faixa **Ativo**.
- Atualizar o titulo do bloco para incluir **Atividade**.

## Fora do escopo

- Alterar formulas de visibilidade, engajamento, favoritos ou conversao.
- Criar matriz Conversao x Atividade.
- Alterar ranking publico, lista de psicologos ou detalhe individual do psicologo.
- Criar schema Prisma, migration, endpoint paralelo, mock, seed ou package novo.

## Criterios de aceite

- [x] O bloco de donuts em `/psicologos` exibe um card **Atividade**.
- [x] O card **Atividade** aparece antes de **Video de apresentacao** no carrossel.
- [x] O donut usa categorias **Muito ativo**, **Ativo**, **Pouco ativo** e **Sem base**.
- [x] As categorias usam somente acoes reais de `community_post.author_id` e `post_reply.author_id` no periodo selecionado.
- [x] O filtro por plano do bloco altera tambem o donut de **Atividade**.
- [x] O bloco **Padrao da plataforma** do card **Atividade** exibe a faixa **Ativo** (`6 a 11 acoes`).
- [x] A UI segue mobile-first, preserva o carrossel e nao cria overflow horizontal em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0387-donut-atividade-dashboard-psicologos-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local via Chrome/CDP headless em `http://localhost:3002/psicologos` com backend real em
  `localhost:3001`, validando:
  - API real `profile_activity.source = community_post.author_id+post_reply.author_id`;
  - categorias **Muito ativo**, **Ativo**, **Pouco ativo** e **Sem base**;
  - card **Atividade** como primeiro item antes de **Video de apresentacao**;
  - faixa **6 a 11 acoes** no **Padrao da plataforma**;
  - desktop 1440px sem overflow global;
  - mobile 390px sem overflow global (`documentScrollWidth = 390`, `documentClientWidth = 390`).

## Observacoes

- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, `pnpm --dir backend db:migrate` nao se aplica.
