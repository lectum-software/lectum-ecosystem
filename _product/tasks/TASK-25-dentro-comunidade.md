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

## Complemento 2026-06-14 — ranking Lectum apenas dentro da comunidade

- Pedido do usuário: restringir o algoritmo de ordenação estilo Reddit/Lectum às páginas internas de comunidade (`/app/community/[slug]`), mantendo o feed geral `/app/community/feed` sem esta ordenação.
- Backend: o endpoint `GET /api/private/community/:slug/posts` passou a aceitar `sort`/`period`, ordenar e paginar os posts da comunidade após calcular `sort_metrics`, com contadores reais por período para comentários/respostas (`post_reply.createdAt`) e upvotes (`post_vote.createdAt` com `value=1`). O endpoint do feed geral não recebe nem usa esses metadados.
- Ranking `Em destaque`: o frontend da página interna aplica `((upvotes * 3) + (comentarios * 5) + (respostasDePsicologos * 15) + (respostasDeTopMentor * 25) + (compartilhamentos * 4) - penalidades) / (horasDesdePublicacao + 2)^0.5` apenas em `CommunityDetailLogic`.
- `Novos`: ordena por `created_at DESC` e mantém ícone de relógio.
- `Mais comentados` e `Mais votados`: usam os contadores reais do período selecionado (`Esta semana`, `Este mês`, `Este ano`, `Desde sempre`) e aplicam o outro contador como desempate, preservando posts existentes e paginação.
- Penalidades: posts removidos continuam excluídos pela query `status = publicado`; campos de denúncia/ocultação/moderação ainda não existem no schema, então `penalty` fica preparado no contrato com valor `0` até haver fonte persistida. Compartilhamentos também ficam em `0` enquanto não existir evento persistido específico.
- Escopo: não houve alteração no algoritmo, contrato visual ou ordenação do feed geral `/app/community/feed`; a exibição de downvotes ao usuário permanece removida conforme ajustes anteriores.
- ADR atualizado: `adrs/0066-pagina-detalhe-comunidade-participacao.md`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm check`; HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/ansiedade-em-equilibrio` e `/app/community/feed`.

## Complemento 2026-06-14 — copy das regras da comunidade

- Pedido do usuário: atualizar apenas o conteúdo textual do card `Regras da comunidade` em `/app/community/[slug]`, preservando layout, accordion, ícones, hierarquia e comportamento existentes.
- Frontend: o subtítulo do card passou para `Comunidade mediada por psicólogos e moderada pela equipe Lectum.`.
- As regras foram substituídas e reordenadas para abordar privacidade, respeito, prevenção de conteúdos prejudiciais, papel mediador dos psicólogos e encaminhamento para WhatsApp quando houver desejo de consulta, diagnóstico ou acompanhamento individualizado.
- Escopo: sem mudanças de backend, Prisma, packages, rotas, lógica de ranking, responsividade ou layout do componente.
- ADR não atualizado por se tratar apenas de alteração de copy, sem decisão arquitetural, integração, regra de domínio nova ou trade-off relevante.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/ansiedade-em-equilibrio`.

## Complemento 2026-06-14 - busca contextual dentro da comunidade

- Pedido do usuario: corrigir a lupa da pagina interna de comunidade para abrir busca local, sem redirecionar para o feed global.
- Frontend: a lupa do `CommunityHeader` em `/app/community/[slug]` deixou de ser um link para `/app/community/feed` e passou a abrir um cabecalho de busca contextual na propria rota da comunidade.
- O cabecalho exibe `Buscar em {nome da comunidade}`, foca o campo automaticamente e envia o termo para `GET /api/private/community/:slug/posts?search=...`, preservando o contexto do `slug`.
- O botao voltar da busca fecha o modo de busca local, restaura a pagina anterior da paginacao e reposiciona o scroll na posicao registrada ao abrir a busca. A ordenacao ativa (`Em destaque`, `Novos`, `Mais comentados`, `Mais votados`) e seus periodos permanecem no estado atual.
- A lupa e o campo de busca do feed global `/app/community/feed` nao foram alterados e continuam usando a busca global do feed.
- Backend: a funcao `postSearchWhere` tambem passa a considerar `post_reply.title` e `post_reply.content` nao deletados, fazendo a busca da comunidade encontrar posts relacionados a comentarios/respostas persistidos sem sair do recorte da comunidade.
- Escopo: sem alteracao de Prisma schema, migrations, packages ou criacao de novas rotas; a correcao reutiliza o endpoint e query key existentes de posts por comunidade.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Dentro da Comunidade.jpg` e o pedido detalhado do usuario.
- ADR atualizado: `adrs/0066-pagina-detalhe-comunidade-participacao.md`.
- Validacoes executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir backend check`
  - `pnpm --dir frontend build`
  - `pnpm --dir backend build`
  - `pnpm check`
  - HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/ansiedade-em-equilibrio` e `/app/community/feed`.

## Complemento 2026-06-15 — identidade visual derivada do avatar

- Pedido do usuário: gerar automaticamente a identidade visual da página interna de comunidade a partir da imagem/avatar da comunidade, mantendo fallback azul quando a imagem não existir ou a extração falhar.
- Banco/contrato: `community` recebeu campos opcionais `avatar_url`, `visual_primary_color`, `visual_primary_dark_color`, `visual_soft_color`, `visual_text_color` e `visual_gradient_color`, documentados também em `DATA-MODEL.md`.
- Backend: os campos visuais passaram a ser selecionados e retornados nos DTOs de comunidade sem alterar lógica de participação, posts, ranking ou feed.
- Frontend: `/app/community/[slug]` agora resolve uma paleta determinística usando primeiro cores salvas, depois extração client-side do avatar via Canvas com cache em memória, ignorando tons muito claros, escuros ou pouco saturados e normalizando saturação/luminosidade antes de aplicar.
- Layout: a faixa superior usa gradiente com `primaryColor`/`primaryDarkColor`, halo radial com `softColor`, avatar/initials com `softColor`/`textColor` e chip de Top Mentores com a mesma paleta. Quando não há avatar/cor, permanece o azul padrão anterior.
- Sem packages novos e sem mocks; as colunas são nullable e não inventam imagem para comunidades existentes.
- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a referência visual usada foi `_product/proto/Dentro da Comunidade.jpg`.
- ADR criado: `adrs/0095-identidade-visual-comunidade-avatar.md`.
- Validações executadas: `pnpm --dir backend db:migrate --name add_community_visual_identity`, `pnpm --dir backend db:generate`, `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e validação HTTP local com 307 esperado em `/app/community/relacionamentos-com-proposito` sem cookie autenticado.

## Complemento 2026-06-15 — regras sem persistência, filtros integrados e FAB consistente

- Pedido do usuário: ajustar somente o estado/visual da página interna de comunidade, sem alterar lógica de ordenação, textos dos filtros ou ações existentes.
- Regras da comunidade: removida a persistência via `sessionStorage`; o accordion passa a iniciar sempre fechado ao entrar novamente na página ou remontar o componente.
- Ordenação: os filtros `Mais comentados` e `Mais votados` passaram a renderizar o seletor de período como controle integrado ao próprio chip, com a seta logo após o texto do botão e sem segmento lateral separado.
- FAB de publicar: o botão flutuante da página interna de comunidade foi alinhado ao mesmo tamanho/ícone/sombra/animação do botão flutuante do feed geral, preservando rota e ação.
- Escopo: sem mudanças de backend, Prisma, contratos, packages ou algoritmo de ordenação.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e validação HTTP local com 307 esperado em `/app/community/relacionamentos-com-proposito` sem cookie autenticado.
