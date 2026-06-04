# Lectum Claude Code Instructions

Use este arquivo como memória de projeto para Claude Code.

## Contexto

- Este repositório reúne `backend/` e `frontend/` apenas para desenvolvimento local.
- Em produção, backend e frontend devem ser tratados como aplicações separadas.
- O produto Lectum é uma plataforma responsiva para psicólogos e pacientes.
- O desenvolvimento deve seguir spec-driven development: uma task por vez, com validação, ADR, commit e push.

## Fontes de Verdade

Leia antes de executar qualquer task:

1. `_product/tasks/README.md`
2. `_product/tasks/ARCHITECTURE.md`
3. `_product/tasks/PACKAGES.md`
4. `_product/tasks/PROTO-INVENTORY.md`
5. `_product/tasks/ROADMAP-REVALIDADO.md`
6. arquivo da task alvo em `_product/tasks/TASK-*.md`
7. `adrs/`

## Builder MCP

- O MCP de projeto está em `.mcp.json`.
- O Quick Copy ativo é `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
- O espaço Builder validado é `Lectum`, Space ID `01ea07af363545a1936f2baa569cd24c`.
- Use o Builder/Quick Copy como referência visual, não como arquitetura final.
- As imagens locais em `_product/proto` são fallback e referência auditável.
- Nunca aceite código gerado por Builder CLI sem adequar aos padrões de `ARCHITECTURE.md`.

## Regras Obrigatórias

- Não use mocks, dados fake permanentes ou endpoints simulados.
- Se faltar decisão externa, pare e registre bloqueio na task/ADR.
- Não use `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Antes de criar estrutura nova, procure padrões existentes no frontend/backend.
- Antes de instalar package novo, consulte `PACKAGES.md` e registre ADR.
- Formulários/campos de produto devem seguir `TASK-02`: React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`. Campos ocupam largura total; slot de erro com altura fixa (sem layout shift).
- Toda UI é **mobile-first** e explícita na execução (base ~390px dos protótipos).
- **Nunca use `<img>`**; sempre `Image` de `next/image`.
- Não crie design system, API client, auth guard, validator ou helper de resposta paralelo.
- Se mudar UI, valide com browser local além dos checks.
- Toda task que alterar `backend/prisma/schema.prisma` ou `backend/prisma/migrations` deve executar `pnpm --dir backend db:migrate` durante a task. O usuário não deve precisar aplicar migrations manualmente.
- Se `prisma migrate dev` falhar por dados ou estado preexistente no banco de desenvolvimento, pare e pergunte se pode resetar o banco antes de rodar comandos destrutivos como `pnpm --dir backend exec prisma migrate reset`.
- Toda task concluída deve gerar commit próprio e executar `git push` para publicar a branch/remoto correspondente. Se o push falhar por credenciais, rede ou permissão, reporte o bloqueio explicitamente.

## Validação

Use como baseline:

- raiz: `pnpm check`
- backend: `pnpm --dir backend check`
- backend build quando estrutural: `pnpm --dir backend build`
- backend com alteração de banco: `pnpm --dir backend db:migrate`
- frontend: `pnpm --dir frontend check`
- frontend build quando mudar rota/UI: `pnpm --dir frontend build`

## Execução

Para executar a próxima task no Claude Code, use a skill/comando de projeto:

- Skill: `.claude/skills/execute-lectum-task/SKILL.md`
- Comando legado: `.claude/commands/execute-next-lectum-task.md`

Ao final, responda com task executada, arquivos alterados, ADR, validações, commit, status do push e bloqueios reais.
