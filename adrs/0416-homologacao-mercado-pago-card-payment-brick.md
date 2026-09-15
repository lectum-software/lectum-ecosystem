# ADR-0416: Homologação Mercado Pago com credenciais de teste do Card Payment Brick

## Status

Superseded by [ADR-0417](0417-restauracao-sandbox-mercado-pago-conta-vendedora-teste.md)

## Contexto

O checkout profissional usa o Card Payment Brick para tokenizar o cartão no frontend e cria uma
assinatura recorrente autorizada (`PreApproval`) no backend. A homologação estava configurada com
Public Key e Access Token de produção (`APP_USR-*`) de uma conta vendedora de teste, além de um
pagador pertencente a outra conta de teste.

Essa combinação chegou a criar planos, mas a criação da assinatura oscilou entre `404` para o
template recém-criado e `500 Internal server error`. Repetir a chamada não resolveu o erro.

A documentação oficial diferencia dois fluxos de teste do Checkout Bricks:

- pagamentos com cartão no Brick usam as credenciais de teste da aplicação pertencente à conta
  Mercado Pago real e um e-mail comum diferente do e-mail do vendedor;
- contas de teste e credenciais produtivas da conta vendedora de teste são usadas no fluxo com
  redirecionamento para a conta/carteira Mercado Pago.

Referências:

- [Realizar compra teste com Checkout Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-payment-flow)
- [Contas de teste para Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/test/accounts)
- [Assinaturas com plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan)

## Decisão

1. Em homologação, manter `MERCADO_PAGO_ENV=sandbox` e usar:
   - `MERCADO_PAGO_ACCESS_TOKEN=TEST-*` da aplicação criada na conta Mercado Pago real;
   - `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-*` da mesma aplicação.
2. Rejeitar no backend a combinação `sandbox + APP_USR-*` e a combinação
   `production/prod + TEST-*` como erro de configuração antes de chamar o gateway.
3. No frontend, não inicializar nem renderizar o Card Payment Brick quando Public Key e ambiente
   forem incompatíveis.
4. Manter `X-scope: stage` nas operações de plano/assinatura quando a credencial validada for de
   sandbox.
5. Não usar usuário ou e-mail de conta Mercado Pago de teste no campo de e-mail do Card Payment
   Brick. Em sandbox:
   - usar por padrão o e-mail do usuário Lectum autenticado;
   - permitir `MERCADO_PAGO_SANDBOX_PAYER_EMAIL` e
     `NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL` apenas como sobrescrita opcional e idêntica nos
     dois aplicativos;
   - quando houver sobrescrita, exigir operacionalmente um e-mail comum diferente do e-mail da
     conta vendedora Mercado Pago.
6. Configurar o webhook da homologação na aba **Modo de teste** da mesma aplicação e usar o segredo
   desse modo no backend.
7. Manter planos associados. O backend continua criando e persistindo o `preapproval_plan_id` no
   mesmo ambiente da assinatura; `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` permanece vazio salvo importação
   deliberada de um plano compatível.
8. Contas vendedora/compradora de teste não são usadas neste fluxo de cartão. Elas continuam
   válidas para testes futuros que redirecionem o comprador à conta/carteira Mercado Pago.

## Consequências

- Homologação volta a usar o caminho oficial do Card Payment Brick e deixa de misturar recursos de
  contas/ambientes diferentes.
- Configuração incorreta falha como `503` da Lectum, em vez de chegar ao Mercado Pago e aparecer
  como `500` genérico.
- Frontend e backend precisam ser recompilados/reimplantados juntos ao trocar as credenciais,
  porque a Public Key é incorporada ao bundle Next.js no build.
- O `gateway_plan_id` criado pela configuração anterior não é reutilizável. Ao trocar o Access
  Token, o backend detecta que o plano persistido está inacessível, limpa a referência local e cria
  outro plano no ambiente correto.
- Nenhum dado de cartão é persistido ou exposto; o backend continua recebendo somente o token
  efêmero gerado pelo Brick.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Pendência operacional

Após o deploy, executar uma compra de homologação com cartão de teste e nome de titular que produza
aprovação. A validação externa depende da troca das credenciais no Dokploy e não pode ser simulada
no repositório.
