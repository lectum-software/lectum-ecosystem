# ADR-0256: Cortesia ativa pula fluxo de assinatura e endereço

## Status

Accepted

## Task relacionada

Correção de regressão nas regras da TASK-31B, TASK-32 e TASK-44.

## Contexto

Psicólogos com `professional_subscription.source="admin_grant"` recebem uma cortesia administrativa ativa e, por decisão de produto, não devem entrar no fluxo de assinatura paga. A regressão observada em 2026-07-11 fez um psicólogo com cortesia cair em `/app/professional/billing/address`, exibindo copy de pagamento e solicitando endereço de faturamento.

Essa etapa existe para assinatura paga Mercado Pago confirmada, não para cortesia. Cortesia é entitlement operacional temporário/manual e já funciona como equivalência de verificação profissional enquanto ativa.

## Decisão

- `source="admin_grant"` ativo deixa de exigir endereço de faturamento no cálculo de onboarding profissional.
- Se uma cortesia ativa acessar diretamente checkout ou endereço, o frontend redireciona para a próxima etapa real do cadastro profissional ou para a tela de assinatura/gestão, nunca para pagamento/endereço.
- O endpoint de endereço de faturamento passa a aceitar somente assinatura profissional ativa de origem `mercadopago`, com `gateway="mercadopago"` e `gateway_subscription_id` real.
- A regra preserva o fluxo pago: pagamento real confirmado → endereço → WhatsApp → verificação profissional → perfil.
- A regra preserva a cortesia: cortesia ativa → WhatsApp/perfil quando pendentes, sem checkout, cartão ou endereço.

## Consequências

- Psicólogos com cortesia não ficam presos em telas de cobrança.
- O backend deixa de tratar cortesia como assinatura válida para salvar endereço de faturamento.
- O fluxo de renovação opcional de cortesia com cartão continua separado pelo intent explícito `courtesy-renewal`.
- Nenhuma migration nem package novo foi necessário.

## Validação

- `_product/tasks/PROTO-INVENTORY.md` consultado; as telas relacionadas continuam sendo `Finalizar Assinatura`, `Endereço de Faturamento` e `Minhas Assinatura`.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a correção foi de regra de fluxo, não de layout novo.
- `pnpm --dir frontend check`
- `pnpm --dir backend check` (primeira tentativa expirou por timeout local; segunda executou sem erros)
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke local com `next start --port 3101` e `curl -I /app/professional/billing/address` sem sessão retornou `307` para login, confirmando proteção da rota privada; validação autenticada depende de sessão real do psicólogo afetado.

## Pendências

- Sem pendência externa.
