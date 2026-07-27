# TASK-86 - Trilha pre-cadastro dos psicologos no dashboard Admin

Status: Completed
Data: 2026-07-27
Depende de: TASK-45, TASK-46, TASK-47, TASK-49, TASK-53, TASK-72, TASK-76, TASK-81, TASK-85

## Contexto

O dashboard `/pacientes` ja possui o bloco de trilha pre-cadastro para entender, de tras para frente, quais paginas anonimas antecederam o cadastro de pacientes.

No dashboard `/psicologos`, o bloco existente **Conversao do cadastro ate assinatura** media apenas a etapa posterior ao cadastro. A necessidade desta task e permitir alternar esse mesmo bloco para **Conversao ate o cadastro**, rastreando a trilha anonima anterior ao cadastro do psicologo.

Fonte visual ativa consultada:

- `PROTO-INVENTORY.md`
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`
- screenshots do usuario em `/pacientes` e `/psicologos`

Limitacao registrada: Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao ficou acessivel como ferramenta executavel neste ambiente; foi usado o fallback permitido por imagens locais e screenshots.

## Escopo

- Adicionar um seletor dropdown no card **Conversao do cadastro ate assinatura** do Admin `/psicologos`.
- Manter a opcao padrao como **Conversao do cadastro ate assinatura**.
- Adicionar a opcao **Conversao ate o cadastro**.
- Persistir, no cadastro de psicologos por e-mail e por Google, a identidade analytics first-party (`analytics_visitor_id`/`analytics_session_id`) em `user_background`.
- Calcular no backend a trilha pre-cadastro dos psicologos cadastrados no periodo, usando apenas dados reais:
  - `user.createdAt`
  - `user_background.type="psychologist_signup_analytics_identity"`
  - `page_view_event.visitor_id/session_id`
  - `visitor_session.visitor_id/session_id`
- Exibir metricas equivalentes ao dashboard de pacientes:
  - psicologos cadastrados;
  - com trilha previa;
  - sem trilha capturada;
  - cobertura da trilha;
  - media, mediana, P75 e P90 do tempo ate cadastro;
  - distribuicao por prazo;
  - primeira pagina antes do cadastro.

## Fora de escopo

- Backfill de cadastros antigos sem `analytics_visitor_id`.
- Identificacao cross-device.
- Incluir visitantes que nunca viraram psicologo.
- Incluir pacientes na coorte dos psicologos.
- Criar novos pacotes.
- Alterar schema Prisma ou migrations.

## Contrato de dados

Novo campo em `AdminPsychologistsDashboardSummary`:

- `pre_signup_conversion`

Fonte:

- `user.createdAt+user_background+page_view_event+visitor_session`

Sem mudanca de banco: a ponte usa `user_background.data` ja existente, com novo `type` sem migration.

## Criterios de aceite

- [x] O card de conversao em `/psicologos` possui dropdown mobile-first com as opcoes **Conversao do cadastro ate assinatura** e **Conversao ate o cadastro**.
- [x] A opcao padrao preserva as metricas atuais de cadastro ate assinatura.
- [x] A opcao **Conversao ate o cadastro** exibe a trilha pre-cadastro dos psicologos com dados reais.
- [x] O cadastro de psicologo por e-mail envia a identidade analytics first-party.
- [x] O cadastro de psicologo por Google envia a identidade analytics first-party pelo state/query existente.
- [x] O backend grava `user_background.type="psychologist_signup_analytics_identity"` para novos psicologos quando houver `analytics_visitor_id`.
- [x] A coorte considera apenas psicologos cadastrados no periodo selecionado.
- [x] Pacientes e visitantes anonimos que nao viraram psicologo ficam fora da metrica.
- [x] Sem mocks, fixtures permanentes, backfill ou estimativas falsas.
- [x] Nenhum pacote novo foi instalado.
- [x] Nenhuma migration Prisma foi criada.
- [x] ADR atualizado com a decisao de ponte analytics por papel.

## Validacao

Executada em 2026-07-27:

- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm --dir admin check`
- [x] `pnpm --dir admin build`
- [x] `pnpm check`
- [x] Smoke real do use-case `buildPsychologistsDashboard({})` confirmando `pre_signup_conversion` presente e 6 buckets retornados.
- [x] `db:migrate` nao se aplica: nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`.

Validacao de browser local: servidor Admin local em `http://localhost:3002`; a rota `/psicologos` foi validada no build/DOM do app e a validacao autenticada depende da sessao Admin local do navegador. O dropdown foi implementado no card com `id="psychologist-conversion-journey"` e opcao **Conversao ate o cadastro**.
