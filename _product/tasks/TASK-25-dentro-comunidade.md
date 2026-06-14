# TASK-25: Dentro da comunidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-25 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
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

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.


## Execução 2026-06-13

- Referência visual consultada: `_product/proto/Dentro da Comunidade.jpg`. Builder Quick Copy não esteve disponível como ferramenta MCP neste ambiente; a implementação usou a imagem local registrada no inventário.
- Backend: criado `community_member` com `@@unique([community_id, user_id])`, endpoint `GET /api/private/community/:slug`, ações `POST/DELETE /api/private/community/:slug/members` e filtro real de `scope=following` no feed.
- Frontend: `/app/community/feed` permanece como feed global; `/app/community/[slug]` agora renderiza a página de detalhe com capa derivada, nome, descrição, regras gerais Lectum, contadores reais, participação e posts reais da comunidade.
- Nenhum mock, seed artificial ou endpoint simulado foi criado; o estado vazio informa ausência de publicações persistidas.
- Validações executadas: `pnpm --dir backend db:migrate --name add_community_membership`, `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e validação local via HTTP em `/app/community/ansiedade-em-equilibrio` e `/app/community/feed`.

## Complemento 2026-06-14 — regras da comunidade em accordion

- Frontend: o bloco “Regras da comunidade” em `/app/community/[slug]` foi transformado em accordion recolhido por padrão, mantendo no cabeçalho o ícone de escudo, título, subtítulo e seta de estado.
- As regras atuais foram preservadas exatamente como conteúdo expandido; o clique em qualquer área do cabeçalho alterna expansão/retração com animação de 300ms e rotação da seta.
- Persistência: a preferência de expansão/retração é lembrada apenas durante a sessão do usuário via `sessionStorage`, usando chave por `slug` da comunidade.
- Escopo: alteração visual aplicada em desktop e mobile, sem mudanças de backend, schema Prisma, lógica de domínio, rotas ou packages.
- ADR atualizado: `adrs/0066-pagina-detalhe-comunidade-participacao.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `GET http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio` e `GET http://127.0.0.1:3000/app/community/feed`.

## Complemento 2026-06-14 — topo limpo, ordenação e nav mobile

- Pedido do usuário: refinar `/app/community/[slug]` para que a faixa azul do cabeçalho comece no topo da área útil, remover o bloco textual de posts e o botão inline de publicar, ajustar a ordenação e esconder a nav inferior no mobile ao rolar para baixo.
- Layout: o `PrivateTemplate` da página de comunidade recebeu `!pt-0` no conteúdo para remover o respiro superior herdado do `PageShell`; a faixa azul do `CommunityHeader` passa a ser o primeiro elemento visível da área de conteúdo.
- Área de posts: removidos os textos `Posts da comunidade` e `Dados reais publicados nesta comunidade`, além do botão `+ Publicar`; permanece apenas o botão flutuante de criação.
- Ordenação: o menu agora possui `Em destaque`, `Novos`, `Mais comentados` e `Mais votados`; `Novos` usa ícone de relógio.
- Períodos: `Mais comentados` e `Mais votados` exibem dropdown próprio com `Esta semana`, `Este mês`, `Este ano` e `Desde sempre`, mantendo estados independentes para cada ordenação.
- Como a API atual expõe contadores agregados do post e `created_at`, o período atua na ordenação priorizando posts criados na janela escolhida, sem ocultar posts antigos nem alterar paginação/backend.
- Nav mobile: `PrivateTemplate` passou a separar visibilidade mobile e desktop; `autoHideNavigation` agora oculta suavemente apenas a bottom nav em telas mobile ao rolar para baixo e mostra ao rolar para cima. A sidebar desktop não é afetada.
- Escopo: sem mudanças de backend, Prisma, migrations, packages, schema, contratos de API ou conteúdo dos posts.
- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a referência visual usada foi `_product/proto/Dentro da Comunidade.jpg` e o pedido detalhado do usuário.
- ADR atualizado: `adrs/0066-pagina-detalhe-comunidade-participacao.md`.
- Validações executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP 200 em `http://localhost:3000/app/community/ansiedade-em-equilibrio` e HTTP 200 em `http://localhost:3000/app/community/feed`.
