# ADR-0427: Fallback sandbox para Preapproval pendente sem card token

## Status

Superseded by [ADR-0430](0430-checkout-mercado-pago-sandbox-com-tunnel-sem-fallback.md) and
[ADR-0417](0417-restauracao-sandbox-mercado-pago-conta-vendedora-teste.md)

## Data

2026-07-01

## Task relacionada

Correção operacional do checkout Mercado Pago sandbox sem túnel.

## Contexto

Durante o teste local sandbox do checkout profissional, a criação da assinatura autorizada com
`card_token_id` falhou no Mercado Pago com HTTP 404:

- `Card token service not found`

A tokenização acontecia no frontend via Card Payment Brick, mas o serviço de assinaturas
`/preapproval` não encontrava/aceitava o token no sandbox. A documentação de assinaturas do Mercado
Pago orienta testes com contas de teste e cartões nacionais; a documentação de contas de teste também
informa que integrações com Checkout Bricks não suportam contas de teste para testes de integração,
o que deixa o fluxo transparente de assinatura com card token instável/inviável neste ambiente local.

Como não há túnel disponível para webhook e não podemos usar mock, era necessário um caminho de teste
local que continuasse criando recursos reais no Mercado Pago.

## Decisão

1. Manter o fluxo principal de produção/sandbox com cartão tokenizado e `status: "authorized"`.
2. Quando `MERCADO_PAGO_ENV=sandbox` e a criação autorizada falhar especificamente com
   `Card token service not found`, criar uma preapproval real em modo `status: "pending"`, sem
   `card_token_id`, via `MercadoPagoAdapter.createPendingSubscription`.
3. Persistir o `gateway_subscription_id` retornado no mesmo `professional_subscription` local,
   mantendo status interno `inativa` até confirmação/sincronização real.
4. Retornar `init_point` ao frontend para o usuário concluir a assinatura no Mercado Pago.
5. Mostrar no frontend um CTA "Concluir no Mercado Pago" quando `init_point` existir.
6. Em ambiente local sem webhook, usar o script `pnpm --dir backend billing:sync` após a conclusão no
   Mercado Pago para consultar o gateway real e reconciliar a assinatura local.

## Consequências

- O desenvolvimento local consegue avançar sem túnel e sem simular aprovação.
- A assinatura pendente é recurso real do Mercado Pago; a Lectum não ativa plano por parâmetro manual
  nem cria pagamento fake.
- Produção continua usando o caminho autorizado com cartão tokenizado e webhook assinado.
- O fallback é restrito a sandbox e a um erro específico do gateway.
- A UI passa a expor o `init_point` apenas quando retornado pelo backend.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Retestar manualmente o checkout sandbox no browser e, após concluir no Mercado Pago, executar
  `pnpm --dir backend billing:sync -- --psychologist-email <email>`.
- Em homologação/prod, configurar webhook público real em `/api/public/billing/webhook`.
