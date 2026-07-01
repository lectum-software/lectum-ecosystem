# TASK-28: Meus posts e posts salvos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-28 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Posts |
| Status | Completed |
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

## Execução 2026-06-13

- Referências visuais consultadas pelas imagens locais `_product/proto/Meus Posts - Paciente.jpg`,
  `_product/proto/Meus Posts - Psicólogo.jpg` e `_product/proto/Posts Salvos.jpg`; o Builder/Quick
  Copy ativo não estava disponível como ferramenta callable no ambiente.
- Backend implementado nos endpoints `GET /api/private/posts/mine`, `GET /api/private/posts/saved`
  e na ação existente `DELETE /api/private/posts/:id/save`, sem alteração de schema Prisma.
- Frontend implementado em `/app/posts/mine` e `/app/posts/saved`, com estados de loading, erro,
  vazio, sucesso discreto e remoção de salvo real.
- Nenhum mock, seed artificial, endpoint simulado, package novo ou código gerado por Builder foi
  usado.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local mobile
  390x844 nas rotas privadas, com redirecionamento esperado para login sem sessão persistida e sem
  overflow horizontal.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Ajuste complementar em 2026-06-16 - acompanhamento de comentarios

- A rota `/app/posts/mine` foi renomeada visualmente para "Meus posts e comentarios" no perfil do paciente e no titulo da tela.
- A tela passou a iniciar em "Posts" e removeu o filtro "Todos", mantendo apenas "Posts" e "Comentarios" com controles premium.
- Cards de comentarios passaram a usar "Comentado em", removendo rotulos/acoes de engajamento do card e exibindo foco de acompanhamento: respostas recebidas e indicador "Respondido por psicologo" apenas quando ha resposta direta de profissional verificado.
- O bloco de conteudo original citado foi refinado visualmente com fundo, borda, radius, padding e faixa lateral mais discreta.
- Backend de `GET /api/private/posts/mine?type=replies` passou a retornar `replies_received_count` e `has_verified_professional_reply` derivados de dados reais, sem mock e sem alteracao de schema.

## Ajuste complementar em 2026-06-17 - limpeza dos cards de posts

- A rota `/app/posts/mine` removeu a badge/chip visual "PUBLICADO" dos cards de post para reduzir ruido visual.
- Os cards continuam usando o `CommunityPostCard` real e mantendo apenas o contexto "Postado em [comunidade]" na linha superior.
- O backend continua retornando `community_post.status` para compatibilidade e regras futuras, mas a tela nao exibe um status visual substituto nos cards de post.
- Referencias visuais da TASK-28 seguem sendo as imagens locais `_product/proto/Meus Posts - Paciente.jpg`, `_product/proto/Meus Posts - Psicologo.jpg` e `_product/proto/Posts Salvos.jpg`; o Builder/Quick Copy ativo nao esta disponivel como ferramenta callable neste ambiente.

## Ajuste complementar em 2026-06-17 - foco em comentarios do usuario

- Na aba "Comentarios" de `/app/posts/mine`, cada card de comentario passou a navegar para o post
  original com deep link `?focusReplyId=<replyId>#reply-<replyId>`.
- Comentarios diretos no post agora exibem o bloco de contexto "Post original" com o titulo real do
  post; respostas a comentarios continuam exibindo o trecho do comentario pai como contexto.
- O detalhe do post passou a aceitar `focusReplyId` ao carregar a arvore de comentarios, buscando a
  pagina que contem o comentario raiz daquela participacao e aplicando scroll automatico com
  destaque temporario no comentario alvo.
- A implementacao usa dados reais de `post_reply` e `community_post`, sem mock, sem novo package e
  sem alteracao de schema Prisma.
- Validacoes complementares executadas: `pnpm --dir backend check`, `pnpm --dir backend build`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke local mobile 390x844 em Chrome
  headless validando card direto com titulo do post, link com `focusReplyId` e destaque temporario
  do comentario no detalhe do post.

## Ajuste complementar em 2026-06-17 - padronizacao da tela Salvos

- A rota `/app/posts/saved` passou a renderizar acoes abaixo de posts e respostas salvas com a mesma `CommunityActionBar` usada no feed/comunidade: upvote/downvote, comentarios/respostas, salvar ativo em azul e compartilhar.
- Foram removidas acoes extras visiveis dos cards salvos, como botoes textuais `Abrir post`, lixeira vermelha e compartilhamento duplicado fora da barra padrao.
- Posts principais salvos deixaram de incorporar automaticamente a resposta profissional em destaque; respostas salvas continuam aparecendo como itens independentes.
- Respostas salvas agora recebem do backend autor, midia, voto atual e estado salvo reais para manter WhatsApp profissional, midia e interacoes consistentes sem mock.
- O CTA `Chamar no WhatsApp` de resposta profissional verificada usa a identidade do feed: fundo transparente, borda verde e texto/icone verdes.
- Validacao complementar: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local Chrome headless mobile 390x844 em `/app/posts/saved`, confirmando ausencia de `Abrir post`, ausencia de `Resposta profissional em destaque` dentro de post salvo, barra padrao renderizada e WhatsApp vazado verde.

## Ajuste complementar em 2026-06-17 - comentarios com barra padrao e contexto limpo

- Na aba "Comentarios" de `/app/posts/mine`, o chip `X respostas recebidas` foi removido e substituido pela `CommunityActionBar` compartilhada: upvote, downvote, respostas, salvar e compartilhar.
- Cards de comentarios diretos ao post exibem apenas o titulo do post no bloco de contexto, sem rotulo `POST ORIGINAL` e sem icone lateral; respostas a comentarios continuam exibindo o trecho do comentario pai.
- Comentarios continuam navegando para o post original com `?focusReplyId=<replyId>#reply-<replyId>`, preservando scroll automatico e destaque temporario no detalhe do post.
- Posts da aba "Posts" e contextos de post na aba "Comentarios" exibem a flag premium `Respondido por psicologo verificado` quando o post possui resposta profissional verificada real.
- O seletor segmentado `Posts / Comentarios` teve o glow/sombra externa removido, mantendo apenas borda, radius e contraste de estado ativo.
- O backend passou a devolver voto atual e estado salvo dos comentarios em `/api/private/posts/mine`, derivados de `post_vote` e `post_reply_save`, sem schema novo e sem mock.
- Referencias visuais seguem as imagens locais da TASK-28; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 validando ausencia do chip de respostas recebidas, ausencia de `POST ORIGINAL`, seletor sem box-shadow, deep link com `focusReplyId` e seletor compacto de notificacoes sem overflow.

## Ajuste complementar em 2026-06-17 - biblioteca Salvos mais limpa

- A rota `/app/posts/saved` passou a exibir respostas salvas com cabecalho `Respondido em`, removendo o texto antigo `Resposta salva em`.
- O quadrante azul de referencia de post/comentario pai foi removido dos cards de respostas salvas; a tela passa a destacar apenas o comentario efetivamente salvo.
- Respostas salvas agora exibem avatar, nome, selo de verificado quando houver, badge de mentor quando existir, tipo/cargo do autor e data relativa da publicacao no mesmo padrao visual dos comentarios dentro do post.
- Posts salvos deixaram de exibir a data de salvamento como chip azul/uppercase e passam a usar texto simples cinza `Salvo em ...`, preservando a data apenas como metadado secundario.
- Nao houve alteracao de schema Prisma, endpoints ou nova dependencia; o ajuste reutiliza o DTO de respostas salvas enriquecido anteriormente.
- Referencias visuais seguem as imagens locais da TASK-28; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 em `/app/posts/saved`, confirmando `Respondido em` visivel, ausencia de `Resposta salva em`, ausencia de `SALVO EM`, ausencia de `blockquote` de referencia azul, barras padrao de acao e largura sem overflow horizontal.

## Ajuste complementar em 2026-06-17 - contador de salvamentos em Meus posts

- Na aba "Comentarios" de `/app/posts/mine`, a `CommunityActionBar` passou a exibir a quantidade real de salvamentos de cada comentario ao lado do icone de salvar.
- O backend de `GET /api/private/posts/mine?type=replies` passou a retornar `saves_count` calculado por `_count` de `post_reply_save` ativo (`deleted=false`), sem alterar schema Prisma.
- As acoes `POST/DELETE /api/private/posts/:id/replies/:replyId/save` agora devolvem `saves_count` real apos a transacao, permitindo feedback otimista e reconciliacao visual imediata.
- A aba "Posts" continua reutilizando `CommunityPostCard`, que ja exibe `community_post.saves_count` na mesma barra padrao do feed/post; a alteracao mantem consistencia entre posts e comentarios.
- Referencias visuais seguem as imagens locais da TASK-28; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, consulta autenticada de `GET /api/private/posts/mine?type=replies`, ciclo real `POST/DELETE /api/private/posts/:id/replies/:replyId/save` confirmando `saves_count`, e Chrome/CDP mobile 390x844 em `/app/posts/mine` validando contador de salvamentos em comentarios e posts sem overflow horizontal.

## Ajuste complementar em 2026-06-17 - precisão da flag profissional em comentários

- Pedido direto de produto: na aba "Comentarios" de `/app/posts/mine`, a linha `Comentado em [comunidade]` deve se aproximar do padrão do feed, com metadado cinza discreto e comunidade com destaque leve, sem parecer título principal.
- A flag `Respondido por psicologo verificado` deixou de usar `post.highlighted_professional_reply`, que representava resposta ao post principal e podia refletir comentários de terceiros.
- A flag agora usa exclusivamente `reply.has_verified_professional_reply`, derivada do comentário específico do usuário, e é exibida abaixo do texto do comentário, antes da `CommunityActionBar`.
- O contrato em `_product/tasks/DATA-MODEL.md` foi esclarecido: a flag considera apenas respostas diretas ativas daquele comentário específico feitas por psicólogo verificado, sem considerar o post principal ou outras árvores.
- Não houve alteração de schema Prisma, migration, pacote, ordenação, navegação, votos, salvamentos ou compartilhamento.

### Validação do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/mine` mobile `390x844`, validando a linha `Comentado em` discreta, ausência da tag dentro do bloco de contexto e ausência de overflow horizontal.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.


## Ajuste complementar em 2026-06-17 - padronizacao final dos cards salvos

- Pedido direto de produto: em `/app/posts/saved`, os cards nao devem exibir mais o texto `Salvo em ...`; o header passa a manter apenas o contexto do conteudo: `Postado em [comunidade]` para posts e `Respondido em [comunidade]` para comentarios/respostas.
- Respostas salvas seguem a mesma estrutura visual dos cards de post: header de comunidade, metadados do autor, conteudo, midia/WhatsApp quando houver e `CommunityActionBar` ao final.
- Quando o autor da resposta salva e paciente, a linha de metadados exibe somente o tempo da publicacao; quando e psicologo, mantem `Psicologo • tempo` conforme o padrao dos comentarios no post.
- A `CommunityActionBar` de respostas salvas passou a usar a mesma apresentacao do feed, incluindo cluster de up/downvote, contador de respostas, contador de salvamentos ativo em azul e compartilhar. Posts salvos continuam usando `CommunityPostCard`, agora sem data de salvamento no header e com contexto visual discreto.
- Nao houve alteracao de schema Prisma, endpoint, pacote, ordenacao ou persistencia; a mudanca e de apresentacao e reutiliza contadores reais ja expostos no DTO.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/saved` mobile `390x844`, validando ausencia de `Salvo em`, contexto `Postado em`/`Respondido em`, ausencia de bloco de referencia azul, contador de salvamentos na barra padrao e ausencia de overflow horizontal.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.

## Ajuste complementar em 2026-06-17 - posts alinhados aos cards de comentarios

- Na aba "Posts" de `/app/posts/mine`, os cards deixam de exibir avatar, nome e metadados do autor, mantendo apenas a linha de contexto `Postado em [comunidade] � [tempo]` no topo.
- A linha `Postado em` passa a usar o mesmo tom discreto dos cards de comentarios, com comunidade em destaque leve e tempo na mesma linha.
- O `CommunityPostCard` recebeu props opt-in para ocultar o header de autor, mostrar tempo na linha de comunidade e trocar a `CommunityActionBar` para a apresentacao inline usada em comentarios.
- A aba "Posts" passa a usar a mesma barra padrao da aba "Comentarios": upvote/downvote inline, comentarios, salvamentos e compartilhar, sem alterar endpoints, schema Prisma ou ordenacao.
- Referencias visuais seguem as imagens locais da TASK-28; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/mine` mobile `390x844`, validando card de post sem avatar/nome, contexto com tempo na mesma linha e barra de acoes no padrao de comentarios.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.

## Ajuste complementar em 2026-06-18 - header secundário premium compartilhado

- Pedido direto de produto: padronizar `Meus posts e comentários` e `Salvos` com o mesmo header visual de `Meus Analytics` e `Minhas Avaliações`.
- As rotas `/app/posts/mine` e `/app/posts/saved` passaram a usar `AppPageHeader`, preservando botão de voltar à esquerda, título centralizado, fundo branco, borda suave, sombra discreta e sem textos auxiliares no header.
- A alteração substitui apenas a superfície de navegação secundária; filtros, cards, paginação, ações reais, salvamentos, votos, compartilhamento e estados de API permanecem inalterados.
- Escopo: sem alteração de backend, endpoints, DTOs, schema Prisma, packages ou dados.
- ADR criado: `adrs/0119-header-secundario-premium-compartilhado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em mobile 390x844 e desktop 1024x768 confirmando header centralizado e ausência de overflow horizontal.


## Ajuste complementar em 2026-06-21 - foco robusto em respostas profundas

- Pedido direto de produto: ao clicar em uma resposta na aba `Respostas` de `/app/posts/mine`, a navegacao deve repetir o comportamento de respostas salvas, abrindo o post original no comentario/resposta exata e aplicando foco contextual.
- O card de resposta de `Meus posts e respostas` ja usa o deep link `?focusReplyId=<replyId>#reply-<replyId>`; o ajuste fortaleceu o destino para respostas em arvores profundas.
- O backend de `GET /api/private/posts/:id/replies` agora, quando recebe `focusReplyId`, carrega tambem o caminho real de ancestrais ate a resposta focada, mesmo quando ela passa da profundidade inline padrao. A paginacao continua ancorada no comentario raiz correto.
- O detalhe do post passa a renderizar a trilha focada alem do limite visual padrao apenas para esse caminho, sem expandir a arvore inteira, e aplica foco DOM temporario junto ao pulso visual azul.
- Nao houve alteracao de schema Prisma, migration, package, endpoint paralelo, mock ou dados artificiais.
- Referencias visuais seguem `_product/proto/Meus Posts - Paciente.jpg`, `_product/proto/Meus Posts - Psicologo.jpg`, `_product/proto/Posts Salvos.jpg` e `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0143-post-cards-clique-unificado.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, smoke API com `focusReplyId` profundo confirmando o alvo no payload e Chrome/CDP mobile 390x844 no detalhe do post confirmando elemento `reply-<id>` renderizado, focado, com `lectum-reply-focus-pulse` e scroll centralizado.

## Ajuste complementar em 2026-06-21 - abas fora do header em Meus posts e respostas

- Pedido direto de produto: em `/app/posts/mine`, as opcoes `Posts` e `Respostas` nao devem ficar dentro do header da tela.
- O header passa a exibir somente o botao de voltar e o titulo centralizado `Meus posts e respostas` / `Meus posts e comentarios`.
- O filtro entre posts e respostas foi movido para um card separado logo abaixo do header, centralizado e com o mesmo padrao visual do resumo de publicacoes do perfil do psicologo: icone, contador antes do rotulo e divisor vertical entre opcoes em telas maiores.
- A semantica de abas e o comportamento funcional de filtro, contadores reais, paginacao e carregamento foram preservados, sem alteracao de endpoint, DTO, schema Prisma, packages ou dados.
- Referencia visual aplicada a partir do padrao ja implementado no perfil do psicologo; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0144-meus-posts-abas-integradas.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP local em `/app/posts/mine` mobile `390x844`, confirmando filtro fora do header, centralizado e com botoes `2 Posts` / `1 Respostas`.
## Ajuste complementar em 2026-06-21 - ações de respostas do usuário

- Pedido direto de produto: na aba `Respostas` de `/app/posts/mine`, respostas/comentários do usuário devem ter menu próprio com `Editar`, `Silenciar` e `Excluir`, equivalente ao menu de posts do usuário.
- Backend: foi adicionado `PUT /api/private/posts/:id/replies/:replyId` para edição owner-only do conteúdo de `post_reply`, usando validação real e sem alterar schema Prisma.
- A exclusão `DELETE /api/private/posts/:id/replies/:replyId` manteve remoção em cascata da subárvore, mas passou a aplicar a mesma regra de preservação dos posts: autores psicólogos podem excluir a qualquer momento; autores não psicólogos são bloqueados quando a subárvore já contém contribuição de psicólogo.
- Frontend: o menu de respostas usa o estado real do autor, abre modal de edição com React Hook Form/Zod/TASK-02, confirma exclusão e, quando a exclusão é bloqueada, oferece silenciar a conversa via mute real do post.
- `Silenciar` em comentário/resposta reaproveita o mute persistido do post porque as notificações de respostas pertencem à conversa do post; não foi criado modelo paralelo de mute por reply.
- Não houve novo package, mock, seed artificial, migration ou alteração de storage.
- ADR criado: `adrs/0146-acoes-respostas-usuario.md`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 em `/app/posts/mine`, confirmando menu `Editar/Silenciar/Excluir` nas respostas e abertura do modal de edição sem submeter alterações.


## Ajuste complementar em 2026-06-21 - modal de edição igual à criação

- Pedido direto de produto: a modal de edição de post deve usar a mesma superfície visual da criação de post, sem uma tela/layout paralelo.
- `PostEditModal` passou a reutilizar o padrão mobile-first do sheet de criação: cabeçalho com fechar/título/ajuda, área editorial branca com campos sem bordas pesadas, miniatura de mídia dentro da área em branco e rodapé fixo com ação primária.
- A faixa azul de `Dados fixos` foi removida; os dados que não podem mudar ficam como controles inativos no próprio fluxo: comunidade em seletor desabilitado e anonimato em switch desabilitado quando aplicável.
- A regra de edição continua preservando o domínio: somente título, conteúdo e mídia são enviados ao endpoint `PUT /api/private/posts/:id`; comunidade, autoria, anonimato e status seguem imutáveis.
- Não houve alteração de schema Prisma, endpoint, package, mock ou storage.
- Referência visual aplicada a partir da modal de criação já implementada e das imagens locais da TASK-28; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0145-edicao-post-publicado.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile `390x844` em `/app/posts/mine`, confirmando abertura da modal `Editar Post`, ausência de `Dados fixos`, ausência de `Cancelar`, seletor de comunidade inativo, campos editoriais sem bordas pesadas e rodapé com `Mídia`/`Salvar`.

## Ajuste complementar em 2026-06-22 - sem WhatsApp proprio e flag profissional externa

- Pedido direto de produto: em `/app/posts/mine`, nao exibir o CTA de WhatsApp em conteudos do proprio psicologo e nao mostrar `Respondido por psicologo verificado` quando a resposta profissional direta foi criada pelo proprio autor.
- Frontend: `CommunityPostCard` recebeu prop opt-in para ocultar CTAs de WhatsApp sem alterar o padrao publico do feed, salvos e perfil; `/app/posts/mine` usa essa prop para posts e respostas destacadas proprias.
- Backend: a flag `has_verified_professional_reply` em `GET /api/private/posts/mine?type=replies` passou a considerar apenas respostas diretas de outros psicologos verificados, preservando o indicador quando outro profissional responder.
- Nao houve alteracao de schema Prisma, migrations, packages, endpoints novos, regras de WhatsApp publico fora da area pessoal, votos, salvos, edicao, exclusao ou notificacoes.
- Referencias visuais seguem as imagens locais `_product/proto/Meus Posts - Paciente.jpg`, `_product/proto/Meus Posts - Psicologo.jpg` e o screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`; smoke API real criando e removendo uma resposta direta propria do psicologo confirmou `replies_received_count=1` com `has_verified_professional_reply=false`; Chrome/CDP mobile `390x844` em `/app/posts/mine` confirmou ausencia de `Chamar no WhatsApp` e ausencia de `Respondido por psicologo verificado` no card da resposta propria com filho criado pelo mesmo psicologo.
## Ajuste complementar em 2026-06-23 - scroll infinito em Meus posts e respostas

- A rota `/app/posts/mine` deixou de exibir a barra visual de paginação nas abas `Posts` e `Respostas/Comentários`.
- A lista passou a usar React Query infinito com o contrato paginado real de `GET /api/private/posts/mine`, carregando novas páginas automaticamente por `IntersectionObserver` ao rolar para o fim.
- As contagens das abas continuam usando dados reais do endpoint ativo ou consultas leves de contagem para a aba inativa.
- Estados de loading inicial, atualização, erro, vazio e carregamento incremental foram preservados sem mock, sem novo package e sem alteração de schema Prisma.
- Builder/Quick Copy não está disponível como ferramenta callable neste ambiente; a validação visual segue o layout atual e o screenshot do usuário.

## Ajuste complementar em 2026-06-23 - midia em minhas respostas

- Pedido direto de produto: na aba `Respostas/Comentarios` de `/app/posts/mine`, respostas que tenham midia anexada tambem devem exibir essa midia no card da lista.
- Frontend: `ReplyItemCard` passou a renderizar `media_url`/`media_type` reais da resposta usando `CommunityMediaBlock`, com variante `reply` e sem CTA de WhatsApp, preservando a regra de conteudo proprio.
- Respostas somente com midia continuam validas visualmente: o texto e renderizado apenas quando houver conteudo, sem criar bloco vazio.
- A midia fica marcada como alvo interativo para nao quebrar controles de video/imagem nem o deep link do card para a resposta dentro do post.
- Nao houve alteracao de endpoint, schema Prisma, storage, package, mock ou dados artificiais; o endpoint `/api/private/posts/mine` ja entregava os campos de midia da resposta.
- Builder/Quick Copy nao esta disponivel como ferramenta callable neste ambiente; a referencia foi o screenshot do usuario e os componentes de midia ja existentes na comunidade.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.
- ADR criado: `adrs/0155-midia-respostas-meus-posts.md`.

## Ajuste complementar em 2026-06-26 - modal de exclusao acima do card

- Pedido direto de produto: a modal de excluir em `/app/posts/mine` nao pode deixar icones/textos do card de fundo sobrepostos ao conteudo da confirmacao, e os botoes `Cancelar` e `Excluir` precisam ter tipografia mais legivel.
- Frontend: as modais de confirmacao de acoes do dono (`PostOwnerActionMenu` e `ReplyOwnerActionMenu`) passaram a ser renderizadas via portal no `document.body`, com overlay isolado em `z-[1000]` e card interno acima do restante da tela.
- Os botoes do rodape dessas modais receberam `text-base` e peso `font-extrabold`, preservando altura, variantes `outline`/`destructive`, estados disabled/loading e comportamento de teclado/escape.
- Nao houve alteracao de backend, schema Prisma, endpoints, packages, dados, permissoes, exclusao, silenciamento, edicao, votos ou salvos.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi o screenshot do usuario e as imagens locais da TASK-28 em `_product/proto`.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/components/community/reply-owner-action-menu.tsx src/components/community/post-owner-action-menu.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/mine` retornou 200.
- `git diff --check`
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.

## Ajuste complementar em 2026-06-26 - fonte do Salvar na edicao de post

- Pedido direto de produto: na modal `Editar Post`, aumentar a fonte do texto do botao primario `Salvar` no rodape fixo.
- Frontend: `PostEditModal` passou o botao `Salvar` de `text-base` para `text-lg`, mantendo `font-black`, altura `h-12`, formato arredondado, estado disabled/loading e a hierarquia visual do rodape da edicao.
- A mudanca e exclusivamente visual/mobile-first; nao altera submit, validacao, React Hook Form/Zod, endpoint `PUT /api/private/posts/:id`, schema Prisma, packages, midia, anonimato, comunidade, permissao ou dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi o screenshot do usuario e as imagens locais da TASK-28 em `_product/proto`.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/components/community/post-edit-modal.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/mine` retornou 200.
- `git diff --check`
- ADR atualizado: `adrs/0145-edicao-post-publicado.md`.

## Ajuste complementar em 2026-07-01 - resposta profissional destacada em Salvos

- Pedido direto de produto: quando um post salvo possuir `highlighted_professional_reply`, o card em
  `/app/posts/saved` deve exibir essa resposta-destaque como no feed/comunidade.
- Frontend: a rota de Salvos deixou de desativar a renderizacao da resposta profissional destacada
  ao reutilizar `CommunityPostCard`; o componente volta a usar o comportamento padrao do feed para
  posts principais salvos de pacientes com resposta profissional verificada.
- O backend ja retornava `highlighted_professional_reply` real em `GET /api/private/posts/saved`
  via `listPostSelect`/`toListPostResponse`; nao houve alteracao de endpoint, DTO, schema Prisma,
  migrations, packages, votos, salvamentos, respostas salvas independentes ou persistencia.
- Mobile-first: referencia visual consultada em `_product/proto/Posts Salvos.jpg` e comparada com
  `_product/proto/Feed Comunidade.jpg`; o Builder/Quick Copy ativo nao esta exposto como ferramenta
  callable neste ambiente.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`,
  `git diff --check` e Chrome headless mobile `390x844` em `/app/posts/saved`; sem sessao
  persistida no perfil headless, a rota redirecionou para login, entao a comparacao visual
  autenticada foi feita pelas imagens locais e pelo reuso do `CommunityPostCard` ja validado no
  feed.

## Ajuste complementar em 2026-07-01 - card salvo identico ao feed

- Pedido direto de produto: em `/app/posts/saved`, posts salvos devem usar o mesmo card do feed, incluindo a resposta profissional destacada, sem o rotulo extra e sem espacamentos/cores diferentes.
- Frontend: `CommunityPostCard` recebeu a apresentacao opt-in `presentation="feed"`, que aplica o mesmo container, header de comunidade com `CommunityFollowToggle`, tipografia, divisores, espacamento, borda do action bar e labels do feed/comunidade.
- A resposta profissional destacada nessa apresentacao usa a mesma composicao visual do feed: card azul claro, coluna lateral, avatar/identidade do psicologo, metadados, texto expansivel em 2 linhas e midia/WhatsApp no mesmo bloco.
- `/app/posts/saved` passa `presentation="feed"` somente para itens do tipo post salvo; respostas salvas independentes continuam com o card proprio de resposta, preservando a diferenca sem criar mock ou endpoint paralelo.
- Nao houve alteracao de backend, schema Prisma, migrations, packages, dados artificiais, votos, salvamentos, DTOs ou persistencia.
- Mobile-first: referencia visual comparada com `_product/proto/Posts Salvos.jpg` e `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0072-meus-posts-e-posts-salvos.md`.

### Validacao do ajuste

- `pnpm --dir frontend exec biome check --write src/components/community/community-post-card.tsx src/app/app/posts/saved/logic.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/saved` retornou 200.
- Chrome headless mobile `390x844` foi executado contra `/app/posts/saved`, mas sem sessao autenticada persistida o ambiente headless nao permitiu comparacao autenticada; a verificacao visual ficou baseada no reuso da apresentacao do feed e nas imagens locais.
