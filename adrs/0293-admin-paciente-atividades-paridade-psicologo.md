# ADR-0293: Aba Atividades do paciente com paridade operacional do psicologo

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

O detalhe administrativo de paciente ja possuia uma lista simples de atividades recentes dentro do contrato de detalhe. Apos feedback em 2026-07-20, a aba **Atividades** precisava ter a mesma configuracao visual e operacional da aba Atividades do detalhe administrativo do psicologo: filtros superiores, busca, tabela paginada e copy de "Atividades da conta".

A regra de produto permanece: nao criar mock, seed, tracking novo ou eventos artificiais apenas para preencher a tela. Login continua fora da lista quando nao ha evento de login confiavel por ocorrencia.

## Decisao

- Criar endpoint dedicado `GET /api/admin/private/patients/:id/activities`, seguindo a estrutura de modulo Admin existente.
- Derivar o feed somente de fontes persistidas reais: `user`, `patient_profile`, `community_member`, `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `professional_review` e `admin_activity_log`.
- Reusar no Admin a mesma experiencia da aba Atividades do psicologo: filtro de periodo, area, tipo, busca textual, tabela com Data/Acao/Descricao/Usuario e paginacao.
- Manter exportacao desabilitada porque nao existe endpoint real de exportacao de atividades nesta V1.

## Consequencias

- A aba de paciente passa a ter paridade de layout com a aba equivalente do psicologo sem acoplar os contratos dos dois dominios.
- A lista pode exibir eventos de conta/perfil reais mesmo quando nao houver atividade de comunidade no periodo, porque `user.createdAt` e `patient_profile` sao fontes confiaveis.
- Nao ha backfill, tracking novo, schema Prisma, migration ou package novo.
- O historico de login segue como indisponivel de forma explicita ate existir fonte confiavel de eventos de login.

## Validacao

- `pnpm --dir backend exec biome check --write "src/main/server/imports/write.ts" "src/modules/api/admin/private/patients/activities/index.ts" "src/modules/api/admin/private/patients/activities/DTOs/IAdminPatientActivitiesDTO.ts" "src/modules/api/admin/private/patients/activities/repositories/AdminPatientActivitiesRepository.ts" "src/modules/api/admin/private/patients/activities/use-cases/controller.ts" "src/modules/api/admin/private/patients/activities/use-cases/services.ts" "src/modules/api/admin/private/patients/activities/validator/index.ts"`
- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/callers/patients/index.ts" "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz?tab=atividades` retornou `200`.
- Smoke HTTP local sem token: `GET http://localhost:3001/api/admin/private/patients/cmrqsr926001d1guhoz10yvaz/activities` retornou `401`, confirmando rota privada.

## Pendencias

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel foi a captura enviada pelo usuario e o padrao ja implementado em `/psicologos/[id]?tab=atividades`.
