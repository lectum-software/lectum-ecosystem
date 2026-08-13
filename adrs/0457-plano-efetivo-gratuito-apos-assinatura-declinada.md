# ADR-0457 — Plano efetivo gratuito após assinatura profissional declinada

## Status

Aceito — 2026-08-13

## Contexto

Na tela **Minha Assinatura**, quando uma tentativa de assinatura profissional terminava cancelada ou
sem confirmação, o endpoint de assinatura ainda podia retornar a última assinatura profissional
encerrada como `current`. Com isso, a UI mostrava **Plano Profissional** com status **Cancelado**,
alertas de cartão indisponível e pagamento não vinculado.

Do ponto de vista do usuário, uma assinatura profissional declinada, cancelada ou encerrada não é o
plano vigente. Enquanto não houver entitlement profissional ativo, cortesia ativa ou pagamento ainda
em confirmação real, o plano efetivo deve ser o gratuito.

## Decisão

- O contrato de **plano atual** passa a expor somente:
  - assinatura profissional ativa com período vigente;
  - assinatura profissional gateway ainda em confirmação (`inativa` com referência externa real);
  - assinatura gratuita ativa.
- Assinaturas profissionais `cancelada` ou `inadimplente` deixam de ser fallback de plano atual.
- Quando não houver assinatura gratuita persistida, o endpoint pode retornar `null`; o frontend já
  interpreta ausência de assinatura vigente como **Plano Gratuito**, sem criar dado artificial.
- O histórico operacional da assinatura encerrada permanece no banco/admin, mas deixa de compor o
  estado principal do plano do psicólogo.

## Consequências

- Psicólogos com tentativa de assinatura recusada passam a ver a experiência de **Plano Gratuito** e
  CTA de upgrade, em vez de uma assinatura profissional cancelada como se fosse plano atual.
- Pagamentos recém-enviados e ainda `inativa` com referência real continuam podendo aparecer como
  aguardando confirmação.
- Nenhuma migration, env nova, seed, mock ou mutação automática de dados existentes foi necessária.

## Task relacionada

- Ajuste incremental da TASK-33 — Gestão de assinatura e cartão.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
