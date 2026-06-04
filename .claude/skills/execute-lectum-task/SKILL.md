---
name: execute-lectum-task
description: Execute uma task Lectum de ponta a ponta usando Builder/proto, arquitetura existente, ADR, validação, commit e push.
---

# Execute Lectum Task

Use esta skill no Claude Code quando o usuário pedir para executar a próxima task, continuar o desenvolvimento Lectum ou executar uma task específica de `_product/tasks`.

## Workflow Obrigatório

1. Ler `CLAUDE.md`, `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md`, `_product/tasks/PROTO-INVENTORY.md`, `_product/tasks/ROADMAP-REVALIDADO.md` e o arquivo da task alvo.
2. Confirmar dependências da task.
3. Se houver UI, identificar imagens de `_product/proto` citadas na task.
4. Usar Builder MCP/Quick Copy quando disponível no cliente Claude Code.
5. Se Builder MCP não estiver disponível no cliente, usar as imagens locais citadas na task e registrar a limitação.
6. Verificar requisitos externos: pagamento, storage, e-mail, WhatsApp/SMS, CFP, OAuth, push e LGPD.
7. Se faltar requisito externo, parar e registrar bloqueio em task/ADR.
8. Mapear arquivos existentes antes de criar estrutura nova:
   - frontend: `src/api/req`, `src/api/callers`, `src/api/cache/keys.ts`, `src/templates`, `src/registry/new-york-v4/ui`, `src/components/ui`, `src/components/controllers`, `src/hooks/form`;
   - backend: `src/modules/api`, `src/utils/validator.ts`, `src/helpers/return`, `src/helpers/translate`, `src/main/server/imports/write.ts`.
9. Implementar sem mocks.
10. Se alterar `backend/prisma/schema.prisma` ou `backend/prisma/migrations`, executar `pnpm --dir backend db:migrate`. Se `prisma migrate dev` falhar por dados ou estado preexistente no banco de desenvolvimento, perguntar ao usuário se pode resetar o banco antes de rodar comando destrutivo.
11. Rodar checks/builds relevantes.
12. Criar ou atualizar ADR em `adrs/`.
13. Marcar critérios de aceite concluídos no arquivo da task.
14. Fazer commit com mensagem convencional.
15. Executar `git push` para publicar a branch/remoto correspondente. Se a branch não tiver upstream, usar `git push -u origin <branch>`. Se o push falhar por credenciais, rede ou permissão, registrar o bloqueio explicitamente.

## Proibições

- Não usar mock para concluir critério de aceite.
- Não instalar package sem `PACKAGES.md` e ADR.
- Não criar design system, API client, auth guard, validator ou response helper paralelo.
- Não rodar Builder CLI a partir da raiz para gerar UI; use `frontend/` ou `--cwd frontend`.
- Não aceitar Builder output como implementação final sem revisão arquitetural.
- Não concluir task com erro de TypeScript, warning Biome ou build quebrado.
- Não avançar para outra task sem concluir validação, commit e push.
- Não usar `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.

## Saída Esperada

Ao final, responder com:

- task executada;
- arquivos principais alterados;
- ADR criado/atualizado;
- validações executadas;
- hash do commit;
- status do push;
- bloqueios reais, se houver.
