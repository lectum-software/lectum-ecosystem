# ADR-0493: CRP público sem zero artificial no registro

## Status

Accepted

## Task relacionada

TASK-15

## Contexto

Em 2026-09-10, o usuário identificou que o perfil público de uma psicóloga exibia
`CRP 07/029112`, enquanto o registro profissional correto e exibido no Admin era `29112`.

A causa estava no formatter compartilhado do frontend (`formatCrpNumber`), que preenchia o número
do registro com zeros à esquerda até 6 dígitos. Essa regra era apenas visual e podia inventar um
zero não existente no registro público. A regional `07` continua sendo uma normalização esperada,
mas o número do registro deve refletir o valor real armazenado/informado.

## Decisão

- Manter a normalização da regional numérica para 2 dígitos.
- Remover o `padStart` do número do registro público.
- Preservar o valor do registro quando ele já vier armazenado com zero à esquerda; o formatter não
  faz limpeza destrutiva de dado persistido.
- Manter a remoção de prefixos duplicados `CRP`, inclusive nos CTAs/modal de WhatsApp, perfil
  público, perfil privado e telas de avaliações que usam `formatCrpLabel`.

## Consequências

- `7/29112` passa a ser exibido como `CRP 07/29112`, sem virar `CRP 07/029112`.
- A UI pública deixa de divergir do dado operacional exibido no Admin para registros com 5 dígitos.
- Registros que realmente estiverem persistidos com zero inicial continuam exibindo esse zero; se
  houver dado persistido incorreto, a correção deve ser operacional/auditada, não mascarada no
  formatter público.
- Não há alteração de backend, contrato de API, Prisma, migration, pacote, env, storage, provider,
  seed, mock ou backfill.

## Produção e rollout

- Compatibilidade com dados existentes: alteração frontend-only e tolerante a versões diferentes do
  backend/admin, pois o contrato `crp: string | null` permanece idêntico.
- Banco/migration: sem alteração.
- Envs: nenhuma env nova ou obrigatória; sem **ALERTA DE DEPLOY**.
- Ordem de deploy: push em `homolog` publica o frontend em homologação; validar `/version` e o
  perfil público afetado antes de recomendar promoção.
- Rollback: reverter o commit restaura o padding visual anterior, sem migração reversa.

## Validação

- `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou por cache local `ENOENT`;
  a evidência visual usou o print do usuário e a referência local
  `_product/proto/Perfil Profissional - Sobre.jpg`.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/crp.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- `pnpm check`
- Smoke local HTTP do frontend buildado em `0.1.306`: `/version` 200 e
  `/psicologos/cmtvlnjf400ef01p85lh98bcw` 200.
- Chrome headless local mobile 390px carregou a rota pública sem overflow horizontal
  (`scrollWidth=390`); os dados do perfil não hidrataram no ambiente local, então a conferência
  visual do CRP real fica para o smoke de homologação após o deploy.

## Pendências

- Nenhuma pendência externa nova.
