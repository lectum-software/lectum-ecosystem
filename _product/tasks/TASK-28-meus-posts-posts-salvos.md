# TASK-28: Meus posts e posts salvos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-28 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Posts |
| Status | Pending |
| Dependências | TASK-24 |
| ADR alvo | ADR de posts do usuário e salvos |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Meus Posts - Paciente.jpg` | `figma-design-frame-14-Meus-Posts---Paciente.html` |
| `_product/proto/Meus Posts - Psicólogo.jpg` | `figma-design-frame-11-Meus-Posts---Psic-logo.html` |
| `_product/proto/Posts Salvos.jpg` | `figma-design-frame-7-Posts-Salvos.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

As telas permitem que usuários acompanhem conteúdo publicado/salvo. Devem usar os mesmos modelos de post e ações do feed.

## Objetivo

Criar telas para posts do usuário e posts salvos, diferenciando paciente e psicólogo.

## Pré-requisitos e bloqueios

- Depende de criação/salvamento real de posts.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md` — "Saved/my posts" sob `/app/posts/...`):

- `/app/posts/mine`
- `/app/posts/saved`

Implementação esperada:

- Criar listagem Meus Posts com variação por perfil.
- Criar listagem Posts Salvos.
- Permitir abrir detalhe do post.
- Exibir status do post quando houver moderação.
- Reutilizar card de post do feed.

## Escopo backend

Implementação esperada:

- Endpoints para posts do usuário autenticado e salvos.
- Garantir escopo por usuário (`community_post.author_id` para Meus Posts; `post_save.user_id` para Salvos).
- Paginar listas.
- Permitir remover salvo (`post_save`, `@@unique([user_id, post_id])`).
- Não retornar posts de outros usuários em Meus Posts.
- Exibir `community_post.status` em Meus Posts (incl. `"removido"`/`"pendente"` quando houver moderação).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (posts próprios)
- `post_save`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/posts/mine`
- GET `/api/private/posts/saved`
- DELETE `/api/private/posts/:id/save`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — listas paginadas (`page`/`limit`, resposta `data: { items, total, page, limit }`; `post_save` ordenado por `@@index([user_id, createdAt])`).

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
