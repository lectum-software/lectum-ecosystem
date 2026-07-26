# ADR-0323: Visão geral de Tráfego com timeline filtrável

## Status

Accepted

## Task relacionada

TASK-50

## Contexto

O feedback de 2026-07-26 pediu que a **Visão geral** de `/trafego` mantivesse somente os
contadores **Sessões**, **Usuários únicos**, **Novos visitantes** e **Visitantes recorrentes**, e que
ganhasse um gráfico abaixo seguindo o layout da visão geral de `/psicologos`: filtro de período,
campos de data e cards que exibem/ocultam curvas.

## Decisão

- A UI de `/trafego` passa a whitelistar apenas esses 4 contadores na Visão geral.
- Os cards da Visão geral viram botões acessíveis (`aria-pressed`) para alternar as curvas do
  gráfico SVG local.
- Os cards não exibem badge visual **real** nem descrições internas para reduzir ruído visual; a
  origem real permanece documentada no contrato e nas seções analíticas.
- O filtro de período fica dentro da Visão geral, preservando o header limpo de Tráfego.
- O backend mantém os agregados reais existentes e adiciona `recurring_visitors` e `timeline.points`
  ao payload de `GET /api/admin/private/traffic/summary`.
- A timeline é diária, limitada pelo range atual da TASK-50 (máximo de 180 dias), e deriva somente de
  `visitor_session`, `page_view_event` e `important_action_event`.
- `Visitantes recorrentes` segue a fórmula real existente: visitantes com sessão anterior ao recorte
  ou mais de uma sessão no recorte.
- Nenhum pacote novo, mock, endpoint simulado, schema Prisma ou migration foi adicionado.

## Consequências

- A Visão geral fica mais focada e consistente com o padrão visual do dashboard de Psicólogos.
- O contrato HTTP é expandido de forma compatível: consumidores existentes continuam recebendo os
  agregados anteriores, e a UI nova usa apenas o subconjunto solicitado.
- O CSV de exportação passa a incluir linhas `overview_timeline` para manter paridade com o resumo
  real retornado pela API.
- A faixa visual **Resumo textual do gráfico** não é exibida nos gráficos de Tráfego; o resumo foi
  mantido como `figcaption` apenas para leitores de tela.
- Builder/Quick Copy não estava exposto como ferramenta callable neste ambiente; a validação visual
  usou `_product/proto/admin/Tráfego.png`, `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`
  e browser local.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` — OK.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx" "src/api/req/traffic/index.ts"` — OK.
- `pnpm --dir backend check` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK.
- Browser local/headless em `http://localhost:3002/trafego` — OK: validou com admin real
  transitório removido após o teste, 4 contadores, remoção do badge **real**, remoção das descrições
  internas, remoção da faixa visual
  **Resumo textual do gráfico**, filtros de período/data, toggle de curva por contador e mobile
  390x844 sem overflow horizontal.
