# Lectum Backend

## Reset total do banco de desenvolvimento

Use somente em ambiente de desenvolvimento. O comando apaga todos os dados, recria o schema e
reaplica as migrations Prisma:

```bash
pnpm --dir backend db:reset
```

O script mostra o banco alvo e exige digitar `RESET`. Para automações locais/descartáveis:

```bash
pnpm --dir backend db:reset -- --force
```

As validações de segurança continuam ativas mesmo com `--force`: `NODE_ENV=production`, URLs que
pareçam produção e bancos não locais/remotos são bloqueados por padrão.
