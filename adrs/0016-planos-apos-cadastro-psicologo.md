# ADR-0016: Planos apos cadastro de psicologo

## Status

Accepted

## Contexto

O cadastro inicial do psicologo criava `psychologist_profile` real, mantinha
`crp_status="pendente"` e `published=false`, e encaminhava o usuario para a
jornada de CFP/CRP. O produto agora exige que, depois de passar pela tela de
cadastro profissional, o psicologo veja a selecao de plano antes da etapa de
validacao profissional.

O fluxo precisa atender os dois caminhos de cadastro:

- Google: o backend confirma a conta e o frontend recebe sessao real via
  `/api/public/google/me`.
- E-mail/senha: a conta nasce com `confirmed=false`; a verificacao de e-mail
  segue obrigatoria antes de liberar rotas privadas.

A tela de planos nao pode usar mock, seed artificial nem preco hardcoded fora da
fonte persistida. O provedor de pagamento ja foi decidido como Mercado Pago no
ADR-0003, mas o checkout real permanece reservado para a TASK-32 e depende de
credenciais reais.

## Decisao

- O destino canonico de home para `user.role="psicologo"` passa a ser
  `/app/professional/billing/plans`.
- Cadastro via Google redireciona diretamente para a selecao de plano, pois o
  usuario ja retorna confirmado.
- Cadastro via e-mail continua redirecionando primeiro para
  `/auth/verify-email`; depois da confirmacao, o mesmo resolvedor envia o
  psicologo para `/app/professional/billing/plans`.
- A tela de planos consome endpoints privados reais:
  - `GET /api/private/psychologist/billing/plans`;
  - `GET /api/private/psychologist/billing/current`.
- Os endpoints vivem sob `/api/private/psychologist/*` e sao protegidos por
  `_auth` + `requireRole("psicologo")`, fail-closed.
- Os modelos persistidos passam a ser a fonte de verdade para planos:
  - `subscription_plan` com slugs `gratuito` e `profissional`;
  - `professional_subscription` para a assinatura atual do psicologo quando ela
    existir.
- A migration insere os dois planos reais definidos pelo PRD/TASK-31
  (`gratuito` e `profissional`, R$ 9,90/mes em centavos no banco). O frontend
  formata preco a partir de `subscription_plan.price_cents`.
- O CTA do plano profissional nao simula checkout. Enquanto a TASK-32 nao estiver
  pronta com credenciais reais do Mercado Pago, ele registra pendencia visual ao
  usuario e nao cria cobranca nem assinatura ativa.

## Consequencias

- A ordem operacional do psicologo passa a ser: cadastro -> verificacao de
  e-mail quando necessaria -> selecao de plano -> CFP/CRP/CRP manual.
- A tela de planos existe antes do checkout e pode ser testada sem credenciais
  Mercado Pago porque e read-only.
- `professional_subscription.status` continua sendo a futura fonte de
  entitlement do Plano Profissional; nenhuma assinatura e ativada sem webhook ou
  confirmacao real do gateway.
- O plano gratuito pode encaminhar para a etapa de CFP atual sem persistir uma
  assinatura fake.

## Task relacionada

- Pedido direto de produto em 2026-06-05.
- TASK-31 - Planos de assinatura.
- ADR-0003 - Gateway de pagamento: Mercado Pago.

## Validacoes

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3012`: rota
  `/app/professional/billing/plans` retornou HTTP 200 com cookie de sessao de
  smoke.
