# ADR-0454: CSP do CardPayment no checkout profissional

## Status

Accepted

## Data

2026-08-13

## Contexto

Na tela `/app/profissional/assinatura/pagamento`, o usuário via o resumo **Cartão de crédito**,
mas os campos seguros do Card Payment Brick não apareciam. A rota já usava o componente real
`CardPayment` do SDK React do Mercado Pago e não coletava PAN/CVV diretamente.

A causa mais provável era operacional/frontend: a política CSP permitia o SDK principal em
`sdk.mercadopago.com` e chamadas/frames Mercado Pago, mas não incluía todos os assets dinâmicos do
Brick servidos em `http2.mlstatic.com` e `api-static.mercadopago.com`. Quando esse carregamento
externo falha, o SDK React pode deixar apenas o container do Brick vazio, sem fallback visual
suficiente para o usuário.

## Decisão

- Manter o Card Payment Brick como única forma de coletar dados de cartão no checkout profissional.
- Centralizar em `frontend/next.config.ts` as fontes CSP usadas pelo Mercado Pago e incluir
  `https://http2.mlstatic.com` e `https://api-static.mercadopago.com` nas diretivas necessárias ao
  Brick.
- Preservar `frame-src`/`connect-src` para os domínios Mercado Pago/Mercado Livre já usados pelo fluxo.
- Na UI do checkout, exibir estado **Carregando campos seguros do cartão** enquanto o Brick monta.
- Se os campos não ficarem prontos dentro do timeout ou o provider sinalizar erro, mostrar mensagem
  pública em PT-BR com ação **Tentar novamente**, sem detalhes técnicos do provider.

## Consequências

- O checkout pago e o checkout de cartão futuro continuam usando tokenização real no provider.
- Nenhum novo package, variável de ambiente, migration, endpoint, mock ou dado artificial foi criado.
- O frontend fica mais explícito para falhas externas: em vez de um bloco vazio, o usuário recebe
  feedback e pode remontar o Brick.
- Rollback é seguro no frontend: reverter esta decisão remove as fontes CSP adicionais e o fallback
  visual, sem alterar assinatura, webhook, banco ou contrato de API.

## Validação

- `pnpm --dir frontend exec biome check --write next.config.ts src/app/app/professional/billing/checkout/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start --port 3118`: `/app/profissional/assinatura/pagamento` retornou `307`
  para login sem sessão e enviou CSP contendo as fontes Mercado Pago/MLStatic necessárias ao Brick.
- `pnpm check`
- `pnpm check:version` após `pnpm version:bump`, confirmando `0.1.92`.
