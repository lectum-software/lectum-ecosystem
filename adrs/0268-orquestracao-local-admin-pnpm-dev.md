# ADR-0268: Orquestração local do Admin no `pnpm dev`

## Status

Accepted

## Task relacionada

TASK-72

## Contexto

Durante a validação local do Admin, `http://localhost:3002/dashboard` podia ficar inacessível quando o desenvolvimento era iniciado apenas pelo comando raiz `pnpm dev`. O orquestrador local subia backend e frontend, mas não iniciava a aplicação Admin separada criada na TASK-46.

Como o repositório reúne as aplicações apenas para desenvolvimento, o comando raiz deve facilitar o ambiente local sem mudar o princípio de produção: backend, frontend e Admin continuam sendo aplicações separadas.

## Decisão

- O script raiz `scripts/dev.mjs` passa a iniciar o Admin em processo separado, por padrão em `http://localhost:3002`.
- A porta do Admin pode ser configurada por `ADMIN_PORT`.
- O Admin pode ser desativado no orquestrador raiz com `DEV_ADMIN_ENABLED=0`.
- O `pnpm check` raiz passa a incluir `pnpm --dir admin check`, evitando concluir alterações do painel sem validar Biome, ESLint e TypeScript do Admin.
- O proxy de tunnel existente continua direcionando rotas não-API para o frontend público; o Admin permanece uma aplicação local separada e não é mesclado ao frontend.

## Consequências

- Abrir `localhost:3002/dashboard` deixa de depender de lembrar um comando separado quando o ambiente é iniciado pela raiz.
- A separação entre aplicações em produção é preservada.
- O comando raiz fica mais exigente: falha se a porta Admin estiver ocupada, a menos que `ADMIN_PORT` seja ajustado ou `DEV_ADMIN_ENABLED=0` seja usado.
- Não há alteração de schema Prisma, migrations, endpoints, contratos de API ou packages.

## Validação

- `pnpm --dir admin check`
- `Invoke-WebRequest http://localhost:3002/dashboard` retornando 200 após iniciar `pnpm --dir admin dev`.

## Pendências

- Nenhuma.
