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
- `MERCADO_PAGO_ENV=sandbox` e `MERCADO_PAGO_ACCESS_TOKEN=TEST-...`.

As validações de segurança continuam ativas mesmo com `--force`: `NODE_ENV=production/prod`, URLs
que pareçam produção, bancos não locais/remotos, bucket R2 com nome de produção e token Mercado Pago
fora de sandbox são bloqueados por padrão.
