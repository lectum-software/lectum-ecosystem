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

## Ajuste 2026-07-22: presets sem agrupamento manual no Financeiro

O feedback de produto pediu que os filtros de `/financeiro` fossem deslocados para a **Visao Geral**, sem controle manual de agrupamento, e que os presets passassem a representar periodos de negocio em vez de janelas fixas de 7/30/90 dias.

Decisoes:

- Aceitar no contrato financeiro `period=today|week|month|year|all|custom`, preservando `from`/`to` para `custom` e mantendo `groupBy=day|week|month` apenas como compatibilidade de API/exportacao.
- Remover o seletor **Agrupar** da UI Admin; a agregacao passa a ser automatica por extensao do periodo: diaria em janelas curtas, semanal em janelas intermediarias e mensal em janelas longas.
- Resolver **Todo o periodo** a partir da primeira data financeira real encontrada em `payment_event` Mercado Pago ou `professional_subscription` paga, com fallback para os ultimos 30 dias somente quando nao houver nenhum dado financeiro real.
- Aplicar os mesmos filtros/presets no CSV exportado, sem adicionar campos sensiveis, package novo, schema Prisma ou migration.

Consequencia: a interface fica mais simples e alinhada ao painel Admin, enquanto o backend continua garantindo dados reais e compatibilidade para consumidores existentes que ainda enviem `groupBy`.


## Ajuste 2026-07-22: contadores financeiros controlam curvas do gráfico

O feedback de produto pediu que a **Visão Geral** do Financeiro tivesse a mesma interação já usada nos dashboards Admin de Psicólogos e Pacientes: clicar no bloco contador alterna a série correspondente no gráfico, mantendo a comparação visual sob controle do operador.

Decisões:

- Transformar os quatro cards financeiros primários em botões acessíveis com `aria-pressed`, preservando o layout mobile-first e mantendo pelo menos uma série ativa para evitar gráfico vazio por interação acidental.
- Ampliar `series.points` do contrato financeiro com `active_subscriptions` e `cancellations` por bucket real, mantendo `revenue_cents`, `confirmed_payments` e `new_subscriptions` para gráfico e CSV.
- Calcular `new_subscriptions`, `active_subscriptions` e `cancellations` por bucket a partir dos mesmos métodos reais de `professional_subscription` usados pelos cards, sem backfill, seed, mock ou inferência de cancelamento por ausência de renovação.
- Renderizar todas as métricas selecionadas como curvas SVG. Receita usa eixo em reais; novas assinaturas, assinaturas ativas e cancelamentos usam eixo de quantidade quando aparecem junto da receita, para não misturar unidades sem indicação.
- Manter `confirmed_payments` no payload/CSV como dado de auditoria financeira, mas não como card toggle porque não existe bloco contador primário correspondente na UI atual.
- Incluir `active_subscriptions` e `cancellations` na seção de série agregada do CSV, sem alterar endpoint, MIME, filename ou expor token/PAN/CVV/dados sensíveis.

Consequências:

- O gráfico financeiro fica consistente com Psicólogos e Pacientes, usando os próprios cards como legenda/interação.
- A consulta passa a executar contagens reais por bucket para as novas curvas. O custo é aceitável para o Admin porque o período máximo continua limitado e a agregação automática usa buckets semanais/mensais em janelas longas.
- A decisão não altera Prisma, migrations, packages nem a regra financeira central de contar somente receita confirmada real do Mercado Pago.


## Ajuste 2026-07-22: LTV médio substitui ticket mensal e bloco de cobertura sai da UI

Feedback de produto pediu remover o bloco visual **Cobertura dos dados financeiros** de `/financeiro` e trocar o card **Ticket médio mensal por assinatura** por **LTV médio dos psicólogos**.

Decisões:

- Remover apenas o bloco visível de cobertura da UI; `coverage_notes` e métricas indisponíveis permanecem no contrato/CSV para rastreabilidade operacional sem ocupar a tela.
- Substituir `average_ticket` por `average_ltv` no dashboard financeiro.
- Calcular `average_ltv` como receita confirmada lifetime em `payment_event` vinculada ao `professional_subscription.id` ou `gateway_subscription_id`, dividida pela quantidade de psicólogos com assinatura paga Mercado Pago criada até o fim do período.
- Marcar o LTV como indisponível quando houver pagamento confirmado vinculado sem valor monetário extraível, sem projetar por preço do plano.
- Manter plano gratuito e `source="admin_grant"` fora do denominador e da receita do LTV.

Consequências:

- A tela passa a privilegiar valor acumulado real por psicólogo pagante em vez de preço médio mensal.
- Eventos de pagamento não vinculáveis a uma assinatura não entram no LTV, embora ainda possam compor a receita total quando confirmados e com valor extraível.
- A remoção do bloco visual reduz ruído na tela sem eliminar as notas de auditoria disponíveis no CSV e no contrato da API.

## Ajuste 2026-07-22: receita de novas assinaturas e Churn

Feedback de produto pediu remover a cópia visível acima do gráfico financeiro, ocultar a tag de fonte técnica e refinar os contadores com receita de novas assinaturas e nomenclatura de Churn.

Decisões:

- Remover apenas os textos visíveis do bloco de gráfico e a tag `payment_event+professional_subscription`; `series.source` permanece no contrato para auditoria e CSV.
- Adicionar o card `new_subscriptions_revenue` entre **Assinaturas ativas** e **Novas assinaturas**, com soma real de `subscription_plan.price_cents` das assinaturas pagas criadas no período.
- Incluir `new_subscriptions_revenue_cents` em `series.points` e na seção agregada do CSV para que o gráfico e a exportação usem o mesmo contrato real.
- Renomear o card `cancellations` para **Churn** e adicionar `rate_percent` ao contrato das métricas; a taxa usa cancelamentos reais no período divididos pela base paga no início do período.
- Manter o id técnico `cancellations` para compatibilidade do contrato e usar apenas label/copy de **Churn** na UI.
- Preservar a interação dos cards como controles de curva com `aria-pressed`, layout mobile-first e sem criar schema, migration, package, seed, mock ou endpoint paralelo.

Consequências:

- A Visão Geral passa a alinhar contadores e curvas na ordem solicitada pelo produto.
- O valor de receita de novas assinaturas representa soma dos planos iniciados no período, não substitui a receita total confirmada em `payment_event`.
- Churn pode exibir `sem base` quando houver saída sem base paga confiável no início do período, evitando taxa artificial.

## Ajuste 2026-07-22: textos técnicos ocultos nos blocos MRR/LTV e lista de novas assinaturas

Feedback de produto pediu remover da UI de `/financeiro` as descrições explicativas longas de MRR e LTV, além das tags técnicas de fonte exibidas nos blocos inferiores.

Decisões:

- Ocultar no frontend Admin as descrições visíveis de `mrr.description` e `average_ltv.description` nos cards inferiores, mantendo somente título, ícone e valor.
- Ocultar as tags visuais `active_paid_subscriptions`, `payment_event_linked_to_paid_psychologists` e `professional_subscription+subscription_plan+psychologist_profile+user` desses blocos.
- Manter `description` e `source` no contrato financeiro e na lógica de backend para rastreabilidade, CSV e auditoria operacional, sem alterar cálculo, endpoint, Prisma/migrations ou packages.

Consequências:

- A tela fica menos técnica para o operador Admin sem perder a proveniência dos dados no contrato real.
- A mudança é exclusivamente visual e não altera as regras de receita, MRR, LTV, novas assinaturas ou exportação.

## Ajuste 2026-07-22: cobranças realizadas e relação completa de assinaturas

Feedback de produto pediu substituir a tabela visual **Novas assinaturas de psicólogos** por **Últimas cobranças realizadas**, adicionar uma tabela de **Relação de assinaturas** e permitir que ambas tenham **Ver todas** para páginas completas.

Decisões:

- Expor no dashboard `latest_charges`, derivado apenas de `payment_event` real do Mercado Pago com evento de pagamento e status confirmado (`approved`, `accredited` ou `paid`). Quando o evento confirmado não possui valor monetário extraível, a cobrança aparece com valor indisponível em vez de estimativa.
- Vincular cobranças a assinaturas pagas procurando o `professional_subscription.id` ou `gateway_subscription_id` no payload do evento. Eventos confirmados sem vínculo local continuam visíveis como cobrança real não vinculada, sem bloquear a tabela nem criar dado artificial.
- Expor no dashboard `subscription_relation`, derivado de `professional_subscription` paga Mercado Pago com `subscription_plan`, `psychologist_profile` e `user`, filtrado pelo período da tela e excluindo plano gratuito e `source="admin_grant"`.
- Criar endpoints Admin privados e paginados `GET /api/admin/private/finance/charges` e `GET /api/admin/private/finance/subscriptions`, reutilizando a mesma resolução real de período do dashboard financeiro.
- Criar páginas `/financeiro/cobrancas` e `/financeiro/assinaturas` no Admin, com paginação e detalhes seguros. Os links **Ver todas** preservam o período atual por `period=custom&from=...&to=...`.
- Atualizar o CSV para incluir seções de cobranças realizadas e relação de assinaturas, sem exportar payload bruto, token, PAN, CVV ou metadados sensíveis de cartão.
- Manter `new_subscriptions` no contrato financeiro para cards/séries e compatibilidade, mas remover essa relação como tabela visual principal de `/financeiro`.

Consequências:

- O operador financeiro passa a ver primeiro cobranças efetivamente confirmadas, enquanto assinaturas ficam em relação própria.
- A rastreabilidade aumenta sem acoplar `payment_event` a uma nova tabela ou migration; a vinculação continua por referências reais já persistidas no payload do gateway.
- Eventos de cobrança reais, mas não vinculáveis a uma assinatura local, são exibidos de forma honesta como não vinculados.
- A mudança não adiciona package, schema Prisma, migration, seed, mock ou endpoint simulado.
