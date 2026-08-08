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

## Ajuste 2026-07-22: lifetime médio dos psicólogos

Feedback de produto pediu adicionar, logo após **LTV médio dos psicólogos**, o indicador de quanto tempo em média um psicólogo permanece assinante antes de cancelar.

Decisões:

- Expor `average_subscription_lifetime` no contrato do dashboard financeiro.
- Manter **LTV médio dos psicólogos** e **Lifetime médio dos psicólogos** como métricas de todo o histórico financeiro real, enquanto **MRR** permanece sensível ao período filtrado da Visão Geral.
- Exibir na UI uma linha **Período de análise** sem tags técnicas: MRR mostra o período filtrado; LTV e Lifetime mostram **Todo o período**.
- Calcular o lifetime médio apenas com assinaturas pagas reais do Mercado Pago (`source="mercadopago"`, gateway Mercado Pago, plano pago e `gateway_subscription_id` persistido) já canceladas em todo o histórico financeiro real.
- Medir a duração por assinatura cancelada como `professional_subscription.updatedAt - professional_subscription.createdAt`, porque o modelo atual não possui um campo dedicado `cancelled_at` e o próprio cálculo de churn financeiro já usa `status="cancelada"` com `updatedAt` como evidência real de cancelamento persistido.
- Retornar o valor em dias e meses, deixando a UI formatar em meses quando houver pelo menos 1 mês médio e em dias quando o histórico real for menor.
- Marcar o indicador como indisponível quando não houver nenhuma assinatura paga cancelada, sem estimar por churn, preço de plano, seed, backfill ou dado artificial.
- Incluir o resumo de `average_subscription_lifetime` no CSV financeiro, sem payload bruto, token, PAN, CVV ou dado sensível de cartão.

Consequências:

- O Admin passa a ter um lifetime observacional real, baseado em cancelamentos já persistidos.
- Enquanto houver pouco histórico de cancelamento, a métrica pode aparecer indisponível; essa limitação é preferível a projetar lifetime artificial.
- A decisão não adiciona package, schema Prisma, migration, mock, seed ou endpoint simulado.

## Ajuste 2026-07-22: relação de assinaturas com datas de cobrança e filtros Lectum

Feedback de produto pediu simplificar a relação completa de assinaturas, removendo colunas técnicas/operacionais visíveis e alinhando busca/filtros ao padrão das listagens Admin Lectum.

Decisões:

- A relação visual de assinaturas pagas deixa de exibir **CRP**, **Plano**, **Período atual** e **Gateway** como colunas; o contrato continua carregando dados necessários para compatibilidade e para regras financeiras internas.
- A tabela passa a exibir **Início**, **Última** e **Próxima** como datas sem hora. **Última** é calculada a partir do `payment_event` real confirmado mais recente vinculado ao `professional_subscription.id` ou `gateway_subscription_id`; **Próxima** usa `professional_subscription.current_period_end`.
- O CRP pode continuar sendo usado como critério de busca operacional, mas não fica exposto na coluna principal da relação.
- Os filtros da lista passam a ser `q`, `status` e data de início por `period=custom&from&to`, reaproveitando o contrato financeiro existente e filtrando `professional_subscription.createdAt`.
- O filtro/coluna de plano não foi incluído para reduzir ruído na operação financeira atual; a lista continua restringida no backend a assinaturas pagas Mercado Pago, excluindo plano gratuito/cortesia.
- A UI usa o mesmo layout das listagens Lectum Admin: busca em pill com ícone, selects/inputs arredondados, responsivos e botão **Limpar** contextual.
- Não foi criada migration, tabela auxiliar, cache materializado, package novo, seed, mock ou endpoint simulado.

Consequências:

- A tela fica mais próxima da leitura financeira solicitada, mostrando datas de cobrança/renovação sem expor identificadores de gateway como coluna principal.
- A derivação de **Última** depende dos `payment_event` reais já persistidos; quando não houver evento confirmado vinculável, o campo aparece vazio (`—`) em vez de estimar cobrança por plano.
- Para a versão Admin atual, a busca da última cobrança percorre eventos reais em serviço para evitar alteração de schema. Se o volume de `payment_event` crescer, uma futura task pode introduzir índice, campo dedicado ou relação persistida mediante nova decisão arquitetural.

## Ajuste 2026-07-23: busca e filtros na relação completa de cobranças

Feedback de produto pediu que `/financeiro/cobrancas` deixasse de usar a nomenclatura de preview **Últimas cobranças realizadas**, adotasse **Cobranças** como título da página completa e ganhasse busca, filtros de data/status e contagem abaixo da busca.

Decisões:

- Manter a lista de cobranças como relação de `payment_event` real confirmado do Mercado Pago; o filtro de status atual aceita apenas `confirmed`, porque a página continua restrita a cobranças confirmadas e não cria estados artificiais.
- Aplicar `q` no serviço depois do mapeamento seguro de cobranças, procurando nome/e-mail do psicólogo, CRP, plano, ids locais/gateway, referência do evento e status exibido, sem expor payload bruto.
- Reutilizar `period=custom&from&to` para o filtro **Data de/Data até**, preservando a resolução centralizada de período do Financeiro e filtrando o período de `payment_event.createdAt` já usado pela lista.
- Manter a paginação e a contagem no backend após os filtros, para que **cobranças encontradas** reflita o resultado real filtrado e não apenas a página atual no frontend.
- Reaproveitar o padrão visual da relação de assinaturas: busca em pill, filtros arredondados, botão **Limpar** contextual e layout mobile-first.

Consequências:

- A operação financeira passa a localizar cobranças por psicólogo ou identificador sem criar endpoint paralelo nem consulta mockada.
- Como o status real da página completa é apenas `Confirmada`, novos status de cobrança só devem aparecer em task futura se o contrato financeiro passar a listar eventos não confirmados com copy honesta.
- Não há alteração de schema Prisma, migration, package, seed, mock ou dado artificial.

## Ajuste 2026-07-23: filtros de data financeiros com commit após data completa

Feedback de produto identificou que os campos nativos de data em `/financeiro/cobrancas` começavam a consultar a lista enquanto o operador ainda digitava a data. Em Chrome com locale pt-BR, a digitação parcial do ano pode produzir valores normalizados como `0002-07-23`, fazendo a URL receber um intervalo customizado inválido antes da conclusão do campo.

Decisões:

- Manter `type="date"` e o layout mobile-first das listas financeiras, sem pacote de máscara/calendário novo.
- Separar rascunho local de data do estado aplicado na URL para as listas completas de cobranças e assinaturas.
- Aplicar `period=custom&from&to` somente quando o operador sair do grupo de datas ou pressionar Enter com datas completas.
- Rejeitar como rascunho/inválidas datas incompletas ou implausíveis com ano anterior a 1900, impedindo que valores como `0002-07-23` cheguem às queries de listagem.
- Sanitizar `from`/`to` em `parseQuery` e na atualização dos search params; se a URL carregar intervalo incompleto, o frontend não o trata como filtro customizado válido e remove os parâmetros inválidos na próxima troca de filtro.

Consequências:

- A digitação manual deixa de disparar buscas intermediárias e erros por datas parciais.
- A consulta continua real e baseada nos endpoints existentes; apenas o momento de aplicar o filtro mudou.
- O ano mínimo de 1900 é uma barreira de plausibilidade de UI para diferenciar datas reais de estados parciais do input nativo, sem alterar contrato backend nem schema.
- Não há instalação de package, schema Prisma, migration, mock, seed ou endpoint simulado.


## Ajuste 2026-07-23: confiabilidade de pagamento na prévia de assinaturas

Feedback de produto pediu que a tabela **Assinaturas** do dashboard `/financeiro` usasse a mesma leitura operacional da relação completa, priorizando a próxima cobrança e a confiabilidade do pagamento.

Decisões:

- A prévia de assinaturas no dashboard passa a exibir **Psicólogo**, **Início**, **Próxima**, **Valor**, **Status** e **Confiabilidade Pgto**.
- A coluna **Última** é removida apenas da prévia visual do dashboard; a informação de cobranças confirmadas continua disponível na tabela de cobranças e no histórico da relação completa de assinaturas.
- **Confiabilidade Pgto** reutiliza o `payment_health` já calculado pelo serviço financeiro a partir de `payment_event` e `professional_subscription`, sem endpoint novo, cálculo visual paralelo ou dado simulado.
- Os cards mobile seguem a mesma hierarquia, exibindo a confiabilidade de pagamento junto aos dados principais da assinatura.

Consequências:

- A prévia do Financeiro fica consistente com `/financeiro/assinaturas` e reduz redundância com a tabela de cobranças realizadas.
- A mudança é somente de apresentação: não altera contrato HTTP, cálculo financeiro, CSV, Prisma/migrations, packages, seeds, mocks ou dados persistidos.

## Ajuste 2026-08-04: IDs operacionais em assinaturas e cobranças

Feedback de produto pediu que as listas financeiras completas expusessem identificadores rastreáveis: ID da assinatura em `/financeiro/assinaturas`, ID de cada cobrança no histórico de pagamentos e ID da cobrança/assinatura em `/financeiro/cobrancas`.

Decisões:

- Expor na tabela principal de `/financeiro/assinaturas` o `professional_subscription.id` como **ID assinatura**, mantendo os demais dados financeiros derivados do contrato existente.
- Expor no histórico de pagamentos de cada assinatura o `payment_event.id` como **ID cobrança** e o `payment_event.external_id` como **ID Mercado Pago**, sem exibir payload bruto do gateway.
- Em `/financeiro/cobrancas`, adicionar a coluna **ID cobrança** usando `payment_event.id` e `external_id`, e renomear a antiga coluna **Plano** para **Assinatura**.
- Na coluna **Assinatura** de cobranças, manter o nome do plano/estado operacional e exibir `professional_subscription.id`; quando houver, exibir também `gateway_subscription_id` como ID Mercado Pago da assinatura.
- Manter eventos confirmados sem vínculo local visíveis de forma honesta com indicação de ausência de ID de assinatura local.
- Não alterar contrato HTTP, cálculo financeiro, CSV, Prisma/migrations, packages, seed, mock ou endpoint simulado, porque todos os identificadores já existem no payload tipado retornado pelo backend financeiro.

Consequências:

- O operador Admin ganha rastreabilidade para conciliar assinatura e cobrança entre a UI, o banco local e o Mercado Pago.
- A tela fica um pouco mais densa, mitigada com tipografia monoespaçada pequena, quebra de linha e rolagem horizontal apenas no desktop, preservando cards mobile-first.
- A rastreabilidade é ampliada sem expor dados sensíveis de cartão nem payload bruto de pagamento.

## Ajuste 2026-08-04: IDs internos com rótulo simples

Feedback de produto refinou a decisão anterior: a UI deve manter somente identificadores internos e usar o rótulo genérico **ID**, sem expor IDs externos do gateway nem repetir labels como **ID cobrança** ou **ID assinatura**.

Decisões:

- Exibir `professional_subscription.id` como **ID** na relação principal de assinaturas e na área de assinatura da relação de cobranças.
- Exibir `payment_event.id` como **ID** na relação de cobranças e no histórico de pagamentos das assinaturas.
- Remover da apresentação visual `payment_event.external_id` e `gateway_subscription_id`; esses campos continuam disponíveis no contrato/dados internos quando necessários para conciliação técnica, mas não aparecem na tabela operacional.
- Para cobranças confirmadas sem assinatura vinculada, mostrar ausência de identificador interno de assinatura como `ID: —`, sem gerar ID artificial.

Consequências:

- A tela fica menos ruidosa para operação diária, mantendo rastreabilidade interna suficiente para localizar registros no banco local.
- A conciliação com Mercado Pago continua possível por dados internos/contrato, mas deixa de ocupar a lista visual principal.
- Não há alteração de schema, endpoint, cálculo financeiro, CSV, package, mock ou dado persistido.

## Ajuste 2026-08-04: identificadores financeiros internos numéricos

Feedback de produto pediu que o ID interno mostrado nas listas financeiras fosse numérico, não string. O modelo existente usa `String @id @default(cuid())` como chave primária em `professional_subscription` e `payment_event`, e esses valores são usados por relações internas, payloads de gateway, busca, reconciliação e compatibilidade de contrato.

Decisões:

- Manter as chaves primárias string existentes (`id`) para evitar quebra relacional e alteração ampla de contratos já persistidos.
- Adicionar um identificador operacional numérico e persistido, `internal_id Int @unique @default(autoincrement())`, em `professional_subscription` e `payment_event`.
- Usar `internal_id` como o **ID** visível no Admin Financeiro para assinaturas, cobranças e histórico de pagamentos.
- Manter `id`, `external_id` e `gateway_subscription_id` no backend/contrato quando necessários à compatibilidade técnica, mas não como ID operacional visível nas listas solicitadas.
- Permitir busca por `professional_subscription.internal_id` na relação de assinaturas e incluir `internal_id` de cobrança/assinatura na busca mapeada de cobranças.
- Não criar IDs numéricos derivados no frontend nem extrair sufixos de strings existentes, porque isso viraria convenção visual frágil e não um identificador real.

Consequências:

- O operador vê IDs numéricos estáveis e reais sem migração destrutiva de chaves primárias.
- O banco passa a manter duas camadas de identificação financeira: chave técnica string para relações/integrações e `internal_id` numérico para leitura operacional Admin.
- A migration preenche linhas existentes e futuras via sequência PostgreSQL/autoincrement, sem seed, mock ou dado artificial.
- A decisão adiciona schema/migration, mas não altera provider, package, gateway, CSV ou endpoints novos.

## Ajuste 2026-08-04: códigos operacionais C/A para cobranças e assinaturas

Feedback de produto pediu que o ID operacional exibido no Admin Financeiro também identifique visualmente o tipo do registro, sem voltar a labels longos nas células.

Decisões:

- Manter `professional_subscription.internal_id` e `payment_event.internal_id` como identificadores numéricos reais e persistidos.
- Derivar apenas na apresentação os códigos operacionais:
  - cobrança: `C` + `internal_id` com 5 dígitos mínimos, por exemplo `C00001`;
  - assinatura: `A` + `internal_id` com 5 dígitos mínimos, por exemplo `A00020`.
- Não truncar valores acima de 99999; o código cresce naturalmente, como `C100000`.
- Não criar coluna nova, migration, seed ou código artificial persistido, porque o identificador continua sendo o `internal_id` real.
- Aceitar busca por código operacional nas listas completas: `/financeiro/assinaturas` entende `A00020` como assinatura `internal_id=20`, e `/financeiro/cobrancas` localiza tanto cobranças `C00001` quanto assinaturas vinculadas `A00020`.

Consequências:

- O operador distingue cobrança e assinatura pela própria célula de ID, preservando uma tabela curta e sem prefixo textual `ID:`.
- O padrão é reversível e auditável a partir do banco local: remover o prefixo e zeros à esquerda recupera o `internal_id`.
- A decisão não altera schema, chaves primárias, contratos financeiros centrais, gateway Mercado Pago, CSV ou packages.
