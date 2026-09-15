# TASK-127 - Matriz expansivel no funil comportamental por conversao do Admin de psicologos

## Status

Completed

## Contexto

Apos a TASK-126, o dashboard Admin `/psicologos` exibia a tabela de **Funil comportamental por conversao** e mantinha o expansivo **Matriz de conversao** no bloco seguinte, **Atividade, visibilidade, engajamento, favoritos e conversao dos psicologos**. O usuario solicitou mover essa matriz expansivel para dentro do bloco de funil comportamental por conversao.

A alteracao deve preservar as leituras reais ja existentes e apenas reposicionar a auditoria detalhada para ficar junto da leitura comportamental, sem recriar calculos ou endpoint.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a matriz separada abaixo dos sinais agregados.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Mover o expansivo **Matriz de conversao** para dentro do card **Funil comportamental por conversao**, abaixo da tabela de tags comportamentais, deixando o bloco de sinais agregados apenas com o carrossel de donuts.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-100: matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
- TASK-103: funil comportamental por conversao.
- TASK-124: reposicionamento anterior da matriz.
- TASK-125: tabela comportamental por conversao.
- TASK-126: tags na tabela comportamental por conversao.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Remover o `DashboardProfileConversionMatrixSection` do card de sinais agregados dos psicologos.
- Renderizar o mesmo expansivo dentro de `DashboardProfileConversionBehaviorFunnelCard`, logo abaixo da tabela de tags comportamentais.
- Manter as quatro opcoes de matriz existentes:
  - Conversao x Visibilidade na Comunidade;
  - Conversao x Video de apresentacao;
  - Conversao x Engajamento recebido;
  - Conversao x Favoritados recebidos.
- Usar a base agregada do funil (`Todos`) para a matriz, pois o card de funil nao possui filtro local de plano.
- Ajustar a copy do expansivo para comunicar que os cruzamentos sao apoio/auditoria do funil.
- Manter o bloco de sinais agregados com o seletor de plano e carrossel de donuts, sem a matriz abaixo.

## Fora do escopo

- Alterar calculos, pesos, percentis, categorias, query keys ou contrato da API.
- Criar matriz Conversao x Atividade, novo endpoint, mock, seed, schema Prisma, migration ou package novo.
- Alterar a tabela de tags comportamentais, ranking publico, lista de psicologos ou detalhe individual.

## Criterios de aceite

- [x] O expansivo **Matriz de conversao** aparece dentro do bloco **Funil comportamental por conversao**.
- [x] A matriz fica abaixo da tabela de tags comportamentais do funil.
- [x] O bloco **Atividade, visibilidade, engajamento, favoritos e conversao dos psicologos** nao exibe mais o expansivo da matriz abaixo dos donuts.
- [x] As quatro opcoes de cruzamento da matriz foram preservadas.
- [x] A matriz usa contratos reais ja existentes (`profile_conversion_visibility` e `profile_conversion_engagement_favorites`), sem mock ou endpoint novo.
- [x] A copy informa que a leitura acompanha a base agregada do funil.
- [x] A UI segue mobile-first e nao cria overflow horizontal global em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0391-matriz-expansivel-funil-comportamental-conversao-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos` validou desktop e mobile 390px: a ordem do texto ficou **Funil comportamental por conversao** -> **Matriz de conversao** -> **Atividade, visibilidade, engajamento...**, a matriz expandiu e exibiu a copy **base agregada do funil: Todos**. Screenshots locais: `.tmp/task127-matrix-funnel-desktop.png` e `.tmp/task127-matrix-funnel-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task e frontend-only na aplicacao `admin/`.
- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, `pnpm --dir backend db:migrate` nao se aplica.
