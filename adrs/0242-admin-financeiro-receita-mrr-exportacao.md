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

## Ajuste 2026-07-22: contadores financeiros controlam curvas do gr?fico

O feedback de produto pediu que a **Vis?o Geral** do Financeiro tivesse a mesma intera??o j? usada nos dashboards Admin de Psic?logos e Pacientes: clicar no bloco contador alterna a s?rie correspondente no gr?fico, mantendo a compara??o visual sob controle do operador.

Decis?es:

- Transformar os quatro cards financeiros prim?rios em bot?es acess?veis com `aria-pressed`, preservando o layout mobile-first e mantendo pelo menos uma s?rie ativa para evitar gr?fico vazio por intera??o acidental.
- Ampliar `series.points` do contrato financeiro com `active_subscriptions` e `cancellations` por bucket real, mantendo `revenue_cents`, `confirmed_payments` e `new_subscriptions` para gr?fico e CSV.
- Calcular `new_subscriptions`, `active_subscriptions` e `cancellations` por bucket a partir dos mesmos m?todos reais de `professional_subscription` usados pelos cards, sem backfill, seed, mock ou infer?ncia de cancelamento por aus?ncia de renova??o.
- Renderizar todas as m?tricas selecionadas como curvas SVG. Receita usa eixo em reais; novas assinaturas, assinaturas ativas e cancelamentos usam eixo de quantidade quando aparecem junto da receita, para n?o misturar unidades sem indica??o.
- Manter `confirmed_payments` no payload/CSV como dado de auditoria financeira, mas n?o como card toggle porque n?o existe bloco contador prim?rio correspondente na UI atual.
- Incluir `active_subscriptions` e `cancellations` na se??o de s?rie agregada do CSV, sem alterar endpoint, MIME, filename ou expor token/PAN/CVV/dados sens?veis.

Consequ?ncias:

- O gr?fico financeiro fica consistente com Psic?logos e Pacientes, usando os pr?prios cards como legenda/intera??o.
- A consulta passa a executar contagens reais por bucket para as novas curvas. O custo ? aceit?vel para o Admin porque o per?odo m?ximo continua limitado e a agrega??o autom?tica usa buckets semanais/mensais em janelas longas.
- A decis?o n?o altera Prisma, migrations, packages nem a regra financeira central de contar somente receita confirmada real do Mercado Pago.
