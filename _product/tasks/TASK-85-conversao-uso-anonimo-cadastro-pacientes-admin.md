# TASK-85: Trilha pré-cadastro dos pacientes no dashboard Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-85 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Pacientes / Conversão e Analytics |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-47, TASK-49, TASK-60, TASK-76, TASK-81 |
| ADR alvo | ADR sobre métrica first-party de trilha anônima pré-cadastro de pacientes |

## Contexto

O dashboard Admin de psicólogos já possui um bloco de conversão do cadastro até a assinatura. O dashboard Admin de pacientes tinha visão geral, intenção, demografia, dispositivos, sistemas e uso autenticado, mas ainda não respondia uma pergunta operacional anterior ao cadastro: como os pacientes reais se comportaram antes de se cadastrar.

Revisão de produto em 2026-07-27: este bloco não deve medir visitantes anônimos em geral nem conversões de visitantes para psicólogos. A leitura correta é **de trás para frente**: partir dos pacientes cadastrados no período e buscar a trilha anônima anterior ao cadastro pelo mesmo `visitor_id`.

A plataforma já possui tracking first-party de `page_view_event` e `visitor_session` criado nas tasks de analytics/tráfego. Esta task usa esses eventos existentes e `user.createdAt`, sem criar tracking novo, backfill, mock ou integração de terceiros.

Complemento de execução em 2026-07-27: após validação do bloco com dados reais, a cobertura ficou limitada quando o paciente se cadastrava antes de existir qualquer `page_view_event`/`visitor_session` autenticado vinculado ao `user_id`. Para melhorar a captura futura sem prometer 100% nem identificar cross-device, o cadastro de paciente passa a enviar a identidade first-party já existente (`visitor_id`/`session_id`) e o backend grava uma ponte auditável em `user_background.type="patient_signup_analytics_identity"`. O dashboard usa essa ponte para descobrir o `visitor_id` do paciente cadastrado e continua considerando somente eventos/sessões reais anteriores ao cadastro. No OAuth Google, os ids de analytics são consumidos no backend a partir do `state` e removidos da URL final do callback frontend.

Referências consultadas:

- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/DATA-MODEL.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`;
- padrão visual do bloco de conversão em `/psicologos`.

Builder/Quick Copy não ficou exposto como ferramenta callable neste ambiente; por isso a referência visual auditável usada foi a imagem local exportada e os screenshots enviados pelo usuário.

## Objetivo

Permitir que um Admin autenticado veja, em `/pacientes`, um bloco de **Trilha pré-cadastro dos pacientes** com coorte de pacientes cadastrados no período selecionado, cobertura de trilha anônima prévia, prazos até cadastro e primeira página capturada antes do cadastro.

## Pré-requisitos e bloqueios

- TASK-45 e TASK-46 concluídas: Admin real e shell lateral.
- TASK-47 e TASK-49 concluídas: `visitor_session` e `page_view_event` first-party.
- TASK-60 concluída: dashboard Admin de pacientes existente.
- TASK-76 concluída: filtros de período consolidados.
- TASK-81 concluída: analytics Admin por device/sistema já usam as mesmas fontes first-party.
- Não há requisito externo pendente.
- Não há mudança de banco/schema/migrations; `pnpm --dir backend db:migrate` não se aplica.

## Escopo frontend

- Atualizar o dashboard Admin de pacientes (`/pacientes`) com um bloco mobile-first logo abaixo da Visão Geral.
- Reutilizar o padrão visual do card de conversão do dashboard de psicólogos: cards métricos, distribuição por prazo com barras e lista comparativa lateral.
- Exibir:
  - pacientes reais cadastrados no período;
  - pacientes com trilha anônima prévia capturada;
  - pacientes sem trilha anônima prévia capturada;
  - taxa de cobertura da trilha pré-cadastro;
  - média, mediana, P75 e P90 do tempo até cadastro;
  - distribuição por prazo: mesmo dia, 1-3 dias, 4-7 dias, 8-30 dias, mais de 30 dias, sem trilha capturada;
  - primeira página anônima antes do cadastro.
- Mostrar textos honestos de indisponibilidade/amostra pequena quando aplicável.

## Escopo backend

- Estender `GET /api/admin/private/patients/dashboard` para retornar `anonymous_conversion` dentro do resumo.
- Derivar a coorte de `user.role="paciente"` com `user.createdAt` dentro do período selecionado.
- Para cada paciente da coorte, localizar `visitor_id`s vinculados ao próprio paciente por `page_view_event`/`visitor_session`.
- Para cadastros futuros de pacientes, localizar também `visitor_id` pela ponte `user_background.type="patient_signup_analytics_identity"` gravada no momento do cadastro por e-mail/senha ou Google.
- Buscar `page_view_event`/`visitor_session` anteriores ou simultâneos ao `user.createdAt` do paciente pelo mesmo `visitor_id`, aceitando somente registros sem usuário ou do próprio paciente.
- Psicólogos e visitantes que nunca viraram paciente ficam fora deste bloco; análises gerais de visitantes anônimos pertencem a outra página.
- Não criar tabela, migration, seed, mock ou dado estimado.

## Fora do escopo

- Criar novo tracking/evento de produto.
- Reprocessar histórico, backfill ou inferir identidade entre dispositivos/navegadores.
- Usar Google Analytics, Meta Pixel ou qualquer fonte de terceiros.
- Medir conversão de paciente para sessão clínica, consulta, conversa, diagnóstico, mensagem ou atendimento.
- Bloquear uso anônimo ou alterar a jornada pública de descoberta.

## Contrato técnico detalhado

Backend esperado:

- DTO `AdminPatientsDashboardAnonymousConversion` em `backend/src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts`.
- Repository com leituras reais de `page_view_event` e `visitor_session`, filtrando eventos deletados e usuários paciente quando houver autenticação.
- Persistência opcional da ponte de identidade no cadastro de paciente em `user_background`, sem migration, com `visitor_id`, `session_id`, `captured_at`, `source` e `role`.
- Service agregando coorte por paciente cadastrado, trilha prévia por `visitor_id`, primeiro toque, percentis e buckets.
- `coverage_notes` e `unavailable` atualizados para explicar fonte e limitações.

Frontend esperado:

- Tipo `PatientsDashboardAnonymousConversion` em `admin/src/api/req/patients/index.ts`.
- `AnonymousConversionCard` em `admin/src/app/(admin)/pacientes/client.tsx`.
- UI mobile-first com grid progressivo (`sm`/`md`/`lg`) e tokens existentes.
- Nenhum formulário/campo novo.
- Nenhum `<img>`.

Packages usados:

- Nenhum package novo.
- Apenas dependências já instaladas no backend/admin.

Regras anti-recriação:

- Reutilizar `CardShell`, `PanelTitle`, formatadores e `MiniBar` existentes do dashboard de pacientes.
- Manter estrutura de repository/service/DTO já usada por `/patients/dashboard`.
- Não copiar Builder output como arquitetura final.

## Critérios de aceite

- [x] `GET /api/admin/private/patients/dashboard` retorna `anonymous_conversion` com coorte de pacientes cadastrados, cobertura de trilha prévia, prazos, buckets, primeira página e notas de cobertura.
- [x] O cálculo usa apenas dados reais first-party (`page_view_event`, `visitor_session`, `user_background`, `user.createdAt`) e não cria mock/backfill.
- [x] Cadastros futuros de pacientes por e-mail/senha e Google salvam a ponte opcional `visitor_id/session_id` em `user_background` quando a identidade first-party existe no cliente.
- [x] O dashboard `/pacientes` mostra o bloco **Trilha pré-cadastro dos pacientes** abaixo da Visão Geral.
- [x] A UI exibe métricas, distribuição por prazo e primeira página pré-cadastro com copy honesta para ausência/amostra pequena.
- [x] Psicólogos e visitantes anônimos que não viraram paciente não entram no denominador deste bloco.
- [x] UI mobile-first; nenhum `<img>` cru (somente componentes existentes e ícones SVG de biblioteca já instalada).
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `pnpm --dir backend db:migrate` não se aplica.
- [x] Formulários/campos da TASK-02 não se aplicam porque não houve novo formulário ou input.
- [x] Builder/Quick Copy não esteve disponível como ferramenta callable; imagens locais e screenshots foram usados como referência.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0325-admin-patient-anonymous-conversion.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

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
- Validação local do service `buildPatientsDashboard({ period: "all" })`.
- Browser local em `/pacientes`.

## Notas de execução

- A coorte é o conjunto de `user.role="paciente"` cadastrados no período selecionado.
- A métrica busca a primeira trilha anônima anterior ao cadastro pelo mesmo `visitor_id`, filtrando registros sem usuário ou do próprio paciente.
- Para novos cadastros, o `visitor_id` do paciente vem prioritariamente da ponte explícita `patient_signup_analytics_identity`; registros anteriores à melhoria não recebem backfill.
- Psicólogos e visitantes que nunca viraram paciente não entram no denominador deste bloco.
- A métrica continua não atravessando browsers/devices e não tenta identificar pessoas além do `visitor_id` first-party já persistido.
- A validação pós-ponte em `period="all"` manteve `registered_patients_count=155`, `patients_with_anonymous_history_count=26`, `patients_without_anonymous_history_count=129` e `history_coverage_rate=16.8`, como esperado, porque não houve backfill dos cadastros anteriores.
- Os cards mostram `Indisponível`/nota operacional quando não há pacientes cadastrados ou trilha prévia suficiente, evitando zero falso.
- A versão forward anterior retornava `anonymous_visitors_count=205`, `converted_patients_count=31` e `conversion_rate=15.1`; esses campos foram substituídos por `registered_patients_count`, `patients_with_anonymous_history_count`, `patients_without_anonymous_history_count` e `history_coverage_rate`.
- Validação local do service em `period="all"` retornou `status=200`, `registered_patients_count=155`, `patients_with_anonymous_history_count=26`, `patients_without_anonymous_history_count=129` e `history_coverage_rate=16.8` na base de desenvolvimento.
- `pnpm check` ficou bloqueado por formatação preexistente em alterações não relacionadas de `admin/src/app/(admin)/trafego/client.tsx`; os checks/builds direcionados de backend/admin para esta task foram executados.
- Na revisão da ponte, `pnpm check` continuou bloqueado pela mesma alteração não relacionada em `admin/src/app/(admin)/trafego/client.tsx`; `pnpm --dir admin exec biome check "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`, `pnpm --dir admin lint` e `pnpm --dir admin typecheck` passaram.
- Smoke local de browser/rota em `http://localhost:3002/pacientes` retornou HTTP 200.
- O admin temporário `codex-task85-browser@lectum.local` criado para validação de autenticação local foi removido ao final.
