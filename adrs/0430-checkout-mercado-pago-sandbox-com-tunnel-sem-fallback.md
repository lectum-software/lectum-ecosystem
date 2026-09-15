# ADR-0430: Checkout Mercado Pago sandbox com tunnel e sem fallback local

## Status

Accepted for tunnel/no-fallback; credential and payer details superseded by
[ADR-0417](0417-restauracao-sandbox-mercado-pago-conta-vendedora-teste.md)

## Data

2026-07-01

## Task relacionada

Limpeza operacional do fluxo Mercado Pago local/sandbox após validação manual do checkout.

## Contexto

Durante os testes locais sem tunnel, foram adicionados caminhos auxiliares para lidar com limitações do ambiente local: fallback para preapproval pendente, retry de e-mail do pagador, script manual de sincronização e variáveis de pagador de teste. Esses caminhos destravaram a investigação sem mocks, mas aumentavam a distância entre desenvolvimento local e a experiência real do produto.

A decisão de produto agora é testar o fluxo local como sandbox real com tunnel público, deixando falhas de configuração e falhas do gateway aparecerem como falhas. Ausência de URL pública, webhook ou credenciais deve bloquear o fluxo em vez de acionar contornos locais.

## Decisão

1. Remover o fallback sandbox para assinatura pendente sem `card_token_id`.
2. Remover o retry de `payer_email` com variável de teste e usar sempre o e-mail autenticado do usuário Lectum.
3. Remover o script `billing:sync`; reconciliação deve acontecer por webhook real do Mercado Pago.
4. Remover envs frontend/backend de pagador de teste e remover `return_url` enviado pelo frontend no checkout; a URL de retorno do gateway passa a vir apenas de `MERCADO_PAGO_BACK_URL`.
5. Exigir `MERCADO_PAGO_BACK_URL` HTTPS e público; `localhost`, `127.0.0.1` e URL ausente geram erro de configuração.
6. Remover o header sandbox customizado `X-scope: stage`; o adapter usa o SDK Mercado Pago com as credenciais configuradas.
7. Estender `pnpm dev` para iniciar, quando configurado, um proxy local e um Cloudflare Tunnel:
   - `/api/*`, `/socket.io/*`, `/docs*` e `/swagger*` para backend;
   - demais rotas para frontend.
8. Suportar URL fixa por Cloudflare Named Tunnel configurado fora do repositório (`DEV_TUNNEL_NAME` + `DEV_TUNNEL_URL`). Sem named tunnel, o Cloudflare gera URL temporária.
9. Sincronizar `.env` e `.env.example` de backend/frontend com as chaves realmente usadas pelo projeto, removendo chaves obsoletas de teste.

## Consequências

- O ambiente local fica mais próximo do fluxo real: Card Payment Brick, criação de assinatura autorizada e webhook assinado.
- Falhas de credencial, URL pública, card token, sandbox ou webhook passam a ser tratadas como falhas reais.
- Para uma URL estável no Mercado Pago, é necessário configurar externamente um Cloudflare Named Tunnel/DNS apontando para `DEV_TUNNEL_PROXY_PORT`.
- O fluxo sem tunnel deixa de ter reconciliação manual por script; isso é intencional para evitar caminhos paralelos ao produto.
- Não houve instalação de pacote novo.

## Validação

- `node --check scripts/dev.mjs`
- `pnpm --dir backend exec biome check --write ../scripts/dev.mjs ../README.md`
- `pnpm --dir backend biome:fix`
- `pnpm --dir frontend biome:fix`
- `cloudflared --version`
- Comparação segura de chaves `.env` vs `.env.example` no backend e frontend, sem imprimir valores.
- Varredura das chaves `process.env`/`envValue` ativas fora de `sample/`, sem chaves ausentes nos examples.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
