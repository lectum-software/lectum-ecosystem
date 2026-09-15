# ADR-0315: Labels de período dos blocos analíticos do Admin sem prefixo

## Status

Accepted

## Task relacionada

TASK-76

## Contexto

Os dashboards administrativos exibem blocos de gráficos e análises com uma linha curta de contexto temporal. Após os ajustes de período do Admin, alguns blocos ainda renderizavam o prefixo redundante `Período:`, por exemplo: `Período: Todo o período · 28 de jun. a 24 de jul.`.

O pedido de produto de 2026-07-25 é que esses blocos mostrem somente o valor semântico do período e o intervalo, como `Todo o período · 28 de jun. a 24 de jul.`. A alteração é apenas de copy/hierarquia visual no app Admin e não altera filtros, contratos HTTP, query keys, persistência ou agregações.

## Decisão

- Padronizar os formatadores de período dos dashboards de **Psicólogos**, **Pacientes** e **Comunidades** para renderizar somente `{label} · {data inicial} a {data final}` quando houver intervalo.
- Quando o backend ou o estado local não tiver intervalo completo, renderizar somente `{label}`, sem `Período:`.
- Remover também o prefixo hardcoded do bloco **Origem do tráfego** em `/psicologos`.
- Manter as telas que já estavam no padrão sem prefixo, como Financeiro e a visão geral de Moderação, sem alterações.

## Consequências

- Os blocos analíticos ficam mais enxutos e consistentes entre dashboards do Admin.
- A semântica de filtro permanece preservada: o texto ainda informa preset e datas, apenas sem rótulo duplicado.
- Não há mudança de backend, Prisma schema/migrations, dados persistidos, packages ou formulários.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/pacientes/client.tsx" "src/app/(admin)/comunidades/client.tsx"` - OK.
- `rg -n "Período:" admin/src` - OK, sem ocorrências.
- `pnpm --dir admin check` - OK na reexecução isolada.
- Smoke HTTP local no Admin: `GET /psicologos`, `GET /pacientes` e `GET /comunidades` retornaram 200 em `localhost:3002`.
- `pnpm --dir admin build` foi executado, mas o workspace atual está bloqueado por uma alteração não relacionada já presente em `admin/src/api/req/patients/index.ts`, que exige `operating_systems` em itens de device usage e quebra `admin/src/app/(admin)/pacientes/[id]/client.tsx:2539`.

## Pendências

- Resolver a inconsistência não relacionada de `operating_systems` no detalhe de paciente para liberar o build do Admin no workspace atual.
