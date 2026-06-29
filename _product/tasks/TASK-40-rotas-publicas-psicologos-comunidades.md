# TASK-40: Rotas públicas de psicólogos e comunidades fora de /app

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-40 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta pública e roteamento |
| Status | Completed |
| Dependências | TASK-12, TASK-13, TASK-22, TASK-23, TASK-25, TASK-26, TASK-39 |
| ADR alvo | ADR-0180 |

## Contexto

A Lectum usa `/app` como shell de navegação e também hospedava páginas que, pelo produto, são públicas: busca/listagem de psicólogos, perfil público do psicólogo, exploração de comunidades, feed e leitura de posts. Isso dificulta a semântica de SEO/IA criada na TASK-39 e confunde a fronteira mental de autenticação: a comunidade só deve exigir conta para interações, como publicar, sugerir comunidade, seguir, votar, comentar, salvar ou favoritar.

Esta task separa a URL pública da URL autenticada sem recriar telas nem APIs. As telas públicas passam a responder fora de `/app`, enquanto `/app` fica reservado para áreas que exigem sessão ou ações autenticadas.

## Objetivo

Disponibilizar as superfícies públicas principais em rotas canônicas sem `/app`:

- `/psychologists`
- `/psychologists/[id]`
- `/psychologists/[id]/contact`
- `/community`
- `/community/feed`
- `/community/[slug]`
- `/community/[slug]/post/[id]`
- `/community/[slug]/post/[id]/thread/[replyId]`
- `/community/top-mentors`

Áreas autenticadas permanecem sob `/app`, incluindo favoritos, notificações, perfil, configurações, posts do usuário, área profissional e fluxos de interação/autoria de comunidade (`/app/community/suggest`, `/app/community/[slug]/post/new`).

## Pré-requisitos e bloqueios

- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Política de packages em `PACKAGES.md`; nenhum pacote novo.
- `PROTO-INVENTORY.md` consultado; não há tela nova, apenas roteamento das telas já implementadas. Builder/Quick Copy não está disponível como ferramenta callable neste ambiente.
- Sem requisito externo.
- Sem alteração de banco/schema/migrations.

## Escopo frontend

- Criar wrappers públicos no App Router para reaproveitar a lógica existente das páginas de psicólogos e comunidades.
- Alterar navegação, links, compartilhamentos e redirecionamentos para as rotas públicas canônicas.
- Manter rotas de interação/autoria de comunidade sob `/app` e protegidas pelo `proxy.ts`.
- Ajustar `proxy.ts` para remover exceções públicas em `/app`.
- Atualizar SEO: sitemap, robots, `llms.txt`, noindex e homepage redirecionando para `/psychologists`.
- Ajustar manifest PWA para iniciar/escopar as rotas públicas atuais.

## Escopo backend

- Atualizar deep-links gerados pelo backend para notificações/digests e `profile_url` do ranking de mentores, apontando para rotas públicas.
- Sem endpoint novo.
- Sem alteração de banco/schema/migrations.

## Fora do escopo

- Criar aliases em português (`/psicologos`, `/comunidades`).
- Criar páginas estáticas editoriais ou `QAPage` com curadoria/consentimento.
- Alterar contratos de API ou modelos de dados.
- Tornar comandos de interação anônimos.

## Contrato técnico detalhado

- `/app` deve ser tratado como namespace autenticado pelo `frontend/src/proxy.ts`.
- As rotas públicas devem reutilizar as telas existentes sem duplicar lógica, dados ou mocks.
- Links de leitura devem apontar para rotas públicas (`/psychologists`, `/community`).
- Links de interação que exigem conta devem permanecer sob `/app` ou acionar conversão/login antes do comando.
- `robots.txt`/`sitemap.xml` devem listar apenas superfícies públicas indexáveis e manter `/app`, `/auth`, `/dashboard`, `/patient`, `/api` e onboarding profissional sensível fora da indexação.
- Nenhum pacote novo deve ser instalado.

## Critérios de aceite

- [x] `/psychologists`, `/psychologists/[id]`, `/community`, `/community/feed`, `/community/[slug]` e `/community/[slug]/post/[id]` existem fora de `/app`.
- [x] `/` redireciona para a página pública de psicólogos, conforme preferência de produto.
- [x] `/app` não possui exceções públicas no `proxy.ts`; rotas sob `/app` sem token redirecionam para login.
- [x] Navegação, cards, links de perfil, links de posts, compartilhamentos, notificações/digests e ranking de mentores usam URLs públicas quando a leitura é pública.
- [x] Criar post e sugerir comunidade continuam sob `/app` por exigirem autenticação.
- [x] `robots.txt`, `sitemap.xml`, `llms.txt`, headers e metadata refletem a nova separação público/autenticado.
- [x] Arquitetura e modelo de dados documentam a nova convenção de rotas.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos seguem a fundação da TASK-02 quando aplicável; nesta task não foram criados formulários novos.
- [x] UI permanece mobile-first e sem `<img>` cru; a task só reendereça telas existentes.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0180-rotas-publicas-psicologos-comunidades.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP/browser local em `/`, `/psychologists`, `/community`, `/community/feed`, `/app/psychologists` sem cookie e `/app/community/suggest` sem cookie.

## Notas de execução

- A decisão de manter nomes em inglês nas URLs (`/psychologists`, `/community`) evita uma migração semântica maior nesta task. Aliases em português podem ser avaliados em task futura.
- Os arquivos de lógica permanecem fisicamente sob `frontend/src/app/app/...` para reduzir risco de regressão e duplicação; os novos segmentos públicos são wrappers canônicos. A movimentação física pode ser feita depois, se necessário, sem mudar URLs.

## Evidencias de validacao

- 2026-06-29: `pnpm --dir frontend check` executado com sucesso.
- 2026-06-29: `pnpm --dir frontend build` executado com sucesso.
- 2026-06-29: `pnpm --dir backend check` executado com sucesso.
- 2026-06-29: `pnpm --dir backend build` executado com sucesso.
- 2026-06-29: `pnpm check` executado com sucesso.
- 2026-06-29: smoke HTTP local com `next start --port 3000`:
  - `/` -> 307 `/psychologists`;
  - `/psychologists`, `/community`, `/community/feed`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` -> 200;
  - `/app/psychologists` -> 307 `/auth/login?callbackUrl=%2Fapp%2Fpsychologists`;
  - `/app/community/suggest` -> 307 `/auth/login?callbackUrl=%2Fapp%2Fcommunity%2Fsuggest`;
  - `/psychologist/cfp` -> 307 `/app/professional/cfp`.

## Notas finais

- `db:migrate` nao se aplica: nao houve alteracao em Prisma schema/migrations.
- Builder/Quick Copy nao estava acessivel como ferramenta callable; nao houve tela nova, apenas reenderecamento de telas existentes.
