# TASK-88 - Seletor de conversao no titulo e filtro de plano na trilha pre-cadastro dos psicologos Admin

Status: Completed
Data: 2026-07-27
Depende de: TASK-53, TASK-72, TASK-82, TASK-86

## Contexto

A TASK-86 adicionou ao dashboard Admin `/psicologos` a alternancia entre **Conversao do cadastro ate assinatura** e **Conversao ate o cadastro**. O primeiro ajuste colocou o seletor como controle separado no canto superior direito do bloco.

O feedback de produto pede que o seletor de jornada fique no proprio titulo do card, porque a visualizacao **Conversao ate o cadastro** ainda precisa ter o filtro por plano **Todos / Assinantes / Gratuitos / Cortesia** no canto superior direito do bloco.

Fonte visual ativa consultada:

- `PROTO-INVENTORY.md`
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` (arquivo real com acentos no workspace)
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`
- screenshots enviados pelo usuario em `/pacientes` e `/psicologos`

Limitacao: Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao ficou acessivel como ferramenta callable neste ambiente; foi usado o fallback permitido por imagens locais e screenshots.

## Escopo

- Mover o seletor **Conversao do cadastro ate assinatura / Conversao ate o cadastro** para dentro do titulo do card de conversao em `/psicologos`.
- Mostrar o filtro por plano **Todos / Assinantes / Gratuitos / Cortesia** no canto superior direito apenas quando a visualizacao selecionada for **Conversao ate o cadastro**.
- Segmentar `pre_signup_conversion` no backend dentro de `plan_segments`, usando os mesmos eventos reais e a coorte real ja criados na TASK-86.
- Fazer o frontend usar `plan_segments[segment].pre_signup_conversion` na visualizacao pre-cadastro.

## Fora de escopo

- Alterar a regra de conversao do cadastro ate assinatura.
- Alterar tracking first-party, cadastro, Google OAuth ou `user_background`.
- Criar endpoint paralelo, mock, seed, backfill, dados estimados ou identificacao cross-device.
- Criar package novo.
- Alterar schema Prisma ou migrations.

## Contrato de dados

`AdminPsychologistsDashboardPlanSegmentSummary` passa a conter:

- `pre_signup_conversion: AdminPsychologistsDashboardPreSignupConversion`

O campo e calculado por segmento de plano (`all`, `subscribers`, `free`, `courtesy`) a partir das mesmas fontes reais da TASK-86:

- `user.createdAt`
- `user_background.type="psychologist_signup_analytics_identity"`
- `page_view_event`
- `visitor_session`

## Criterios de aceite

- [x] O seletor de jornada aparece no proprio titulo do card de conversao em `/psicologos`.
- [x] A visualizacao padrao continua sendo **Conversao do cadastro ate assinatura** e nao mostra filtro de plano no canto superior direito.
- [x] Ao selecionar **Conversao ate o cadastro**, o canto superior direito do card mostra o filtro **Todos / Assinantes / Gratuitos / Cortesia**.
- [x] O filtro de plano altera a trilha pre-cadastro usando `plan_segments[segment].pre_signup_conversion` retornado pelo backend.
- [x] A ordem do filtro de plano e **Todos**, **Assinantes**, **Gratuitos**, **Cortesia**.
- [x] Sem mocks, fixtures permanentes, seed, backfill ou dados estimados.
- [x] Nenhum package novo foi instalado.
- [x] Nenhuma migration Prisma foi criada.
- [x] UI mobile-first; nenhum `<img>` cru foi adicionado.
- [x] ADR atualizado com a decisao de hierarquia do seletor e segmentacao da trilha pre-cadastro.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado e `git push` executado.

## Validacao

Executada em 2026-07-27:

- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir admin check`
- [x] `pnpm --dir admin build`
- [x] `pnpm check`
- [x] Smoke real do use-case `buildPsychologistsDashboard({})` confirmando `plan_segments.all/subscribers/free/courtesy.pre_signup_conversion` presente e 6 buckets em `all`.
- [x] Validacao local Admin: build/DOM contem `psychologist-conversion-journey` e `pre-signup-conversion-plan-segment`; `GET http://localhost:3002/psicologos` retornou 200.
- [x] `db:migrate` nao se aplica: nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`.

Nota de validacao: `pnpm --dir admin check` revelou no HEAD atual um desalinhamento preexistente em `TrafficOnlineNow.new_visitors`; o contrato real de `/trafego` foi reconciliado sem schema/migration para permitir typecheck honesto do Admin.
