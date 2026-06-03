# Regras do projeto

- Este repositório reúne `backend/` e `frontend/` apenas para facilitar o desenvolvimento local.
- Em produção, frontend e backend devem ser tratados como aplicações separadas.
- O desenvolvimento do produto Lectum deve seguir spec-driven development.
- A fonte de verdade das próximas execuções é `_product/tasks/README.md`.
- A arquitetura obrigatória está em `_product/tasks/ARCHITECTURE.md`.
- A política de packages está em `_product/tasks/PACKAGES.md`.
- Execute uma task por vez, marque critérios de aceite, registre ADRs relevantes e faça commit ao final da task.

# Design e protótipos

- A fonte visual ativa é `_product/tasks/PROTO-INVENTORY.md`.
- O Quick Copy ativo é `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
- Use Builder/Quick Copy quando estiver disponível no cliente.
- Se Builder/Quick Copy não estiver acessível no ambiente, use as imagens exportadas em `_product/proto` e registre a limitação.
- Não trate imagens, Builder output ou código gerado como arquitetura final.
- Não use Figma como fonte ativa, salvo pedido explícito do usuário.

# Regras de execução

- Nunca use mocks para concluir uma task.
- Se faltar requisito externo, pare e registre a decisão pendente.
- Não use `sample/` como fonte ativa, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Não crie estrutura nova antes de procurar padrão equivalente no front/back atual.
- Não instale package novo sem validar `_product/tasks/PACKAGES.md` e registrar ADR.
- Para formulários/campos de produto, use a fundação da `TASK-02`: React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`.
- Para UI, valide com Builder/proto, build e browser local.
- Para backend, valide Prisma, TypeScript e Biome.
