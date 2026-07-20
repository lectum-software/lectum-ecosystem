# ADR-0282: Contador de acessos nas estatísticas de pessoas da comunidade

## Status

Accepted

## Task relacionada

TASK-71

## Contexto

O detalhe administrativo de comunidade já separa a aba **Estatísticas** em blocos de pessoas e conteúdo. O pedido operacional foi adicionar, em **Estatísticas de pessoas**, um contador **Acessos** na primeira posição, sem estimar valores nem usar mock.

A métrica disponível e auditável para acessos é `page_view_event`, já coletada como analytics first-party para páginas de comunidade, posts e respostas relacionados à comunidade.

## Decisão

- Adicionar `counters.accesses.total` no contrato real de estatísticas de comunidade, calculado por eventos `page_view_event` do período filtrado.
- Adicionar `charts.daily[].accesses` para que o contador possa ser ligado/desligado no gráfico como os demais cartões.
- Contar acessos anônimos e autenticados, mantendo a regra de **usuários ativos** restrita a usuários reais com papel `paciente` ou `psicologo`.
- Renderizar o cartão **Acessos** na primeira posição do bloco **Estatísticas de pessoas** e ajustar a grade desktop para acomodar os 7 contadores sem scroll horizontal global.

## Consequências

- O Admin passa a ver volume bruto de acessos da comunidade no mesmo período dos demais indicadores de pessoas.
- A métrica usa somente eventos first-party reais existentes; não há backfill, seed ou estimativa.
- A diferença semântica fica explícita: **Acessos** é volume de pageviews; **Pacientes/Psicólogos ativos** continuam sendo usuários únicos autenticados com atividade real.
- Em telas menores, a grade segue mobile-first e quebra linhas sem carrossel no bloco de pessoas.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/smoke HTTP em `http://localhost:3002/comunidades/autocuidado-em-pratica?tab=estatisticas`

## Pendências

- Nenhuma pendência externa.

## Complemento - Aba Geral

A mesma métrica de acessos também passa a alimentar `highlight_counters.accesses_count` no detalhe administrativo da comunidade. Na aba **Geral**, o card **Acessos** aparece antes de **Posts de pacientes** e usa o total histórico de `page_view_event` da comunidade e de seus conteúdos relacionados, sem backfill artificial.

### Validação do complemento Aba Geral

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica` retornou 200.


## Atualização 2026-07-18: fallback zero em acessos

O card **Acessos** da aba **Geral** e o contador **Acessos** da aba **Estatísticas** devem exibir `0` quando a contagem real de `page_view_event` não existir ou chegar ausente por compatibilidade durante atualização.

A decisão é normalizar valores ausentes, não numéricos ou negativos para zero somente na apresentação, mantendo a origem real `page_view_event` e sem estimar, fazer backfill ou criar dado artificial.
