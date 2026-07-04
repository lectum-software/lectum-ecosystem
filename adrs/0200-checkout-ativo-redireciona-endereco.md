# ADR 0200 - Checkout ativo redireciona direto para endereço

- **Status:** Accepted
- **Data:** 2026-07-04

## Contexto

No fluxo pago do Plano Profissional, a rota `/app/professional/billing/checkout` pode ser acessada novamente por uma pessoa psicóloga que já concluiu a assinatura e já possui `professional_subscription` ativa. A tela intermediária de "Assinatura ativa" exigia um clique extra em "Continuar para endereço", mesmo quando o próximo passo obrigatório do onboarding já era conhecido.

## Decisão

Quando o backend informar uma assinatura profissional ativa e válida, o checkout não renderiza novamente a confirmação de assinatura. A página executa `router.replace` diretamente para `/app/professional/billing/address`, mantendo a tela de inserção de cartão disponível apenas para quem ainda não concluiu a assinatura.

## Consequências

- O fluxo evita uma tela redundante após o pagamento já estar concluído.
- A página de cartão continua existindo para estados sem assinatura ativa, com Mercado Pago real e sem mock.
- Durante a revalidação client-side, pode aparecer apenas um loading transitório de redirecionamento, sem CTA intermediário.
