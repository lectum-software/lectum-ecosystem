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
