# Lectum Agent Instructions

Estas instruções valem para agentes de IA trabalhando neste workspace.

## Contexto do Projeto

- O repositório reúne `backend/`, `frontend/` e `admin/` apenas para facilitar o desenvolvimento.
- Em produção, as três aplicações devem continuar separadas.
- O produto Lectum é uma plataforma web responsiva para psicólogos e pacientes.
- O desenvolvimento deve seguir spec-driven development: a IA executa uma task bem definida, valida, registra decisões e só então avança.

## Ambientes Publicados e Segurança de Deploy

- Desde **2026-08-07**, Lectum está publicado em homologação e produção. Trate dados, filas, uploads, pagamentos e integrações desses ambientes como reais e persistentes.
- A branch `homolog` publica automaticamente em **homologação**; a branch `main` publica automaticamente em **produção**.
- Toda implementação deve começar em `homolog`. Se a branch atual for `main`, pare antes de editar, commitar ou fazer push e oriente o usuário a mudar para `homolog`.
- Nunca faça commit ou push direto em `main`. A promoção para produção ocorre somente depois de validar o deploy de homologação e por merge revisado de `homolog` para `main`.
- Antes de qualquer push, avise que o push em `homolog` inicia um deploy. Depois dele, registre smoke test e resultado de `/health` e `/ready` quando o backend for afetado.
- Quando o usuário pedir explicitamente para **colocar em produção**, não implemente novamente nem peça que ele promova manualmente: confirme o smoke de homologação, use `gh` para criar ou reutilizar um PR `homolog` → `main`, aguarde os checks obrigatórios, faça o merge sem excluir a branch permanente `homolog` e execute smoke de produção. Falha de autenticação, permissão ou checks bloqueia a promoção e nunca autoriza push direto em `main`.
- Nunca execute reset, seed destrutivo, `db push`, exclusão em massa ou limpeza de bucket em homologação/produção.
- Alterações de banco devem ser compatíveis com versões anterior e nova durante o deploy: usar expansão segura, backfill retomável e só depois contração. Não tornar coluna obrigatória sem tratar todos os registros existentes; não editar migration já aplicada; não remover/renomear campo no mesmo deploy que deixa de usá-lo.
- Variável nova deve ter fallback seguro ou ser opcional no primeiro deploy. Se ela precisar ser obrigatória, emitir **ALERTA DE DEPLOY** antes do commit/push com nome da variável (nunca o valor), aplicações afetadas, ordem de configuração em homologação/produção e sintoma esperado se faltar.
- Mudanças de contrato devem ser aditivas e tolerar frontend/backend em versões diferentes durante o rollout.
- Logs, toasts e respostas públicas nunca podem expor segredo, PII, stack trace, SQL, URL interna ou mensagem técnica de provider.

## Fontes de Verdade

1. Tasks sequenciais: `_product/tasks/README.md`.
2. Arquitetura obrigatória: `_product/tasks/ARCHITECTURE.md`.
3. Política de packages: `_product/tasks/PACKAGES.md`.
4. Product docs: `_product/Lectum PRD.pdf` e `_product/Fluxogramas do Produto.pdf`.
5. Design/protótipos: Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` e imagens em `_product/proto`.
6. ADRs: `adrs/`.

## Regras Obrigatórias

- Nunca usar mocks, dados fake permanentes ou endpoints simulados para concluir uma task.
- Se um requisito externo estiver ausente, parar a task e registrar a decisão pendente em vez de mascarar com mock.
- Antes de implementar tela, consultar `_product/tasks/PROTO-INVENTORY.md`.
- Usar Builder/Quick Copy quando disponível no cliente; se a ferramenta não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Não usar Figma como fonte ativa, salvo pedido explícito do usuário.
- Não aceitar código gerado por Builder CLI como final sem adequar à arquitetura do projeto.
- Formulários/campos de produto devem usar a fundação da `TASK-02`: React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`. Campos ocupam largura total e o slot de erro tem altura fixa (sem layout shift).
- Toda UI é **mobile-first** e isso deve ser explícito na execução da task (base ~390px dos protótipos, progredindo para telas maiores).
- **Nunca usar `<img>`**; sempre o componente `Image` de `next/image`.
- Cada task concluída deve atualizar seus critérios de aceite de `[ ]` para `[x]`.
- Cada task concluída deve criar ou atualizar pelo menos um ADR quando houver decisão arquitetural, integração, regra de domínio, fluxo crítico ou trade-off relevante.
- Cada task concluída deve gerar commit próprio e executar `git push` para publicar a branch/remoto correspondente; não deixe commits apenas locais. Se o push falhar por credenciais, rede ou permissão, reporte o bloqueio explicitamente.
- O commit e o push da task devem ocorrer em `homolog`; lembre que o push dispara deploy automático de homologação.
- Antes de cada novo commit criado por agente, execute uma única vez `pnpm version:bump`, prepare `package.json`, `backend/package.json`, `frontend/package.json` e `admin/package.json` no mesmo commit e confirme `pnpm check:version`. Se uma tentativa de commit falhar, corrija e tente novamente sem outro bump. O hook bloqueia versão não incrementada ou dessincronizada.
- A versão dos artefatos é consultável em `GET /ping` no backend e `GET /version` no frontend/admin. Essas rotas são públicas, sem cache e não indexáveis; não as vincule na navegação ou sitemap.
- Não usar a pasta `sample/` como fonte ativa de implementação futura, exceto quando a task citar expressamente uma referência técnica específica, como a `TASK-02`.
- Antes de criar estrutura nova, verificar `_product/tasks/ARCHITECTURE.md`.
- Antes de instalar pacote novo, verificar `_product/tasks/PACKAGES.md` e registrar ADR.
- Toda task que alterar `backend/prisma/schema.prisma` ou criar/alterar arquivo em `backend/prisma/migrations` deve rodar `pnpm --dir backend db:migrate` durante a execução, além de `check`/`build`.
- Se `prisma migrate dev` falhar por conflito com dados ou estado preexistente do banco de desenvolvimento, não rode reset automaticamente. Explique o erro e pergunte ao usuário se pode resetar o banco antes de executar qualquer comando destrutivo, como `pnpm --dir backend exec prisma migrate reset`.

## Validação

Use estes comandos como baseline:

- Raiz: `pnpm check`
- Backend: `pnpm --dir backend check` e, quando houver mudança estrutural, `pnpm --dir backend build`
- Backend com mudança de banco: `pnpm --dir backend db:migrate`
- Frontend: `pnpm --dir frontend check` e, quando houver mudança visual/rota, `pnpm --dir frontend build`
- Admin: `pnpm --dir admin check` e, quando houver mudança visual/rota, `pnpm --dir admin build`

Para mudanças de interface, também validar manualmente no browser local depois de subir o dev server apropriado.

## Stack Atual

- Backend: Express 5, Prisma 7, PostgreSQL adapter, Passport/JWT/Google OAuth, Biome, TypeScript.
- Frontend: Next.js 16, React 19, Tailwind CSS 4, TanStack Query 5, Redux Toolkit, Biome, ESLint, TypeScript.
- Package manager: pnpm.
