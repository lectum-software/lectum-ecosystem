# TASK-82: Filtro Cortesia no dashboard Admin de psicologos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-82 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Admin analytics |
| Status | Completed |
| Dependencias | TASK-53, TASK-72, TASK-81 |
| ADR alvo | ADR-0317 |

## Contexto

O dashboard Admin de psicologos em `/psicologos` possui blocos analiticos filtraveis por plano. A opcao **Todos** inclui tambem psicologos em cortesia administrativa (`professional_subscription.source="admin_grant"`), mas os filtros disponiveis eram somente **Todos**, **Gratuitos** e **Assinantes**. Isso gerava uma leitura ambigua: dados reais de sessoes de cortesia apareciam em **Todos**, enquanto **Gratuitos** e **Assinantes** podiam ficar vazios.

Referencias visuais e de produto:

- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.
- Screenshot enviado pelo usuario em 2026-07-25 mostrando o card **Devices e sistemas** em `/psicologos`.
- Builder Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, nao houve ferramenta Builder/Quick Copy callable no ambiente; a referencia local e o screenshot do usuario foram usados.

## Objetivo

Adicionar a opcao **Cortesia** aos filtros por plano dos blocos do dashboard Admin de psicologos, fazendo com que os cards filtraveis consigam mostrar os agregados reais dos psicologos em cortesia administrativa separados de **Todos**, **Gratuitos** e **Assinantes**.

## Pre-requisitos e bloqueios

- TASK-53 concluida para o dashboard Admin de psicologos.
- TASK-72 concluida para metricas de conversao e uso por segmento.
- TASK-81 concluida para o card **Devices e sistemas** com OS.
- Sem requisito externo novo.
- Sem package novo.
- Sem alteracao de Prisma schema/migrations.

## Escopo frontend

- `admin/src/app/(admin)/psicologos/client.tsx`: incluir **Cortesia** na lista local de opcoes do filtro por plano.
- `admin/src/api/req/psychologists/index.ts`: atualizar o tipo do segmento retornado pelo endpoint.
- Manter UI mobile-first, usando o select existente e sem criar componente paralelo.

## Escopo backend

- `backend/src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts`: incluir `courtesy` no contrato de `plan_segments`.
- `backend/src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`: gerar `plan_segments.courtesy` com os mesmos agregados reais ja usados pelos demais segmentos, filtrando psicologos cujo segmento ativo no fim do periodo seja cortesia administrativa.

## Fora do escopo

- Alterar regra de receita, churn ou entitlement.
- Misturar cortesia em **Assinantes**.
- Criar endpoint paralelo, backfill, seed, dado fake ou migration.
- Alterar dashboard de pacientes.

## Contrato tecnico detalhado

Backend esperado:

- Reutilizar o endpoint existente `GET /api/admin/private/psychologists/dashboard`.
- Reutilizar `getPlanSegmentAt`, `filterProfilesByPlanSegment` e `buildPlanSegmentSummaries`.
- Novo segmento `courtesy` deve usar `professional_subscription.source="admin_grant"` com plano profissional ativo, respeitando a mesma data de corte do fim do periodo.

Frontend esperado:

- Reutilizar `PlanSegmentSelect` existente.
- Todos os blocos que ja consomem `plan_segments` passam a aceitar a opcao **Cortesia** automaticamente.
- Sem formulario ou submit; a fundacao da TASK-02 nao se aplica.

Packages usados:

- Nenhum package novo.

## Criterios de aceite

- [x] O endpoint do dashboard retorna `plan_segments.courtesy` com label **Cortesia**.
- [x] O segmento **Cortesia** filtra psicologos em `admin_grant` ativo, separado de **Gratuitos** e **Assinantes**.
- [x] A pagina `/psicologos` mostra **Cortesia** nos filtros por plano existentes dos blocos analiticos.
- [x] **Todos** continua incluindo todos os segmentos, inclusive cortesia.
- [x] Nenhum mock, dado fake permanente, seed, backfill ou endpoint simulado foi usado.
- [x] Nao houve alteracao de banco/schema/migrations; `pnpm --dir backend db:migrate` nao se aplica.
- [x] Formulario/campos da TASK-02 nao se aplicam porque o ajuste reutiliza selects existentes sem submit.
- [x] UI mobile-first; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validacao minima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke direto do service confirmando `plan_segments.courtesy`.
- Browser local em `/psicologos`.

## Notas de execucao

- Implementado em 2026-07-25 a partir do feedback do usuario sobre o percentual de desktop em **Todos** vindo de sessoes de psicologos em cortesia.
- A decisao e intencionalmente de segmentacao analitica: cortesia permanece fora de **Assinantes** para nao misturar pagamento Mercado Pago com concessao administrativa.
