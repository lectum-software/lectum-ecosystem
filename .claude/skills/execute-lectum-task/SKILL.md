---
name: execute-lectum-task
description: Execute uma task Lectum de ponta a ponta usando Builder/proto, arquitetura existente, ADR, validação, commit e push.
---

# Execute Lectum Task

Use esta skill no Claude Code quando o usuário pedir para executar a próxima task, continuar o desenvolvimento Lectum ou executar uma task específica de `_product/tasks`.

## Workflow Obrigatório

1. Executar `git branch --show-current`; se for `main`, parar e orientar o usuário a usar `homolog`.
2. Ler `CLAUDE.md`, `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md`, `_product/tasks/PROTO-INVENTORY.md`, `_product/tasks/ROADMAP-REVALIDADO.md` e o arquivo da task alvo.
3. Confirmar dependências da task.
4. Se houver UI, identificar imagens de `_product/proto` citadas na task.
5. Usar Builder MCP/Quick Copy quando disponível no cliente Claude Code.
6. Se Builder MCP não estiver disponível no cliente, usar as imagens locais citadas na task e registrar a limitação.
7. Verificar requisitos externos: pagamento, storage, e-mail, WhatsApp/SMS, CFP, OAuth, push e LGPD.
8. Se faltar requisito externo, parar e registrar bloqueio em task/ADR.
9. Mapear arquivos existentes antes de criar estrutura nova:
   - frontend: `src/api/req`, `src/api/callers`, `src/api/cache/keys.ts`, `src/templates`, `src/registry/new-york-v4/ui`, `src/components/ui`, `src/components/controllers`, `src/hooks/form`;
   - backend: `src/modules/api`, `src/utils/validator.ts`, `src/helpers/return`, `src/helpers/translate`, `src/main/server/imports/write.ts`.
10. Implementar sem mocks.
11. Registrar risco de deploy, dados existentes, envs, ordem entre apps e rollback. Env obrigatória nova exige **ALERTA DE DEPLOY** sem mostrar valor.
12. Se alterar `backend/prisma/schema.prisma` ou `backend/prisma/migrations`, usar expandir/backfill/contrair, não editar migration aplicada e executar `pnpm --dir backend db:migrate`. Se falhar por dados locais preexistentes, perguntar antes de resetar somente o ambiente local.
13. Rodar checks/builds relevantes.
14. Criar ou atualizar ADR em `adrs/`.
15. Marcar critérios de aceite concluídos no arquivo da task.
16. Antes do novo commit, executar uma única vez `pnpm version:bump`, incluir os quatro `package.json` sincronizados e validar `pnpm check:version`; não repetir o bump ao apenas tentar novamente o mesmo commit.
17. Fazer commit com mensagem convencional.
18. Confirmar `homolog`, avisar que o push inicia deploy automático e executar `git push`. Validar smoke, versões publicadas e `/health`/`/ready` quando aplicável.

## Promoção explícita para produção

Quando o usuário pedir para colocar em produção, confirmar homologação, usar `gh` para criar ou
reutilizar PR `homolog` → `main`, aguardar checks, fazer merge sem excluir `homolog` e validar
`/health`, `/ready`, `/ping`, frontend/admin `/version` e os fluxos afetados em produção. Se acesso ou
checks bloquearem, reportar; nunca fazer push direto em `main`.

## Proibições

- Não usar mock para concluir critério de aceite.
- Não instalar package sem `PACKAGES.md` e ADR.
- Não criar design system, API client, auth guard, validator ou response helper paralelo.
- Não rodar Builder CLI a partir da raiz para gerar UI; use `frontend/` ou `--cwd frontend`.
- Não aceitar Builder output como implementação final sem revisão arquitetural.
- Não concluir task com erro de TypeScript, warning Biome ou build quebrado.
- Não avançar para outra task sem concluir validação, commit e push.
- Não usar `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Não fazer commit/push direto em `main` nem executar ações destrutivas em dados publicados.
- Não criar um segundo bump ao apenas repetir uma tentativa falha do mesmo commit.
- Não introduzir coluna obrigatória incompatível, env não provisionada ou quebra de contrato entre versões.
- Não expor detalhe técnico, PII, segredo, stack, SQL ou mensagem crua de provider.

## Saída Esperada

Ao final, responder com:

- task executada;
- arquivos principais alterados;
- ADR criado/atualizado;
- validações executadas;
- hash do commit;
- status do push;
- bloqueios reais, se houver.
- alertas de deploy, rollback e smoke de homologação.
- versões publicadas e, quando solicitado, PR/merge e smoke de produção.
