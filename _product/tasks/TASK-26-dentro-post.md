# TASK-26: Dentro do post

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-26 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Pending |
| Dependências | TASK-02, TASK-24, TASK-25 |
| ADR alvo | ADR de respostas e votos em posts |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Dentro do Post.jpg` | `figma-design-frame-2-Dentro-do-Post.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

`Dentro do Post.jpg` é uma tela muito longa. A implementação precisa quebrar em componentes e carregar respostas de forma paginada.

## Objetivo

Criar detalhe de post com respostas, votos, salvamento e paginação de comentários.

## Pré-requisitos e bloqueios

- Regras de moderação/downvote devem estar em ADR antes de implementar comportamento destrutivo.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/[slug]/post/[id]`

Implementação esperada:

- Criar rota de detalhe do post.
- Exibir post, autor, comunidade, votos, salvar e respostas.
- Criar formulário de resposta com validação.
- Paginar respostas e evitar render gigante.
- Aplicar optimistic update com rollback em votos/salvar.

Decomposição de componentes (a tela é muito longa — quebrar para evitar render monolítico):

- `PostHeader`: avatar/autor (`author_id` + `user.role`), comunidade (`community.slug`/nome), data, menu de ações.
- `PostBody`: `community_post.title` + `content`.
- `PostVoteBar`: upvote/downvote a partir de `community_post.upvotes_count`/`downvotes_count` e do voto do usuário; ação de salvar usando `saves_count`. Downvote nunca exibido como número público (regra `DATA-MODEL.md`).
- `ReplyComposer`: formulário (React Hook Form + Zod, `TASK-02`) para criar comentário (`parent_reply_id = null`) ou resposta (1 nível, `parent_reply_id` preenchido).
- `RepliesList`: lista de `post_reply` paginada por âncora (`@@index([post_id, parent_reply_id, createdAt])`), com respostas aninhadas em 1 nível apenas.

## Escopo backend

Implementação esperada:

- Endpoints de detalhe, respostas, criar resposta, votar e salvar.
- Unicidade de voto via `post_vote` (`@@unique([user_id, post_id])` / `@@unique([user_id, reply_id])`); upsert para alterar voto.
- `value` aceita apenas `1` (upvote) ou `-1` (downvote); downvotes nunca expostos individualmente.
- Paginar respostas por âncora.
- Validar permissão e `community_post.status`.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post`
- `post_reply` (`parent_reply_id` — árvore de 1 nível)
- `post_vote`
- `post_save`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/posts/:id` — detalhe do post.
- GET `/api/private/posts/:id/replies` — respostas paginadas por âncora.
- POST `/api/private/posts/:id/replies` — criar comentário/resposta; payload `{ content: string, parentReplyId?: string }`.
- POST `/api/private/posts/:id/vote` — votar/alterar voto; payload `{ value: 1 | -1, replyId?: string }` (sem `replyId` = voto no post). Reenviar o mesmo `value` remove o voto (toggle); upsert por `@@unique`.
- POST `/api/private/posts/:id/save` — salvar; DELETE `/api/private/posts/:id/save` — remover salvo (`post_save`).

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — replies paginadas (`page`/`limit` ou cursor por âncora); votos/salvar retornam o estado atualizado no envelope de sucesso para o optimistic update reconciliar.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- React Hook Form
- Zod
- TanStack Query
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
