# ADR-0176: Reset total seguro do banco de desenvolvimento

## Status

Accepted

## Data

2026-07-01

## Task relacionada

Solicitação operacional ad hoc do backend.

## Contexto

O desenvolvimento local do Lectum precisa de uma forma repetível de limpar totalmente o banco para
executar testes manuais e fluxos de desenvolvimento sem resíduos de dados anteriores. O projeto usa
Prisma 7 com PostgreSQL e já possui migrations versionadas em `backend/prisma/migrations`.

A operação é destrutiva e não deve ser confundida com resolução automática de conflitos de
migration. A regra do projeto continua valendo: durante tasks com alteração de schema/migrations,
se `prisma migrate dev` falhar por estado ou dados preexistentes, o reset não deve ser executado
automaticamente sem confirmação do usuário.

## Decisão

Criar o script backend `pnpm db:reset`, implementado por `backend/scripts/reset-database.mjs`, para
executar `prisma migrate reset --force` somente depois de validações de segurança e confirmação
explícita.

O script:

1. carrega `backend/.env` para obter `DATABASE_URL`;
2. bloqueia execução com `NODE_ENV=production`;
3. aceita apenas URLs PostgreSQL;
4. bloqueia alvos cujo host ou nome de banco pareçam produção (`prod`, `production`, `prd`);
5. permite por padrão apenas hosts locais, Docker ou redes privadas;
6. exige digitar `RESET` em execução interativa;
7. permite automação apenas com `pnpm db:reset -- --force` ou `LECTUM_CONFIRM_DB_RESET=1`, mantendo
   as validações de segurança;
8. permite bancos remotos descartáveis de desenvolvimento apenas com
   `LECTUM_ALLOW_NON_LOCAL_DB_RESET=1`.

## Consequências

- Desenvolvedores têm um comando único para apagar dados, recriar o schema e reaplicar todas as
  migrations Prisma.
- O script evita expor usuário/senha do banco nos logs e mostra apenas protocolo, host, porta e nome
  do database.
- A opção `--force` fica encapsulada atrás de validações locais para reduzir risco operacional.
- A política de não resetar automaticamente após falhas de `migrate dev` permanece inalterada.
- Nenhum package novo foi adicionado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Smoke de segurança com `NODE_ENV=production DATABASE_URL=postgresql://... pnpm --dir backend db:reset -- --force`, validando bloqueio antes de qualquer reset

## Pendências

- Não há pendências externas. O script não foi executado contra o banco real nesta alteração para
  evitar operação destrutiva durante a implementação.
