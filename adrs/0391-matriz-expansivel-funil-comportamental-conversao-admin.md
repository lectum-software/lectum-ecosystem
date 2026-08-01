# ADR-0391 - Matriz expansivel dentro do funil comportamental por conversao Admin

## Status

Accepted

## Contexto

O dashboard Admin de psicologos passou a ter uma tabela de tags no bloco **Funil comportamental por conversao**. A matriz detalhada de Conversao x Visibilidade/Engajamento/Favoritos continuou aparecendo no bloco seguinte de sinais agregados, o que separava a leitura executiva do funil da auditoria detalhada usada para investigar os cruzamentos.

Em 2026-08-01, o usuario pediu explicitamente para mover a matriz expansivel para o bloco de funil comportamental por conversao.

## Decisao

1. Renderizar `DashboardProfileConversionMatrixSection` dentro de `DashboardProfileConversionBehaviorFunnelCard`, abaixo da tabela de tags comportamentais.
2. Remover o expansivo do `DashboardProfileConversionCard`, mantendo esse card focado no carrossel de donuts e no filtro de plano dos sinais agregados.
3. Manter a matriz baseada nos contratos reais existentes `profile_conversion_visibility` e `profile_conversion_engagement_favorites`.
4. Usar a base agregada `Todos` no expansivo quando ele estiver no funil, porque o funil nao possui filtro local de plano.
5. Ajustar a copy para tratar a matriz como apoio/auditoria do funil, sem alterar calculos nem categorias.

## Consequencias

- A leitura comportamental e a auditoria detalhada ficam no mesmo bloco, reduzindo dispersao visual.
- O card de sinais agregados volta a concentrar somente os donuts e seu seletor de plano.
- A matriz deixa de acompanhar o filtro local dos sinais agregados e passa a acompanhar a base agregada do funil.
- Nao houve alteracao de backend, schema Prisma, migrations, packages ou contratos de API.

## Task relacionada

- `_product/tasks/TASK-127-matriz-expansivel-funil-comportamental-conversao-admin-psicologos.md`

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px, com matriz expandida dentro do funil e copy **base agregada do funil: Todos**.

## Pendencias

- Nenhuma pendencia externa.
