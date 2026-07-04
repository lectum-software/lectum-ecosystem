# ADR 0208 - Alterar cartão com ação enxuta

- **Status:** Accepted
- **Data:** 2026-07-04

## Task relacionada

TASK-33 - Gestão de assinatura e cartão

## Contexto

A tela mobile-first `/app/professional/billing/card` já usava o Card Payment Brick real do Mercado Pago para re-tokenizar cartão de crédito, mas a composição visual mantinha elementos de baixa conversão para a ação principal: faixa informativa azul extensa, CTA secundário **Voltar para assinatura**, CTA manual **Atualizar assinatura** e botão do Brick com texto genérico **Pagar**.

O objetivo desta alteração é deixar claro que o fluxo não é uma nova compra, e sim a atualização do método de pagamento de uma assinatura existente.

## Decisão

Remover da tela de alteração de cartão:

- a faixa informativa azul com a copy sobre token temporário;
- o botão **Voltar para assinatura** do card lateral;
- o botão **Atualizar assinatura** do fim do formulário.

No bloco **Novo cartão de crédito**, substituir o ícone de confirmação por `CreditCard` de `lucide-react`. No Card Payment Brick, usar `customization.visual.texts.formSubmit = "Alterar cartão"`, recurso documentado pelo Mercado Pago para alteração de textos do Brick.

A integração segura permanece inalterada: o frontend recebe somente o token do Brick e envia ao backend `payment_type_id = credit_card`; PAN/CVV continuam restritos ao provedor.

## Consequências

- A tela passa a reforçar a ação correta: **Alterar cartão**, não **Pagar**.
- Menos CTAs competem com o envio do novo cartão.
- Não há package novo, mock, seed ou alteração de schema.
- A explicação de segurança fica menos explícita visualmente nessa tela, mas a garantia técnica permanece no uso do Card Payment Brick e na arquitetura já registrada da TASK-33.

## Validação

- Referência visual local consultada: `_product/proto/Alterar cartão de crédito.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- Documentação oficial Mercado Pago consultada para `customization.visual.texts.formSubmit`.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3106`: `/app/professional/billing/card` retornou `307` para login sem sessão, preservando a proteção da rota privada; `/auth/login` retornou `200`.

## Pendências

- Nenhuma pendência externa nova. A operação continua dependente da configuração real do Mercado Pago já exigida pelas tasks de billing.
