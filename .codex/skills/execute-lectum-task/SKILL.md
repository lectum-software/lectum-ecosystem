---
name: execute-lectum-task
description: Execute uma task de produto Lectum de ponta a ponta, com Builder/proto, sem mocks, ADR, validação e commit.
---

# Execute Lectum Task

Use esta skill quando o usuário pedir para executar a próxima task, uma task específica de `_product/tasks`, ou continuar o desenvolvimento do produto Lectum.

## Workflow Obrigatório

1. Ler `AGENTS.md`, `_product/tasks/README.md`, `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e o arquivo da task alvo.
2. Confirmar que todas as dependências da task estão concluídas.
3. Se a task envolver tela, ler `_product/tasks/PROTO-INVENTORY.md` e identificar as imagens de referência.
4. Se Builder/Quick Copy estiver disponível no cliente, usar `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` para complementar o contexto visual.
5. Se Builder/Quick Copy não estiver acessível no ambiente, usar as imagens locais em `_product/proto` e registrar a limitação.
6. Verificar requisitos externos:
   - gateway de pagamento;
   - bucket/armazenamento;
   - WhatsApp/SMS/e-mail;
   - CFP;
   - termos legais/LGPD;
   - chaves OAuth.
7. Se faltar requisito externo, parar a implementação e registrar a pendência no arquivo da task/ADR.
8. Mapear arquivos existentes antes de criar estrutura nova:
   - frontend: `api/req`, `api/callers`, `api/cache/keys`, `templates`, `registry/new-york-v4/ui`, `components/controllers`, `hooks/form`;
   - backend: `modules/api`, `utils/validator`, `helpers/return`, `helpers/translate`, `main/server/imports/write.ts`.
9. Implementar sem mocks.
10. Rodar validação:
   - `pnpm --dir backend check` se backend mudou;
   - `pnpm --dir frontend check` se frontend mudou;
   - `pnpm check` quando a task tocar ambos;
   - builds relevantes;
   - browser local para interface.
11. Criar ou atualizar ADR em `adrs/` para decisões e execuções importantes.
12. Marcar critérios de aceite concluídos no arquivo da task, trocando `[ ]` por `[x]`.
13. Fazer commit com mensagem convencional e escopo da task.

## Proibições

- Não usar mocks, seeds artificiais ou dados inventados para passar critério de aceite.
- Não instalar package novo sem citar `_product/tasks/PACKAGES.md` e registrar decisão.
- Não criar design system, API client, auth guard, validator ou response helper paralelo.
- Não rodar Builder CLI a partir da raiz para gerar UI; use `frontend/` ou `--cwd frontend`.
- Não aceitar Builder output como implementação final sem revisão arquitetural.
- Não deixar task como concluída se existir erro de TypeScript, warning do Biome ou build quebrado.
- Não avançar para outra task sem finalizar validação e commit da atual.
- Não usar `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Não marcar critério `[x]` por intenção; marcar apenas com evidência executada.

## Saída Esperada

Ao final, responder ao usuário com:

- task executada;
- arquivos principais alterados;
- ADR criado/atualizado;
- validações executadas;
- hash do commit;
- pendências reais, se houver.
