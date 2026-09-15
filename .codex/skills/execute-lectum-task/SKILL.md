---
name: execute-lectum-task
description: Execute uma task de produto Lectum de ponta a ponta, com Builder/proto, sem mocks, ADR, validação, commit e push.
---

# Execute Lectum Task

Use esta skill quando o usuário pedir para executar a próxima task, uma task específica de `_product/tasks`, ou continuar o desenvolvimento do produto Lectum.

## Workflow Obrigatório

1. Executar `git branch --show-current`. Se estiver em `main`, parar e orientar o usuário a mudar para `homolog`; nunca editar, commitar ou fazer push direto em produção.
2. Ler `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e o arquivo da task alvo.
3. Confirmar que todas as dependências da task estão concluídas.
4. Se a task envolver tela, ler `_product/tasks/PROTO-INVENTORY.md` e identificar as imagens de referência.
5. Se Builder/Quick Copy estiver disponível no cliente, usar `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` para complementar o contexto visual.
6. Se Builder/Quick Copy não estiver acessível no ambiente, usar as imagens locais em `_product/proto` e registrar a limitação.
7. Verificar requisitos externos:
   - gateway de pagamento;
   - bucket/armazenamento;
   - WhatsApp/SMS/e-mail;
   - CFP;
   - termos legais/LGPD;
   - chaves OAuth.
8. Se faltar requisito externo, parar a implementação e registrar a pendência no arquivo da task/ADR.
9. Mapear arquivos existentes antes de criar estrutura nova:
   - frontend: `api/req`, `api/callers`, `api/cache/keys`, `templates`, `registry/new-york-v4/ui`, `components/controllers`, `hooks/form`;
   - backend: `modules/api`, `utils/validator`, `helpers/return`, `helpers/translate`, `main/server/imports/write.ts`.
10. Implementar sem mocks.
11. Antes de implementar, registrar impacto de deploy: compatibilidade com dados existentes, envs, ordem entre apps, rollback e efeitos em jobs/providers. Env obrigatória nova exige **ALERTA DE DEPLOY** sem revelar valor.
12. Se a task alterar `backend/prisma/schema.prisma` ou `backend/prisma/migrations`, usar expandir/backfill/contrair, nunca editar migration aplicada e executar `pnpm --dir backend db:migrate` durante a task. Se `prisma migrate dev` falhar por conflito com dados ou estado preexistente do banco de desenvolvimento, parar e perguntar ao usuário se pode resetar apenas o banco local antes de rodar comando destrutivo.
13. Rodar validação:
   - `pnpm --dir backend check` se backend mudou;
   - `pnpm --dir frontend check` se frontend mudou;
   - `pnpm check` quando a task tocar ambos;
   - builds relevantes;
   - `pnpm --dir admin check`/build se admin mudou;
   - browser local para interface.
14. Criar ou atualizar ADR em `adrs/` para decisões e execuções importantes.
15. Marcar critérios de aceite concluídos no arquivo da task, trocando `[ ]` por `[x]`.
16. Antes do novo commit, executar uma única vez `pnpm version:bump`, preparar os cinco `package.json` sincronizados e validar `pnpm check:version`. Se a tentativa desse mesmo commit falhar, corrigir e tentar novamente sem outro bump.
17. Fazer commit com mensagem convencional e escopo da task.
18. Confirmar novamente que a branch é `homolog`, avisar que o push inicia deploy automático e executar `git push`. Se falhar por credenciais, rede ou permissão, registrar o bloqueio explicitamente. Após o deploy, validar smoke, versões publicadas e `/health`/`/ready` quando aplicável.

## Promoção explícita para produção

Quando o usuário disser para colocar a versão homologada em produção:

1. Não alterar código nem criar commit direto em `main`; confirmar branch `homolog`, árvore limpa, checks e smoke de homologação.
2. Validar `gh auth status` e procurar PR aberto `homolog` → `main`; reutilizá-lo ou criar um novo.
3. Aguardar checks obrigatórios do PR e interromper/reportar se algum falhar.
4. Fazer merge pelo PR sem usar `--delete-branch`; `homolog` é permanente.
5. Acompanhar o deploy de produção e validar backend `/health`, `/ready`, `/ping` e frontend/admin/video `/version`, além dos fluxos afetados.
6. Se `gh`, permissões ou proteção de branch bloquearem a ação, reportar o bloqueio; nunca contornar com push em `main`.

## Proibições

- Não usar mocks, seeds artificiais ou dados inventados para passar critério de aceite.
- Não instalar package novo sem citar `_product/tasks/PACKAGES.md` e registrar decisão.
- Não criar design system, API client, auth guard, validator ou response helper paralelo.
- Não rodar Builder CLI a partir da raiz para gerar UI; use `frontend/` ou `--cwd frontend`.
- Não aceitar Builder output como implementação final sem revisão arquitetural.
- Não deixar task como concluída se existir erro de TypeScript, warning do Biome ou build quebrado.
- Não avançar para outra task sem finalizar validação, commit e push da atual.
- Não usar `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Não marcar critério `[x]` por intenção; marcar apenas com evidência executada.
- Não resetar, semear destrutivamente, limpar bucket ou alterar dados em massa em homologação/produção.
- Não criar coluna obrigatória incompatível com registros existentes nem depender de env ainda não provisionada.
- Não expor mensagens técnicas, PII, segredos, stack, SQL ou detalhes de provider em UI/API/logs.
- Não fazer commit/push direto em `main`.
- Não criar um segundo bump ao apenas repetir uma tentativa falha do mesmo commit.

## Saída Esperada

Ao final, responder ao usuário com:

- task executada;
- arquivos principais alterados;
- ADR criado/atualizado;
- validações executadas;
- hash do commit;
- status do push;
- pendências reais, se houver.
- alertas de deploy, rollback e resultado do smoke de homologação.
- versão publicada de cada aplicação alterada e, quando solicitado, PR/merge e smoke de produção.
