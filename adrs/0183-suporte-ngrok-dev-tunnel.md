# ADR-0183: Suporte a ngrok no tunnel de desenvolvimento

## Status

Accepted

## Data

2026-07-01

## Task relacionada

Solicitação operacional ad hoc para simplificar tunnel local do Mercado Pago sandbox.

## Contexto

O fluxo real de checkout Mercado Pago depende de URL pública HTTPS para retorno e webhook. A opção
Cloudflare Named Tunnel continua válida, mas exige domínio gerenciado na Cloudflare, DNS e arquivo de
configuração local. Para desenvolvimento individual, o ngrok reduz a fricção porque a conta fornece
um domínio de desenvolvimento e o CLI cria um endpoint HTTP para localhost com menos configuração.

O projeto já possui um proxy local em `scripts/dev.mjs` que roteia `/api`, `/socket.io`, `/docs` e
`/swagger` para o backend e o restante para o frontend. Portanto, o provider de tunnel só precisa
apontar para `DEV_TUNNEL_PROXY_PORT`, sem alterar arquitetura de frontend/backend.

## Decisão

Adicionar suporte a `DEV_TUNNEL_PROVIDER=ngrok` no `pnpm dev`, mantendo `cloudflared` como default.

Quando `DEV_TUNNEL_ENABLED=1`:

- `DEV_TUNNEL_PROVIDER=cloudflared` mantém o comportamento atual com quick tunnel ou Named Tunnel;
- `DEV_TUNNEL_PROVIDER=ngrok` executa `ngrok http http://127.0.0.1:${DEV_TUNNEL_PROXY_PORT}`;
- quando `DEV_TUNNEL_URL` estiver preenchida, o ngrok recebe `--url <DEV_TUNNEL_URL>`;
- `DEV_TUNNEL_NAME` permanece específico do Cloudflare e é ignorado pelo provider ngrok;
- ausência do CLI escolhido faz o `pnpm dev` falhar antes de iniciar a experiência incompleta.
- o frontend Next.js passa a preencher `allowedDevOrigins` automaticamente a partir das URLs
  públicas configuradas em `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_LOGIN_URL` e
  `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS`, evitando bloqueio de HMR/dev resources quando a aplicação é
  acessada pelo tunnel.

Não será instalado package no repositório. `ngrok` é uma dependência operacional externa do ambiente
do desenvolvedor, assim como `cloudflared`.

## Consequências

- O time pode escolher entre Cloudflare e ngrok apenas por `.env`, sem alterar código.
- O caminho do Mercado Pago continua real: URL pública, Card Payment Brick, checkout e webhook.
- Para URL fixa com ngrok, o desenvolvedor ainda precisa instalar o CLI, configurar `authtoken` e
  definir `DEV_TUNNEL_URL`, `MERCADO_PAGO_BACK_URL` e o webhook no painel do Mercado Pago.
- O script não cria conta, domínio nem authtoken do ngrok; falhas de configuração permanecem falhas.

## Validação

- `node --check scripts/dev.mjs`
- `pnpm --dir backend exec biome check --write ../scripts/dev.mjs`
- `DEV_TUNNEL_ENABLED=1 DEV_TUNNEL_PROVIDER=ngrok node scripts/dev.mjs` valida falha honesta quando
  o CLI ngrok não está instalado no ambiente atual.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
