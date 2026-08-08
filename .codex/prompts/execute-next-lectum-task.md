# Executar próxima task Lectum

Execute a próxima task pendente em `_product/tasks/README.md` usando a skill `execute-lectum-task`.

Regras:

- confirme a branch; pare se estiver em `main` e trabalhe somente em `homolog`;
- lembre que o push em `homolog` faz deploy automático e nunca faça push direto em `main`;
- leia `_product/tasks/ARCHITECTURE.md`;
- leia `_product/tasks/DATA-MODEL.md` quando a task envolver modelo Prisma, DTO ou contrato de API;
- leia `_product/tasks/PACKAGES.md`;
- use a fundação da `TASK-02` para formulários/campos de produto;
- execute apenas uma task;
- use Builder/Quick Copy quando disponível ou imagens de `_product/proto` quando a ferramenta não estiver acessível;
- não use mocks;
- registre ADRs relevantes;
- se a task alterar banco/schema/migrations, rode `pnpm --dir backend db:migrate`;
- se a migration falhar por dados/estado preexistente, pergunte antes de resetar o banco de desenvolvimento;
- rode checks/builds;
- marque critérios concluídos;
- faça commit ao final.
- registre impacto em dados existentes, envs, rollout e rollback; env obrigatória nova exige alerta explícito sem valor.

Se a task envolver tela, consulte `_product/tasks/PROTO-INVENTORY.md`. Se Builder/Quick Copy não estiver acessível no ambiente, registre a limitação e use as imagens locais explicitamente citadas como referência visual.
