# ADR-0174: Gestao de assinatura e cartao com Mercado Pago

## Status

Aceita

## Contexto

A TASK-33 exige que psicologos visualizem a assinatura atual e alterem o cartao com gateway real. O metodo de pagamento e sensivel: a Lectum nao pode armazenar PAN, CVV nem dados completos de cartao. A TASK-32 ja definiu Mercado Pago como gateway de assinatura via PreApproval, com webhook publico autenticado por `x-signature`.

O Builder Quick Copy ativo nao ficou disponivel neste ambiente de execucao. As referencias visuais locais consultadas foram:

- `_product/proto/Minhas Assinatura - Psicologo.jpg`
- `_product/proto/Alterar cartao de credito.jpg`
- `_product/proto/Cartao Alterado com Sucesso.jpg`

## Decisao

1. Criar as rotas privadas de psicologo:
   - `GET /api/private/psychologist/billing/subscription`
   - `POST /api/private/psychologist/billing/payment-method/session`
2. Proteger as rotas no mount de `write.ts` com `requireRole("psicologo")`, mantendo o webhook publico em `/api/public/billing/webhook` com autenticacao por assinatura do gateway.
3. Reutilizar a porta `PaymentGateway` e o `MercadoPagoAdapter`, adicionando `updateSubscriptionCard` para atualizar o cartao do PreApproval real com `card_token_id` gerado pelo Card Payment Brick.
4. Manter o MVP restrito a cartao de credito. Debito e pre-pago sao bloqueados no frontend e no backend.
5. Criar a tabela `payment_methods` para persistir somente referencia segura do gateway e dados de exibicao: `gateway_token`, `brand`, `last4`, `exp_month`, `exp_year`. O `gateway_token` representa a referencia gerenciada pelo provedor para a assinatura, nao PAN/CVV nem token efemero de cartao.
6. Nao criar historico de cobrancas fake. A tela mostra apenas dados reais da assinatura e do metodo de pagamento disponiveis no banco/gateway.
7. Reutilizar o webhook da TASK-32 para registrar eventos reais e normalizar o status da assinatura apos notificacoes do Mercado Pago.

## Consequencias

- A Lectum continua fora do escopo de armazenamento de dados completos de cartao.
- A troca de cartao depende de uma assinatura profissional vinculada ao Mercado Pago; assinaturas gratuitas ou de cortesia nao exibem alteracao de cartao.
- A tela de assinatura pode ser usada como destino central de upgrade e gestao, substituindo links antigos para `/app/professional/billing/subscription`.
- A confirmacao visual de cartao alterado ocorre apos retorno positivo do adapter real. O status de assinatura segue confirmado pelo webhook assinado do gateway.
- Quando houver necessidade de historico de pagamentos, sera necessario integrar uma leitura real de cobrancas/eventos do gateway antes de expor essa secao.
