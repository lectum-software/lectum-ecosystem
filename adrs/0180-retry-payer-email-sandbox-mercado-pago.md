# ADR-0180: Retry do payer email no fallback sandbox Mercado Pago

## Status

Accepted

## Data

2026-07-01

## Task relacionada

Correção operacional do checkout Mercado Pago sandbox sem túnel.

## Contexto

Após o fallback para preapproval pendente no sandbox, o Mercado Pago retornou HTTP 400 com a causa:

- `Both payer and collector must be real or test users`

O ambiente local estava configurado com `MERCADO_PAGO_TEST_PAYER_EMAIL`, mas a credencial sandbox em uso podia ser tratada pelo gateway como coletor de outro tipo em relação ao pagador informado. Isso impedia a criação da preapproval pendente antes mesmo de abrir o fluxo hospedado do Mercado Pago.

Não devemos mascarar o erro com aprovação manual ou mock. O recurso de assinatura precisa continuar sendo criado no gateway real.

## Decisão

1. Manter a preferência por `MERCADO_PAGO_TEST_PAYER_EMAIL` no sandbox quando configurado.
2. Se a criação da preapproval pendente falhar especificamente com `Both payer and collector must be real or test users`, repetir uma única vez usando o e-mail do usuário autenticado na Lectum.
3. Usar uma chave de idempotência distinta no retry para não colidir com a tentativa anterior que usou outro `payer_email`.
4. Restringir esse retry ao sandbox; produção continua sem fallback adicional.
5. Cancelar a assinatura local pendente se a tentativa original e o retry falharem.

## Consequências

- O checkout local fica mais tolerante às combinações de credencial/pagador aceitas pelo sandbox do Mercado Pago.
- O fluxo continua sem mock: o backend só prossegue se o Mercado Pago criar uma preapproval real.
- Se a credencial exigir contas de teste compatíveis, o usuário ainda precisará alinhar seller/buyer test users ou remover a variável `MERCADO_PAGO_TEST_PAYER_EMAIL`.
- O retry não altera o caminho de produção nem ativa assinatura local sem confirmação do gateway.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
