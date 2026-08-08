# Regras do projeto

- Este repositório reúne `backend/`, `frontend/` e `admin/` apenas para facilitar o desenvolvimento local.
- Em produção, as três aplicações devem ser tratadas separadamente.
- O desenvolvimento do produto Lectum deve seguir spec-driven development.
- A fonte de verdade das próximas execuções é `_product/tasks/README.md`.
- A arquitetura obrigatória está em `_product/tasks/ARCHITECTURE.md`.
- A política de packages está em `_product/tasks/PACKAGES.md`.
- Execute uma task por vez, marque critérios de aceite, registre ADRs relevantes e faça commit ao final da task.

# Homologação e produção

- Desde **2026-08-07**, Lectum está publicado e os ambientes podem conter dados reais.
- `homolog` publica automaticamente em homologação; `main` publica automaticamente em produção.
- Antes de editar, confirme a branch. Se for `main`, pare e oriente o usuário a usar `homolog`.
- Nunca faça commit/push direto em `main`. Promova somente por merge revisado após validar homologação.
- Push em `homolog` inicia deploy: avise o usuário e execute smoke test antes de recomendar promoção.
- Nunca resete ou destrua dados, seeds ou buckets em ambiente publicado.
- Banco: expandir, fazer backfill retomável e só depois contrair; não tornar coluna obrigatória sem compatibilidade com dados existentes; não editar migration aplicada.
- Env obrigatória nova exige **ALERTA DE DEPLOY** com nome, app, ordem e impacto. Nunca exponha valores; prefira fallback seguro/adoção em duas etapas.
- APIs devem tolerar frontend e backend em versões diferentes durante o rollout.
- Não exponha mensagens técnicas, PII, segredos, stack, SQL ou detalhes de provider em UI/API/logs.

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
- Para qualquer alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`, execute `pnpm --dir backend db:migrate` durante a task.
- Se `prisma migrate dev` falhar por conflito com dados/estado do banco de desenvolvimento, pergunte ao usuário antes de resetar o banco ou rodar comando destrutivo.
- Para o admin, execute `pnpm --dir admin check` e `pnpm --dir admin build` quando houver alteração de UI/rota.
- Commit e push de tasks ocorrem em `homolog`; nunca deixe uma automação publicar `main` sem validação prévia do ambiente de homologação.
