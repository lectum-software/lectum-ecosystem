# ADR-0406: Preço do Plano Profissional em R$ 29,90

## Status

Accepted

## Task relacionada

Pedido direto de produto em 2026-08-03; complementa TASK-31, TASK-32, TASK-33, TASK-56 e TASK-62.

## Contexto

O Plano Profissional era persistido em `subscription_plan.price_cents = 990` e a UI do frontend/Admin apenas formatava esse valor recebido do backend. O produto solicitou que a assinatura do Plano Profissional passe de R$ 9,90/mês para R$ 29,90/mês.

Como o checkout usa Mercado Pago Preapproval Plan, um `gateway_plan_id` já persistido pode apontar para um plano recorrente externo com o valor antigo. Reutilizar esse id sem validação poderia cobrar o valor anterior apesar do banco local exibir o novo preço.

## Decisão

- Atualizar a fonte de verdade interna do Plano Profissional para `subscription_plan.price_cents = 2990`.
- Criar migration de dados `20260803090000_update_professional_plan_price` para aplicar o novo preço em bancos existentes.
- Limpar `subscription_plan.gateway_plan_id` quando o preço anterior era diferente de `2990`, forçando a criação/importação de um plano recorrente compatível nas próximas assinaturas.
- Manter frontend e Admin sem hardcode de preço: telas de planos, checkout, assinatura, cartão, financeiro e detalhe administrativo continuam formatando `price_cents`.
- Validar, no checkout, o valor do `preapproval_plan` do Mercado Pago antes de reutilizar `gateway_plan_id` persistido ou `MERCADO_PAGO_PREAPPROVAL_PLAN_ID`; se o valor externo divergir de `subscription_plan.price_cents`, criar um novo plano recorrente.

## Consequências

- Novos checkouts exibem e enviam R$ 29,90/mês a partir do plano persistido.
- Métricas como MRR e receita de novas assinaturas passam a refletir `2990` centavos para assinaturas ligadas ao plano profissional.
- Assinaturas já ativas no Mercado Pago podem exigir ação operacional no gateway se o produto quiser reajustar cobranças futuras de assinantes existentes; esta mudança não simula webhook nem altera cobranças externas retroativamente.
- A migration antiga de criação dos planos permanece intacta para evitar drift em ambientes que já a aplicaram; o novo valor é imposto pela migration complementar.

## Validação

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Consulta local Prisma confirmou `slug="profissional"`, `price_cents=2990` e `gateway_plan_id=null`.

## Pendências

- Se existir `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` configurado fora do repositório, ele precisa apontar para um plano Mercado Pago de R$ 29,90/mês; caso contrário, o backend não o reutiliza e cria um novo plano quando o checkout tiver credenciais válidas.
- Definir política comercial para assinaturas Mercado Pago já ativas antes do reajuste, caso devam ser reajustadas no gateway.
