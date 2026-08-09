# ADR-0433: Reconciliação de assinatura Mercado Pago por webhook e entitlement local

## Status

Accepted

## Data

2026-07-02

## Task relacionada

Correção operacional do fluxo de assinatura profissional Mercado Pago sandbox/ngrok.

## Contexto

Após um checkout sandbox autorizado, a tela de endereço podia exibir a assinatura profissional como ativa enquanto o backend recusava o salvamento do endereço com `billing_address_subscription_required`.

A investigação mostrou dois pontos de dessincronia:

1. A validação de webhook do Mercado Pago deve usar o `data.id` recebido na query string junto com `x-signature` e `x-request-id`; o receiver local considerava apenas o corpo JSON para o `data.id`.
2. Para preapprovals autorizados, o `next_payment_date` retornado pelo Mercado Pago sandbox pode vir igual ao início da assinatura. Persistir esse valor diretamente em `current_period_end` expira o entitlement local minutos depois do pagamento, mesmo com status do gateway `authorized`.

## Decisão

- O receiver público de webhook passa a receber `req.query`, validar assinatura com `query["data.id"]` quando disponível e montar um payload normalizado com fallback para query/corpo.
- Eventos duplicados continuam reconciliando o estado local, pois atualizar status e período é idempotente. Isso evita perder uma atualização se uma tentativa anterior falhar depois de armazenar o evento.
- Apenas eventos de preapproval de assinatura atualizam a assinatura local diretamente. Eventos de `subscription_authorized_payment` continuam registrados, mas não são tratados como preapproval porque o recurso é uma cobrança/autorização, não o ID da assinatura.
- A sincronização Mercado Pago foi centralizada em `syncMercadoPagoSubscriptionRecord`, usada pelo endpoint manual, pelo webhook e pelo salvamento de endereço.
- Ao sincronizar uma assinatura ativa, o backend usa `next_payment_date` somente quando ele está no futuro. Quando o gateway retorna uma data inicial/passada, o período local é derivado do `auto_recurring.start_date` + frequência real do preapproval; se necessário, o intervalo do plano local é usado como apoio de mapeamento.
- O salvamento do endereço tenta reconciliar a assinatura real no Mercado Pago antes de recusar por falta de assinatura profissional ativa.
- O frontend só exibe assinatura profissional ativa quando `status=ativa`, plano profissional e `current_period_end` ausente ou futuro, alinhando a regra visual com o backend.
- A tela de checkout faz sincronização automática em background enquanto a assinatura está pendente, usando o endpoint real de sync contra o gateway. O botão manual permanece como ação explícita de recuperação.

## Consequências

- O webhook real fica compatível com a assinatura esperada pelo Mercado Pago e reduz a dependência do clique manual.
- O endereço deixa de falhar por estado local vencido quando o Mercado Pago ainda considera a preapproval autorizada.
- O entitlement local passa a representar a janela de acesso Lectum, não apenas o campo bruto `next_payment_date` quando ele for ambíguo no sandbox.
- A sincronização em background não simula pagamento nem ignora o gateway: ela consulta a assinatura real no Mercado Pago.
- Ainda é necessário manter o webhook configurado no painel do Mercado Pago/ngrok para validação end-to-end completa.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local de webhook assinado com `x-signature`, `x-request-id` e `query["data.id"]`, usando uma assinatura sandbox real já existente: retorno `status=200`, `processed=true` e assinatura local `ativa` com `current_period_end=2026-08-02T21:07:31.503Z`. O evento temporário de validação foi removido após o teste.

## Pendências

- Conferir no painel do Mercado Pago se o webhook do app sandbox aponta para `https://tunnel-autorizado.example/api/public/billing/webhook` e inclui eventos de assinatura/preapproval.
