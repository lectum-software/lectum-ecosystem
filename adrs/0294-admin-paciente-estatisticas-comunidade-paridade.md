# ADR-0294: Estatisticas de comunidade do paciente no Admin

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

A aba **Estatisticas** do detalhe administrativo de paciente ainda mostrava o bloco antigo de
engajamento com cinco contadores. Apos feedback em 2026-07-20, a tela precisava seguir a mesma
hierarquia visual do bloco **Estatisticas de comunidade** do detalhe administrativo do psicologo,
mas com contadores especificos para paciente.

A decisao precisava preservar a regra de dados reais: nao criar mock, seed, backfill artificial,
tracking novo ou endpoint paralelo apenas para preencher a UI.

## Decisao

- Manter o contrato real `GET /api/admin/private/patients/:id` como fonte da aba do paciente.
- Trocar os contadores de comunidade do paciente para: **Posts**, **Comentarios totais**,
  **Respostas de psicologos verificados**, **Upvotes**, **Downvotes**, **Salvamentos** e
  **Compartilhamentos**.
- Contar respostas verificadas apenas quando a resposta vier de `post_reply.author.role="psicologo"`
  com entitlement profissional verificado pelo helper canonico `isVerifiedProfessionalEntitlement`.
- Contar salvamentos recebidos por `post_save` e `post_reply_save` sobre posts/respostas do paciente,
  excluindo autoacoes do proprio paciente.
- Contar compartilhamentos recebidos por `post_share` sobre posts/respostas do paciente, incluindo
  compartilhamentos anonimos reais e excluindo autoacoes autenticadas do proprio paciente.
- Reusar o layout mobile-first do bloco de comunidade com carrossel horizontal de contadores e grafico
  de series reais, sem criar design system paralelo.

## Consequencias

- A aba de paciente ganha paridade visual com o bloco de comunidade do psicologo sem acoplar os dois
  dominios ou misturar contratos.
- A serie temporal agora reflete todos os sete contadores solicitados.
- "Respostas de psicologos verificados" nao conta respostas de pacientes, psicologos sem entitlement
  profissional vigente ou terceiros sem verificacao.
- Nao houve alteracao em Prisma schema, migrations, packages ou tracking.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Service local: `showAdminPatient({ id: "cmrqsr926001d1guhoz10yvaz", period: "month" })`
  retornou `200` com os sete contadores e series correspondentes.
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsr926001d1guhoz10yvaz?tab=estatisticas`
  retornou `200`.

## Pendencias

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a captura enviada pelo usuario, `_product/proto/admin/Pacientes/Pacientes -
  Detalhes.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
