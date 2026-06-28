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
- Restringir o checkout e a futura troca de cartão a `credit_card`: o Card Payment Brick oculta débito/pré-pago, a interface explicita "Cartão de crédito" e o backend exige `payment_type_id = credit_card` e rejeita valores diferentes.
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
- A assinatura fica dependente de cartão de crédito, reduzindo risco operacional de recorrência com débito/pré-pago, mas exclui esses meios até nova decisão de produto.
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

## Atualizacao 2026-06-28

Durante o teste local com credenciais sandbox, a tokenizacao do cartao foi concluida no frontend, mas a criacao do `preapproval` falhou no backend. A documentacao oficial de assinaturas autorizadas do Mercado Pago exige o cabecalho `X-scope: stage` nos testes de assinatura.

Decisao complementar:

- Enviar `X-scope: stage` apenas quando `MERCADO_PAGO_ENV=sandbox`.
- Reutilizar o mesmo escopo nas operacoes de criacao, consulta e troca de cartao da assinatura.
- Registrar logs sanitizados de falhas do gateway, sem expor token de cartao, access token ou segredo de webhook.

## Atualizacao 2026-06-28 - payer sandbox

Durante a simulacao local, o Mercado Pago retornou `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` quando o `payer_email` enviado era o e-mail real do usuario autenticado na Lectum. A conta compradora de teste do Mercado Pago possui um e-mail sandbox proprio, obtido ao acessar a conta de teste com as credenciais geradas no painel.

Decisao complementar:

- Quando `MERCADO_PAGO_ENV=sandbox`, permitir sobrescrever o `payer_email` enviado ao Preapproval por meio de `MERCADO_PAGO_TEST_PAYER_EMAIL`.
- Em ambientes fora do sandbox, manter o e-mail real do usuario autenticado na Lectum como pagador da assinatura.
- Manter a variavel opcional apenas no backend, sem versionar o valor real no repositorio.

## Atualizacao 2026-06-28 - payer sandbox no Brick

Ao manter o e-mail real do usuario autenticado no `payer.email` do Card Payment Brick, o frontend tokenizava o cartao em um contexto de pagador diferente daquele enviado pelo backend ao Preapproval sandbox. Para reduzir bloqueios de politica do Mercado Pago durante testes locais, o mesmo e-mail comprador de teste passa a ser usado tambem no Brick quando `NEXT_PUBLIC_MERCADO_PAGO_ENV=sandbox`.

Decisao complementar:

- Expor apenas em ambiente local/sandbox a variavel `NEXT_PUBLIC_MERCADO_PAGO_TEST_PAYER_EMAIL`, sem versionar o valor real.
- Em producao, manter o e-mail real do usuario autenticado na Lectum como pagador informado ao Brick.
- Documentar a variavel no `frontend/.env.example` para evitar divergencia entre tokenizacao frontend e criacao de assinatura backend nos testes.

## Atualizacao 2026-06-28 - headers sandbox do SDK

Ao investigar o erro `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, foi identificado que o SDK Node do Mercado Pago mescla `requestOptions` de forma rasa nas chamadas de `PreApproval`. Assim, ao adicionar somente o header `X-scope: stage`, o objeto `headers` original do SDK era substituido e o header `Authorization` deixava de ser enviado.

Decisao complementar:

- No sandbox, enviar `X-scope: stage` junto com `Authorization: Bearer <access token>` dentro dos `requestOptions` do adapter.
- Manter esse ajuste restrito ao `MercadoPagoAdapter`, sem expor access token em logs, frontend ou outros modulos.
- Em producao, continuar usando o fluxo padrao do SDK sem sobrescrever headers.
