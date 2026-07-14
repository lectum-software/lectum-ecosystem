# Lectum Ecosystem

Este repositório reúne `backend/` e `frontend/` apenas para desenvolvimento local. Em produção,
trate as aplicações separadamente.

## Desenvolvimento local

```bash
pnpm dev
```

O comando sobe:

- backend em `PORT` definido em `backend/.env` (padrão `3001`);
- frontend em `FRONTEND_PORT` definido em `backend/.env` (padrão `3000`);
- admin em `ADMIN_PORT` definido no ambiente ou em `admin/.env.local` (padrão `3002`);
- opcionalmente, um tunnel Cloudflare ou ngrok quando `DEV_TUNNEL_ENABLED=1`.

Para rodar só backend + frontend sem o painel administrativo, defina `DEV_ADMIN_ENABLED=0`.

## Tunnel local para integrações externas

O tunnel existe para testar integrações reais que precisam chamar sua máquina, como webhooks do
Mercado Pago. Não há fallback local para assinatura: se o Mercado Pago não conseguir criar a
assinatura ou entregar o webhook, o fluxo deve falhar e ser corrigido por configuração.

### Cloudflare rápido, URL temporária

Com `DEV_TUNNEL_ENABLED=1`, `DEV_TUNNEL_PROVIDER=cloudflared` e `DEV_TUNNEL_NAME` vazio,
`pnpm dev` executa:

```bash
cloudflared tunnel --url http://127.0.0.1:${DEV_TUNNEL_PROXY_PORT}
```

O Cloudflare gera uma URL temporária a cada execução. Esse modo serve para validar conectividade,
mas exige atualizar URLs no Mercado Pago sempre que a URL mudar.

### ngrok com Dev Domain fixo

Para uma configuração local mais simples, use o ngrok com o Dev Domain da sua conta:

```bash
# Instalar CLI no macOS
brew install ngrok

# Configurar authtoken uma vez na máquina
ngrok config add-authtoken <seu-authtoken>
```

Depois configure em `backend/.env`:

```env
DEV_TUNNEL_ENABLED=1
DEV_TUNNEL_PROVIDER=ngrok
DEV_TUNNEL_PROXY_PORT=3005
DEV_TUNNEL_URL=https://seu-dev-domain.ngrok-free.dev
WEB_URL=http://localhost:3000,https://seu-dev-domain.ngrok-free.dev
MERCADO_PAGO_BACK_URL=https://seu-dev-domain.ngrok-free.dev/app/professional/billing/address
```

E, quando quiser acessar o frontend pelo próprio tunnel e manter chamadas same-origin via proxy,
configure em `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=https://seu-dev-domain.ngrok-free.dev
NEXT_PUBLIC_LOGIN_URL=https://seu-dev-domain.ngrok-free.dev/api/public/google/login
```

No painel do Mercado Pago, configure o webhook para:

```text
https://seu-dev-domain.ngrok-free.dev/api/public/billing/webhook
```

### URL fixa com Cloudflare Named Tunnel

Para evitar trocar URLs no Mercado Pago, crie e configure um Cloudflare Named Tunnel fora do repo,
apontando o hostname fixo para o proxy local:

```bash
# 1. Instalar CLI no macOS
brew install cloudflared

# 2. Autenticar na conta Cloudflare que gerencia o domínio
cloudflared tunnel login

# 3. Criar o tunnel fixo
cloudflared tunnel create lectum-dev

# 4. Criar o DNS para o hostname escolhido
cloudflared tunnel route dns lectum-dev lectum-dev.seudominio.com
```

```yaml
# ~/.cloudflared/config.yml ou equivalente
tunnel: <id-ou-nome-do-tunnel>
credentials-file: /caminho/para/<id>.json
ingress:
  - hostname: lectum-dev.seudominio.com
    service: http://127.0.0.1:3005
  - service: http_status:404
```

Valide a configuração local antes de depender dela no Mercado Pago:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://lectum-dev.seudominio.com/api/public/billing/webhook
```

Depois configure em `backend/.env`:

```env
DEV_TUNNEL_ENABLED=1
DEV_TUNNEL_PROVIDER=cloudflared
DEV_TUNNEL_PROXY_PORT=3005
DEV_TUNNEL_NAME=<nome-do-tunnel>
DEV_TUNNEL_URL=https://lectum-dev.seudominio.com
WEB_URL=http://localhost:3000,https://lectum-dev.seudominio.com
MERCADO_PAGO_BACK_URL=https://lectum-dev.seudominio.com/app/professional/billing/address
```

E, quando quiser acessar o frontend pelo próprio tunnel e manter chamadas same-origin via proxy,
configure em `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=https://lectum-dev.seudominio.com
NEXT_PUBLIC_LOGIN_URL=https://lectum-dev.seudominio.com/api/public/google/login
```

No painel do Mercado Pago, configure o webhook para:

```text
https://lectum-dev.seudominio.com/api/public/billing/webhook
```

Ative os tópicos de assinatura necessários, especialmente `subscription_preapproval` e
`subscription_authorized_payment`.

O proxy local roteia:

- `/api/*`, `/socket.io/*`, `/docs*`, `/swagger*` para o backend;
- demais rotas para o frontend.

## Mercado Pago local/sandbox

O fluxo local deve permanecer o mais próximo possível da experiência real:

- o frontend usa o Card Payment Brick real com `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`;
- o backend usa `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_ENV=sandbox`,
  `MERCADO_PAGO_WEBHOOK_SECRET` e `MERCADO_PAGO_BACK_URL`;
- o e-mail do pagador é sempre o e-mail autenticado do usuário Lectum;
- não há payer de teste via env, assinatura pendente automática, sync manual ou mock de aprovação.

Se uma configuração obrigatória estiver ausente ou inválida, o checkout deve retornar erro de
configuração em vez de contornar o fluxo.
