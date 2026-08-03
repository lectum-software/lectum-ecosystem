# ADR-0003: Gateway de pagamento — Mercado Pago (checkout transparente + assinaturas)

## Status

Accepted

## Task relacionada

TASK-31, TASK-32, TASK-33 (assinatura/checkout/gestão). Modelo e contrato em `_product/tasks/DATA-MODEL.md` › "Assinatura e cobrança". Decisão de papel/guarda em `adrs/0002-arquitetura-auth-roles.md`.

## Contexto

O PRD previa o Plano Profissional recorrente por R$ 9,90/mês, e a decisão direta de produto de 2026-08-03 atualizou o valor para R$ 29,90/mês. O cliente definiu o provedor: **Mercado Pago**. Requisitos do produto antes de implementar:

1. Checkout transparente (UX 100% no app, sem redirect/marca do provedor).
2. Não ficar preso ao gateway nem depender dele como fonte de verdade dos dados.
3. Arquitetura que permita trocar de gateway no futuro.

Pesquisa na doc do Mercado Pago (junho/2026) confirmou compatibilidade total, sem breaking change com o que o `DATA-MODEL.md` já modelava:

- **Checkout Bricks / Card Payment Brick**: formulário no nosso app; o SDK do MP tokeniza o cartão no browser (campos PAN/CVV em conformidade PCI) e devolve um `card_token`. O backend nunca recebe dado bruto de cartão.
- **API de Assinaturas (Preapproval)**: `POST /preapproval` com `card_token_id` cria assinatura recorrente transparente (`status: "authorized"`), com `auto_recurring` (frequency/frequency_type/transaction_amount/currency_id). Suporta com e sem plano associado.
- **Webhooks**: tópicos `subscription_preapproval`, `subscription_authorized_payment`, `payment`; autenticidade via header `x-signature` (`ts` + `v1` HMAC-SHA256 sobre manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`).

## Decisão

- Adotar **Mercado Pago** com **Checkout Transparente (Bricks)** para coleta/tokenização de cartão e **Preapproval** para a recorrência mensal.
- A integração fica **obrigatoriamente atrás de uma porta de domínio `PaymentGateway`** (ports & adapters). O domínio nunca importa o SDK do MP; só o `MercadoPagoAdapter` conhece o provedor. Trocar de gateway = novo adapter.
- A **fonte de verdade do entitlement** ("é Pro?") é o nosso banco (`professional_subscription.status`), atualizado por webhook — nunca uma chamada síncrona ao MP. Status do MP são **normalizados** para o nosso enum; o payload bruto fica em `payment_event` (idempotência por `@@unique([gateway, external_id])`).
- Cartão: persistimos apenas `payment_method.gateway_token` + dados de exibição (brand/last4/exp). **Nunca PAN/CVV.**
- Webhook `POST /api/public/billing/webhook` permanece público, autenticado por verificação de `x-signature` antes de processar.

Detalhes de campos, mapa de status e modo de integração estão em `DATA-MODEL.md` › "Assinatura e cobrança".

## Consequências

- Positivo: UX transparente; escopo PCI reduzido (tokenização client-side); independência de dados (nosso banco é autoritativo); troca de gateway viável sem reescrever regra de negócio.
- Trade-off: **card token não é portável entre gateways** — trocar de provedor exige re-tokenização (re-coletar cartão dos usuários ou migração gerenciada). O fluxo de troca deve prever isso; não há como "copiar" o token.
- Trade-off: **redundância ativa-ativa (dois gateways simultâneos) fica fora de escopo** — inviável de forma limpa por causa da não-portabilidade de token e desproporcional para o ticket. "Redundância" aqui = soberania de dados + portabilidade, não failover quente.
- Risco: dependência operacional do MP (PRD §18 já lista dependências externas como risco) — mitigado pela porta + dados próprios.
- Revisitar: ao adicionar Pix/boleto (fluxos próprios), ao introduzir um 2º adapter, ou se o MP alterar a API de Assinaturas.

## Validação

- Pesquisa confirmada na doc oficial do Mercado Pago (Assinaturas/Preapproval, Checkout Bricks, Webhooks `x-signature`), junho/2026.
- Sem breaking change: `professional_subscription`, `payment_method`, `payment_event` e `billing_address` do `DATA-MODEL.md` já comportam a integração.
- Implementação real e testes ocorrem em TASK-32/33, condicionados às credenciais MP.

## Pendências

- **Credenciais Mercado Pago** (access token + public key, sandbox e produção) — bloqueio operacional das TASK-32/33 até serem providas. Registrar em `_product/decisions.md` (TASK-03).
- Preço vigente do Plano Profissional: R$ 29,90/mês, sem período de teste, conforme `_product/decisions.md` e ADR-0406.
- Demais integrações (storage, CFP, WhatsApp, e-mail/SMS, push, LGPD, moderação) permanecem pendentes na TASK-03 / ADR-0004.
