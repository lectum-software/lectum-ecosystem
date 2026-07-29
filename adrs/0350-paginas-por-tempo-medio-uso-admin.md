# ADR-0350: Páginas por tempo médio no uso da plataforma Admin

## Status

Accepted

## Task relacionada

TASK-60 e TASK-72

## Contexto

Os dashboards Admin de **Psicólogos** e **Pacientes** já exibiam, dentro de **Uso da plataforma**, o ranking **Páginas mais acessadas** usando contagem de `page_view_event` autenticado. O feedback de produto pediu uma alternância para **Páginas com maior tempo médio**, diferenciando claramente permanência média de quantidade de acessos.

As fontes disponíveis continuam sendo os eventos first-party reais de `page_view_event`, incluindo `duration_seconds` quando o navegador consegue registrar duração confiável. Não há nova fonte externa, backfill, seed ou tracking adicional.

## Decisão

- Manter `top_pages` como ranking por quantidade de pageviews e adicionar `top_pages_by_average_duration` aos contratos dos dashboards de psicólogos e pacientes.
- Calcular `top_pages_by_average_duration` no backend por página normalizada, usando somente pageviews autenticados com `duration_seconds` positivo.
- Retornar, para cada página ranqueada por tempo médio, `average_duration_seconds`, `count` e `duration_samples_count`.
- No Admin, transformar o título do ranking em um select com seta para alternar entre **Páginas mais acessadas** e **Páginas com maior tempo médio**.
- Na visualização por tempo médio, a barra é proporcional ao maior tempo médio da lista e o texto mostra tempo médio + acessos como contexto, evitando confundir média de permanência com volume.

## Consequências

- O Admin consegue identificar páginas em que psicólogos e pacientes permanecem mais tempo sem perder a leitura de tráfego por volume.
- A métrica por tempo médio depende da cobertura real de `duration_seconds`; quando não houver amostras confiáveis, a UI exibe estado honesto.
- Não houve alteração de Prisma, migration, package novo, endpoint paralelo ou dados artificiais.

## Validação

- `pnpm --dir backend exec biome check --write "src/utils/admin-psychologist-analytics.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/api/req/patients/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local/headless autenticado em `/psicologos?period=all` e `/pacientes?period=all`, em 390px e 1366px, validou o select com seta, alternância para **Páginas com maior tempo médio** e ausência de overflow horizontal. Screenshots salvos em `.tmp/admin-psychologists-platform-pages-duration-mobile.png`, `.tmp/admin-psychologists-platform-pages-duration-desktop.png`, `.tmp/admin-patients-platform-pages-duration-mobile.png` e `.tmp/admin-patients-platform-pages-duration-desktop.png`.
- APIs locais autenticadas confirmaram `platform_usage.top_pages_by_average_duration` nos dashboards de psicólogos e pacientes.

## Pendências

- Nenhuma pendência externa.
