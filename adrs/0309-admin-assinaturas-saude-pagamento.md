# ADR 0309: Saúde de pagamento por assinatura no Admin Financeiro

## Status

Aceita em 2026-07-22.

## Contexto

A tela `/financeiro/assinaturas` precisava indicar rapidamente se uma assinatura paga de psicólogo apresenta problemas recorrentes de cobrança. O pedido de produto foi manter apenas uma coluna de resumo na tabela, chamada **Saúde do pagamento**, e mover o histórico para dentro da própria assinatura via dropdown.

O modelo atual não possui relação formal entre `payment_event` e `professional_subscription`; os eventos do Mercado Pago ficam em payload bruto e já são reconciliados em outros pontos por `professional_subscription.id` ou `gateway_subscription_id`.

## Decisão

- A assinatura continua sendo a entidade principal da listagem.
- O histórico de pagamentos é um detalhe da assinatura, não uma tabela paralela nem linhas independentes.
- A saúde do pagamento é derivada somente de dados reais:
  - `professional_subscription.status`;
  - `professional_subscription.current_period_end`;
  - `payment_event` com referência ao id local da assinatura ou ao `gateway_subscription_id`.
- A coluna de tabela mostra apenas o resumo da saúde; métricas auxiliares ficam no dropdown.
- O cálculo classifica a saúde em:
  - `healthy`;
  - `attention`;
  - `risk`;
  - `critical`;
  - `insufficient_history`.
- A taxa de sucesso usa somente tentativas finais de cobrança: aprovadas versus recusadas/canceladas/chargeback. Cobranças pendentes são exibidas, mas não entram no denominador.
- Histórico insuficiente não é tratado como falha: a UI informa honestamente que não há `payment_event` reconciliável.

## Consequências

- Não foi criada migration nem tabela de tentativa de cobrança nesta etapa.
- Não há mock, seed ou fallback inventado para pagamentos ausentes.
- A precisão da reconciliação continua limitada ao payload bruto do Mercado Pago até existir uma relação persistida dedicada entre pagamento e assinatura.
- A UI fica preparada para exibir métricas mais completas futuramente se o backend passar a persistir tentativas de cobrança normalizadas.

