# Lectum Ecosystem

Este repositório reúne `backend/`, `frontend/` e `admin/` apenas para desenvolvimento local. Nos
ambientes publicados, trate as três aplicações e seus deploys separadamente.

## Ambientes publicados

- Desde **07/08/2026**, homologação e produção podem conter dados reais.
- Push em `homolog` publica homologação automaticamente.
- Merge/push em `main` publica produção automaticamente.
- Desenvolvimento e commits devem ocorrer em `homolog`; push direto em `main` é bloqueado.
- Só promova para `main` depois de checks, builds e smoke test em homologação.
- Ao pedir para um agente **colocar em produção**, ele deve abrir/reutilizar PR `homolog` → `main`,
  aguardar checks, fazer o merge e validar produção; o usuário não precisa trocar para `main`.
- Nunca execute reset, seed destrutivo, `db push` ou limpeza de storage em ambiente publicado.

As regras completas de banco, env e rollout estão em
[`_product/tasks/ARCHITECTURE.md`](_product/tasks/ARCHITECTURE.md). O resumo da auditoria atual está
em [`_product/AUDITORIA-CORRECOES-2026-08-07.md`](_product/AUDITORIA-CORRECOES-2026-08-07.md).

## Versão publicada

Cada commit criado por agente incrementa e sincroniza a versão dos quatro `package.json`. O hook de
commit impede publicação sem bump. Para preparar manualmente um novo commit:

```bash
pnpm version:bump
pnpm check:version
```

Não execute o bump novamente ao apenas corrigir e repetir uma tentativa falha do mesmo commit.

Depois do deploy, consulte:

- backend: `GET /ping`;
- frontend: `GET /version`;
- admin: `GET /version`.

As rotas `/version` são públicas somente para verificação interna, sem cache, noindex e sem links na
interface ou sitemap.

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
MERCADO_PAGO_BACK_URL=https://seu-dev-domain.ngrok-free.dev/app/profissional/assinatura/endereco
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
MERCADO_PAGO_BACK_URL=https://lectum-dev.seudominio.com/app/profissional/assinatura/endereco
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

- crie uma conta Mercado Pago **vendedora de teste**, entre nela e crie a aplicação usada pela
  Lectum;
- frontend e backend usam, respectivamente, a Public Key e o Access Token `APP_USR-*` dessa mesma
  aplicação; credenciais `TEST-*` com `X-scope: stage` não pertencem a este fluxo;
- o backend mantém `MERCADO_PAGO_ENV=sandbox` e valida em `/users/me` que o token pertence a um
  usuário marcado como `test_user`, impedindo uso acidental da conta vendedora real;
- `MERCADO_PAGO_SANDBOX_PAYER_EMAIL` e
  `NEXT_PUBLIC_MERCADO_PAGO_SANDBOX_PAYER_EMAIL` são obrigatórios e devem conter o mesmo e-mail da
  conta Mercado Pago **compradora de teste**;
- o checkout usa assinatura com plano associado; deixe `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` vazio
  para o backend criar e persistir o plano da conta vendedora configurada;
- configure a URL de webhook na aba **Modo de produção** da aplicação da conta vendedora de teste,
  pois esse ambiente usa as credenciais `APP_USR-*` da própria conta;
- não há plano sem template, fallback de aprovação, retry especulativo nem mock.

Se uma configuração obrigatória estiver ausente ou inválida, o checkout deve retornar erro de
configuração em vez de contornar o fluxo.
