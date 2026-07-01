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

## Sincronizar assinatura Mercado Pago no sandbox local

Quando o webhook do Mercado Pago não puder chegar ao backend local, use o script abaixo depois de
concluir o checkout sandbox. Ele consulta o Mercado Pago real pelo `gateway_subscription_id` salvo no
banco e sincroniza `professional_subscription.status`/`current_period_end` sem criar mock ou aprovar
manualmente.

```bash
pnpm --dir backend billing:sync -- --psychologist-email psi@example.com
```

Também é possível mirar diretamente a assinatura local ou o id de preapproval do Mercado Pago:

```bash
pnpm --dir backend billing:sync -- --subscription-id <professional_subscription.id>
pnpm --dir backend billing:sync -- --gateway-subscription-id <mp-preapproval-id>
```

Para conferir antes de atualizar o banco:

```bash
pnpm --dir backend billing:sync -- --psychologist-email psi@example.com --dry-run
```

O script é restrito a desenvolvimento/sandbox: bloqueia `NODE_ENV=production/prod` e exige
`MERCADO_PAGO_ENV=sandbox`.
