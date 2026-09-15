# Lectum Claude Code Instructions

Use este arquivo como memória de projeto para Claude Code.

## Contexto

- Este repositório reúne `backend/`, `frontend/`, `admin/` e `video/` apenas para desenvolvimento local.
- Em produção, as quatro aplicações devem ser tratadas separadamente.
- O produto Lectum é uma plataforma responsiva para psicólogos e pacientes.
- O desenvolvimento deve seguir spec-driven development: uma task por vez, com validação, ADR, commit e push.

## Homologação e produção ativas

- Desde **2026-08-07**, os dois ambientes são publicados e podem conter dados reais.
- `homolog` dispara deploy automático de homologação; `main` dispara deploy automático de produção.
- Trabalhe sempre em `homolog`. Se estiver em `main`, pare e peça ao usuário para mudar de branch antes de alterar ou publicar código.
- Não faça commit/push direto em `main`; produção só recebe merge revisado após smoke test em homologação.
- Quando o usuário pedir explicitamente para colocar em produção, use `gh` para criar/reutilizar PR `homolog` → `main`, aguarde checks, faça o merge sem excluir `homolog` e valide produção. Não delegue o merge ao usuário salvo bloqueio real de acesso.
- Não resete, semeie destrutivamente ou limpe dados/buckets em ambientes publicados.
- Banco deve evoluir por expandir → backfill retomável → contrair. Não crie coluna obrigatória sem compatibilidade com dados existentes e nunca edite migration aplicada.
- Nova env obrigatória exige **ALERTA DE DEPLOY** com chave, app, ordem de provisionamento e impacto se ausente; nunca mostre o valor. Prefira env opcional com fallback seguro no primeiro deploy.
- Preserve compatibilidade entre versões durante rollout e não exponha detalhes técnicos, PII ou segredos em UI, HTTP ou logs.

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
- O espaço Builder validado é `Lectum`; identificadores operacionais não são versionados.
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
- O push deve ser feito em `homolog` e informado como início de deploy automático; valide o ambiente antes de qualquer solicitação de promoção.
- Antes de cada novo commit criado por agente, rode uma única vez `pnpm version:bump`, inclua os cinco `package.json` sincronizados e valide `pnpm check:version`. Não faça novo bump apenas porque uma tentativa do mesmo commit falhou.
- Backend expõe versão em `/ping`; frontend, admin e video expõem `/version` publicamente, sem cache, noindex e sem links de navegação/sitemap.

## Validação

Use como baseline:

- raiz: `pnpm check`
- backend: `pnpm --dir backend check`
- backend build quando estrutural: `pnpm --dir backend build`
- backend com alteração de banco: `pnpm --dir backend db:migrate`
- frontend: `pnpm --dir frontend check`
- frontend build quando mudar rota/UI: `pnpm --dir frontend build`
- admin: `pnpm --dir admin check`
- admin build quando mudar rota/UI: `pnpm --dir admin build`
- video: `pnpm --dir video check` e `pnpm --dir video build`

## Execução

Para executar a próxima task no Claude Code, use a skill/comando de projeto:

- Skill: `.claude/skills/execute-lectum-task/SKILL.md`
- Comando legado: `.claude/commands/execute-next-lectum-task.md`

Ao final, responda com task executada, arquivos alterados, ADR, validações, commit, status do push e bloqueios reais.
