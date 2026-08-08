# Executar próxima task Lectum

Execute a próxima task pendente listada em `_product/tasks/README.md`.

Obrigatório:

1. Confirme a branch; se for `main`, pare e oriente o uso de `homolog`.
2. Leia `CLAUDE.md`, `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md`, `_product/tasks/PROTO-INVENTORY.md` e a task alvo.
3. Execute apenas uma task.
4. Use Builder MCP/Quick Copy quando disponível; use as imagens citadas de `_product/proto` como fallback auditável.
5. Não use mocks, dados fake permanentes ou endpoints simulados.
6. Reutilize a arquitetura existente antes de criar estrutura nova.
7. Registre ADRs relevantes.
8. Se alterar banco/schema/migrations, rode `pnpm --dir backend db:migrate`; se falhar por dados/estado preexistente, pergunte antes de resetar o banco de desenvolvimento.
9. Rode checks/builds.
10. Marque critérios concluídos.
11. Registre riscos de dados/env/rollout/rollback; env obrigatória nova exige alerta sem valor.
12. Faça commit e push somente em `homolog`, avisando que o push publica homologação.

Responda com task ID, arquivos alterados, ADRs, validações, commit hash e bloqueios reais.
