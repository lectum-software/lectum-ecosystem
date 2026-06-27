# ADR-0172: Bloqueio da TASK-32 por credenciais Mercado Pago ausentes

## Status

Accepted

## Task relacionada

TASK-32 - Checkout de assinatura. Complementa a decisão de gateway em `adrs/0003-gateway-pagamento-mercado-pago.md`.

## Contexto

A TASK-32 implementa checkout real de assinatura com Mercado Pago, Card Payment Brick, assinatura recorrente via Preapproval e webhook assinado. A própria task determina que, se um bloqueio obrigatório estiver ativo, a implementação deve parar, registrar pendência/ADR e não marcar a task como concluída.

Em 2026-06-27, a varredura local de configuração encontrou:

- `.env` ausente.
- `frontend/.env.local` ausente.
- `backend/.env` sem chaves `MERCADO_PAGO`, `MERCADOPAGO`, `MP_`, `PAYMENT` ou `WEBHOOK`.
- `frontend/.env` sem chaves `MERCADO_PAGO`, `MERCADOPAGO`, `MP_`, `PAYMENT` ou `WEBHOOK`.

Portanto, não há access token do Mercado Pago, public key client-side nem segredo de assinatura de webhook disponíveis para executar uma integração real.

## Decisão

- Bloquear a TASK-32 como `Blocked` até que as credenciais reais do Mercado Pago sejam fornecidas.
- Não instalar `mercadopago` nem `@mercadopago/sdk-react` nesta execução, porque não há integração real a validar.
- Não criar adapter, endpoint de checkout, webhook, migração ou fluxo visual definitivo nesta execução.
- Não simular pagamento aprovado, não ativar assinatura e não criar mock/seed/endpoint fake para contornar o gateway ausente.

## Consequências

- O fluxo pago permanece honesto e sem ativação de assinatura enquanto o gateway real não estiver configurado.
- Os critérios de aceite da TASK-32 permanecem desmarcados.
- A retomada da TASK-32 deve começar pela confirmação de credenciais e ambiente Mercado Pago antes de qualquer implementação de checkout.

## Pendências para retomar

Antes de reabrir a implementação da TASK-32, providenciar e confirmar:

1. Access token Mercado Pago para backend (`MERCADO_PAGO_ACCESS_TOKEN` ou nome equivalente definido na implementação).
2. Public key Mercado Pago para frontend (`NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` ou nome equivalente definido na implementação).
3. Segredo/contrato de assinatura de webhook para validar `x-signature`.
4. Ambiente alvo inicial (sandbox ou produção) e conta Mercado Pago correspondente.
5. URL pública/túnel para webhook durante validação local, sem dispensar verificação de assinatura.

## Validação desta decisão

- Varredura local das variáveis de ambiente citadas acima.
- Consulta da TASK-32, README de tasks, DATA-MODEL, PACKAGES, ARCHITECTURE e PROTO-INVENTORY.
- Nenhuma alteração de código, schema ou package foi feita nesta execução.
