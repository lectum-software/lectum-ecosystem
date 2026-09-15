# ADR-0417: Restaurar sandbox Mercado Pago com conta vendedora de teste

## Status

Accepted

## Data

2026-08-06

## Contexto

O checkout da Lectum usa Card Payment Brick e cria uma assinatura autorizada com plano associado
pelos endpoints `/preapproval_plan` e `/preapproval`. Antes do deploy de homologação, esse fluxo
funcionava localmente com:

- `MERCADO_PAGO_ENV=sandbox`;
- Access Token e Public Key `APP_USR-*` da aplicação criada dentro de uma conta Mercado Pago
  vendedora de teste;
- conta Mercado Pago compradora de teste como pagador no frontend e no backend;
- `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` vazio, permitindo criação e persistência automática do plano.

Durante a tentativa de homologação, o fluxo foi alterado para credenciais `TEST-*` de uma aplicação
da conta real, operações com `X-scope: stage`, pagador comum opcional, fallback sem plano e retries
para respostas `404`/`500`. Essa combinação passou a produzir bloqueios
`PA_UNAUTHORIZED_RESULT_FROM_POLICIES`, planos pertencentes a aplicações distintas e erros de
template inexistente.

A regressão foi reavaliada sem criar, atualizar ou excluir recursos externos:

1. `/users/me` com o Access Token local conhecido retornou HTTP 200 e a tag `test_user`.
2. A pesquisa de planos com a mesma credencial encontrou planos da aplicação/conta vendedora local.
3. A pesquisa de assinaturas encontrou assinaturas `authorized` vinculadas a esses planos,
   confirmando que plano associado e `APP_USR-*` já haviam funcionado de ponta a ponta.
4. O plano persistido durante as tentativas de homologação não existia para a credencial local sem
   scope e retornava PolicyAgent com `X-scope: stage`, evidenciando mistura de conta/aplicação.
5. A referência oficial de assinaturas com plano associado usa Bearer `APP_USR-*` e não instrui o
   envio de `X-scope: stage` nesse fluxo.

Referências:

- [Assinaturas com plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-associated-plan)
- [Criar plano de assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval-plan/post)
- [Criar assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post)
- [Contas de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/test-accounts)

## Decisão

1. Preservar uma única arquitetura nos três ambientes: **assinatura com plano associado**. Remover
   o fallback `MERCADO_PAGO_SKIP_PREAPPROVAL_PLAN` e não criar um caminho de homologação diferente
   de produção.
2. Em desenvolvimento/homologação, usar somente o par Public Key/Access Token `APP_USR-*` da mesma
   aplicação criada dentro da conta Mercado Pago vendedora de teste.
3. Manter `MERCADO_PAGO_ENV=sandbox` como proteção operacional da Lectum. Antes da primeira chamada
   ao gateway, consultar `/users/me` e exigir a tag `test_user`; assim, uma credencial `APP_USR-*`
   da conta real não pode ser usada acidentalmente em sandbox.
4. Rejeitar credenciais `TEST-*` no fluxo atual, pois elas pertencem ao modelo stage que não é usado
   por esta integração de plano associado.
5. Não enviar `X-scope: stage` em criação, leitura, atualização ou cancelamento de plano/assinatura.
6. Exigir o e-mail da conta compradora de teste em
   `MERCADO_PAGO_SANDBOX_PAYER_EMAIL` e
   `NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL`, com o mesmo valor nas duas aplicações.
7. Configurar o webhook na aba **Modo de produção** da aplicação criada na conta vendedora de teste,
   pois o par usado por essa conta é `APP_USR-*`; isso não transforma a conta em uma conta real.
8. Deixar `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` vazio por padrão. O backend cria o plano com o preço
   ativo no banco e persiste o id retornado. Um id explícito só pode ser usado se for acessível pela
   credencial atual e tiver o mesmo valor.
9. Limpar automaticamente uma referência de plano persistida apenas quando o gateway responder
   `404`. Erros `401`, `403` ou `5xx` permanecem explícitos e não provocam criação silenciosa de
   outro plano.
10. Remover retries adicionados sem evidência de garantia de consistência eventual. Falhas reais do
    gateway continuam visíveis para diagnóstico, sem mascaramento ou multiplicação de recursos.

## Consequências

- Homologação volta a reproduzir o mesmo domínio de produção: um plano do vendedor associado a
  várias assinaturas, mudando apenas as contas externas utilizadas.
- O backend impede mistura entre conta real e conta vendedora de teste antes de criar recursos.
- Frontend e backend precisam usar credenciais da mesma aplicação e o mesmo comprador de teste.
- Ao restaurar as credenciais conhecidas, um `gateway_plan_id` de outra conta será descartado somente
  após `404`; em seguida, o backend criará um plano de R$ 29,90 na conta vendedora correta.
- Public Key e e-mail sandbox são incorporados ao bundle Next.js e exigem rebuild do frontend.
- Nenhum segredo, token de cartão, PAN ou CVV é persistido ou registrado em logs.

## Configuração operacional de homologação

Backend:

```env
MERCADO_PAGO_ACCESS_TOKEN=<APP_USR da aplicacao da conta vendedora de teste>
MERCADO_PAGO_WEBHOOK_SECRET=<segredo do Modo de producao dessa mesma aplicacao>
MERCADO_PAGO_ENV=sandbox
MERCADO_PAGO_BACK_URL=https://homolog.lectum.com.br/app/profissional/assinatura/endereco
MERCADO_PAGO_SANDBOX_PAYER_EMAIL=<email da conta compradora de teste>
MERCADO_PAGO_PREAPPROVAL_PLAN_ID=
```

Frontend, tanto em Environment Settings quanto em Build-time Arguments:

```env
NEXT_PUBLIC_MERCADO_PAGO_ENV=sandbox
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<APP_USR da mesma aplicacao vendedora>
NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL=<mesmo comprador de teste do backend>
```

## Validação

- Consulta somente leitura de `/users/me`, planos e assinaturas com a credencial local conhecida.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

O smoke transacional final depende do deploy das credenciais no Dokploy. Ele deve ser executado
uma única vez após backend e frontend estarem na mesma revisão, sem criar recursos manualmente no
intervalo.
