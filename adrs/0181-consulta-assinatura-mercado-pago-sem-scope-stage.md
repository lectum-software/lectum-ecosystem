# ADR-0181: Consulta de assinatura Mercado Pago sem X-scope stage

## Status

Accepted

## Data

2026-07-01

## Task relacionada

Correção operacional da sincronização local de assinatura Mercado Pago sandbox.

## Contexto

O script local `billing:sync` encontrava a assinatura pendente criada no banco, mas a consulta da preapproval no Mercado Pago falhava com HTTP 403:

- `At least one policy returned UNAUTHORIZED.`
- `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
- `PolicyAgent`

A assinatura havia sido criada sem o header sandbox `X-scope: stage`, pois esse header já havia causado bloqueios de PolicyAgent em operações de preapproval/plano com as credenciais de teste usadas localmente. A consulta (`GET /preapproval/:id`) ainda herdava o header global do adapter em `MERCADO_PAGO_ENV=sandbox`, consultando o recurso em outro escopo.

## Decisão

1. Consultar assinaturas Mercado Pago (`getSubscription`) sem incluir `X-scope: stage`.
2. Manter o bloqueio de segurança do script: somente ambiente local/sandbox pode executar `billing:sync`.
3. Melhorar a saída de erro do script para imprimir os detalhes sanitizados do adapter (`operation`, `status`, `code`, `blocked_by`, `cause_message`) quando disponíveis.

## Consequências

- O script de sincronização passa a consultar a mesma preapproval criada pelo checkout/fallback sandbox.
- Erros futuros do Mercado Pago ficam diagnosticáveis sem expor token ou dados sensíveis.
- Produção não muda: o adapter só altera o requestOptions da operação de consulta e a sync local segue bloqueada fora de sandbox.

## Validação

- `pnpm --dir backend billing:sync -- --psychologist-email lectum02@gmail.com --dry-run`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
