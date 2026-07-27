# TASK-85: Conversão de uso não autenticado até cadastro no dashboard Admin de pacientes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-85 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Pacientes / Conversão e Analytics |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-47, TASK-49, TASK-60, TASK-76, TASK-81 |
| ADR alvo | ADR sobre métrica first-party de conversão de uso anônimo até cadastro de paciente |

## Contexto

O dashboard Admin de psicólogos já possui um bloco de conversão do cadastro até a assinatura. O dashboard Admin de pacientes tinha visão geral, intenção, demografia, dispositivos, sistemas e uso autenticado, mas ainda não respondia uma pergunta operacional anterior ao cadastro: quantos visitantes usam a Lectum sem login e depois viram cadastro real de paciente.

A plataforma já possui tracking first-party de `page_view_event` e `visitor_session` criado nas tasks de analytics/tráfego. Esta task usa esses eventos existentes e `user.createdAt`, sem criar tracking novo, backfill, mock ou integração de terceiros.

Referências consultadas:

- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/DATA-MODEL.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`;
- padrão visual do bloco de conversão em `/psicologos`.

Builder/Quick Copy não ficou exposto como ferramenta callable neste ambiente; por isso a referência visual auditável usada foi a imagem local exportada e os screenshots enviados pelo usuário.

## Objetivo

Permitir que um Admin autenticado veja, em `/pacientes`, um bloco de **Conversão do uso não autenticado até cadastro** com coorte de visitantes sem login no período selecionado, taxa de cadastro, prazos até cadastro e distribuição por primeira página visitada.

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
  - visitantes com primeiro uso sem login no período;
  - sessões vinculadas à coorte;
  - cadastros reais de paciente;
  - taxa de cadastro;
  - média, mediana, P75 e P90 do tempo até cadastro;
  - distribuição por prazo: mesmo dia, 1-3 dias, 4-7 dias, 8-30 dias, mais de 30 dias, ainda não cadastrou;
  - conversão por primeira página visitada.
- Mostrar textos honestos de indisponibilidade/amostra pequena quando aplicável.

## Escopo backend

- Estender `GET /api/admin/private/patients/dashboard` para retornar `anonymous_conversion` dentro do resumo.
- Derivar a coorte de `page_view_event` do período quando o evento ocorreu sem usuário ou antes de `user.createdAt` de paciente.
- Vincular conversão real somente pelo mesmo `visitor_id` quando a sessão/evento estiver associado a `user.role="paciente"` e `user.createdAt` ocorrer até o fim do período selecionado.
- Usar `visitor_session` apenas para complementar contagem de sessões e identificar conversão quando uma sessão iniciada anonimamente é associada depois ao paciente real.
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
- Service agregando coorte por `visitor_id`, primeiro toque, conversão, percentis e buckets.
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

- [x] `GET /api/admin/private/patients/dashboard` retorna `anonymous_conversion` com coorte, taxa, prazos, buckets, primeira página e notas de cobertura.
- [x] O cálculo usa apenas dados reais first-party (`page_view_event`, `visitor_session`, `user.createdAt`) e não cria mock/backfill.
- [x] O dashboard `/pacientes` mostra o bloco **Conversão do uso não autenticado até cadastro** abaixo da Visão Geral.
- [x] A UI exibe métricas, distribuição por prazo e conversão por primeira página com copy honesta para ausência/amostra pequena.
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
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação local do service `buildPatientsDashboard({ period: "all" })`.
- Browser local em `/pacientes`.

## Notas de execução

- A coorte é o primeiro `page_view_event` sem conta capturado dentro do período selecionado, agrupado por `visitor_id`.
- Se o mesmo `visitor_id` virar `user.role="paciente"` por evento/sessão associado até o fim do período, conta como cadastro convertido.
- O mesmo visitante conta uma vez; quando houver mais de um candidato paciente no mesmo `visitor_id`, usa-se a primeira data real de cadastro.
- A métrica não atravessa browsers/devices e não tenta identificar pessoas além do `visitor_id` first-party já persistido.
- Os cards mostram `Indisponível`/nota operacional quando não há coorte ou conversões suficientes, evitando zero falso.
- Validação local do service em `period="all"` retornou `status=200`, `anonymous_visitors_count=205`, `converted_patients_count=31` e `conversion_rate=15.1` na base de desenvolvimento.
- Smoke local de browser/rota em `http://localhost:3002/pacientes` retornou HTTP 200.
- O admin temporário `codex-task85-browser@lectum.local` criado para validação de autenticação local foi removido ao final.
