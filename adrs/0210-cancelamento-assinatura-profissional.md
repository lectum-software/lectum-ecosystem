# ADR-0210: Cancelamento discreto de assinatura profissional

## Status

Aceito em 2026-07-04.

## Contexto

A tela `/app/professional/billing` já exibe plano, renovação, método de pagamento e histórico real. O protótipo ativo `_product/proto/Minhas Assinatura - Psicólogo.jpg` mostra uma ação secundária e discreta de cancelamento no rodapé da experiência. A porta `PaymentGateway` descrita em `_product/tasks/DATA-MODEL.md` já previa `cancelSubscription(gateway_subscription_id)`, mas a operação ainda não existia no adapter real.

## Decisão

- Expor a opção **Cancelar assinatura** somente para assinatura profissional ativa `source="mercadopago"`, `gateway="mercadopago"` e com `gateway_subscription_id` real.
- Implementar o cancelamento no backend via `PaymentGateway.cancelSubscription`, mantendo o SDK Mercado Pago isolado em `MercadoPagoAdapter`.
- No Mercado Pago, cancelar a recorrência atualizando o Preapproval para `status="cancelled"`; só atualizar `professional_subscription.status` para `cancelada` quando o retorno normalizado do gateway confirmar `cancelada`.
- Manter a UI discreta: link textual cinza com ícone pequeno; antes de cancelar, exibir confirmação inline compacta.
- Não criar schema novo nem agendar cancelamento ao fim do período no MVP. O cancelamento é imediato porque o modelo atual só possui `status` e `current_period_end`, sem campo de `cancel_at_period_end`.

## Consequências

- Não há mock nem simulação: sem credencial/configuração do Mercado Pago, o endpoint responde erro de gateway e a assinatura local permanece inalterada.
- Assinaturas de cortesia administrativa ou plano gratuito não recebem CTA de cancelamento pelo usuário.
- Após cancelar, os benefícios que dependem de `professional_subscription.status="ativa"` deixam de ser concedidos pela regra de entitlement existente.
- Caso o produto decida oferecer cancelamento ao fim do ciclo, será necessária nova decisão e possível evolução de schema/estado.
