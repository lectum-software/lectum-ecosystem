# ADR-0425: Sincronização local de assinatura Mercado Pago sandbox

## Status

Superseded by
[ADR-0430](0430-checkout-mercado-pago-sandbox-com-tunnel-sem-fallback.md)

## Data

2026-07-01

## Task relacionada

Solicitação operacional ad hoc do fluxo de pagamentos local.

## Contexto

O fluxo de assinatura profissional usa Mercado Pago Preapproval e, por regra de domínio, a
assinatura só deve ser ativada após confirmação real do gateway. Em desenvolvimento local, porém, o
Mercado Pago não consegue chamar `localhost` para entregar o webhook. Sem túnel HTTPS disponível, o
checkout sandbox cria a assinatura no gateway, mas o banco local pode permanecer com
`professional_subscription.status = "inativa"`.

Também foi observado que a criação inicial de `preapproval_plan` exigia uma `back_url` pública. Em
sandbox local, `WEB_URL` e o `return_url` do frontend são `localhost`, portanto inválidos para o
Mercado Pago.

## Decisão

1. Criar o script backend `pnpm billing:sync`, implementado em
   `backend/src/operations/subscriptions/sync-mercado-pago-subscription.ts`.
2. O script aceita um alvo local (`--psychologist-email`, `--psychologist-user-id`,
   `--psychologist-profile-id`, `--subscription-id`) ou o `--gateway-subscription-id` do Mercado
   Pago.
3. O script consulta o Mercado Pago real pelo adapter existente `PaymentGateway`/`MercadoPagoAdapter`
   e sincroniza `professional_subscription.status`, `gateway_subscription_id` e
   `current_period_end` com os dados retornados pelo gateway.
4. O script não cria evento falso de webhook, não aprova assinatura por parâmetro manual e não usa
   mock; ele apenas reconcilia o banco local a partir de uma consulta real ao gateway.
5. Por segurança, o script bloqueia `NODE_ENV=production/prod` e exige `MERCADO_PAGO_ENV=sandbox`.
6. Para reduzir atrito em sandbox local sem túnel, o checkout passa a usar
   `https://www.mercadopago.com.br` como `back_url` pública de fallback somente quando
   `MERCADO_PAGO_ENV=sandbox` e nenhuma URL pública estiver configurada. Em produção, a ausência de
   URL pública continua bloqueando a criação de plano quando necessário.

## Consequências

- Desenvolvedores conseguem testar o checkout sandbox localmente sem túnel, executando uma
  sincronização explícita após o checkout.
- A regra de não usar mock é preservada: a fonte de verdade da mudança de status continua sendo o
  Mercado Pago.
- O fluxo automático de produção continua dependendo de webhook assinado; o script é operacional e
  sandbox-only.
- A `back_url` de fallback pode redirecionar para Mercado Pago em vez do frontend local, mas apenas
  em sandbox e apenas quando nenhuma URL pública foi configurada.
- Nenhum package novo foi adicionado.

## Validação

- `pnpm --dir backend billing:sync -- --help`
- `pnpm --dir backend check`
- `pnpm --dir backend build`

## Pendências

- Para homologação/prod com ativação automática, ainda é necessário configurar webhook público real
  em `/api/public/billing/webhook`.
