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
- Execução local do service de sync para `lectum02@gmail.com`, retornando
  `gateway_status="authorized"` e `current.status="ativa"` com dados reais do Mercado Pago.
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

## Atualizacao 2026-06-28 - assinatura associada a plano Mercado Pago

Ao comparar a implementação com a documentação oficial de `POST /preapproval_plan` e `POST /preapproval`, foi identificado que o checkout estava criando assinatura recorrente sem `preapproval_plan_id`. Embora o Mercado Pago permita assinatura sem plano, o fluxo operacional escolhido para a Lectum é assinatura associada a plano: criar o plano uma vez, guardar o id retornado e usá-lo ao criar cada assinatura.

Decisao complementar:

- Adicionar `subscription_plan.gateway_plan_id` para persistir o `preapproval_plan_id` do Mercado Pago no plano interno `profissional`.
- Antes de criar a assinatura, garantir o plano no gateway:
  - se `subscription_plan.gateway_plan_id` já existir, reutilizar;
  - se `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` estiver configurado, importar e persistir esse id;
  - caso contrário, criar o plano real via `PreApprovalPlan.create` com recorrência mensal, BRL e apenas `credit_card`, persistindo o id retornado.
- Usar `MERCADO_PAGO_BACK_URL` como URL pública de retorno preferencial para criar `/preapproval_plan`. `localhost` não é aceito pelo Mercado Pago; em desenvolvimento, usar túnel/domínio público ou informar um `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` já criado.
- Não enviar `X-scope: stage` na criação do `/preapproval_plan`; o escopo `stage` permanece restrito às operações de assinatura (`/preapproval`) que precisam dele em sandbox.
- Criar a assinatura via `PreApproval.create` enviando `preapproval_plan_id`, `card_token_id`, `payer_email`, `external_reference` e `status="authorized"`, sem duplicar `auto_recurring` quando o plano já define a recorrência.
- Manter a ativação do entitlement dependente do webhook assinado; a resposta do checkout continua registrando assinatura `inativa` pendente de confirmação real.
- Enriquecer logs sanitizados do adapter com operação/status/código quando disponíveis, sem registrar access token, webhook secret, PAN, CVV, public key ou `card_token`.

## Atualizacao 2026-07-02 - escopo stage em sandbox

Durante o teste local via ngrok, o Card Payment Brick voltou a tokenizar corretamente, mas a criação
do `PreApproval.create` retornou `Card token service not found`. A documentação oficial de
assinaturas autorizadas em ambiente de teste mostra `X-scope: stage` junto do access token `TEST-*`
no `POST /preapproval`.

Decisão complementar:

- Restaurar no `MercadoPagoAdapter` o envio de `X-scope: stage` apenas para operações
  `/preapproval` em `MERCADO_PAGO_ENV=sandbox`.
- Como o SDK Node mescla headers de forma rasa, enviar também `Authorization: Bearer <access token>`
  no mesmo objeto de headers quando o escopo stage for aplicado.
- Manter `/preapproval_plan` sem `X-scope: stage`; a criação do plano sandbox permanece pelo fluxo
  padrão do SDK.
- Não introduzir fallback, mock, aprovação manual ou env `test`: se o Mercado Pago ainda rejeitar o
  token, a falha permanece explícita para investigação de credenciais/tokenização.

Validação executada:

- `pnpm --dir backend exec biome check --write src/modules/billing/payment-gateway/MercadoPagoAdapter.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Atualizacao 2026-07-02 - credenciais oficiais para teste de Subscriptions

Após o ajuste de `X-scope: stage`, o Mercado Pago passou a retornar
`PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, indicando bloqueio de política e não falha de transporte ou
token ausente. A documentação oficial de testes de Subscriptions com plano associado orienta criar
duas contas de teste, entrar na conta vendedora de teste, criar uma aplicação e usar a `public_key`
para gerar o `card_token` e o `access_token` das credenciais de produção dessa conta vendedora de
teste para criar o plano e a assinatura.

Decisão complementar:

- Manter `MERCADO_PAGO_ENV=sandbox` como semântica operacional da Lectum para ambiente local de
  desenvolvimento.
- Aplicar `X-scope: stage` somente quando o access token começar com `TEST-`, pois esse é o caminho
  usado pelas credenciais de teste da conta real.
- Ao usar as credenciais oficiais recomendadas para Subscriptions sandbox (`APP_USR-*` da conta
  vendedora de teste), não enviar `X-scope: stage`.
- Documentar em `backend/.env.example` e `frontend/.env.example` que o teste de
  Subscriptions/Preapproval deve usar as credenciais de produção da conta Mercado Pago de teste
  vendedora.

## Atualizacao 2026-07-02 - pagador comprador sandbox

Com as credenciais `APP_USR-*` da conta vendedora de teste, o Mercado Pago passou a criar/encontrar
o plano corretamente, mas recusou a assinatura com `Both payer and collector must be real or test
users` quando o `payer_email` enviado era o e-mail real do usuário Lectum autenticado. Esse bloqueio
é coerente com a documentação de testes: em Subscriptions sandbox, o vendedor e o comprador precisam
ser contas de teste.

Decisão complementar:

- Em `MERCADO_PAGO_ENV=sandbox`, exigir `MERCADO_PAGO_SANDBOX_PAYER_EMAIL` no backend e enviar esse
  e-mail como `payer_email` do Preapproval.
- No frontend, quando `NEXT_PUBLIC_MERCADO_PAGO_ENV=sandbox`, usar
  `NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL` como `payer.email` do Card Payment Brick para que a
  tokenização do cartão e a criação da assinatura usem o mesmo comprador sandbox.
- A assinatura local da Lectum continua pertencendo ao psicólogo autenticado; a substituição afeta
  apenas o pagador externo exigido pelo Mercado Pago sandbox.
- Não criar fallback nem aprovação manual: ausência do e-mail comprador sandbox passa a ser erro de
  configuração do gateway.

Validação executada:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Atualizacao 2026-07-02 - sincronização manual autenticada

Após a criação real da assinatura, o retorno local continuou exibindo `professional_subscription`
como `inativa` porque o botão "Atualizar status" apenas refazia a leitura local. O Mercado Pago já
retornava a assinatura como `authorized`, mas o banco Lectum dependia do webhook ou de uma
reconciliação operacional.

Decisão complementar:

- Criar `POST /api/private/psychologist/billing/sync`, protegido por papel `psicologo`, para
  reconciliar a assinatura do psicólogo autenticado contra o Mercado Pago.
- O endpoint busca somente a assinatura Mercado Pago mais recente do próprio psicólogo autenticado,
  chama `PaymentGateway.getSubscription` e atualiza `status`, `gateway_subscription_id` e
  `current_period_end` com o retorno real do gateway.
- O botão "Atualizar status" na tela de checkout passa a chamar esse endpoint antes de refazer a
  leitura local.
- A soberania do entitlement continua no banco Lectum; a sincronização é uma reconciliação real
  autenticada, não fallback, mock ou aprovação manual.

Validação executada:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
