# ADR-0242: Financeiro administrativo com receita confirmada, MRR real e CSV sem dados sensíveis

## Status

Aceito em 2026-07-10.

## Contexto

A TASK-62 implementa a tela Financeiro do Admin usando `_product/proto/admin/Financeiro.png` como referência visual local. Builder/Quick Copy não ficou acessível por ferramenta neste ambiente, então a execução usou a imagem exportada e registrou a limitação na UI e na task.

O painel financeiro precisa mostrar receita, novas assinaturas, assinaturas ativas, cancelamentos, MRR, ticket médio e exportação CSV sem criar dashboard contábil/fiscal completo e sem simular eventos do Mercado Pago.

## Decisão

- Receita total usa somente `payment_event` real do gateway `mercadopago` com status confirmado (`approved`, `accredited` ou `paid`) e valor monetário extraível do payload bruto.
- Quando existir pagamento confirmado sem valor monetário extraível, a métrica de receita é retornada como indisponível, com copy honesta, para evitar soma parcial.
- Novas assinaturas consideram apenas `professional_subscription` com `source="mercadopago"`, `gateway="mercadopago"`, `gateway_subscription_id` preenchido, plano pago (`subscription_plan.price_cents > 0` e `slug != "gratuito"`) e status operacional não inativo.
- Assinaturas ativas, MRR e ticket médio excluem plano gratuito e `source="admin_grant"`/cortesia.
- MRR soma `subscription_plan.price_cents` dos planos pagos ativos. Se planos anuais aparecerem no futuro, o valor anual é normalizado por 12 para o mês.
- Cancelamentos contam somente `professional_subscription.status="cancelada"` com origem Mercado Pago e `updatedAt` no período, sem inferir cancelamento por ausência de renovação.
- A exportação CSV é gerada manualmente, com escape de aspas/campos, `text/csv; charset=utf-8`, BOM UTF-8 e `Content-Disposition` com o período filtrado.
- O CSV exporta resumo, série agregada e novas assinaturas de psicólogos; não usa `payment_method` nem inclui token, PAN, CVV ou metadados sensíveis de cartão.

## Consequências

- A tela privilegia precisão e honestidade operacional em vez de estimar receita por multiplicação de assinaturas.
- Em ambientes com payloads incompletos do Mercado Pago, a receita pode aparecer indisponível enquanto MRR e ticket médio seguem disponíveis a partir do banco de assinatura.
- O Admin Financeiro fica dependente da qualidade dos webhooks/eventos reais já persistidos em `payment_event`, sem criar dados fake ou endpoint simulado.
