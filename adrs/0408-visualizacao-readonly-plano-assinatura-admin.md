# ADR-0408: Visualização read-only do Plano Profissional no Admin

## Status

Accepted

## Task relacionada

TASK-142

## Contexto

O produto quer começar simples na página **Configurações > Assinatura**: exibir o valor atual do Plano Profissional, sem permitir edição administrativa do preço nesta etapa.

O preço vigente já é fonte de verdade do backend em `subscription_plan.price_cents` com `slug="profissional"` e foi atualizado para R$ 29,90 pela ADR-0406. Reintroduzir esse valor no frontend criaria risco de divergência com checkout, financeiro e detalhe administrativo.

## Decisão

- Criar o endpoint Admin privado read-only `GET /api/admin/private/settings/subscription-plan`.
- Ler exclusivamente `subscription_plan` real com `slug="profissional"` e `deleted=false`.
- Retornar o preço em centavos (`price_cents`) e `currency="BRL"` apenas como metadado de formatação.
- Exibir o card de valor atual em `/configuracoes/assinatura` usando TanStack Query no app Admin.
- Não exibir a relação de assinaturas vinculadas nessa tela; a listagem operacional permanece no menu **Financeiro**.
- Não criar edição de preço, migration, auditoria de alteração ou integração nova com gateway nesta task.

## Consequências

- O Admin passa a ver claramente o valor atual do plano no contexto de Configurações.
- O frontend continua sem hardcode de preço; se o backend mudar o plano, a tela reflete a nova configuração.
- A ausência do plano profissional é tratada como erro honesto, sem fallback visual inventado.
- A página de Configurações fica focada no parâmetro do plano, sem repetir a listagem financeira de assinaturas.
- A edição futura do preço ainda precisará definir impacto em gateway, assinaturas existentes e auditoria.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke API Admin autenticado confirmou `price_cents=2990`, `currency="BRL"` e `source="subscription_plan"`.
- Browser local via Chrome headless/CDP confirmou `R$ 29,90` em `/configuracoes/assinatura` e ausência da listagem **Assinaturas vinculadas**.

## Pendências

- Definir uma task futura para edição administrativa auditada do preço, se o produto decidir permitir alteração pelo painel.
