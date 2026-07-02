# ADR-0176: Reset total seguro do ambiente de desenvolvimento

## Status

Accepted

## Data

2026-07-01

## Task relacionada

Solicitação operacional ad hoc do backend.

## Contexto

O desenvolvimento local do Lectum precisa de uma forma repetível de limpar totalmente o ambiente
para executar testes manuais e fluxos de desenvolvimento sem resíduos de dados anteriores. O reset
apenas do PostgreSQL deixou lacunas após a integração real com Mercado Pago sandbox e Cloudflare R2:
assinaturas sandbox antigas continuavam existindo no gateway e arquivos públicos permaneciam no
bucket, criando estados fantasmas depois que o banco era recriado.

A operação é destrutiva e não deve ser confundida com resolução automática de conflitos de
migration. A regra do projeto continua valendo: durante tasks com alteração de schema/migrations,
se `prisma migrate dev` falhar por estado ou dados preexistentes, o reset não deve ser executado
automaticamente sem confirmação do usuário.

## Decisão

Evoluir o script backend `pnpm --dir backend reset`, implementado por
`backend/scripts/reset-database.mjs`, para limpar o ambiente real de desenvolvimento nesta ordem:

1. coletar referências locais de assinaturas/plano Mercado Pago antes de apagar o banco;
2. localizar assinaturas sandbox também por `MERCADO_PAGO_PREAPPROVAL_PLAN_ID` e pela query
   `LECTUM_RESET_MERCADO_PAGO_SEARCH_QUERY` nos status configurados;
3. cancelar as assinaturas Mercado Pago encontradas usando o SDK real e exigindo
   `MERCADO_PAGO_ENV=sandbox` + token `TEST-...` ou `APP_USR-...` validado como conta Mercado Pago
   de teste;
4. limpar os objetos publicados no bucket Cloudflare R2 configurado, opcionalmente limitado por
   `LECTUM_RESET_R2_PREFIX`;
5. executar `prisma migrate reset --force`, apagando o banco local e reaplicando migrations.

O script mantém e amplia as validações de segurança:

1. carrega `backend/.env` para obter credenciais e alvos;
2. bloqueia execução com `NODE_ENV=production/prod`;
3. aceita apenas URLs PostgreSQL;
4. bloqueia alvos cujo host ou nome de banco pareçam produção (`prod`, `production`, `prd`);
5. permite por padrão apenas hosts locais, Docker ou redes privadas para o banco;
6. bloqueia bucket/endpoint R2 com aparência de produção, salvo opt-in explícito
   `LECTUM_ALLOW_PRODUCTION_LIKE_R2_RESET=1`;
7. exige Mercado Pago sandbox com access token `TEST-*` ou, para o fluxo oficial de Subscriptions
   sandbox com conta vendedora de teste, `APP_USR-*` cuja conta retorne e-mail `@testuser.com` em
   `/users/me`;
8. exige digitar `RESET` em execução interativa;
9. permite automação apenas com `pnpm --dir backend reset -- --force` ou
   `LECTUM_CONFIRM_DB_RESET=1`, mantendo as validações de segurança;
10. oferece `--dry-run` para listar alvos e contagens sem apagar/cancelar/resetar.

O alias `pnpm --dir backend db:reset` continua existindo para compatibilidade e delega para
`pnpm reset` dentro do backend.

## Consequências

- Desenvolvedores têm um comando único para cancelar assinaturas sandbox, limpar R2, apagar dados,
  recriar o schema e reaplicar todas as migrations Prisma.
- O script evita expor usuário/senha do banco, credenciais R2 e token Mercado Pago nos logs.
- A opção `--force` fica encapsulada atrás de validações locais para reduzir risco operacional.
- A política de não resetar automaticamente após falhas de `migrate dev` permanece inalterada.
- O reset agora depende das credenciais sandbox reais de R2 e Mercado Pago; ausência de configuração
  falha antes de qualquer destruição.
- Nenhum package novo foi adicionado; foram usados `@aws-sdk/client-s3`, `pg` e `mercadopago` já
  instalados no backend.

## Validação

- `node --check backend/scripts/reset-database.mjs`
- `pnpm --dir backend reset -- --help`
- `pnpm --dir backend exec biome check --write package.json scripts/reset-database.mjs`
- `pnpm --dir backend reset -- --dry-run`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Atualizacao 2026-07-02

Durante a validação do checkout real de Subscriptions sandbox, as credenciais `TEST-*` da aplicação
principal passaram a ser substituídas por credenciais `APP_USR-*` de uma conta Mercado Pago de teste
vendedora, conforme exigência operacional do Mercado Pago para Preapproval com vendedor/comprador de
teste. O reset continuava bloqueando qualquer token que não começasse com `TEST-*`.

Decisão complementar:

- Manter `MERCADO_PAGO_ENV=sandbox` obrigatório.
- Continuar aceitando `TEST-*`.
- Aceitar `APP_USR-*` somente após validar o token em `GET /users/me` e confirmar que a conta é uma
  conta de teste (`email` com domínio `@testuser.com`).
- Bloquear qualquer outro `APP_USR-*` para evitar cancelar assinaturas de uma conta real.

Validação adicional:

- `node --check backend/scripts/reset-database.mjs`
- `pnpm --dir backend exec biome check --write scripts/reset-database.mjs`
- `pnpm --dir backend reset -- --dry-run` com `APP_USR-*` de conta vendedora de teste, retornando
  1 assinatura sandbox candidata a cancelamento sem executar alterações destrutivas.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Pendências

- O script não foi executado em modo destrutivo durante a implementação para evitar apagar recursos
  reais do ambiente do usuário. A validação operacional deve começar por
  `pnpm --dir backend reset -- --dry-run`.
