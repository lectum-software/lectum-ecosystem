# TASK-99 - Manter tres graficos lado a lado no funil Admin de psicologos

## Status

Completed

## Contexto

O ajuste de tamanho dos donuts do dashboard Admin de psicologos resolveu a regressao de graficos
gigantes, mas em desktop amplo o bloco executivo do funil passou a quebrar em duas colunas:
**Visibilidade** e **Engajamento e Favoritos** na primeira linha, com **Conversao** abaixo. A leitura
esperada pelo produto e manter os tres graficos do funil lado a lado quando houver largura suficiente.

## Escopo

- Restaurar o layout desktop com tres cards lado a lado para **Visibilidade**, **Engajamento e
  Favoritos** e **Conversao**.
- Preservar a quebra em duas colunas em telas intermediarias e a pilha mobile-first.
- Manter os donuts contidos e a matriz **Conversao x Engajamento** compacta.

## Fora do escopo

- Alterar dados, categorias, benchmarks, pesos de engajamento, contratos de API ou banco.
- Criar nova visualizacao analitica, mock, seed artificial, endpoint simulado, schema Prisma,
  migration ou package novo.
- Usar Figma como fonte ativa.

## Criterios de aceite

- [x] Em desktop amplo, os tres cards do funil aparecem na mesma linha.
- [x] Em telas intermediarias, a UI continua usando duas colunas com Conversao ocupando a linha
      seguinte quando necessario.
- [x] Em mobile, a UI continua empilhada e mobile-first.
- [x] Donuts permanecem contidos e sem voltar ao estado gigante.
- [x] A matriz **Conversao x Engajamento** permanece compacta.
- [x] Nenhum mock, package novo, schema Prisma ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e o screenshot enviado pelo
  usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado em `/psicologos` validou o breakpoint desktop com tres cards lado a lado;
  screenshot salvo em `.tmp/task99-three-cards.png`.
- Admin temporario real `codex-task99-validation-1785378095@lectum.local` foi criado com
  `admin:bootstrap` apenas para validacao local e removido do banco ao final junto com seus tokens.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.
