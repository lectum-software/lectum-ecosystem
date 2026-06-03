# ADR-0001: Execução spec-driven por tasks auto-suficientes

## Status

Accepted

## Contexto

O Lectum será desenvolvido por usuários não-devs em colaboração com IA. Isso exige tarefas grandes o bastante para o usuário validar visualmente, mas detalhadas o suficiente para uma IA executar sem depender de memória implícita, mocks ou conhecimento da pasta `sample/`.

O repositório contém `backend/` e `frontend/` juntos para desenvolvimento, mas as aplicações devem permanecer separadas em arquitetura, validação e decisões de produção.

## Decisão

Adotamos `_product/tasks` como fila canônica de execução do produto. Cada task deve:

- ser auto-suficiente;
- citar dependências e pré-requisitos externos;
- proibir mocks;
- exigir validação objetiva;
- exigir ADR quando houver decisão importante;
- exigir commit ao final.

Também adicionamos:

- `AGENTS.md` como instrução raiz para agentes;
- `.github/copilot-instructions.md` como resumo always-on para VS Code/Copilot;
- `.github/instructions/*.instructions.md` para regras segmentadas por área;
- `.github/prompts/execute-next-lectum-task.prompt.md` como prompt file reutilizável no VS Code/Copilot;
- `.codex/skills/execute-lectum-task/SKILL.md` como workflow operacional;
- `.codex/prompts/execute-next-lectum-task.md` como prompt reutilizável.
- `_product/tasks/TASK-TEMPLATE.md` e `adrs/TEMPLATE.md` como modelos de expansão.

## Consequências

- O usuário pode pedir "execute a próxima task" sem precisar saber comandos técnicos.
- A IA deve parar diante de decisões externas ausentes, em vez de inventar integração.
- O histórico de decisões fica em `adrs/`.
- A referência visual ativa deve ser consumida por Builder/Quick Copy quando disponível no cliente ou pelas imagens exportadas em `_product/proto`.
- Código gerado por ferramenta visual não deve ser aceito como arquitetura final sem revisão.

## Task relacionada

Criação da base `_product/tasks` solicitada em `_product/Prompt.md`.
