# TASK-128 - Ajustes de largura e copy da tabela comportamental por conversao Admin

## Status

Completed

## Contexto

Depois que a matriz expansivel foi movida para dentro do bloco **Funil comportamental por conversao**, o usuario validou visualmente `/psicologos` e solicitou quatro refinamentos no mesmo bloco:

1. fazer todos os dados da tabela caberem na largura util sem barra de rolagem horizontal;
2. remover o paragrafo explicativo abaixo da tabela;
3. remover a linha auxiliar do expansivo da matriz;
4. trocar **Matriz de conversao** por **Matriz de cruzamento de dados**.

A leitura continua observacional, interna ao Admin e baseada nos dados reais agregados ja entregues por `profile_conversion_behavior`, `profile_conversion_visibility` e `profile_conversion_engagement_favorites`.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela com barra horizontal e os textos a remover.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Refinar o bloco **Funil comportamental por conversao** para eliminar rolagem horizontal da tabela e simplificar a copy da matriz expansivel.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-103: funil comportamental por conversao.
- TASK-126: tags na tabela comportamental por conversao.
- TASK-127: matriz expansivel no funil comportamental por conversao.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Trocar a tabela desktop para `table-fixed` com colunas proporcionais e tags quebrando linha dentro da celula.
- Remover `min-width` fixa e o wrapper `overflow-x-auto` da versao desktop do funil.
- Criar uma leitura mobile-first em cards empilhados para as mesmas linhas e colunas, evitando rolagem horizontal em ~390px.
- Remover o paragrafo abaixo da tabela que iniciava com **Cada celula resume em tags...**.
- Remover a linha auxiliar do expansivo que dizia **Ver cruzamentos...**.
- Trocar o label visivel e o fallback tecnico de **Matriz de conversao** para **Matriz de cruzamento de dados**.
- Manter todos os dados reais existentes, sem alterar backend, contratos ou query keys.

## Fora do escopo

- Alterar metricas, pesos, percentis, categorias, DTOs, backend, schema Prisma, migrations ou query keys.
- Reduzir o numero de tags retornadas pelo backend ou esconder dados reais para caber visualmente.
- Criar endpoint, mock, seed, dado fake permanente, package novo ou design system paralelo.
- Alterar os donuts de sinais agregados ou os demais blocos do dashboard.

## Criterios de aceite

- [x] A tabela desktop do funil cabe na largura util do card sem barra de rolagem horizontal interna.
- [x] Em mobile ~390px, os dados da tabela aparecem em cards empilhados sem barra de rolagem horizontal global.
- [x] As tags mantem os dados reais visiveis, quebrando linha quando necessario em vez de truncar.
- [x] O paragrafo **Cada celula resume em tags...** foi removido.
- [x] A linha auxiliar **Ver cruzamentos...** foi removida do expansivo da matriz.
- [x] O texto **Matriz de conversao** foi trocado para **Matriz de cruzamento de dados**.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0392-ajustes-largura-copy-tabela-comportamental-conversao-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos` validou desktop e mobile 390px: ausencia de `scrollWidth > clientWidth` no bloco do funil, ausencia do paragrafo removido, ausencia do texto **Ver cruzamentos**, e presenca de **Matriz de cruzamento de dados**. Screenshots locais: `.tmp/task128-behavior-table-fit-desktop.png` e `.tmp/task128-behavior-table-fit-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task e frontend-only na aplicacao `admin/`.
- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, `pnpm --dir backend db:migrate` nao se aplica.
