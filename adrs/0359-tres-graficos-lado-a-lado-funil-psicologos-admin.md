# ADR-0359 - Tres graficos lado a lado no funil Admin de psicologos

## Status

Accepted

## Contexto

O bloco executivo de psicologos no Admin representa um funil comparativo:
**Visibilidade** -> **Engajamento e Favoritos** -> **Conversao**. Apos conter os donuts e compactar a
matriz, o breakpoint desktop ainda deixava os tres cards em duas linhas em telas amplas com escala de
Windows/Chrome, reduzindo a leitura comparativa imediata.

## Decisao

- O grid do bloco do funil passa de tres colunas apenas em `2xl` para tres colunas em `xl`.
- O card de **Conversao** continua ocupando duas colunas apenas no intervalo `lg`, mas volta a uma
  coluna em `xl`.
- A decisao preserva mobile-first: uma coluna em mobile, duas colunas em telas intermediarias e tres
  cards lado a lado em desktop amplo.

## Consequencias

- O Admin volta a comparar os tres graficos do funil na mesma linha quando ha largura suficiente.
- O ajuste nao altera dados, contratos, categorias, benchmarks, ranking publico ou matriz de
  conversao.
- Nenhum package, mock, endpoint paralelo, schema Prisma ou migration foi criado.

## Task relacionada

- TASK-99 - Manter tres graficos lado a lado no funil Admin de psicologos.

## Validacoes

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md` e o screenshot fornecido pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado em `/psicologos` validou o breakpoint desktop com os tres cards lado a
  lado; screenshot salvo em `.tmp/task99-three-cards.png`.
- Admin temporario real `codex-task99-validation-1785378095@lectum.local` foi criado com
  `admin:bootstrap` apenas para validacao local e removido do banco ao final junto com seus tokens.
