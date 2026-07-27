# ADR-0325: Trilha anônima pré-cadastro de pacientes no Admin

## Status

Accepted

## Task relacionada

TASK-85

## Contexto

O Admin precisava de um bloco equivalente ao de conversão dos psicólogos, mas para pacientes: entender o comportamento anterior ao cadastro real. A Lectum já captura analytics first-party por `page_view_event` e `visitor_session`, com `visitor_id` e `session_id`, e já possui `user.createdAt` para o cadastro.

Revisão de produto em 2026-07-27: a métrica não deve responder "quantos visitantes anônimos viraram pacientes". Essa leitura forward pertence a tráfego/aquisição. No dashboard de pacientes, a intenção é exclusivamente backward: partir dos pacientes cadastrados e procurar a trilha anônima anterior ao cadastro.

A restrição principal é não criar métrica falsa: não há identidade cross-device, não há backfill histórico e não devemos usar ferramentas de terceiros nem inferir dados sensíveis. Também não há mudança necessária de schema para responder à leitura operacional solicitada.

## Decisão

Derivar `anonymous_conversion` do dashboard Admin de pacientes usando somente:

- `user.createdAt` e `user.role="paciente"` como coorte de pacientes cadastrados no período selecionado;
- `page_view_event` para localizar a primeira página anônima anterior ou simultânea ao cadastro pelo mesmo `visitor_id`;
- `visitor_session` para complementar o vínculo de `visitor_id` e a contagem de sessões pré-cadastro.

A leitura conta somente pacientes reais cadastrados no período. Para cada paciente, o backend localiza `visitor_id`s vinculados ao próprio usuário e considera como trilha prévia apenas eventos/sessões com `user_id=null` ou `user_id` do próprio paciente ocorridos até `user.createdAt`. Psicólogos e visitantes que nunca viraram paciente não entram no denominador deste bloco.

O backend agrega por paciente, calcula cobertura de trilha pré-cadastro, média, mediana, P75, P90, buckets por prazo e ranking agregado de primeira página pré-cadastro.

Não haverá nova tabela, migration, backfill, seed, mock, integração de analytics de terceiros ou tentativa de identificar pessoas entre dispositivos/navegadores.

## Consequências

- O Admin ganha uma leitura real e operacional do comportamento pré-cadastro dos pacientes.
- A métrica é privativa e agregada; não expõe trilha individual nem PII no dashboard.
- A cobertura é honesta: pacientes que trocam de browser/device antes do cadastro podem permanecer como "sem trilha capturada".
- A análise forward de visitantes anônimos, incluindo quantos viram psicólogos, fica fora deste bloco e deve ser tratada em tráfego/outra página.
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
- A versão forward anterior retornava `anonymous_visitors_count=205`, `converted_patients_count=31` e `conversion_rate=15.1`; esses campos foram substituídos por `registered_patients_count`, `patients_with_anonymous_history_count`, `patients_without_anonymous_history_count` e `history_coverage_rate`.
- Validação local revisada retornou `status=200`, `registered_patients_count=155`, `patients_with_anonymous_history_count=26`, `patients_without_anonymous_history_count=129` e `history_coverage_rate=16.8` na base de desenvolvimento.
- `pnpm check` ficou bloqueado por formatação preexistente em alterações não relacionadas de `admin/src/app/(admin)/trafego/client.tsx`; backend/admin direcionados para TASK-85 passaram em check/build.
- Smoke local de browser/rota em `http://localhost:3002/pacientes` retornou HTTP 200.

## Pendências

- Nenhuma pendência externa nesta task.
- Reavaliar somente se o produto decidir medir identidade consentida entre devices ou adicionar tracking explícito de etapas pré-cadastro.
