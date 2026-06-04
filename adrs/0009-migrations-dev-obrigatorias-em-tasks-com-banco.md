# ADR-0009: Migrations dev obrigatorias em tasks com alteracao de banco

## Status

Accepted

## Task relacionada

Regra transversal de execucao para todas as tasks que alterem banco, schema Prisma ou migrations.

## Contexto

O Lectum sera executado por usuarios nao-devs com apoio de agentes de IA. Quando uma
task altera `backend/prisma/schema.prisma` ou cria/altera migrations, deixar a aplicacao
apenas com o arquivo de migration commitado nao basta: o usuario nao deve precisar saber
qual comando aplicar no banco local/de desenvolvimento.

Tambem ha risco de o banco de desenvolvimento conter dados ou estado preexistente que
quebrem uma migration. Como reset de banco e destrutivo, mesmo em desenvolvimento, ele
precisa de confirmacao explicita do usuario.

## Decisao

- Toda task que alterar `backend/prisma/schema.prisma` ou `backend/prisma/migrations`
  deve executar `pnpm --dir backend db:migrate` durante a propria task.
- `pnpm --dir backend db:migrate` passa a ser validacao obrigatoria adicional para
  alteracoes de banco, alem de `check`/`build`.
- Se `prisma migrate dev` falhar por conflito com dados ou estado preexistente do banco
  de desenvolvimento, o agente deve parar, explicar o erro e perguntar se pode resetar o
  banco antes de executar comandos destrutivos.
- Comandos destrutivos, como `pnpm --dir backend exec prisma migrate reset`, nunca devem
  ser executados automaticamente.

## Consequencias

- O usuario nao-dev nao fica responsavel por aplicar migrations manualmente.
- Tasks que mudam banco so podem ser concluidas depois de validar que a migration foi
  aplicada ou depois de registrar bloqueio real.
- Reset de banco continua permitido em ambiente de desenvolvimento, mas apenas com
  autorizacao explicita do usuario.

## Validacao

- Regra adicionada em `AGENTS.md`, `CLAUDE.md`, prompts/skills Codex e Claude, instrucoes
  GitHub/Copilot, `ARCHITECTURE.md`, `README.md` das tasks e `TASK-TEMPLATE.md`.
- A migration da TASK-04 foi verificada com `pnpm --dir backend db:migrate`, que retornou
  `Already in sync`.
