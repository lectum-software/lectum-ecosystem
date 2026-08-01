# TASK-129 - Eixos independentes na matriz de cruzamento de dados Admin

## Status

Completed

## Contexto

Depois da TASK-128, o usuario validou `/psicologos` e pediu que a **Matriz de cruzamento de dados** deixasse de ter um unico seletor de matriz pronta. A necessidade e escolher dois campos independentes, um para a linha e outro para a coluna, permitindo leituras como:

- Conversao x Atividade;
- Engajamento x Atividade;
- Conversao x Retencao video de apresentacao;
- Conversao x Visibilidade video de apresentacao;
- Conversao x Posts com video.

As matrizes anteriores (`profile_conversion_engagement_favorites` e `profile_conversion_visibility`) eram agregados fechados sempre ancorados em Conversao. Para suportar Engajamento x Atividade e novas combinacoes sem mock, foi necessario criar um contrato agregado generico no backend.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a matriz expansivel no Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Adicionar dois campos selecionaveis na matriz para escolher independentemente o eixo de **Linha** e o eixo de **Coluna**, mantendo leitura agregada, dados reais e comportamento mobile-first.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-100: matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
- TASK-123: donut de Atividade no dashboard Admin.
- TASK-125: tabela comportamental por conversao.
- TASK-127: matriz expansivel no funil comportamental por conversao.
- TASK-128: largura e copy da tabela/matriz.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Criar contrato backend agregado `profile_cross_matrix` no dashboard Admin de psicologos.
- Expor eixos canônicos selecionaveis: Conversao, Atividade, Engajamento, Favoritados, Visibilidade comunidade, Visibilidade video de apresentacao, Retencao video de apresentacao e Posts com video.
- Gerar matrizes agregadas para todos os pares distintos de eixos, com totais por categoria, quadrantes e percentuais.
- Calcular categorias somente com fontes reais existentes: cliques WhatsApp, posts/respostas, eventos de engajamento/favoritos, sessoes de atencao, sessoes reais de video e posts com midia de video.
- Adicionar os mesmos tipos no client Admin.
- Substituir o seletor unico por dois selects nativos rotulados **Linha** e **Coluna**.
- Bloquear a selecao do mesmo eixo nos dois campos e atualizar titulo/matriz dinamicamente.
- Manter layout mobile-first: cards em ~390px e grade desktop sem overflow global.

## Fora do escopo

- Criar filtros navegaveis para cada quadrante.
- Alterar pesos ou categorias ja decididas das metricas de Conversao, Atividade, Engajamento, Favoritos ou Visibilidade.
- Criar tracking novo, backfill, seed, mock, endpoint simulado ou dado fake permanente.
- Alterar schema Prisma, migrations, packages, query keys ou design system.
- Trocar a posicao do bloco no dashboard.

## Criterios de aceite

- [x] A matriz possui dois campos selecionaveis visiveis: **Linha** e **Coluna**.
- [x] O admin consegue selecionar Conversao x Atividade.
- [x] O admin consegue selecionar Engajamento x Atividade.
- [x] O admin consegue selecionar Conversao x Retencao video de apresentacao.
- [x] O admin consegue selecionar Conversao x Visibilidade video de apresentacao.
- [x] O admin consegue selecionar Conversao x Posts com video.
- [x] O mesmo eixo nao fica selecionavel simultaneamente como linha e coluna.
- [x] O titulo e as celulas da matriz atualizam conforme os dois eixos escolhidos.
- [x] A API retorna `profile_cross_matrix` com eixos, matrizes e quadrantes agregados sem mocks.
- [x] Em mobile ~390px, a matriz permanece em cards sem overflow horizontal global.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0393-eixos-independentes-matriz-cruzamento-dados-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos` validou API e UI: `profile_cross_matrix`, 8 eixos, 56 matrizes, selects **Linha**/**Coluna**, combinacoes solicitadas e ausencia de overflow global em desktop e mobile 390px. Screenshots locais: `.tmp/task129-cross-matrix-desktop.png` e `.tmp/task129-cross-matrix-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task altera o contrato agregado do backend Admin e o client `admin/`, mas nao altera o banco.
- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, `pnpm --dir backend db:migrate` nao se aplica.
- O servidor local em `localhost:3002` foi usado na validacao por estar rodando em modo dev com o codigo atual; uma tentativa de `next start` em porta separada foi descartada porque a build tinha ambiente publico diferente para API.
