# ADR-0173: Checkout de assinatura com Mercado Pago Preapproval

## Status

Accepted

## Task relacionada

TASK-32 - Checkout de assinatura. Complementa `adrs/0003-gateway-pagamento-mercado-pago.md` e resolve o bloqueio operacional registrado em `adrs/0172-bloqueio-checkout-mercado-pago-credenciais.md`.

## Contexto

A TASK-32 exige checkout real de assinatura para psicólogos no Plano Profissional, sem simular aprovação de pagamento e sem permitir que PAN/CVV passem pelo backend. Também exige que o backend seja agnóstico ao provedor de pagamento, que a assinatura só seja ativada após webhook assinado do gateway e que as rotas privadas de billing sejam protegidas por papel de psicólogo.

Em 2026-06-27, as credenciais sandbox do Mercado Pago foram disponibilizadas localmente pelo usuário em `backend/.env` e `frontend/.env`, incluindo access token, public key e assinatura secreta de webhook. Os valores não são versionados.

## Decisão

- Implementar a porta `PaymentGateway` e concentrar o SDK Node do Mercado Pago apenas no `MercadoPagoAdapter`.
- Usar `mercadopago` no backend para criar assinatura recorrente via Preapproval, com `card_token_id`, `auto_recurring` mensal, `payer_email` e `external_reference = professional_subscription.id`.
- Usar `@mercadopago/sdk-react` no frontend para tokenizar cartão com Card Payment Brick; o backend recebe somente `card_token`.
- Persistir a assinatura profissional inicialmente como `inativa` e salvar `gateway_subscription_id` sem ativar o plano na resposta do checkout.
- Validar `x-signature` dos webhooks públicos com HMAC-SHA256 usando o manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` antes de persistir `payment_event`.
- Persistir eventos brutos em `payment_event` com unicidade por `gateway` e `external_id` para idempotência.
- Refletir o status normalizado de `professional_subscription` somente após consulta/validação via webhook confirmado.
- Liberar o salvamento de `billing_address` apenas para psicólogos com assinatura profissional ativa.
- Documentar `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` em `frontend/.env.example` e liberar esse arquivo no `.gitignore`, mantendo `.env` real ignorado.

## Consequências

- O fluxo segue o modelo real exigido pelo produto: plano -> checkout Mercado Pago -> confirmação por webhook -> endereço de faturamento.
- O backend permanece isolado do SDK Mercado Pago fora do adapter.
- Dados sensíveis de cartão não são persistidos nem trafegam no backend.
- Ambientes locais e de produção precisam configurar access token, public key, segredo de webhook e URL pública do webhook no painel Mercado Pago.
- A validação visual via browser local depende de sessão autenticada de psicólogo; sem sessão, as rotas privadas respondem com redirecionamento de autenticação.

## Validação

- `pnpm --dir backend db:migrate -- --name task32_billing_checkout`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local HTTP nas rotas `/app/professional/billing/checkout` e `/app/professional/billing/address`, ambas respondendo `307` sem sessão autenticada, confirmando proteção/redirecionamento.

## Pendências

- Configurar a URL pública real do webhook no Mercado Pago para cada ambiente.
- Antes de produção, rotacionar segredos que tenham sido expostos em telas, mensagens ou histórico local.
