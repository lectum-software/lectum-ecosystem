# ADR 0309: Confiabilidade do pagamento por assinatura no Admin Financeiro

## Status

Aceita em 2026-07-22.

## Contexto

A tela `/financeiro/assinaturas` precisava indicar rapidamente se uma assinatura paga de psicólogo apresenta problemas recorrentes de cobrança. O pedido de produto foi manter apenas uma coluna de resumo na tabela, chamada **Confiabilidade do pagamento**, e mover o histórico para dentro da própria assinatura via dropdown.

O modelo atual não possui relação formal entre `payment_event` e `professional_subscription`; os eventos do Mercado Pago ficam em payload bruto e já são reconciliados em outros pontos por `professional_subscription.id` ou `gateway_subscription_id`.

## Decisão

- A assinatura continua sendo a entidade principal da listagem.
- O histórico de pagamentos é um detalhe da assinatura, não uma tabela paralela nem linhas independentes.
- A confiabilidade do pagamento é derivada somente de dados reais:
  - `professional_subscription.status`;
  - `professional_subscription.current_period_end`;
  - `payment_event` com referência ao id local da assinatura ou ao `gateway_subscription_id`.
- A coluna de tabela mostra apenas o resumo da confiabilidade; métricas auxiliares ficam no dropdown.
- O dropdown de confiabilidade também exibe o cartão salvo do psicólogo quando houver `payment_method` local seguro. O payload Admin pode expor somente `brand`, `last4`, `exp_month`, `exp_year`, data de atualização e se o registro corresponde ao `gateway_subscription_id`; `gateway_token`, PAN e CVV permanecem backend-only/fora do contrato.
- A listagem completa de assinaturas aceita filtro operacional por confiabilidade via query `paymentHealth`, usando exatamente as classificações derivadas de `payment_health.status`.
- Assinaturas com `status="cancelada"` expõem `cancelled_at` no contrato Admin Financeiro, derivado de `professional_subscription.updatedAt`, porque o fluxo real de gateway/sincronização já grava o cancelamento nessa atualização e ainda não existe coluna Prisma dedicada.
- O cálculo classifica a confiabilidade em:
  - `healthy`;
  - `attention`;
  - `risk`;
  - `critical`;
  - `insufficient_history`.
- O status técnico `healthy` permanece no contrato e filtros, mas o rótulo exibido ao Admin é **Confiável** para comunicar estabilidade de cobrança de forma mais direta.
- A taxa de sucesso usa somente tentativas finais de cobrança: aprovadas versus recusadas/canceladas/chargeback. Cobranças pendentes são exibidas, mas não entram no denominador.
- Histórico insuficiente não é tratado como falha: a UI informa honestamente que não há `payment_event` reconciliável.

## Consequências

- Não foi criada migration nem tabela de tentativa de cobrança nesta etapa.
- Não há mock, seed ou fallback inventado para pagamentos ausentes.
- A apresentação ao Admin mantém **Confiabilidade do pagamento** no detalhe explicativo e usa a abreviação **Confiabilidade Pgto** apenas na coluna da tabela para reduzir largura; nomes técnicos internos como `payment_health` permanecem por compatibilidade do contrato recém-criado.
- A coluna **Próxima** permanece restrita à próxima cobrança. Assinaturas vigentes exibem `next_charge_at`; assinaturas canceladas exibem `—` nessa coluna para não misturar ciclo futuro com cancelamento.
- No detalhe expandido, a UI privilegia a leitura operacional: remove a tag duplicada de classificação, o contador/fonte de eventos reconciliados e a nota técnica de ausência de `payment_event`, mantendo os dados e o estado honesto no contrato.
- A data de cancelamento aparece como métrica operacional no dropdown da assinatura cancelada, imediatamente após **Última falha** no grid de métricas. A UI usa tanto `status="cancelada"` quanto `cancelled_at` presente como guarda defensiva de exibição e o CSV financeiro mantém `cancelled_at`, sem expor payload bruto ou dados sensíveis do gateway.
- O histórico de pagamentos não expõe metadados técnicos do gateway como tipo do evento (`payment.updated`), referência externa ou `status_detail` bruto (`approved`); a linha mantém data, gateway, valor e badge traduzido.
- Notas de amostra pequena continuam podendo existir no contrato de análise, mas não são exibidas como faixa visual no dropdown para evitar ruído operacional.
- A exibição do cartão é informativa e não cria nova relação entre assinatura e cartão; quando o `gateway_token` salvo não corresponde ao `gateway_subscription_id`, a UI informa apenas que é o último cartão salvo do psicólogo.
- O layout do dropdown mantém o cartão salvo no topo direito, enquanto as métricas de confiabilidade ocupam a largura das duas colunas abaixo do cabeçalho/cartão para preservar leitura horizontal no desktop e empilhamento mobile-first.
- O filtro de confiabilidade é aplicado no service depois de mapear a saúde real de pagamento, porque a classificação depende de `payment_event` reconciliado e não existe coluna persistida dedicada. Isso preserva a honestidade do dado, mas pode exigir otimização futura se a lista crescer muito.
- A precisão da reconciliação continua limitada ao payload bruto do Mercado Pago até existir uma relação persistida dedicada entre pagamento e assinatura.
- A UI fica preparada para exibir métricas mais completas futuramente se o backend passar a persistir tentativas de cobrança normalizadas.

## Ajuste 2026-08-13: resumo do gateway como complemento de confiabilidade

A mesma divergência observada no Financeiro pode afetar a saúde de pagamento por assinatura quando o Mercado Pago confirma cobrança no `preapproval.summarized`, mas o webhook local não gerou `payment_event` útil.

Decisões:

- O histórico e a saúde financeira por assinatura podem usar o resumo real do gateway como complemento aos `payment_event` locais.
- Quando o resumo do gateway e um evento local representam a mesma cobrança do mesmo dia, a visualização consolida em uma única entrada para evitar linhas duplicadas.
- O título/descrição principal da cobrança vinculada à assinatura usa o nome do plano, preservando a tag de sucesso em verde quando a cobrança confirmada vem do gateway.

Consequências:

- Assinaturas aprovadas recentemente deixam de aparecer como histórico insuficiente apenas porque o webhook local não gravou a cobrança.
- A UI continua sem expor payload bruto, IDs externos ou mensagens técnicas do provedor; o resumo do gateway é usado apenas para estado, data e valor seguros.
