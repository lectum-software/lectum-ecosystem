# ADR-0209: Historico de pagamentos real na tela de assinatura

## Status

Accepted

## Task relacionada

TASK-33

## Contexto

A tela `/app/professional/billing` precisava remover textos e acoes redundantes sobre seguranca/tokenizacao do cartao e passar a exibir um historico de pagamentos. A Lectum nao deve criar pagamentos ficticios nem derivar historico financeiro de dados estaticos. O dado persistido disponivel para auditoria do gateway e `payment_event`, populado por webhooks reais do Mercado Pago, alem da assinatura local `professional_subscription` e do metodo seguro `payment_method`.

## Decisao

A pagina passa a mostrar o metodo como titulo **Metodo de pagamento** e descricao com bandeira/ultimos quatro digitos armazenados em `payment_method`, sem mencionar tokenizacao no card. O historico de pagamentos e retornado pelo endpoint existente `GET /api/private/psychologist/billing/subscription` como `payment_history`, derivado apenas de eventos reais de `payment_event` cujo payload contenha o `professional_subscription.id` ou o `gateway_subscription_id` da assinatura atual.

Quando nao ha evento real associado, a UI mostra estado vazio honesto em vez de preencher linhas artificiais. A consulta varre uma janela limitada dos eventos recentes do gateway e filtra no backend para evitar expor payload bruto ao frontend.

## Consequencias

- A tela ganha o bloco de historico sem introduzir mocks, seeds ou nova tabela.
- O frontend recebe somente campos seguros e formataveis: titulo, data, status, valor opcional, gateway e referencia externa.
- Eventos de pagamento que nao tragam referencia a assinatura no payload do webhook podem nao aparecer ate que o contrato de reconciliacao seja expandido com um registro financeiro dedicado ou consulta autorizada ao provedor.
- A acao contextual **Alterar** no proprio card permanece disponivel quando ha assinatura Mercado Pago gerenciavel; os CTAs redundantes externos foram removidos.

## Validacao

- Referencia visual local consultada: `_product/proto/Minhas Assinatura - Psicologo.jpg`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3107`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessao e `/auth/login` retornou `200`.

## Pendencias

- Avaliar em task futura uma tabela financeira normalizada para cobrancas liquidadas caso o Mercado Pago envie eventos de pagamento sem vinculo explicito a assinatura no payload do webhook.

## Atualizacao em 2026-08-14: conciliacao pelo resumo da assinatura no gateway

### Contexto

Em homologacao mobile, um psicologo com Plano Profissional ativo, proxima renovacao e cartao
exibidos corretamente via `professional_subscription`/`payment_method` ainda via o bloco
**Historico de pagamentos** vazio. A causa operacional e que nem todo webhook de cobranca traz no
payload local (`payment_event`) uma referencia suficiente ao `professional_subscription.id` ou ao
`gateway_subscription_id`, embora a assinatura do Mercado Pago mantenha o resumo consolidado de
cobrancas confirmadas no Preapproval.

### Decisao

O endpoint `GET /api/private/psychologist/billing/subscription` continua usando `payment_event`
real como primeira fonte do historico. Para assinaturas `source="mercadopago"` com
`gateway_subscription_id`, ele passa a complementar a resposta consultando
`PaymentGateway.getSubscriptionPaymentSummary()` e transformando apenas a ultima mensalidade
confirmada do resumo do gateway em item seguro de `payment_history`.

A conciliacao nao persiste evento novo, nao cria cobranca artificial e nao expoe payload bruto do
gateway ao frontend. Quando houver `payment_event` e resumo do gateway no mesmo dia, a resposta
deduplica por data para evitar linha duplicada. Se a consulta online ao gateway falhar, o endpoint
mantem o historico local anterior e a tela segue com estado honesto.

### Consequencias

- Psicologos com assinatura paga ativa passam a ver pelo menos a cobranca confirmada mais recente
  quando o Preapproval do gateway informa `charged_quantity` e `last_charged_date`.
- O historico do psicologo fica alinhado ao comportamento ja adotado no Admin Financeiro, sem nova
  tabela, migration, env ou package.
- A limitacao permanece: o resumo do gateway fornece a ultima cobranca consolidada, nao uma lista
  historica completa de todas as mensalidades. Uma tabela financeira normalizada ainda pode ser
  avaliada futuramente para historico completo e reconciliacao offline.

### Validacao

- Teste unitario do builder de historico cobrindo resumo do gateway e deduplicacao por data.
- `pnpm --dir backend exec node --import tsx --test src/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository.test.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- `pnpm check:version`

## Atualizacao em 2026-08-15: historico somente com pagamentos bem sucedidos

### Contexto

O bloco **Historico de pagamentos** da tela de assinatura do psicologo e descrito como
**Cobrancas confirmadas**. Como a lista deve conter somente pagamentos bem sucedidos, a chip verde
**Sucesso** repetia uma informacao implicita em todos os itens e deixava a leitura mobile mais
poluida.

### Decisao

- O builder backend de `payment_history` para o psicologo passa a descartar eventos de pagamento
  pendentes, recusados, cancelados ou apenas processados, retornando somente itens com status
  normalizado `pago`.
- A UI da tela `/app/profissional/assinatura` deixa de renderizar a chip de status em cada item do
  historico; o item mostra plano, data e valor.
- O campo `status_label` permanece no contrato por compatibilidade com clientes em rollout, mas nao
  e mais usado para exibir a chip no frontend atual.

### Consequencias

- Falhas e pendencias de cobranca nao aparecem no historico do psicologo como se fossem itens
  financeiros confirmados.
- A lista fica coerente com a copy **Cobrancas confirmadas** e mais enxuta no mobile.
- Nao ha nova tabela, migration, env, package ou gravacao de dados.
