# TASK-98 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos

## Status

Completed

## Contexto

A evolucao dos blocos analiticos do dashboard Admin de psicologos adicionou donuts com mais
categorias e manteve a matriz **Conversao x Engajamento**. No browser local em `/psicologos`, os
donuts passaram a ocupar altura excessiva e a matriz ficou quebrada em uma coluna no desktop,
dificultando a leitura executiva do funil.

O problema e de apresentacao: os dados, contratos e regras de classificacao de Visibilidade,
Engajamento/Favoritos e Conversao permanecem os mesmos. A task corrige o containment visual dos
graficos e restaura a matriz compacta.

## Escopo

- Limitar o tamanho dos donuts executivos do bloco **Visibilidade, engajamento, favoritos e
  conversao dos psicologos** com atributos SVG de largura/altura explicitos e previsiveis.
- Remover dependencia de classe arbitraria fragil para a grade desktop da matriz **Conversao x
  Engajamento**.
- Compactar cards, labels e cabecalhos da matriz para manter a leitura 4x4 no desktop sem altura
  exagerada.
- Preservar comportamento mobile-first e navegacao dos quadrantes para a lista filtrada.

## Fora do escopo

- Alterar regras de negocio, pesos, benchmarks, endpoints, contratos de API ou banco de dados.
- Criar nova matriz analitica ou novas categorias.
- Criar mock, seed artificial, endpoint simulado, migration, schema Prisma ou novo package.
- Tratar Figma como fonte visual ativa; a fonte vigente é Builder/proto.

## Criterios de aceite

- [x] Donuts executivos deixam de expandir alem do card e usam dimensoes fixas explicitas.
- [x] Matriz **Conversao x Engajamento** volta a renderizar como grade 4x4 no desktop.
- [x] Cards da matriz ficam compactos e legiveis, sem linhas gigantes no desktop.
- [x] Layout mobile da matriz continua em secoes por linha de conversao.
- [x] Links dos quadrantes e filtros por plano permanecem preservados.
- [x] Nenhum mock, package novo, schema Prisma ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e os screenshots enviados pelo
  usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado em `/psicologos` validou visualmente os donuts contidos e a matriz
  desktop compacta por CDP, com screenshots em `.tmp/task98-auth-donuts.png` e
  `.tmp/task98-auth-matrix.png`.
- Admin temporario real `codex-task98-validation-1785377453@lectum.local` foi criado com
  `admin:bootstrap` apenas para validacao local e removido do banco ao final junto com seus tokens.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.
- A correcao evita depender de utilitarios Tailwind arbitrarios para propriedades criticas de
  dimensao/grade quando uma falha de geracao pode quebrar a leitura da tela.
