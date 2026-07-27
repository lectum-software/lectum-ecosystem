# ADR-0328: Dashboard Admin com períodos padrão e atividade de comunidade por autoria

## Status

Accepted

## Task relacionada

TASK-48

## Contexto

O Dashboard Admin precisava alinhar o filtro de período ao padrão visual já usado nas demais telas administrativas, sem perder o default específico de **Últimos 7 dias** da visão executiva. O mesmo ajuste pediu remover a ação visual de exportação CSV do topo e detalhar o gráfico de **Atividade nas comunidades** em séries mais úteis para leitura operacional.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A execução usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Dashboard.png` e as capturas fornecidas pelo usuário como referência visual auditável.

## Decisão

- Manter **Últimos 7 dias** como período inicial do `/dashboard`.
- Exibir no seletor do Dashboard Admin a ordem padrão do painel: **Hoje**, **Esta semana**, **Este mês**, **Este ano**, **Últimos 7 dias**, **Últimos 30 dias**, **Últimos 90 dias** e **Todo o período**.
- Enviar `period` ao backend para presets e `period="custom"` com `from`/`to` apenas quando o usuário digitar datas manuais.
- Ampliar o período máximo do endpoint do Dashboard para até 3660 dias, compatível com os demais dashboards Admin e necessário para **Este ano**/**Todo o período**.
- Resolver **Todo o período** pela menor data real entre as fontes agregadas do Dashboard, sem backfill e sem mock.
- Dividir a atividade de comunidade por `user.role` em quatro séries reais: **Posts de pacientes**, **Posts de psicólogos**, **Comentários de pacientes** e **Respostas de psicólogos**.
- Remover apenas o botão visual **Exportar CSV** do topo; o endpoint/export helper real permanece disponível para uso futuro.

## Consequências

- O Dashboard fica visualmente alinhado aos filtros padrão do Admin sem mudar o default executivo de 7 dias.
- O gráfico de comunidade deixa de misturar autoria e passa a indicar o equilíbrio entre demanda de pacientes e resposta profissional.
- `GET /api/admin/private/dashboard/summary` passa a aceitar `period`, além de preservar `from`/`to` customizados.
- O intervalo **Todo o período** pode gerar séries mais longas, mas permanece limitado a 3660 dias para compatibilidade operacional.
- Não houve pacote novo, migration, schema Prisma ou dado artificial.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/dashboard/client.tsx" "src/api/req/dashboard/index.ts" "src/api/callers/dashboard/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/dashboard/summary/DTOs/IAdminDashboardSummaryDTO.ts" "src/modules/api/admin/private/dashboard/summary/validator/index.ts" "src/modules/api/admin/private/dashboard/summary/repositories/AdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/repositories/interfaces/IAdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/dashboard` com admin real transitório:
  - desktop 1440px: `.tmp/dashboard-admin-validation-20260727/desktop-1440-final.png`;
  - mobile 390px: `.tmp/dashboard-admin-validation-20260727/mobile-390-final.png`;
  - verificado: default `7d`, oito opções padrão no select, ausência de **Exportar CSV** e presença das quatro séries de comunidade.
  - admin transitório removido ao final.

## Pendências

- Nenhuma decisão externa pendente.
