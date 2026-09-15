# ADR-0456 — Mensagens públicas para recusas de cartão no Mercado Pago

## Status

Aceito — 2026-08-13

## Contexto

No checkout do Plano Profissional, recusas de cartão do Mercado Pago chegavam ao frontend como
falha genérica de gateway (`502`). A UI então exibia "Não foi possível conectar ao serviço.", mesmo
quando o cenário era uma recusa esperada de cartão de teste, como código de segurança inválido,
validade incorreta, limite insuficiente ou autorização pelo banco.

As telas de pagamento já usam o Card Payment Brick, então o backend continua recebendo apenas o
`card_token`; PAN/CVV não passam pela Lectum. O ajuste precisava preservar essa separação e impedir
que detalhes técnicos do provedor vazassem para UI, API ou logs.

Referências oficiais consultadas:

- Mercado Pago Developers — Cartões de teste:
  https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/cards
- Mercado Pago Developers — Motivos de recusa em assinaturas:
  https://www.mercadopago.com.br/developers/pt/docs/subscriptions/how-tos/improve-payment-approval/reasons-for-rejection

## Decisão

- O adapter do Mercado Pago passa a capturar somente metadados seguros do erro:
  `status`, `status_detail`, `error` normalizado e `cause_codes`.
- O log público/sanitizado do gateway continua sem mensagens brutas do provedor, tokens, dados de
  cartão ou payload completo.
- O backend traduz `status_detail`/códigos conhecidos de recusa para chaves públicas próprias em
  PT-BR, retornando HTTP `402` para erros de cartão conhecidos ou 4xx do gateway durante a cobrança.
- Erros de credencial/configuração continuam como indisponibilidade de checkout (`503`), e falhas
  desconhecidas/5xx continuam genéricas (`502`).
- A mesma tradução segura é reutilizada no cadastro/troca de cartão da assinatura.

## Consequências

- O usuário recebe orientação acionável, como conferir CVV/validade, tentar outro cartão ou autorizar
  com o banco.
- A interface deixa de tratar recusa de cartão como falha de conexão.
- O admin e os logs permanecem protegidos contra vazamento de PII, segredo, payload bruto do gateway
  ou mensagens técnicas.
- Novos códigos do Mercado Pago que não estejam mapeados caem em uma mensagem segura de recusa de
  cartão quando forem 4xx durante cobrança; falhas operacionais seguem genéricas.

## Task relacionada

- Ajuste incremental da TASK-32 — Checkout de assinatura.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
