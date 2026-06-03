# TASK-25: Dentro da comunidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-25 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Comunidades |
| Status | Pending |
| Dependências | TASK-23 |
| ADR alvo | ADR de página de comunidade |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Dentro da Comunidade.jpg` | `figma-design-frame-8-Dentro-da-Comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A tela é longa e combina cabeçalho, descrição e lista de posts. Deve reutilizar feed/post cards e não duplicar queries sem necessidade.

## Objetivo

Criar página de comunidade com dados, posts, membros/participação e CTA de postagem.

## Pré-requisitos e bloqueios

- Depende de comunidade persistida.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/[slug]`

Implementação esperada:

- Criar rota dinâmica de comunidade.
- Exibir capa/nome/descrição/regras/contadores.
- Listar posts daquela comunidade.
- CTA para criar postagem já com comunidade selecionada.
- Estados de não encontrado e comunidade vazia.

## Escopo backend

Implementação esperada:

- Endpoint de detalhe da comunidade por `slug`.
- Reutilizar o endpoint de feed por comunidade (`TASK-23`) para listar posts; não criar variante divergente.
- Filtrar posts por `community_post.status = "publicado"`.
- Usar `community.members_count` (denormalizado) e contadores reais; participação via `community_member` (`@@unique([community_id, user_id])`).
- Não criar comunidade automaticamente.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community`
- `community_member`
- `community_post`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community/:slug`
- GET `/api/private/community/:slug/posts`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — detalhe no envelope de sucesso padrão; lista de posts paginada (`page`/`limit`, resposta `data: { items, total, page, limit }`).

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
