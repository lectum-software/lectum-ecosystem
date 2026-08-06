# ADR-0178: Ajuste de sandbox para Preapproval com plano associado

## Status

Superseded by [ADR-0417](0417-restauracao-sandbox-mercado-pago-conta-vendedora-teste.md)

## Data

2026-07-01

## Task relacionada

Correção operacional do checkout Mercado Pago sandbox.

## Contexto

Durante teste local sandbox do checkout profissional, a tokenização do cartão era concluída, mas a
criação da assinatura no Mercado Pago falhava em `PreApproval.create` com HTTP 403:

- `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
- `blocked_by: PolicyAgent`

O fluxo Lectum cria assinaturas com plano associado (`preapproval_plan_id`). A documentação atual do
Mercado Pago para "Assinaturas com plano associado" mostra a criação da assinatura via
`POST /preapproval` com `preapproval_plan_id`, `card_token_id`, `payer_email`,
`external_reference`, `back_url`, `status: "authorized"` e `auto_recurring`, sem o header
`X-scope: stage` no exemplo desse modo. O header `X-scope: stage` aparece na documentação de
assinaturas autorizadas sem plano associado, mas aplicar o mesmo escopo à assinatura associada ao
plano gerou bloqueio por política no sandbox.

## Decisão

Ajustar `MercadoPagoAdapter.createSubscription` para:

1. sempre enviar `auto_recurring` também quando houver `preapproval_plan_id`, alinhando o payload ao
   exemplo oficial de assinatura com plano associado;
2. não enviar `X-scope: stage` quando a assinatura tiver plano associado;
3. manter `X-scope: stage` apenas como fallback para assinaturas sem plano associado, caso esse modo
   volte a ser usado futuramente.

## Consequências

- O checkout sandbox com plano associado passa a seguir o contrato documentado para
  `preapproval_plan_id`.
- A correção mantém a abstração `PaymentGateway`; nenhum código fora do adapter conhece detalhes do
  Mercado Pago.
- Não há mock nem aprovação manual: a assinatura ainda depende de resposta real do Mercado Pago e,
  em produção, de webhook assinado para ativação automática.
- Nenhum package novo foi adicionado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`

## Pendências

- Retestar o checkout sandbox no browser com cartão de teste e titular `APRO`.
- Em ambiente sem túnel, usar `pnpm --dir backend billing:sync -- --psychologist-email <email>`
  após criação bem-sucedida da assinatura para reconciliar o status local.
