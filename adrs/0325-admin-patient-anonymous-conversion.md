# ADR-0325: Conversão de uso anônimo até cadastro de paciente no Admin

## Status

Accepted

## Task relacionada

TASK-85

## Contexto

O Admin precisava de um bloco equivalente ao de conversão dos psicólogos, mas para pacientes: sair do uso não autenticado da plataforma e chegar ao cadastro real. A Lectum já captura analytics first-party por `page_view_event` e `visitor_session`, com `visitor_id` e `session_id`, e já possui `user.createdAt` para o cadastro.

A restrição principal é não criar métrica falsa: não há identidade cross-device, não há backfill histórico e não devemos usar ferramentas de terceiros nem inferir dados sensíveis. Também não há mudança necessária de schema para responder à leitura operacional solicitada.

## Decisão

Derivar `anonymous_conversion` do dashboard Admin de pacientes usando somente:

- `page_view_event` como coorte de primeiro uso sem login no período selecionado;
- `visitor_session` para complementar sessões da coorte e capturar sessões que começaram anônimas e depois ficaram associadas ao paciente;
- `user.createdAt` e `user.role="paciente"` para confirmar cadastro real.

A conversão conta quando o mesmo `visitor_id` tem primeiro uso anônimo no período e posteriormente fica associado a um paciente real até o fim do período. O backend agrega por visitante, escolhe a primeira data de cadastro vinculada, calcula taxa, média, mediana, P75, P90, buckets por prazo e ranking agregado de primeira página.

Não haverá nova tabela, migration, backfill, seed, mock, integração de analytics de terceiros ou tentativa de identificar pessoas entre dispositivos/navegadores.

## Consequências

- O Admin ganha uma leitura real e operacional do funil pré-cadastro de pacientes.
- A métrica é privativa e agregada; não expõe trilha individual nem PII no dashboard.
- A cobertura é honesta: visitantes que trocam de browser/device antes do cadastro podem permanecer como não convertidos.
- Dados históricos anteriores ao tracking first-party continuam limitados; não haverá retroprocessamento artificial.
- Se no futuro o produto precisar medir campanhas de aquisição com mais precisão, será necessária nova task/ADR para consentimento, governança e/ou nova fonte de eventos.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação local de `buildPatientsDashboard({ period: "all" })`.
- Validação local de `buildPatientsDashboard({ period: "all" })` retornou `status=200`, `anonymous_visitors_count=205`, `converted_patients_count=31` e `conversion_rate=15.1` na base de desenvolvimento.
- Smoke local de browser/rota em `http://localhost:3002/pacientes` retornou HTTP 200.

## Pendências

- Nenhuma pendência externa nesta task.
- Reavaliar somente se o produto decidir medir identidade consentida entre devices ou adicionar tracking explícito de etapas pré-cadastro.
