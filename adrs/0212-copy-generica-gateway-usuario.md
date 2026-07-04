# ADR-0212: Copy genérica de pagamento para usuários

## Status

Accepted

## Task relacionada

TASK-33

## Contexto

Na tela `/app/professional/billing`, o texto de confirmação de cancelamento citava o fornecedor de pagamento. O pedido de produto foi trocar a copy do cancelamento para:

> "Todos os benefícios do Plano Profissional serão desativados após a confirmação."

O pedido também definiu que a interface não deve citar o nome do fornecedor de pagamento para o usuário.

## Decisão

- Remover menções explícitas ao fornecedor de pagamento das copies visíveis ao usuário em billing.
- Manter o fornecedor e os identificadores técnicos apenas como detalhe interno de integração, código, status persistido e adapter.
- Usar linguagem genérica como "pagamento", "método de pagamento", "confirmação" e "formulário seguro de cartão".
- Atualizar mensagens de erro/sucesso do backend que podem chegar ao usuário para não expor o nome do fornecedor.

## Consequências

- A experiência fica mais neutra e centrada na Lectum.
- A troca futura de gateway exige menos ajuste de copy.
- Logs, adapters, env vars e valores persistidos continuam podendo mencionar o fornecedor por necessidade técnica, sem exibição direta ao usuário.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke local com `next start --port 3113`: `/app/professional/billing` retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling` sem sessão e `/auth/login` retornou `200`.
- Busca de fonte confirmou ausência de `"Mercado Pago"` nas strings de UI billing e mensagens backend alteradas.

## Pendências

- Nenhuma.
