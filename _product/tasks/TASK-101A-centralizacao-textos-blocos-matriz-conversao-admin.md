# TASK-101A - Centralizacao dos textos nos blocos da matriz de conversao Admin

## Status

Completed

## Contexto

As matrizes **Conversao x Engajamentos e Favoritos** e **Conversao x Visibilidade** exibiam os
valores e descricoes dos blocos alinhados a esquerda. Na leitura visual do dashboard Admin, os
cards da matriz precisam funcionar como celulas compactas e equilibradas, com conteudo centralizado
em relacao ao proprio bloco.

## Escopo

- Centralizar horizontal e verticalmente os textos dentro dos blocos/celulas das matrizes de
  conversao.
- Centralizar tambem o label exibido dentro dos cards mobile da matriz.
- Manter cabecalhos, linhas, filtros, dados, contratos de API e calculos sem alteracao.

## Fora do escopo

- Alterar pesos, percentis, dados de origem, schema Prisma, migrations ou endpoints.
- Alterar a quantidade de colunas, rolagem horizontal ou seletor da matriz.
- Criar package, mock, seed ou componente paralelo.

## Criterios de aceite

- [x] Os valores e descricoes dos blocos da matriz aparecem centralizados.
- [x] Os labels internos dos cards mobile tambem aparecem centralizados.
- [x] As duas opcoes do seletor continuam funcionando: **Conversao x Engajamentos e Favoritos** e
      **Conversao x Visibilidade**.
- [x] Nenhum contrato de API, schema Prisma, migration ou package foi alterado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Browser local validou a centralizacao no Admin.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e os screenshots enviados pelo
  usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir admin check` foi executado e ficou bloqueado por alteracoes locais nao relacionadas em `admin/src/app/(admin)/dashboard/client.tsx` (`WhatsAppDistributionCard` nao usado e formatacao Biome), que nao fazem parte desta task.
- Browser local em `/psicologos` validou que os blocos da matriz renderizam com alinhamento
  centralizado em **Conversao x Engajamentos e Favoritos** e **Conversao x Visibilidade**.

## Observacoes

- A mudanca e apenas visual no componente existente `ProfileConversionMatrixQuadrantCard`.
- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.

