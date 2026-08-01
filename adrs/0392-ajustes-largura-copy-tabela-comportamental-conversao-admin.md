# ADR-0392 - Tabela comportamental sem rolagem horizontal e copy enxuta

## Status

Accepted

## Contexto

O bloco **Funil comportamental por conversao** exibia a tabela de tags comportamentais em uma tabela larga com `min-width` e rolagem horizontal interna. Na validacao visual de 2026-08-01, o usuario pediu que todos os dados coubessem na largura util sem barra horizontal, alem de remover textos auxiliares e renomear o expansivo da matriz.

## Decisao

1. No desktop, manter semantica de tabela, mas usar layout `table-fixed`, colunas proporcionais e tags com quebra de linha.
2. Em breakpoints abaixo de `lg`, renderizar a mesma informacao em cards empilhados por faixa de conversao, preservando todas as colunas sem rolagem horizontal.
3. Remover o paragrafo narrativo abaixo da tabela porque a propria tabela ja comunica os sinais por tags.
4. Remover a linha auxiliar do expansivo da matriz para reduzir ruido visual.
5. Renomear o bloco **Matriz de conversao** para **Matriz de cruzamento de dados**.

## Consequencias

- A tabela deixa de depender de barra horizontal e passa a ocupar a largura util do card.
- Em mobile, a leitura fica vertical, com todos os dados visiveis por cards.
- Tags longas podem ocupar mais altura, mas nao escondem dados por truncamento.
- A decisao nao altera backend, DTOs, contratos, schema Prisma, migrations, packages, dados ou algoritmos.

## Task relacionada

- `_product/tasks/TASK-128-ajustes-largura-copy-tabela-comportamental-conversao-admin.md`

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px, validando ausencia de overflow horizontal no bloco do funil e a copy final solicitada.

## Pendencias

- Nenhuma pendencia externa.
