# Lectum Backend

## Reset total do ambiente de desenvolvimento

Use somente em ambiente de desenvolvimento/sandbox. O comando limpa os recursos reais do ambiente
local e, por fim, recria o banco reaplicando as migrations Prisma:

1. cancela assinaturas sandbox do Mercado Pago vinculadas ao ambiente Lectum;
2. remove arquivos publicados no bucket Cloudflare R2 configurado;
3. executa `prisma migrate reset --force`, apagando os dados locais e reaplicando as migrations.

```bash
pnpm --dir backend reset
```

O alias legado também funciona:

```bash
pnpm --dir backend db:reset
```

O script mostra os alvos e exige digitar `RESET`. Para automações locais/descartáveis:

```bash
pnpm --dir backend reset -- --force
```

Para conferir alvos e contagens sem apagar nada:

```bash
pnpm --dir backend reset -- --dry-run
```

Configurações obrigatórias em `backend/.env`:

- `DATABASE_URL` apontando para banco local/privado de desenvolvimento;
- `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`,
  `CLOUDFLARE_R2_ACCESS_KEY_SECRET`, `CLOUDFLARE_R2_PUBLIC_BUCKET_NAME`;
- `MERCADO_PAGO_ENV=sandbox` e `MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...` da aplicação criada dentro
  de uma conta Mercado Pago vendedora de teste.

As validações de segurança continuam ativas mesmo com `--force`: `NODE_ENV=production/prod`, URLs
que pareçam produção, bancos não locais/remotos, bucket R2 com nome de produção e conta Mercado
Pago sem a marca `test_user` são bloqueados por padrão.

## Docker do backend

O Dockerfile do backend deve ser buildado usando `backend/` como contexto, mantendo frontend/admin como apps separadas:

```bash
docker build -t lectum-backend ./backend
```

A imagem usa `PORT=3001` apenas como padrão. Para homologação/produção, configure `PORT` nas envs do runtime da aplicação; se a plataforma depender do metadata `EXPOSE`, passe também `--build-arg PORT=<porta>` no build.

Ao iniciar, o container executa `prisma migrate deploy` antes de subir a API. Esse comportamento é controlado por `RUN_DB_MIGRATIONS` e vem ativo por padrão; defina `RUN_DB_MIGRATIONS=false` apenas se o deploy já executar as migrations em um job/comando separado. Como o projeto usa Prisma 7 com `datasource.url` em `prisma.config.ts`, esse arquivo também é copiado para a imagem final.

O build usa uma `DATABASE_URL` dummy apenas para `prisma generate`; a imagem de produção exige as envs reais em runtime, principalmente:

- `DATABASE_URL`
- `RUN_DB_MIGRATIONS`
- `JWT_SECRET_KEY`
- `ADMIN_JWT_SECRET`
- `PORT`
- `BASE`
- `WEB_URL`
- `GOOGLE_CLIENT_ID_API_USER`
- `GOOGLE_CLIENT_SECRET_API_USER`
- `CALLBACK_URL_API_USER`

Exemplo de smoke local sem acessar banco nas rotas de health:

```bash
docker run --rm -p 3001:3001 \
  -e PORT=3001 \
  -e RUN_DB_MIGRATIONS=false \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/lectum" \
  -e JWT_SECRET_KEY="change-me-with-a-strong-32-characters-minimum-secret" \
  -e ADMIN_JWT_SECRET="change-me-with-a-different-strong-admin-secret" \
  -e BASE="http://localhost:3001" \
  -e WEB_URL="http://localhost:3000" \
  -e GOOGLE_CLIENT_ID_API_USER="docker-smoke-client-id" \
  -e GOOGLE_CLIENT_SECRET_API_USER="docker-smoke-client-secret" \
  -e CALLBACK_URL_API_USER="http://localhost:3000/auth/redirect" \
  lectum-backend
```

Por padrão a imagem define `SWAGGER=false`. Para expor a documentação em produção, habilite `SWAGGER=true` conscientemente e garanta que `BASE` aponte para a URL pública correta.
