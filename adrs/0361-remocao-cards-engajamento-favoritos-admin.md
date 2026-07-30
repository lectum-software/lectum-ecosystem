# ADR-0361 - Remocao dos cards auxiliares de Engajamento e Favoritos no Admin

## Status

Accepted

## Task relacionada

TASK-96 - Engajamento e Favoritos no dashboard Admin de psicologos.

## Contexto

O bloco executivo **Engajamento e Favoritos** em `/psicologos` ja mostra o total de psicologos
considerados, o donut e a legenda de categorias. A exibicao adicional dos cards brancos
**Favoritados** e **Com relacionamento** duplicava sinais intermediarios e deixava o topo do funil
mais carregado que o necessario para a leitura operacional solicitada.

## Decisao

- Remover da leitura principal os cards auxiliares **Favoritados** e **Com relacionamento**.
- Preservar o contrato real `profile_engagement_favorites`, pois os totais continuam disponiveis
  para calculos, matriz e evolucao futura.
- Manter no card apenas titulo, tooltip conceitual, total de psicologos considerados, donut e legenda
  resumida/expansivel.

## Consequencias

- O topo do dashboard fica mais limpo e equilibrado com os blocos de Visibilidade e Conversao.
- A leitura principal passa a privilegiar a distribuicao final das categorias, evitando metricas
  auxiliares lado a lado no card.
- Nao ha alteracao de API, banco, tracking, ranking publico, calculo de metricas ou package.

## Validacao

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a imagem local exportada correspondente ao dashboard Admin de
  Psicologos e o screenshot fornecido pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Servidor local do Admin reiniciado em `http://localhost:3002`; HTTP local retornou `200` para
  `/psicologos` e o bundle/source do card nao contem mais as labels **Favoritados** ou
  **Com relacionamento**.

## Pendencias

- Nenhuma.
