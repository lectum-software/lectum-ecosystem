# Executar próxima task Lectum

Execute a próxima task pendente listada em `_product/tasks/README.md`.

Obrigatório:

1. Leia `CLAUDE.md`, `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md`, `_product/tasks/PROTO-INVENTORY.md` e a task alvo.
2. Execute apenas uma task.
3. Use Builder MCP/Quick Copy quando disponível; use as imagens citadas de `_product/proto` como fallback auditável.
4. Não use mocks, dados fake permanentes ou endpoints simulados.
5. Reutilize a arquitetura existente antes de criar estrutura nova.
6. Registre ADRs relevantes.
7. Se alterar banco/schema/migrations, rode `pnpm --dir backend db:migrate`; se falhar por dados/estado preexistente, pergunte antes de resetar o banco de desenvolvimento.
8. Rode checks/builds.
9. Marque critérios concluídos.
10. Faça commit ao final.

Responda com task ID, arquivos alterados, ADRs, validações, commit hash e bloqueios reais.
