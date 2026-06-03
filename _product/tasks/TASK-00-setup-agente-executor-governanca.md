# TASK-00: Setup do agente executor e governança

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-00 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Foundation |
| Status | Completed |
| Dependências | Nenhuma |
| ADR alvo | ADR-0001 |

## Contexto

O Lectum será desenvolvido por usuários não-devs com apoio de IA. A execução precisa ser previsível: uma task por vez, sem mocks, com validação, ADR e commit. Esta task garante que o workspace esteja pronto para esse modo de trabalho.

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`
- `AGENTS.md`
- `CLAUDE.md`

## Objetivo

Configurar e validar o mecanismo de execução das próximas tasks, garantindo que o agente tenha regras claras e que o usuário possa pedir "execute a próxima task" sem conhecer comandos técnicos.

## Pré-requisitos e bloqueios

- O executor precisa estar na raiz `/Users/rezende/Desktop/lectum-ecosystem`.
- `pnpm` precisa estar disponível para validação.
- Se `pnpm check` falhar por erro pré-existente, registrar o erro antes de marcar a task como concluída.

## Escopo frontend

- Nenhuma tela ou componente de produto deve ser implementado.
- Apenas arquivos de instrução, prompts, MCP e documentação podem ser criados/validados.

## Escopo backend

- Nenhum módulo, endpoint, model Prisma ou helper de backend deve ser alterado.
- A validação backend nesta task é apenas `pnpm check`, para confirmar saúde do workspace.

## Escopo documental e tooling

- Confirmar existência de `AGENTS.md`.
- Confirmar existência de `.codex/skills/execute-lectum-task/SKILL.md`.
- Confirmar existência de `.codex/prompts/execute-next-lectum-task.md`.
- Confirmar existência de `.github/copilot-instructions.md`.
- Confirmar existência de `.github/instructions/*.instructions.md`.
- Confirmar existência de `.github/prompts/execute-next-lectum-task.prompt.md`.
- Confirmar existência de `CLAUDE.md`.
- Confirmar existência de `.claude/skills/execute-lectum-task/SKILL.md`.
- Confirmar existência de `.claude/commands/execute-next-lectum-task.md`.
- Confirmar existência de `.mcp.json`, `.vscode/mcp.json` e `.cursor/mcp.json`.
- Confirmar existência de `adrs/README.md`.
- Confirmar existência de `adrs/TEMPLATE.md`.
- Confirmar existência de `_product/tasks/TASK-TEMPLATE.md`.
- Confirmar existência de `_product/tasks/ARCHITECTURE.md`.
- Confirmar existência de `_product/tasks/PACKAGES.md`.
- Confirmar existência de `_product/tasks/PROTO-INVENTORY.md`.
- Confirmar existência de `_product/tasks/ROADMAP-REVALIDADO.md`.
- Confirmar existência de `.builderignore`, `.builderrules`, `frontend/.builderignore` e `frontend/.builder/rules/lectum-frontend.mdc`.
- Confirmar que `_product/tasks/README.md` lista a fila sequencial.
- Criar ADR inicial se ainda não existir.
- Rodar checks base para confirmar que o projeto está saudável antes das próximas tasks.

## Fora do escopo

- Implementar novas telas.
- Alterar banco de dados.
- Integrar gateway, storage, WhatsApp, e-mail ou CFP.

## Contrato técnico detalhado

Arquivos obrigatórios por ambiente:

- Codex: `.codex/instructions.md`, `.codex/config.toml`, `.codex/skills/execute-lectum-task/SKILL.md` e `.codex/prompts/execute-next-lectum-task.md`.
- GitHub/Copilot: `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` e `.github/prompts/execute-next-lectum-task.prompt.md`.
- Cursor: `.cursor/mcp.json` e regras compartilhadas do workspace.
- Claude Code: `CLAUDE.md`, `.claude/skills/execute-lectum-task/SKILL.md`, `.claude/commands/execute-next-lectum-task.md` e `.mcp.json`.

Critérios técnicos:

- A fila deve listar `TASK-00` a `TASK-34`.
- A referência visual ativa deve ser Builder/proto, não Figma.
- O executor deve ler `ARCHITECTURE.md`, `PACKAGES.md` e `PROTO-INVENTORY.md` antes de implementar.
- Nenhum ambiente deve incentivar mock, geração automática sem revisão ou uso direto da pasta `sample/`.
- O Builder MCP deve estar documentado como ferramenta visual, não como arquitetura final.
- Builder generation deve estar protegido por `.builderignore`, `.builderrules` e regras específicas do frontend.

## Estados obrigatórios

Esta task não possui interface. O estado verificável é documental/operacional:

- arquivos de instrução existem;
- MCP Builder está configurado para os clientes previstos;
- fila `TASK-00` a `TASK-34` está listada;
- checks base passam.

## Critérios de aceite

- [x] `AGENTS.md` existe e descreve regras de execução.
- [x] `.codex/skills/execute-lectum-task/SKILL.md` existe e contém workflow completo.
- [x] `.codex/prompts/execute-next-lectum-task.md` existe.
- [x] `.github/copilot-instructions.md` existe com regras resumidas.
- [x] `.github/instructions/` possui instruções segmentadas para frontend, backend e docs.
- [x] `.github/prompts/execute-next-lectum-task.prompt.md` existe.
- [x] `CLAUDE.md` existe com instruções de projeto para Claude Code.
- [x] `.claude/skills/execute-lectum-task/SKILL.md` existe.
- [x] `.claude/commands/execute-next-lectum-task.md` existe.
- [x] `.mcp.json`, `.vscode/mcp.json` e `.cursor/mcp.json` existem com Builder MCP.
- [x] `adrs/0001-spec-driven-task-execution.md` existe.
- [x] `adrs/TEMPLATE.md` existe.
- [x] `_product/tasks/TASK-TEMPLATE.md` existe.
- [x] `_product/tasks/ARCHITECTURE.md` existe.
- [x] `_product/tasks/PACKAGES.md` existe.
- [x] `_product/tasks/PROTO-INVENTORY.md` existe.
- [x] `_product/tasks/ROADMAP-REVALIDADO.md` existe.
- [x] `.builderignore`, `.builderrules`, `frontend/.builderignore` e `frontend/.builder/rules/lectum-frontend.mdc` existem.
- [x] `_product/tasks/README.md` lista todas as tasks de `TASK-00` a `TASK-34` em ordem.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] `pnpm check` executa sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm check`

## Evidências de execução

- Arquivos obrigatórios auditados sem ausências.
- `.github/instructions/` contém `backend.instructions.md`, `frontend.instructions.md` e `product-docs.instructions.md`.
- `_product/tasks/README.md` lista 35 tasks contínuas, de `TASK-00` a `TASK-34`.
- Builder CLI autenticado no espaço `Lectum`.
- `pnpm check` executado sem erros.

## Notas para executor

Esta task deve ser executada antes de qualquer implementação de produto. Se algum ambiente de IA não reconhecer sua configuração automaticamente, registre a limitação, mas mantenha os arquivos versionados para uso futuro.
