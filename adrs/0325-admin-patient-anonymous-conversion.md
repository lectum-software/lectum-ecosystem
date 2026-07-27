# ADR-0325: Trilha anônima pré-cadastro de pacientes no Admin

## Status

Accepted

## Task relacionada

TASK-85

## Contexto

O Admin precisava de um bloco equivalente ao de conversão dos psicólogos, mas para pacientes: entender o comportamento anterior ao cadastro real. A Lectum já captura analytics first-party por `page_view_event` e `visitor_session`, com `visitor_id` e `session_id`, e já possui `user.createdAt` para o cadastro.

Revisão de produto em 2026-07-27: a métrica não deve responder "quantos visitantes anônimos viraram pacientes". Essa leitura forward pertence a tráfego/aquisição. No dashboard de pacientes, a intenção é exclusivamente backward: partir dos pacientes cadastrados e procurar a trilha anônima anterior ao cadastro.

A restrição principal é não criar métrica falsa: não há identidade cross-device, não há backfill histórico e não devemos usar ferramentas de terceiros nem inferir dados sensíveis. Também não há mudança necessária de schema para responder à leitura operacional solicitada.

Após a primeira execução, a base de desenvolvimento mostrou 155 pacientes cadastrados no período completo, mas apenas 26 com trilha prévia capturada. A causa esperada é que muitos cadastros acontecem antes de existir um `page_view_event` ou `visitor_session` autenticado com `user_id` do paciente; nesses casos, o backend anterior só conseguia reconstruir a trilha se algum evento posterior já tivesse vinculado o mesmo `visitor_id` ao usuário. O produto pediu melhorar a captura futura sem transformar a métrica em identificação de 100%.

## Decisão

Derivar `anonymous_conversion` do dashboard Admin de pacientes usando somente dados first-party:

- `user.createdAt` e `user.role="paciente"` como coorte de pacientes cadastrados no período selecionado;
- `user_background.type="patient_signup_analytics_identity"` como ponte opcional criada no cadastro de paciente com `visitor_id`, `session_id`, `captured_at`, `source` e `role`;
- `page_view_event` para localizar a primeira página anônima anterior ou simultânea ao cadastro pelo mesmo `visitor_id`;
- `visitor_session` para complementar o vínculo de `visitor_id` e a contagem de sessões pré-cadastro.

A leitura conta somente pacientes reais cadastrados no período. Para cada paciente, o backend localiza `visitor_id`s vinculados ao próprio usuário pela ponte explícita de cadastro e por eventos/sessões já vinculados, e considera como trilha prévia apenas eventos/sessões com `user_id=null` ou `user_id` do próprio paciente ocorridos até `user.createdAt`. Psicólogos e visitantes que nunca viraram paciente não entram no denominador deste bloco.

O backend agrega por paciente, calcula cobertura de trilha pré-cadastro, média, mediana, P75, P90, buckets por prazo e ranking agregado de primeira página pré-cadastro.

Não haverá nova tabela, migration, backfill, seed, mock, integração de analytics de terceiros ou tentativa de identificar pessoas entre dispositivos/navegadores. A ponte fica no `user_background` existente e é gravada apenas para `role="paciente"`, tanto no cadastro por e-mail/senha quanto no cadastro por Google; psicólogos não gravam esse tipo. No OAuth Google, `analytics_visitor_id` e `analytics_session_id` trafegam apenas dentro do `state` para o backend e são removidos da URL final de callback do frontend.

## Consequências

- O Admin ganha uma leitura real e operacional do comportamento pré-cadastro dos pacientes.
- Novos cadastros de pacientes tendem a aumentar a cobertura porque a identidade first-party do cadastro passa a ser persistida explicitamente.
- A métrica é privativa e agregada; não expõe trilha individual nem PII no dashboard.
- A cobertura é honesta: pacientes que trocam de browser/device antes do cadastro podem permanecer como "sem trilha capturada".
- A melhoria não altera os 129 pacientes históricos sem trilha capturada na base de desenvolvimento; não há backfill artificial.
- A análise forward de visitantes anônimos, incluindo quantos viram psicólogos, fica fora deste bloco e deve ser tratada em tráfego/outra página.
- Dados históricos anteriores ao tracking first-party continuam limitados; não haverá retroprocessamento artificial.
- Se no futuro o produto precisar medir campanhas de aquisição com mais precisão, será necessária nova task/ADR para consentimento, governança e/ou nova fonte de eventos.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/public/analytics/helpers/signup-identity.ts" "src/modules/api/public/google/callback/index.ts" "src/modules/api/public/user/store/DTOs/IStoreDTO.ts" "src/modules/api/public/user/store/validator/index.ts" "src/modules/api/public/user/store/repositories/StoreRepository.ts" "src/modules/api/public/auth/login/DTOs/IStoreDTO.ts" "src/modules/api/public/auth/login/repositories/LoginRepository.ts" "src/modules/api/middlewares/_auth/passport.ts"`
- `pnpm --dir frontend exec biome check --write "src/api/req/auth/index.ts" "src/app/auth/register/patient/logic.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação local de `buildPatientsDashboard({ period: "all" })`.
- A versão forward anterior retornava `anonymous_visitors_count=205`, `converted_patients_count=31` e `conversion_rate=15.1`; esses campos foram substituídos por `registered_patients_count`, `patients_with_anonymous_history_count`, `patients_without_anonymous_history_count` e `history_coverage_rate`.
- Validação local revisada retornou `status=200`, `registered_patients_count=155`, `patients_with_anonymous_history_count=26`, `patients_without_anonymous_history_count=129` e `history_coverage_rate=16.8` na base de desenvolvimento.
- `pnpm check` ficou bloqueado por formatação preexistente em alterações não relacionadas de `admin/src/app/(admin)/trafego/client.tsx`; backend/admin direcionados para TASK-85 passaram em check/build.
- A validação pós-ponte retornou `source="user.createdAt+user_background+page_view_event+visitor_session"` e manteve os mesmos totais históricos (`155/26/129`, cobertura `16.8%`) porque a melhoria não faz backfill. `pnpm check` continuou bloqueado por `admin/src/app/(admin)/trafego/client.tsx`; checks/builds direcionados, `frontend check/build`, `admin lint` e `admin typecheck` passaram.
- Smoke local de browser/rota em `http://localhost:3002/pacientes` retornou HTTP 200.

## Pendências

- Nenhuma pendência externa nesta task.
- Reavaliar somente se o produto decidir medir identidade consentida entre devices, criar backfill histórico auditado ou adicionar eventos de etapas pré-cadastro além da ponte de identidade no signup.
