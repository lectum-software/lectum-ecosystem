# ADR-0363 - Distribuicao de cliques WhatsApp no Dashboard Admin

## Status

Accepted

## Contexto

O Dashboard Admin precisava responder, de forma executiva, se os cliques de WhatsApp estao
concentrados em poucos psicologos ou distribuidos de maneira equilibrada. A pergunta operacional e:
"X% dos cliques de WhatsApp estao indo para X% dos psicologos?".

A plataforma ja persiste a intencao real de contato em `contact_request.channel="whatsapp"` e ja
possui filtro de periodo no endpoint `GET /api/admin/private/dashboard/summary`. Nao havia
necessidade de criar tracking, mock, seed, pacote de graficos ou endpoint paralelo.

## Decisao

- Expandir o contrato existente do Dashboard Admin com `whatsapp_click_distribution`.
- Usar como base os psicologos ativos e publicados atualmente:
  `psychologist_profile.published=true`, `psychologist_profile.deleted=false`, `user.active=true`,
  `user.deleted=false` e `user.role="psicologo"`.
- Contabilizar apenas cliques reais em `contact_request.channel="whatsapp"`, `deleted=false`, dentro
  do periodo selecionado no Dashboard.
- Incluir psicologos sem clique na base com valor zero para medir concentracao de forma honesta.
- Renderizar a curva acumulada/Lorenz em SVG/CSS proprio, sem biblioteca externa, junto de cards de
  total, base, sem clique, top 10% e top 20%.
- Manter a leitura interna e agregada, sem ranking individual nem filtros adicionais nesta versao.

## Consequencias

- O Dashboard passa a indicar rapidamente se poucos psicologos absorvem a maior parte dos cliques.
- O bloco respeita os mesmos presets e datas manuais ja existentes em `/dashboard`.
- A base "ativos e publicados atualmente" e simples para o MVP, mas nao reconstrui historico de
  publicacao no passado; isso deve ser reavaliado se a analise evoluir para auditoria historica
  precisa.
- Nao ha alteracao em schema Prisma, migrations, tracking, packages, rankings publicos ou dados
  individuais expostos.

## Task relacionada

- TASK-102 - Distribuicao de cliques WhatsApp por psicologo no Dashboard Admin.

## Validacoes

- `pnpm --dir backend check`: OK.
- `pnpm --dir admin check`: OK.
- Smoke direto `buildDashboardSummary({ period: "all" })`: OK, com 24 cliques reais, 14 psicologos considerados, 13 sem clique, top 10%/top 20% em 100% e Gini 0,929 na base local.
- `pnpm --dir backend build`: OK.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`: OK.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`: OK.
- Browser local/headless autenticado em `/dashboard`: OK em desktop 1366px e mobile 390px; o bloco ficou entre **Visao geral** e **Atividade nas comunidades**, sem overflow horizontal.
- Browser local/headless em **Todo o periodo**: OK, renderizando curva acumulada em SVG e o resumo de top 20% com dados reais.

## Pendencias

- Nenhuma para o MVP. Filtros por cidade, especialidade, plano ou origem ficaram fora do escopo por
  decisao de produto.
