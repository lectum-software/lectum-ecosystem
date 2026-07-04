# ADR-0213: Billing de cortesia não exibe cobrança nem cartão legado

## Status

Accepted

## Task relacionada

TASK-33

## Contexto

A conta `contato.tuliorezende@gmail.com` possui assinatura profissional ativa com
`professional_subscription.source="admin_grant"` e, portanto, está em cortesia operacional. A
tela `/app/professional/billing` selecionava corretamente a assinatura ativa de cortesia, mas ainda
reaproveitava o `subscription_plan` profissional padrão para exibir `R$ 9,90 / mês` e retornava o
último `payment_method` seguro do usuário, mesmo ele pertencendo a uma assinatura Mercado Pago já
cancelada.

Isso fazia a experiência parecer uma assinatura profissional paga/padrão, apesar de o estado real do
banco indicar cortesia sem gateway, sem `gateway_subscription_id` e sem cobrança recorrente.

## Decisão

- A tela de billing passa a tratar `source="admin_grant"`, `status="ativa"` e plano
  `profissional` como **Plano Profissional de Cortesia**.
- Para cortesia, a UI exibe `Sem cobrança`, `Expiração da cortesia`, histórico sem cobranças e
  método de pagamento como `Cortesia ativa, sem cartão vinculado`.
- O alerta genérico de `Pagamento não vinculado` não aparece para cortesia, porque ausência de
  gateway é o estado esperado.
- O endpoint `GET /api/private/psychologist/billing/subscription` só expõe `payment_method` quando a
  assinatura atual é de fato gerenciável por gateway (`source="mercadopago"`,
  `gateway="mercadopago"`, `gateway_subscription_id` presente e status diferente de `cancelada`).

## Consequências

- Cartões tokenizados de assinaturas pagas anteriores continuam preservados no banco para auditoria,
  mas não são exibidos como método da cortesia atual.
- Cortesias administrativas continuam concedendo os benefícios profissionais, sem serem confundidas
  com assinatura paga recorrente.
- Assinaturas Mercado Pago ativas/inadimplentes/pendentes com vínculo real continuam aptas a exibir
  e alterar cartão.

## Validação

- Consulta real da conta confirmou assinatura atual `admin_grant` ativa e retorno do endpoint com
  `payment_method=null`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em `http://localhost:3002/app/professional/billing`, usando
  sessão real da conta, confirmou os textos de cortesia e a ausência de `Amex final 6885`,
  `Pagamento não vinculado` e `R$ 9,90 / mês`.

## Pendências

- Nenhuma.
