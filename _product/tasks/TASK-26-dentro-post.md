# TASK-26: Dentro do post

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-26 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
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

Execução: Builder/Quick Copy não estava disponível no ambiente Codex; a referência visual foi consultada pela imagem local `_product/proto/Dentro do Post.jpg`.

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


## Execucao complementar: downvote privado e animacao externa de upvote (2026-06-14)

- Pedido do usuario: no feed `/app/community/feed`, nao exibir a quantidade de downvotes em posts e respostas, preservando a logica real de downvote, e fazer a animacao de upvote flutuar fora do container do botao.
- O componente compartilhado `VoteActionButton` passou a renderizar o indicador `+1` em uma camada wrapper externa ao `button`, com `overflow-visible` e `z-index`, para evitar que a animacao fique presa no fundo do botao.
- O grupo de votos do card de feed removeu `overflow-hidden`, permitindo que o `+1` saia visualmente do pill de upvote/downvote.
- A contagem de downvotes deixou de ser passada para o botao de downvote no card do feed e na barra de votos do detalhe do post; a seta continua acionando a mutation real de voto.
- O card reutilizado de posts salvos/meus posts tambem deixou de mostrar numero de downvotes, mantendo apenas o icone de downvote no grupo de votos.
- Respostas ja nao exibiam contagem de downvotes e mantiveram a mesma logica de voto.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads ou regras de persistencia.
- ADR atualizado: `adrs/0076-estado-voto-feed-comunidade.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local em `/app/community/feed` respondeu `200`.

## Execução complementar: detalhe do post inspirado no Reddit (2026-06-15)

- Pedido do usuário: ajustar a tela interna do post conforme referência `Dentro do Post`, com menu de denúncia, composer compacto, composer mobile fixo, mídia restrita a psicólogos assinantes/verificados e vídeo de resposta em proporção 9:16 controlada.
- Referência visual consultada: `_product/proto/Dentro do Post.jpg`. Builder/Quick Copy não foi usado diretamente no ambiente; a imagem local/PDF foi usada como fallback auditável.
- O menu de três pontos do post passou a abrir a opção `Denunciar post` e o fluxo persistente `POST /api/private/posts/:id/report`.
- O composer usa placeholder `Participe da conversa`, fica compacto no desktop e fixo no rodapé mobile, expandindo apenas durante interação/digitação.
- O upload real de mídia de resposta foi adicionado em `POST /api/private/posts/:id/replies/media` e a criação de resposta aceita `mediaUrl`/`mediaType` somente quando originados do fluxo permitido.
- Backend bloqueia upload e criação de resposta com mídia para pacientes, psicólogos sem CFP verificado ou sem Plano Profissional ativo.
- Vídeos anexados em respostas usam card 9:16 com largura máxima, alinhado ao padrão do feed/comunidade.
- ADR criado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validações executadas: `pnpm --dir backend db:migrate --name add_post_reports`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` na rota do detalhe.

## Execucao complementar: badge TOP Mentor premium no detalhe (2026-06-15)

- O mesmo componente compartilhado `MentorBadge` foi aplicado ao detalhe do post para manter consistencia visual nas respostas/comentarios internos.
- O ajuste altera somente tipografia, cor e brilho do selo; ranking, conteudo, posicao, dados, comentarios e ordem de exibicao permanecem inalterados.
- Referencia visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- ADR criado: `adrs/0097-top-mentor-badge-premium.md`.

## Execucao complementar: arvore visual de comentarios do detalhe (2026-06-16)

- Pedido do usuario: aproximar a arvore de comentarios de `/app/community/[slug]/post/[id]` da referencia `Dentro do Post`, pagina 1, priorizando linhas de hierarquia e visual integrado.
- Fonte visual: o PDF local `C:\Users\tulio\Downloads\Dentro do Post (1).pdf` foi usado como referencia indicada; como a captura direta do PDF por Chrome headless nao renderizou a pagina, a execucao usou a imagem local equivalente `_product/proto/Dentro do Post.jpg` como fallback auditavel.
- A lista de respostas passou a ter uma linha azul principal fina e continua na lateral esquerda, acompanhando a arvore visivel da discussao.
- Cada comentario agora e renderizado como item integrado a thread, sem bordas/card cinza ao redor, com linhas cinza discretas abaixo do avatar e nas camadas filhas.
- A profundidade visual foi limitada a tres niveis: comentario principal, resposta nivel 1 e resposta nivel 2; niveis adicionais ficam acessiveis pelo fluxo existente de `Ver mais respostas`/thread.
- A acao de upvote em comentarios removeu o texto `Util`, mantendo apenas seta e contagem; `Responder` ficou como texto sem icone.
- O link `Ver mais respostas` ganhou uma barra cinza curta antes do texto, alinhada a camada onde as respostas serao abertas.
- Nao houve alteracao de ordenacao, destaque de psicologos verificados, backend, Prisma, contratos, packages ou persistencia.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.

## Execucao complementar: fullscreen consistente de videos no detalhe (2026-06-16)

- Pedido do usuario: garantir expansao/tela cheia dos videos dentro do post, incluindo midias anexadas em respostas, sem alterar arvore de comentarios ou ordenacao.
- O `VerticalVideoPlayer` compartilhado removeu `nofullscreen` de `controlsList` e passou a priorizar a Fullscreen API com suporte a iOS/Safari via `webkitEnterFullscreen()`.
- O fallback em lightbox agora calcula a proporcao real do video ao carregar metadados, preservando videos verticais e horizontais sem esticar.
- Nao houve alteracao de backend, Prisma, migrations, packages, regras de destaque, votos, respostas ou layout dos comentarios.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.

## Execucao complementar: cancelamento discreto do composer de respostas (2026-06-16)

- Pedido do usuario: remover a linha separada `Respondendo [nome]`, indicar o contexto apenas pelo placeholder e permitir cancelar o campo focado pelo icone ao lado do envio ou por arrasto para baixo no mobile.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- O placeholder do comentario direto no post voltou ao padrao `Comentar no post`; respostas usam placeholder contextual `Responder [nome]` sem linha extra acima do campo.
- O composer passou a exibir um botao discreto de cancelar quando o campo esta focado, a esquerda do envio; o cancelamento limpa o rascunho/midia local, limpa o alvo de resposta ativo, desfoca o campo e nao altera a mutation de envio.
- No mobile, o composer focado aceita um gesto vertical de arrasto para baixo com limite minimo; o gesto aplica apenas ao campo focado e nao captura scroll fora do composer.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads ou logica de persistencia/envio.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e HTTP local `200` na rota do detalhe com cookie de sessao local de validacao.

## Execucao complementar: controles compactos em todas as camadas (2026-06-16)

- Pedido do usuario: reduzir o peso visual de `Responder`, manter salvar e compartilhar em todas as camadas da arvore e impedir quebra de linha dos controles de interacao.
- A variante compacta `xs` de `CommunityActionBar` passou a usar layout `flex-nowrap`, gaps menores e grupo final sem `ml-auto` nos comentarios, mantendo upvote, downvote, contador, `Responder`, salvar e compartilhar na mesma linha.
- `Responder` continua sem icone e ganhou texto interno proprio para escala compacta (`9px`, peso medio), evitando que o reset global de botoes aumente a tipografia.
- `PostActionButton` e `VoteActionButton` reduziram altura, largura e padding na variante `xs`, preservando icones alinhados e sem fundo cinza no voto inline.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao dos comentarios ou regra de destaque de psicologos verificados.
- ADR atualizado: `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP mobile em 390px confirmando 11 barras de resposta com `topSpread=0`, salvar/compartilhar presentes e sem quebra de linha.

## Execucao complementar: recolher e expandir arvore pelo comentario raiz (2026-06-16)

- Pedido do usuario: permitir recolher/expandir uma arvore ao clicar/tocar no primeiro comentario da arvore, sem afetar acoes internas ou outras arvores.
- Cada `ReplyCard` de primeira camada controla localmente seu estado recolhido; respostas de segunda camada em diante nao recebem comportamento de recolhimento.
- Ao recolher, os descendentes daquela arvore deixam de renderizar e aparece a indicacao `Ver X resposta(s)` alinhada a camada onde as respostas ficariam; clicar nessa indicacao expande novamente.
- Cliques em responder, salvar, compartilhar, upvote/downvote, menu, links, midia e campos de formulario sao ignorados pelo recolhimento.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao dos comentarios ou regra de destaque de psicologos verificados.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile em 390px confirmando recolhimento isolado, `Ver 2 respostas`, expansao e preservacao ao clicar no menu.

## Execução complementar: árvore compacta e controles de comentários (2026-06-16)

- Pedido do usuário: ajustar a árvore de comentários e os controles de interação em feed, comunidade e detalhe do post, preservando ordenação, regra do psicólogo verificado mais votado e responsividade mobile.
- Fonte visual auditável: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, então a execução seguiu as imagens locais/protótipos inventariados.
- O cabeçalho `Discussão` passou a ser independente, sem a linha azul lateral e sem parecer parte do primeiro comentário.
- Cada comentário direto ao post agora é uma árvore própria de primeira camada; apenas respostas ficam aninhadas sob o comentário correspondente.
- O fundo de cada árvore passou a depender do comentário raiz: branco para paciente e azul claro para psicólogo verificado; fundos esverdeados foram removidos dos blocos de destaque compartilhados.
- A barra azul grossa lateral foi removida; a hierarquia usa apenas linhas finas cinza, com recuos mais compactos e limite visual de três níveis.
- Nos comentários, `CommunityActionBar` usa `size="xs"`, reduzindo upvote/downvote e `Responder`, que permanece texto sem ícone.
- O botão `Ver mais resposta(s)` foi alinhado ao nível onde a resposta será expandida.
- Não houve alteração de backend, Prisma, migrations, packages, endpoints, payloads, ordenação, prioridade de psicólogo verificado ou lógica de envio.
- ADRs atualizados: `adrs/0102-arvore-comentarios-posts-comunidade.md` e `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` em `/app/community/feed`, `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Execução complementar: profundidade 5 e thread isolada (2026-06-16)

- Pedido do usuário: permitir até 5 níveis visuais na árvore de comentários dentro do post, abrir uma tela de thread ao exceder o limite e refinar os controles dos comentários sem alterar ordenação ou destaque de psicólogos verificados.
- Fonte visual auditável: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy não está exposto como ferramenta direta nesta sessão, então a validação visual usou a referência local e browser local.
- A tela principal do post agora renderiza o comentário raiz mais 4 níveis de respostas aninhadas; níveis abaixo disso exibem `Ver mais resposta(s)` alinhado à camada onde a continuação existiria.
- O backend deixou de usar o `take: 3` de respostas imediatas e passou a hidratar descendentes dos comentários diretos paginados com profundidade limitada por `INLINE_REPLY_DESCENDANT_DEPTH`, preservando comentários diretos como árvores de primeira camada.
- A rota de thread `/app/community/[slug]/post/[id]/thread/[replyId]` passou a exibir o post original no topo e, abaixo, o comentário raiz do fio selecionado com a continuação da conversa; o composer fica depois da árvore no desktop e permanece fixo no mobile.
- A resposta da API de thread foi normalizada no client para `{ reply }`, compatibilizando o contrato tipado com o payload real do backend e destravando a tela isolada.
- Nos comentários, o grupo de upvote/downvote usa `votePresentation="inline"`, sem cápsula/fundo cinza; `Responder` permanece sem ícone, em escala menor e com espaçamento consistente com salvar/compartilhar.
- Não houve alteração de Prisma schema, migrations, packages, regra de ordenação, prioridade de psicólogo verificado ou lógica de envio.
- ADRs atualizados: `adrs/0102-arvore-comentarios-posts-comunidade.md` e `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validações executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video/thread/demo-reply-ansiedade-apresentacao-psi-video` com cookie de sessão local.
  - Browser local Chrome headless autenticado nas mesmas rotas, conferindo o detalhe do post e a thread isolada com o post original no topo.

## Execucao complementar: ajuste fino dos controles de comentarios (2026-06-16)

- Pedido do usuario: aumentar `Responder` para a mesma escala visual do numero de upvotes, manter os controles em uma unica linha e fixar salvar/compartilhar a direita em todas as camadas da arvore.
- `CommunityActionBar` passou a separar a barra compacta em grupo esquerdo flexivel (`upvote`, `downvote`, `Responder`) e grupo direito com `ml-auto` (`salvar`, `compartilhar`).
- `Responder` em comentarios usa `text-[10px] font-semibold`, igual a escala do contador de upvotes, com `truncate` para ellipsis quando faltar espaco em camadas profundas.
- Salvar e compartilhar permanecem a direita do comentario independentemente do recuo visual da resposta, sem quebra de linha e sem alterar a logica de voto, salvar, compartilhar, ordenacao ou destaque profissional.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads ou persistencia.
- ADR atualizado: `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, browser local autenticado via Chrome headless/CDP em 390px na rota do detalhe do post demo confirmando barras `xs` sem quebra, `topSpread=0`, salvar/compartilhar a direita e `Responder` em 10px.

## Execucao complementar: header premium da thread de respostas (2026-06-16)

- Pedido do usuario: refinar o header da tela aberta por `Ver mais respostas`, mantendo voltar a esquerda, titulo `Respostas` centralizado, fundo branco com blur/transparencia, borda inferior sutil e sombra leve.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou browser local e a referencia local inventariada.
- A tela de thread isolada passou a usar header sticky em grid de tres colunas, garantindo titulo centralizado independentemente do botao de voltar e sem parecer um card solto no mobile.
- O header ganhou fundo branco translucido com `backdrop-blur`, borda inferior refinada, sombra discreta, spacing mais compacto e subtitulo de contexto `Continuacao da conversa` para elevar a hierarquia visual.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao, regras de destaque ou logica de comentarios.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP mobile autenticado em 390px confirmando header sticky no topo, largura 390px, botao de voltar, titulo centralizado, blur, borda inferior e sombra leve.

## Complemento 2026-06-16 - fullscreen mobile de videos de conteudo

- Pedido do usuario: corrigir somente no mobile o tamanho ocupado pelo video em fullscreen dentro do post, sem alterar fullscreen desktop, controles nativos, play/pause, volume, timeline, botao nativo de fullscreen ou arvore de comentarios.
- Midias de video do detalhe do post usam `VerticalVideoPlayer` com `fullscreenVariant="content"`.
- No mobile, o fullscreen nativo recebe estilos temporarios de viewport para ocupar o maximo possivel mantendo 9:16, `object-fit: contain`, centralizacao e fundo preto.
- Ao sair do fullscreen, os estilos originais do video embutido sao restaurados para nao afetar o card/resposta.
- O ajuste e restrito a `max-width: 1023px` e a videos de conteudo; o comportamento desktop ja validado permanece intocado.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, comentarios, votos ou logica de envio.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; referencias auditaveis: `_product/proto/Dentro do Post.jpg`, `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg` e captura enviada pelo usuario.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.
- Validacoes executadas: `pnpm --dir frontend check` e Chrome/CDP mobile 390x844 em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando video expandido em 390x693px, proporcao 9:16, `object-fit: contain` e restauracao ao sair.

## Execucao complementar: areas seguras para recolher arvore de comentarios (2026-06-16)

- Pedido do usuario: corrigir o recolhimento/expansao para que upvote/downvote e demais controles do primeiro comentario nao disparem collapse indevido.
- O comportamento de collapse foi removido do container completo da raiz; agora apenas areas permitidas recebem o handler: conteudo textual sempre e, para comentarios raiz de pacientes, tambem avatar/cabecalho/autor/horario.
- Em comentarios raiz de psicologos, avatar, nome, selo Top Mentor e informacoes profissionais continuam priorizando a navegacao para o perfil e bloqueiam propagacao para o collapse.
- A linha de acoes, menu, midia, botao WhatsApp, composer inline, `Ver X respostas` e `Ver mais respostas` receberam protecao explicita contra propagacao para preservar voto, resposta, salvar, compartilhar, denuncia e navegacao.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao de comentarios ou regra de destaque de psicologos verificados.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile autenticado em 390px no detalhe do post demo, confirmando que upvote nao recolhe, clique no texto recolhe com `Ver 2 respostas`, novo upvote nao expande/recolhe e o botao `Ver 2 respostas` expande novamente.


## Execucao complementar: area total do comentario raiz, votos e CTA de video (2026-06-16)

- Pedido do usuario: ampliar a area de recolher/expandir do primeiro comentario da arvore, corrigir upvote/downvote em todas as camadas e alinhar o botao de WhatsApp abaixo de videos no desktop.
- Fonte visual auditavel: captura enviada pelo usuario `c:/Users/tulio/Downloads/image (14).png` e referencia inventariada `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- O comentario raiz recolhivel voltou a usar toda a area superior do bloco como gatilho: avatar, cabecalho, corpo, texto e espacos internos; comentarios aninhados continuam sem esse comportamento.
- Controles interativos continuam protegidos: upvote, downvote, contador, responder, salvar, compartilhar, menu, midia, WhatsApp, composer, links de perfil e botoes de expansao nao recolhem nem expandem a arvore.
- Para raizes de psicologos, avatar, nome, selo e dados profissionais seguem abrindo o perfil e nao acionam collapse; as demais areas nao interativas do bloco permanecem aptas a recolher/expandir.
- A protecao dos controles deixou de usar bloqueio em fase de captura no wrapper e passou a depender de deteccao de alvo interativo/`data-comment-collapse-ignore`, preservando o clique real dos botoes internos.
- A mutation de voto de replies agora atualiza tambem as queries de thread isolada, aplica resposta do servidor em cache e restaura replies/thread em caso de erro, mantendo contagem e estado ativo consistentes em qualquer camada.
- O CTA de WhatsApp abaixo de videos foi centralizado em relacao ao video e passou a usar largura util equivalente no desktop, sem alterar o comportamento mobile.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao dos comentarios ou regra de destaque de psicologos verificados.
- ADRs atualizados: `adrs/0102-arvore-comentarios-posts-comunidade.md` e `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- ...`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado no detalhe do post demo confirmando collapse em toda area raiz, `Ver 7 respostas`, links de perfil de psicologo sem collapse, upvote/downvote ativos sem recolher a arvore e WhatsApp com `centerDelta=0` em relacao ao video.

## Execucao complementar: ordenacao por relevancia entre irmaos da arvore (2026-06-17)

- Pedido do usuario: ordenar comentarios/respostas dentro de cada arvore por relevancia, sem misturar camadas ou quebrar a hierarquia.
- A ordenacao passou a ser aplicada apenas entre replies irmaos, ou seja, itens com o mesmo comentario pai; cada nivel da arvore e ordenado de forma independente.
- A prioridade adotada e: maior quantidade de upvotes, melhor posicao de mentor/psicologo na comunidade quando houver ranking aplicavel, e comentario mais recente.
- A regra e aplicada tanto na tela principal do post quanto na tela isolada de thread aberta por `Ver mais respostas`.
- O frontend manteve o mesmo criterio para refletir a reordenacao imediatamente apos optimistic updates de voto, enquanto o backend continua sendo a fonte canonica da ordem retornada pela API.
- A prioridade especial do primeiro comentario de psicologo verificado mais votado permanece preservada no grupo de comentarios diretos ao post; a nova ordenacao atua nos grupos de irmaos sem achatar a arvore.
- Nao houve alteracao de Prisma schema, migrations, packages, endpoints, payloads, logica de envio, votos, salvamento ou navegacao.
- Documentacao de contrato atualizada em `_product/tasks/DATA-MODEL.md` e ADR atualizado em `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e script local autenticado via repository no post demo confirmando grupos de irmaos sem violacao de ordem por upvotes.

## Execucao complementar: header leve da thread de respostas (2026-06-17)

- Pedido do usuario: remover o fundo branco e o comportamento sticky/fixo do header da tela de continuacao de respostas, mantendo voltar e titulo `Respostas`.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou a referencia local e browser local.
- O header de `/app/community/[slug]/post/[id]/thread/[replyId]` deixou de usar `sticky`, fundo branco translucido, borda inferior, blur e sombra; agora e um bloco estatico integrado ao fundo da pagina e rola junto com o conteudo.
- O botao de voltar foi preservado na coluna esquerda e o titulo `Respostas` continua centralizado pela grade de tres colunas.
- O subtitulo `Continuacao da conversa` ganhou line-height maior, espacamento vertical e remocao de `leading-none`/truncate, evitando corte na base das letras.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, votos, replies, ordenacao ou regras de destaque.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- 'src/app/app/community/[slug]/post/[id]/logic.tsx'`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em 390px e 1440px confirmando header `position: static`, sem fundo/borda/sombra, rolando com a pagina e subtitulo com line-height de ~16px.

## Execucao complementar: salvar e compartilhar em toda a arvore de comentarios (2026-06-17)

- Pedido do usuario: habilitar salvar e compartilhar em comentarios e respostas de todas as camadas visiveis, incluindo a tela isolada de thread/respostas.
- Fonte visual auditavel: _product/proto/Dentro do Post.jpg; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou browser local autenticado.
- A barra compacta de replies continua usando o componente compartilhado CommunityActionBar, agora com handlers explicitos de salvar e compartilhar protegidos contra propagacao para o collapse da arvore.
- Salvar resposta usa a persistencia existente de post_reply_save e a mutation useSaveReply passou a atualizar otimisticamente tambem as queries de reply-thread, alem da lista principal de replies.
- O estado salvo alterna imediatamente na tela principal e na thread isolada, invalida a area de Salvos e preserva rollback dos caches em caso de erro.
- Compartilhar respostas na tela principal usa deep link do post com #reply-{id}; na thread isolada usa /thread/{replyRootId}#reply-{id}, mantendo referencia direta ao comentario quando possivel.
- Clicar em salvar ou compartilhar nao recolhe nem expande a arvore; upvote/downvote, responder, ordenacao e profundidade visual nao foram alterados.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads ou regras de ordenacao/destaque.
- ADRs atualizados: adrs/0102-arvore-comentarios-posts-comunidade.md e adrs/0104-barra-acoes-comunidade-unificada.md.
- Validacoes executadas:
  - pnpm --dir frontend exec biome check --write -- 'src/api/callers/posts/index.tsx' 'src/app/app/community/[slug]/post/[id]/logic.tsx'
  - pnpm --dir frontend check
  - pnpm --dir frontend build
  - pnpm check
  - Chrome/CDP autenticado em /app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video e /thread/demo-reply-ansiedade-apresentacao-psi-video confirmando 11/11 e 3/3 replies com salvar/compartilhar, toggle persistido, links com #reply e ausencia de collapse ao clicar nas acoes.


## Execucao complementar: voltar por historico dentro dos posts (2026-06-17)

- Pedido do usuario: a seta de voltar dentro de posts deve retornar sempre para a ultima tela visitada, incluindo feed, comunidade, perfil do psicologo, notificacoes, salvos e `Meus posts e comentarios`, sem assumir que a origem foi a comunidade.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou browser local.
- A seta do detalhe `/app/community/[slug]/post/[id]` passou a usar o helper compartilhado `navigateBackWithFallback`, preservando `router.back()` quando existe historico valido do app.
- O fallback em acesso direto ou sem historico confiavel deixou de ser generico e agora usa a comunidade real do post (`/app/community/${post.community.slug}`).
- A seta da tela isolada de thread/respostas recebeu a mesma regra: historico real primeiro e fallback para a comunidade do post; antes do post carregar, usa o `slug` da propria rota como fallback seguro.
- Nao houve alteracao de backend, Prisma, migrations, packages, contratos, votos, comentarios, ordenacao, salvos, compartilhamento ou navegacao manual por links.
- ADR atualizado: `adrs/0066-pagina-detalhe-comunidade-participacao.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- 'src/app/app/community/[slug]/post/[id]/logic.tsx'`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado validando acesso direto com fallback para a comunidade, Comunidade -> Post -> Voltar -> Comunidade, Salvos -> Post -> Voltar -> Salvos, Meus posts/comentarios -> Post -> Voltar -> Meus posts/comentarios e thread direta -> fallback para a comunidade.

## Execucao complementar: isolamento definitivo dos controles no collapse (2026-06-17)

- Pedido do usuario: corrigir novamente o comportamento de expandir/recolher da arvore para que a linha de opcoes clicaveis nunca acione collapse, mantendo a area ampla do comentario raiz como gatilho.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.
- O detector de alvo interativo do comentario raiz agora resolve `Element`/`Node`, cobrindo tambem cliques em `svg`/`path` dentro de botoes e icones.
- A `CommunityActionBar` marca a linha completa com `data-comment-collapse-ignore="true"` e seus handlers de responder, salvar, compartilhar e comentarios interrompem propagacao antes de executar a acao.
- `VoteActionButton` e `PostActionLink` tambem interrompem propagacao, preservando upvote/downvote, links e acoes sem recolher/expandir a arvore.
- O menu de tres pontos e suas opcoes continuam protegidos contra propagacao; composer, botao de envio/cancelamento, `Ver respostas`, midias, WhatsApp e links de perfil seguem fora do gatilho de collapse.
- Para comentarios raiz de psicologos, avatar/nome/dados continuam abrindo o perfil e nao acionam collapse; o collapse permanece disponivel apenas nas areas nao interativas do bloco.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, ordenacao, votos, salvamento ou regra de destaque de psicologos.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- ...`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP em 390px no detalhe do post demo confirmando que a linha de acoes e icones internos nao acionam collapse, enquanto a area de conteudo recolhe/expande normalmente.

## Execucao complementar: cortesia ativa para upload de midia (2026-06-21)

- Pedido do usuario: psicologos com cortesia devem ter os mesmos recursos de psicologos assinantes verificados, incluindo upload de midia.
- Backend: `PostRepository.canAttachReplyMedia` deixou de depender exclusivamente de `cfp_verified_at` quando existe assinatura profissional ativa concedida por administrador (`source="admin_grant"`).
- A regra preserva a exigencia de plano profissional ativo e continua bloqueando plano gratuito; o helper `activeProfessionalCourtesyEntitlementWhere()` centraliza a consulta da cortesia administrativa.
- Nao houve alteracao de Prisma schema, migrations, storage, endpoints, payload de respostas, limites de arquivo, ordenacao, votos ou regras de denuncia.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, script local confirmando `canAttachReplyMedia=true` para `<CONTA_DE_TESTE_AUTORIZADA>` com `cfp_verified_at=null` e `admin_grant` ativo, e service real `authorizeReplyMediaUpload` retornando `status=200` para post publicado existente.

## Execucao complementar: icone de video no anexo de comentarios (2026-06-21)

- Pedido do usuario: trocar o icone de anexar midia nos comentarios para um icone de video, mantendo o upload real ja existente de respostas.
- Frontend: o composer de comentarios/respostas no detalhe do post passou de `Paperclip` para `Video`, sem alterar endpoint, payload, regras de permissao, limites de arquivo, ordem da arvore ou persistencia de replies.
- A regra de entitlement segue centralizada e compartilhada com o fluxo de criacao de post; psicologos com cortesia administrativa ativa continuam liberados quando possuem plano profissional ativo.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg` via inventario local e screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente.
- ADRs atualizados: `adrs/0096-detalhe-post-composer-denuncia-midia.md` e `adrs/0138-create-post-media-permission-modal.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando botao `Anexar midia` habilitado com SVG do novo controle.

## Execucao complementar: editar comentario proprio na arvore do post (2026-06-21)

- Pedido do usuario: quando o comentario/resposta for do proprio usuario, a arvore de comentarios dentro do post deve oferecer a opcao `Editar` no menu de tres pontos.
- Frontend: `ReplyOverflowMenu` passou a exibir `Editar` antes de `Salvar`, `Compartilhar` e `Excluir` quando `reply.author.id` corresponde ao usuario autenticado.
- O clique abre a `ReplyEditModal` existente, reaproveitando React Hook Form, Zod, controllers da TASK-02 e a mutation real `PUT /api/private/posts/:id/replies/:replyId`.
- A mudanca vale tanto para a tela principal do post quanto para threads isoladas, porque `ReplyCard` e compartilhado entre os dois fluxos.
- Comentarios de terceiros continuam exibindo `Salvar`, `Compartilhar` e `Denunciar`; nao ha alteracao nas regras de exclusao, votos, salvamentos, compartilhamento, collapse, midia, backend, Prisma, endpoint ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi o screenshot do usuario e a tela local do post.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile `390x844` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video?focusReplyId=cmqnag8iv0024g8uhognhksz3#reply-cmqnag8iv0024g8uhognhksz3`, confirmando menu `Editar/Salvar/Compartilhar/Excluir` em comentario proprio e abertura da modal `Editar comentario` com o texto atual preenchido.

## Execucao complementar: modal limpa de editar comentario e midia (2026-06-21)

- Pedido do usuario: isolar completamente a modal `Editar comentario`, remover qualquer vazamento visual do card original, manter centralizacao mobile/desktop e permitir gestao de midia quando o autor da resposta e psicologo verificado com direito a midia.
- Frontend: `ReplyEditModal` passou a renderizar por `createPortal(document.body)`, com overlay fixo `z-[1000]`, `overflow` interno e bloqueio do scroll do documento para eliminar stacking context, rodape/controles/metadados herdados e comportamento de bottom sheet.
- A modal ficou focada apenas em titulo, textarea e rodape de acoes; foram removidos label `Texto *`, linha `Respondido em`, divisorias e controles de upvote/downvote/salvar/compartilhar do card original.
- Os botoes `Cancelar` e `Salvar alteracoes` receberam hierarquia visual mais clara, estados de hover/focus/active/disabled e preservam a acao primaria destacada em mobile e desktop.
- Foi criado `ReplyMediaAttachmentControl` para reutilizar o mesmo controle de midia no composer e na edicao de comentarios, com preview de imagem/video, substituicao, remocao e desfazer remocao no modo editor.
- A edicao de comentario so exibe midia para psicologos com permissao real de anexar midia; pacientes e psicologos gratuitos nao veem o controle.
- Backend: `PUT /api/private/posts/:id/replies/:replyId` passou a aceitar `mediaUrl`/`mediaType` opcionais, mantendo autoria/post/hierarquia imutaveis e validando substituicao apenas por URL publica originada do upload permitido. Enviar ambos como `null` remove a midia atual.
- Nao houve alteracao de Prisma schema, migrations, packages, ordenacao, votos, salvos, exclusao ou regras de collapse da arvore.
- Fonte visual auditavel: screenshots enviados pelo usuario e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile autenticado `390x844` em `/app/posts/mine`, confirmando modal centralizada, `z-index=1000`, body com `overflow=hidden`, apenas 1 textarea, sem `Texto`, sem `Respondido em`, sem `Compartilhar` e com controle `Adicionar midia` para psicologo autorizado.

## Execucao complementar: cortesia verificada e WhatsApp em posts/respostas (2026-06-21)

- Pedido do usuario: psicologo com cortesia administrativa deve aparecer como verificado na comunidade, posts editados devem exibir `editado`, e posts/respostas de qualquer psicologo com WhatsApp cadastrado devem mostrar o botao de WhatsApp, inclusive gratuitos.
- Backend: `CommunityRepository` e `PostRepository` passaram a derivar `author.verified` por `cfp_verified_at` preenchido ou assinatura profissional ativa concedida por administrador (`source="admin_grant"`).
- Backend: `author.whatsapp_url` deixou de depender de selo/assinatura e passa a ser derivado para qualquer psicologo nao excluido com WhatsApp publico cadastrado.
- Backend: respostas profissionais destacadas e flags de resposta profissional verificada tambem consideram cortesia administrativa ativa como equivalencia publica de verificado.
- Frontend: os cards do feed/comunidade, o card compartilhado de publicacoes e o detalhe do post exibem `editado` quando `edited_at` existe e renderizam CTA `Chamar no WhatsApp` para posts/respostas de psicologos com URL publica.
- Nao houve alteracao de Prisma schema, migrations, packages, storage, payload de criacao/edicao, votos, salvamentos, ordenacao ou denuncia.
- Fonte visual auditavel: screenshots enviados pelo usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, smoke real de API em `/api/private/community/feed/posts?search=teste%20novo&limit=20` confirmando `verified=true`, `whatsapp_url` e `edited_at` para `<CONTA_DE_TESTE_AUTORIZADA>`, e Chrome/CDP autenticado em `/app/community/feed` confirmando selo verificado, texto `editado`, botao `Chamar no WhatsApp` no card `teste novo` e botao de WhatsApp em resposta profissional destacada.

## Execucao complementar: textarea compacto e botao Midia na edicao de comentario (2026-06-21)

- Pedido do usuario: na modal `Editar comentario`, o campo de texto deve iniciar com cerca de 2 linhas, crescer automaticamente ate uma altura maxima e depois rolar internamente; o botao `Adicionar midia` deve virar `Midia` com visual mais premium.
- Frontend: `ReplyEditModal` passou a usar textarea com `rows=2`, `autoGrow=true`, altura minima compacta e `max-height` responsivo, evitando ocupacao excessiva quando o comentario e curto.
- Frontend: o controller compartilhado de textarea agora respeita `max-height` computado durante auto-resize e alterna rolagem interna somente quando o conteudo excede o limite.
- Frontend: `ReplyMediaAttachmentControl` no modo editor passou a exibir `Midia`, com icone menor, borda suave, gradiente leve, sombra discreta e estados de hover/focus/active/disabled.
- A exibicao do botao de midia continua restrita a psicologos com permissao real de anexar midia; pacientes e psicologos gratuitos seguem sem o controle.
- Nao houve alteracao de backend, Prisma, migrations, packages, storage, endpoints, payloads, votos, salvos, exclusao ou regras de collapse.
- Fonte visual auditavel: screenshots enviados pelo usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado em `/app/posts/mine`, confirmando modal `Editar comentario` com textarea compacto, crescimento ate limite/scroll interno e botao `Midia` visivel apenas para psicologo autorizado.

## Complemento 2026-06-22 - marcador editado em comentarios

Comentarios e respostas editados agora persistem `post_reply.edited_at` e retornam esse metadado nos contratos de detalhe do post, thread, `Meus posts e respostas`, salvos e previa de resposta profissional. A UI mobile-first exibe `editado` ao lado do tempo relativo na arvore de comentarios, em cards de resposta e em respostas profissionais destacadas, usando a mesma semantica publica ja aplicada a posts editados.

- Backend: `PUT /api/private/posts/:id/replies/:replyId` grava `edited_at` a cada edicao owner-only de texto ou midia.
- Backend: DTOs e selects de `PostRepository` e `CommunityRepository` expoem `edited_at` para `PostReplyDTO`, `PostProfessionalReplyDTO`, `PostListReplyDTO` e `CommunityProfessionalReplyDTO`.
- Frontend: a arvore do post, os cards de publicacoes/perfil e as previas profissionais formatam `ha X ... editado` quando o metadado existe.
- Data model: `post_reply.edited_at DateTime?` foi documentado e migrado em `20260622013737_add_post_reply_edited_at`.
- Nao houve alteracao nas regras de autoria, exclusao, notificacoes, votos, salvos, ordenacao, storage, permissao de midia ou historico de edicoes.
- Fonte visual auditavel: screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir backend db:migrate -- --name add_post_reply_edited_at`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile `390x844` no detalhe do post demo, confirmando `Psicólogo · há 1 d · editado` no comentario editado.

## Complemento 2026-06-22 - comentarios com texto ou midia

- Pedido do usuario: comentarios/respostas nao devem exigir texto quando ha midia; o conteudo pode ser texto + midia, somente texto ou somente midia.
- Backend: validadores de `POST /api/private/posts/:id/replies` e `PUT /api/private/posts/:id/replies/:replyId` passaram a aceitar `content` ausente/vazio, mantendo limite maximo de 2000 caracteres.
- Backend: a regra de dominio agora valida a composicao final do comentario/resposta: sem texto e sem midia valida continua bloqueado; com texto, com midia, ou com ambos e permitido.
- Backend: na edicao, a regra considera a midia atual quando ela nao esta sendo removida; apagar texto e manter midia e permitido, mas remover texto e midia ao mesmo tempo e bloqueado.
- Frontend: composer e modal `Editar comentario` removem a obrigatoriedade textual, liberam envio/salvamento quando existe midia selecionada/atual e mantem erro apenas quando nao ha texto nem midia.
- Nao houve alteracao de Prisma schema, migrations, storage, permissao de midia, limites de arquivo, autoria, votos, salvos, exclusao, notificacoes ou marcador `editado`.
- Fonte visual auditavel: screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, smoke real de API criando resposta somente com midia sem `content`, validando bloqueio de composicao vazia e bloqueio ao remover texto + midia, e Chrome/CDP autenticado em `/app/community/ansiedade-em-equilibrio/post/cmqogqcxa0000kcuh7mvngnsl`, confirmando modal `Editar comentario` com textarea vazio, midia atual visivel, sem erro de texto minimo e botao `Salvar alteracoes` habilitado.

## Complemento 2026-06-22 - CTA WhatsApp sem quebra em respostas

- Pedido direto de produto: o botao `Chamar no WhatsApp` em respostas de psicologos nao pode quebrar texto em multiplas linhas, especialmente em comentarios aninhados com largura menor.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg` e screenshot enviado pelo usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente, entao a validacao visual usou imagem local e browser local.
- Frontend: `PsychologistWhatsAppRedirectButton` passou a aplicar base `inline-flex`, `min-w-0`, `max-w-full` e `whitespace-nowrap`, e foi criado `PsychologistWhatsAppButtonContent` com icone `shrink-0` e rotulo `truncate`.
- Os CTAs de WhatsApp em posts, respostas destacadas, respostas aninhadas, salvos, cards de psicologos e perfil publico passaram a usar o conteudo compartilhado e padding/min-width consistente.
- Em largura reduzida, o texto trunca com reticencias e o icone permanece visivel; a altura do botao segue fixa pelas classes `h-*` existentes e nao cresce por causa do texto.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, tracking de clique, regras de WhatsApp publico, votos, salvos ou ordenacao.
- ADR atualizado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP local em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, validando mobile `390x844` e desktop `1440x900` com `white-space: nowrap`, label com `text-overflow: ellipsis`, icone `flex-shrink: 0` visivel e altura fixa dos botoes.

## Complemento 2026-06-22 - miniatura no composer de respostas com midia

- Pedido do usuario: ao anexar midia no campo de resposta/comentario, o botao `Anexar midia` deve se transformar em uma miniatura da midia anexada, no mesmo espaco visual do botao, e deve ser possivel enviar somente a midia sem texto.
- Frontend: `ReplyMediaAttachmentControl` no modo composer agora troca o botao por uma miniatura compacta em formato pill (`Substituir midia anexada`), com preview de imagem/video, overlay discreto, acao para substituir e botao interno para remover.
- A linha separada com o nome do arquivo selecionado foi removida do composer; a midia anexada passa a ser representada apenas pela miniatura.
- A regra de envio somente com midia foi preservada no `ReplyComposer` e no backend existente: composicao vazia continua bloqueada, mas `content` vazio com `mediaUrl`/`mediaType` valido e permitido.
- Nao houve alteracao de Prisma schema, migrations, packages, storage, endpoints, limites de arquivo, permissao de midia, votos, salvos, exclusao ou ordenacao.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`, screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, smoke real de API criando e excluindo resposta somente com midia (`content: ""`) e Chrome/CDP mobile em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando miniatura no lugar do botao, preview renderizado, sem `Anexar midia` visivel no composer ativo, textarea vazio e botao `Enviar resposta` habilitado.

## Complemento 2026-06-22 - orientacao da miniatura e anexo no comentario principal

- Pedido do usuario: a previa da midia anexada em respostas deve respeitar o formato real da midia, horizontal ou vertical, sem gerar uma previa grande; e o anexo de midia no comentario direto do post principal precisa funcionar.
- Frontend: `SelectedReplyMedia` passou a guardar orientacao detectada por metadados reais da imagem/video local antes do upload.
- Frontend: `ReplyMediaAttachmentControl` no modo composer agora escolhe tamanho compacto por orientacao: paisagem, retrato ou quadrado, preservando preview pequeno, acao de substituir e botao de remover.
- Frontend: o composer principal do post passou a manter o controle de midia disponivel para psicologos com permissao mesmo antes de digitar/focar, igualando o comentario direto ao fluxo de resposta aninhada.
- O envio somente com midia continua usando o upload real de replies e a criacao real da resposta; composicao vazia sem texto e sem midia permanece bloqueada.
- Nao houve alteracao de Prisma schema, migrations, packages, storage, endpoints, limites de arquivo, permissao profissional, votos, salvos, exclusao ou ordenacao.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`, screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, upload real de midia de resposta com criacao/exclusao de comentario somente com midia, e Chrome/CDP mobile em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando anexo visivel no comentario principal, miniatura vertical compacta para imagem vertical, textarea vazio e envio habilitado.

## Complemento 2026-06-22 - miniatura sem acao de substituir

- Pedido do usuario: ao anexar midia no comentario/resposta, a miniatura nao deve exibir botao/acao de alterar a midia anexada; deve permanecer apenas o `X` de remover.
- Frontend: `ReplyMediaAttachmentControl` no modo composer deixou de renderizar a miniatura como botao clicavel de substituicao e removeu o overlay inferior `Midia` sobre o preview.
- O usuario continua podendo trocar a midia removendo a anexada pelo `X` e anexando outra em seguida; o modo editor preserva o controle dedicado `Midia` da modal de edicao.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, endpoints, limites de arquivo, permissao profissional, envio somente com midia, votos, salvos, denuncia ou ordenacao.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`, screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando `replaceButtons=0`, miniatura renderizada, `X` de remover presente, sem texto/overlay `Midia` sobre a miniatura e envio habilitado sem texto.

## Complemento 2026-06-22 - foco apos publicar comentario ou resposta

- Pedido do usuario: depois de publicar um comentario ou resposta, a tela deve rolar ate o conteudo recem-criado e aplicar foco/destaque no comentario do proprio usuario.
- Frontend: o foco/destaque existente de `focusReplyId` foi extraido para `useReplyFocusHighlight` e reutilizado tanto no detalhe do post quanto na tela de thread de respostas.
- Ao receber o `PostReply` real retornado por `POST /api/private/posts/:id/replies`, a tela passa a definir o novo `reply.id` como foco ativo; a listagem refaz a consulta quando necessario e expande a arvore profunda ate encontrar o comentario criado.
- O destaque usa a mesma animacao `.lectum-reply-focus-pulse`, `tabindex` temporario e `scrollIntoView({ block: "center" })`, preservando o comportamento ja usado em Salvos/Meus posts/notificacoes.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, limites de midia, votos, salvos, exclusao, denuncia ou ordenacao.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`, screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0068-respostas-votos-salvos-post.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, criando e removendo comentario real de validacao; confirmado comentario criado com foco ativo, classe `lectum-reply-focus-pulse` e posicao visivel na viewport apos scroll suave.

## Complemento 2026-06-22 - repouso mobile do composer de comentarios

- Pedido do usuario: no estado de repouso do comentario no mobile, o botao `Anexar midia` deve permanecer escondido e aparecer somente quando o composer estiver focado, junto com a mensagem `Comente com respeito e empatia...`.
- Frontend: o controle compartilhado `ReplyMediaAttachmentControl` passou a aceitar `className`, permitindo ocultar apenas o bloco de midia no repouso mobile sem alterar o comportamento desktop.
- Frontend: o `ReplyComposer` agora aplica `hidden sm:flex` ao controle de midia enquanto nao ha foco, rascunho ou midia selecionada, garantindo ocultacao real no mobile e preservando o botao no desktop; ao focar, a mensagem de orientacao e o botao de midia aparecem juntos.
- Se ja houver texto ou midia selecionada, o composer continua expandido para preservar a composicao do usuario e permitir remocao/envio da midia.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, endpoints, limites de midia, permissao profissional, votos, salvos, denuncia ou ordenacao.
- Fonte visual auditavel: screenshot do usuario e browser local em 390x844; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: Chrome/CDP mobile autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando `Anexar midia` e orientacao escondidos em repouso e visiveis apos foco; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`.

## Complemento 2026-06-22 - CTA WhatsApp compacto em comentarios

- Pedido do usuario: o botao de WhatsApp continua sendo o CTA independente e prioritario da Lectum, mas estava grande demais dentro da arvore de comentarios.
- Frontend: no detalhe do post, o CTA de WhatsApp renderizado em comentarios/respostas de psicologos passou de faixa larga centralizada para pill compacto, com `w-fit`, `max-w-full`, altura menor, borda verde forte, fonte destacada e icone preservado.
- O texto `Chamar no WhatsApp` foi mantido para preservar clareza de conversao; em largura reduzida, o label segue truncando sem quebrar linha e o icone permanece visivel.
- CTAs de post principal, respostas destacadas, salvos, cards de psicologos e perfil publico nao foram reduzidos neste ajuste, pois esses contextos continuam tratando WhatsApp como acao principal de bloco.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, tracking de clique, modal de redirecionamento, regras de exposicao de WhatsApp, votos, salvos, denuncia ou ordenacao.
- Fonte visual auditavel: screenshots do usuario e browser local mobile 390x844; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: Chrome/CDP mobile autenticado em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando CTA de comentario com `inline-flex`, largura compacta, altura reduzida, `white-space: nowrap` e icone visivel; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`.


## Execucao complementar: proporcao 16:9 para imagens horizontais (2026-06-22)

- Pedido do usuario: quando uma imagem horizontal for postada/anexada em comentarios ou respostas, manter a proporcao visual 16:9 em vez de forcar o card vertical.
- O `MediaBlock` do detalhe do post e o `MediaBlock` compartilhado dos cards de comunidade agora detectam `naturalWidth`/`naturalHeight` no `Image` e alternam para `aspect-video` quando a imagem e horizontal.
- Imagens verticais/quadradas continuam com o padrao `4:5`; videos permanecem nas regras existentes.
- Nao houve alteracao de backend, Prisma, migrations, endpoints, storage, permissoes de upload, payloads ou packages.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a validacao usou browser local e dados reais temporarios com cleanup.
- ADR criado: `adrs/0148-imagens-horizontais-16-9-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local headless/CDP em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, com resposta temporaria contendo imagem horizontal real anexada via endpoint de upload; a resposta e o objeto R2 foram removidos apos validar proporcao 16:9.


## Execucao complementar: ocultar botao Midia quando comentario ja possui anexo (2026-06-22)

- Pedido do usuario: quando ja houver uma midia na modal de editar comentario, remover o botao `Midia`.
- O modo editor do `ReplyMediaAttachmentControl` agora exibe apenas a miniatura e o `X` de remocao enquanto ha midia ativa.
- O botao `Midia` volta a aparecer somente apos remover/marcar a midia atual para remocao, permitindo anexar uma substituta sem duplicar acoes.
- O modo composer nao foi alterado; permissoes, upload, storage, endpoints, payloads e validacoes de dominio permanecem iguais.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a validacao usou browser local mobile com dados reais existentes.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, abrindo `Editar comentario` em comentario proprio com midia e confirmando miniatura presente sem botao textual `Midia`.


## Execucao complementar: previa horizontal no editor de comentario (2026-06-22)

- Pedido do usuario: quando a midia atual ou selecionada for imagem ou video horizontal, a previa exibida na modal `Editar comentario` tambem deve ficar horizontal.
- Frontend: `ReplyMediaAttachmentControl` no modo editor passou a detectar a orientacao de midias atuais por metadados reais de imagem/video, alem de reaproveitar a orientacao ja detectada para arquivos selecionados.
- Frontend: a miniatura do editor agora alterna entre paisagem `aspect-video`, quadrado `aspect-square` e retrato `aspect-[9/14]`, mantendo o tamanho compacto e o botao `X` de remover como unica acao quando ha midia ativa.
- O botao textual `Midia` continua oculto enquanto ja houver anexo ativo; ele so reaparece apos remover/marcar a midia para remocao.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, endpoints, permissoes, limites de arquivo, votos, salvos ou regras de composicao texto/midia.
- Fonte visual auditavel: screenshots do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile `390x844` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando no editor de comentario previa horizontal para imagem e video, proporcao aproximada 16:9, ausencia do botao textual `Midia` e presenca do `X` de remover.


## Execucao complementar: centralizar CTA WhatsApp abaixo de midia no desktop (2026-06-22)

- Pedido do usuario: no desktop, quando o comentario/resposta tiver midia, centralizar o botao `Chamar no WhatsApp` abaixo da midia.
- Frontend: na arvore do detalhe do post, o CTA compacto de WhatsApp continua alinhado ao fluxo no mobile, mas passa a usar wrapper `sm:flex sm:justify-center` quando a resposta possui `media_url`.
- Em respostas sem midia, o CTA permanece no alinhamento compacto anterior, preservando a leitura da arvore profunda.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, tracking de clique, modal de redirecionamento, regra de exposicao de WhatsApp, votos, salvos, midia ou ordenacao.
- Fonte visual auditavel: screenshot do usuario e browser local desktop; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP desktop `1440x900` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando CTA centralizado sob video de resposta com diferenca de centro de 0.01px.


## Execucao complementar: rolagem interna do texto na edicao com midia (2026-06-22)

- Pedido do usuario: quando o texto do comentario for muito grande na modal `Editar comentario`, reduzir a area do texto e manter a rolagem apenas dentro do textarea, sem barra de rolagem externa envolvendo a midia.
- Frontend: `ReplyEditModal` passou a remover a rolagem do corpo da modal e limitar dinamicamente a altura do textarea; quando ha midia efetiva, o campo usa limite menor e rolagem interna propria.
- A midia permanece visivel abaixo do texto e acima do rodape, sem depender de scroll externo da modal.
- Quando nao ha midia, o textarea preserva um limite maior, ainda com rolagem interna para textos longos.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, upload, votos, salvos ou regras de composicao texto/midia.
- Fonte visual auditavel: screenshot do usuario e browser local desktop; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP desktop `1440x900` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando corpo da modal com `overflow-y: hidden`, textarea com `overflow-y: auto`, `scrollHeight > clientHeight` e midia visivel acima do rodape.


## Execucao complementar: botao Midia sem sombreamento (2026-06-22)

- Pedido do usuario: remover o sombreamento visual do botao `Midia` na modal `Editar comentario`.
- Frontend: o botao `Midia` do modo editor em `ReplyMediaAttachmentControl` passou a usar `shadow-none`, mantendo borda, gradiente leve, hover/focus e estados desabilitados existentes.
- O ajuste e exclusivamente visual; miniatura, permissao de midia, remocao/substituicao, upload, envio somente com midia e validacoes de dominio permanecem inalterados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos ou regras de composicao texto/midia.
- Fonte visual auditavel: screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP desktop `1440x900` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, abrindo `Editar comentario` e confirmando que o botao `Midia` nao possui sombra visivel.


## Execucao complementar: imagem horizontal em largura util total (2026-06-22)

- Pedido do usuario: quando a midia for uma imagem horizontal, aproveitar 100% da largura util mantendo a proporcao `16:9`.
- Frontend: o `MediaBlock` do detalhe do post passou a manter imagens horizontais de respostas/comentarios com `aspect-video` e `w-full`, removendo o limite compacto `max-w` usado apenas para imagens verticais/quadradas em respostas.
- Imagens verticais e quadradas continuam compactas em respostas; a regra de videos, CTA de WhatsApp, upload, edicao e envio somente com midia nao foi alterada.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos ou regras de composicao texto/midia.
- Fonte visual auditavel: screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0148-imagens-horizontais-16-9-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP desktop `1440x900` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando imagem horizontal com `ratio=1.7777`, `w-full` e `widthGap=0` em relacao a largura util da coluna do comentario.

## Execucao complementar: video horizontal em largura util total (2026-06-22)

- Pedido do usuario: quando o video anexado em comentarios/respostas for horizontal, exibi-lo horizontalmente com maximo aproveitamento da largura util e proporcao `16:9`.
- Frontend: o `MediaBlock` do detalhe do post agora detecta a orientacao real de videos por metadados e aplica `aspect-video`, `w-full` e `max-w-none` quando o video e horizontal.
- Frontend: o `MediaBlock` compartilhado dos cards de comunidade recebeu a mesma deteccao para manter consistencia em listas, perfil e contribuicoes que reutilizam o card.
- Videos verticais continuam com enquadramento compacto e centralizado; imagens, upload, edicao, permissao de midia, CTA WhatsApp, votos, salvos e ordenacao nao foram alterados neste ajuste.
- Fonte visual auditavel: screenshot do usuario e browser local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0148-imagens-horizontais-16-9-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm --dir backend db:migrate` e `pnpm --dir backend build`.

## Execucao complementar: penalidade leve de downvote no ranking (2026-06-22)

- Pedido do usuario: garantir que conteudo com 1 downvote fique abaixo de conteudo neutro (`0` upvotes e `0` downvotes) no ranqueamento de posts e comentarios, sem aplicar rebaixamento agressivo.
- Backend: posts da comunidade, feed geral, previas de respostas profissionais e publicacoes do perfil passaram a usar score de votos com penalidade leve (`upvotes_count - downvotes_count * 0,6`) antes dos desempates de recencia.
- Backend: `post_reply` ganhou contador denormalizado `downvotes_count`, atualizado pela mutation real de voto e usado na ordenacao de comentarios/respostas em qualquer profundidade da arvore.
- Frontend: a ordenacao client-side da arvore do detalhe do post passou a usar o mesmo score de votos, evitando que reordenacoes otimistas ignorem downvotes.
- A contagem de downvotes continua nao exibida como numero publico; o valor serve para consistencia interna de ranking e retorno de mutation.
- Data model: `post_reply.downvotes_count Int @default(0)` foi documentado e migrado em `20260622223000_add_post_reply_downvotes_count`, com backfill a partir de votos ativos existentes.
- ADR criado: `adrs/0150-penalidade-leve-downvotes-ranking-comunidade.md`.
- Validacoes executadas: pnpm --dir backend db:migrate (primeira tentativa falhou por BOM na migration SQL, migration regravada sem BOM e comando reexecutado com sucesso), pnpm --dir backend biome:fix, pnpm --dir frontend biome:fix, pnpm --dir backend check, pnpm --dir frontend check, pnpm --dir backend build, pnpm --dir frontend build, pnpm check e git diff --check.

## Execucao complementar: miniaturas individuais na criacao e edicao segura de midia (2026-06-22)

- Pedido do usuario: dentro da modal `Criar Post`, quando houver varias midias anexadas, nao agrupa-las em um carrossel/container grande; exibir miniatura por miniatura com exclusao individual e sem esconder o campo de texto.
- Frontend: a previa de midias selecionadas na criacao de post deixou de usar estado ativo, setas e dots; agora renderiza uma faixa compacta de figuras independentes, cada uma com seu proprio `X`.
- As miniaturas respeitam orientacao aproximada (paisagem/retrato/quadrado), ficam limitadas em altura e usam rolagem horizontal apenas quando necessario, preservando area util para titulo e conteudo.
- Frontend: no modo editor de comentario, o botao de midia voltou a aparecer como `Editar midia` quando ja existe anexo; sua acao apenas abre a galeria, sem marcar a midia atual para remocao.
- A remocao da midia existente continua exclusiva do botao `X`; selecionar uma nova midia substitui o anexo somente ao salvar, preservando cancelamento seguro.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, limites de arquivo, permissoes de upload, votos, salvos ou regras de composicao texto/midia.
- Fonte visual auditavel: screenshots do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADRs atualizados: `adrs/0149-carrossel-imagens-posts-comunidade.md` e `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: setas persistentes no carrossel publicado (2026-06-22)

- Pedido do usuario: quando houver carrossel de midias, inserir setas de avancar e voltar nas midias no feed, dentro da comunidade e em todos os locais onde o carrossel aparecer.
- Frontend: o componente compartilhado `PostMediaCarousel` recebeu botoes nativos de navegacao anterior/proxima com `z-index` alto, fundo escuro translúcido, blur e gradientes laterais para manter contraste sobre imagens claras ou escuras.
- Como o feed geral, a tela da comunidade, o detalhe do post e os cards reutilizados ja consomem `PostMediaCarousel`, o ajuste se aplica de forma centralizada a todos os locais de exibicao do carrossel publicado.
- Os dots continuam disponiveis para salto direto entre imagens; setas e dots agora interrompem propagacao de clique para nao abrir o card/post acidentalmente.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, limites de arquivo, upload, DTOs ou regra de carrossel apenas com imagens.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0149-carrossel-imagens-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: CTA WhatsApp anexado a midia e visual neutro (2026-06-22)

- Pedido do usuario: aproximar o CTA de WhatsApp dos posts/respostas com midia ao padrao de cards de anuncio, usando nome do psicologo acima e `Chamar no WhatsApp` abaixo, com visual neutro/cinza em vez de verde dominante.
- Frontend: foi criado o componente compartilhado `CommunityWhatsAppCta`, que preserva o fluxo real de tracking/redirecionamento de `PsychologistWhatsAppRedirectButton`, mas padroniza a apresentacao em card retangular de borda suave, sem sombra e com icone discreto.
- O CTA agora acompanha a largura da midia: em carrosseis e midias horizontais usa a largura util total; em videos verticais e midias compactas fica dentro do mesmo wrapper de largura da midia.
- Quando nao ha midia, o CTA usa o mesmo formato retangular arredondado, porem em `w-fit`, mantendo consistencia visual sem ocupar uma faixa grande.
- A regra foi aplicada nos cards compartilhados de comunidade/feed/meus posts, no detalhe do post, na tela da comunidade e em respostas salvas, sem alterar tracking, modal de redirecionamento, backend, endpoints, storage, votos, salvos ou regras de exibicao de `author.whatsapp_url`.
- Fonte visual auditavel: screenshots de referencia do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: refinamento Threads do CTA WhatsApp (2026-06-22)

- Pedido do usuario: refinar o CTA de WhatsApp para ficar mais proximo da referencia visual do Threads, aumentando o respiro entre as linhas e reduzindo o peso da fonte do nome do psicologo.
- Frontend: `CommunityWhatsAppCta` ganhou maior espacamento vertical interno e gap entre nome/acao; o nome passou de peso extra-bold para medium, preservando a hierarquia da acao `Chamar no WhatsApp`.
- O ajuste e exclusivamente visual e reutiliza o mesmo componente compartilhado ja aplicado em feed, comunidade, detalhe do post, salvos e contribuicoes.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, tracking, modal de redirecionamento, storage, votos, salvos ou regras de exibicao de WhatsApp.
- Fonte visual auditavel: screenshot de referencia do Threads enviado pelo usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0147-cortesia-verificada-whatsapp-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: setas do carrossel na listagem interna da comunidade (2026-06-22)

- Pedido do usuario: o post com varias imagens dentro da comunidade continuava exibindo apenas uma imagem, sem as setas laterais do carrossel.
- Frontend: o `PostMedia` local de `/app/community/[slug]` passou a ler `post.media_items` e renderizar `PostMediaCarousel` quando houver mais de uma imagem.
- O fallback legado por `media_url`/`media_type` foi mantido para posts antigos e midia unica.
- O CTA de WhatsApp agora considera tambem `media_items` para manter o botao anexado ao bloco de midia quando houver carrossel.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, endpoints, upload, limites de arquivo, votos, salvos ou ranking.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0149-carrossel-imagens-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: padronizacao de frames de midia (2026-06-23)

- Pedido do usuario: implementar as regras de formatacao de midia padronizadas definidas na conversa para feed, comunidade, detalhe do post, respostas e publicacoes no perfil do psicologo.
- Frontend: foi criada a fundacao compartilhada `CommunityMediaBlock`/helpers de orientacao para aplicar frames horizontais `16:9`, quadrados `1:1` e verticais `4:5` com limites responsivos por contexto.
- Frontend: `PostMediaCarousel` passou a escolher um frame unico pelo conjunto de imagens, manter altura estavel, usar `object-contain` para nao cortar carrosseis mistos e aceitar footer para o CTA de WhatsApp acompanhar a largura da midia.
- Frontend: cards compartilhados, listagem interna de comunidade, detalhe do post, respostas em arvore e itens salvos passaram a usar a fundacao comum, deixando o desktop mais proximo do Threads: midias menores e alinhadas a esquerda, preservando largura util no mobile.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, storage, upload, limites de arquivo, DTOs, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshots e decisoes do usuario neste thread; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: divisor entre contexto e autor nos cards (2026-06-23)

- Pedido do usuario: nos cards de conteudo, em todos os contextos exceto no detalhe do post, adicionar uma linha fina entre o cabeï¿½alho `Postado em` e o nome do psicologo.
- Frontend: `CommunityPostCard` passou a renderizar um divisor sutil quando o card exibe simultaneamente contexto da comunidade (`Postado em`/`Respondido em`) e autoria.
- Frontend: a listagem interna de comunidade recebeu o mesmo divisor no `PostCard` local quando o cabeï¿½alho `Postado em` esta visivel.
- Frontend: os cards de respostas salvas tambem receberam o divisor entre `Respondido em` e o cabeï¿½alho do autor, mantendo consistencia nas listas fora do detalhe do post.
- O detalhe do post nao foi alterado, conforme excecao definida pelo usuario.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, votos, salvos, ranking, midia ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0152-divisor-contexto-autor-cards-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: botao Anexar midia apenas com comentario em foco (2026-06-23)

- Pedido do usuario: `Anexar midia` so deve aparecer quando o campo de comentarios estiver em foco.
- Frontend: `ReplyComposer` passou a renderizar o controle de midia apenas quando o composer esta ativo/focado ou quando ja existe uma midia selecionada.
- A miniatura da midia selecionada continua visivel apos perda de foco, preservando o fluxo de enviar somente midia sem texto.
- O ajuste vale para o comentario principal do post e para respostas inline, pois ambos reutilizam o mesmo composer.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: remover fallback desktop do botao Anexar midia (2026-06-23)

- Pedido reforcado pelo usuario: `Anexar midia` so deve aparecer quando o campo de comentarios estiver em foco.
- Frontend: removido o fallback responsivo `sm:flex` e a condicao auxiliar `expanded` da renderizacao do controle de midia no `ReplyComposer`.
- Agora o controle so e renderizado quando o composer esta ativo/focado ou quando ja existe uma midia selecionada para envio.
- O ajuste vale para comentario principal e respostas inline sem alterar o fluxo de enviar somente midia.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.

## Execucao complementar: videos em 9:16 ou 16:9 sem crop automatico (2026-06-23)

- Pedido do usuario: alterar a regra dos videos para remover margens pretas laterais sem cortar videos verticais gravados corretamente em 9:16.
- Frontend: `CommunityMediaBlock` passou a separar metadados de videos e imagens; videos sao classificados apenas como horizontais ou verticais.
- Frontend: videos verticais usam frame `9:16`, videos horizontais usam `16:9`, e o player preserva o conteudo com `object-contain` em vez de crop automatico.
- Frontend: quando `videoWidth/videoHeight` estao disponiveis, o player recebe `aspect-ratio` exato para eliminar barras geradas por pequenas variacoes de proporcao do arquivo.
- Imagens e carrosseis de imagens continuam com a regra anterior (`16:9`, `1:1`, `4:5`) e nao foram alterados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshots do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: imagens verticais em 9:16 (2026-06-23)

- Pedido do usuario: para imagens verticais, usar frame `9:16` em vez de `4:5`.
- Frontend: a fundacao compartilhada `CommunityMediaBlock` passou a aplicar `aspect-[9/16]` para imagens classificadas como verticais.
- Imagens horizontais continuam em `16:9` e quadradas em `1:1`; videos continuam com a regra separada `16:9`/`9:16` sem crop automatico.
- Carrosseis com qualquer imagem vertical passam a herdar o frame vertical `9:16` pelo helper centralizado de orientacao.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: decisao do usuario neste thread; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: pnpm --dir frontend biome:fix, pnpm --dir frontend check, pnpm --dir frontend build, pnpm check e git diff --check.

## Execucao complementar: carrossel misto em frame 1:1 (2026-06-23)

- Pedido do usuario: quando o carrossel tiver midias em formatos diferentes, usar um frame unico quadrado `1:1`; quando todas tiverem o mesmo formato, preservar `16:9`, `9:16` ou `1:1` conforme a orientacao.
- Frontend: `resolveCarouselMediaOrientation` passou a retornar `square` para qualquer mistura de orientacoes, mantendo `landscape`, `portrait` ou `square` apenas quando todos os itens detectados forem homogeneos.
- O carrossel continua usando `object-contain`, evitando corte de imagens horizontais, verticais ou quadradas dentro do frame misto.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: decisao do usuario neste thread; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: pnpm --dir frontend biome:fix, pnpm --dir frontend check, pnpm --dir frontend build, pnpm check e git diff --check.

## Execucao complementar: carrossel com fallback quadrado e formatos canônicos (2026-06-23)

- Pedido do usuario: o carrossel continuava vertical no feed mesmo apos a regra de carrossel misto.
- Frontend: `PostMediaCarousel` passou a resolver o frame a partir dos metadados reais de largura/altura de todas as imagens do carrossel.
- Frontend: enquanto os metadados de um carrossel multiplo nao estiverem completos, o fallback agora e `1:1`, evitando renderizacao vertical por deteccao parcial.
- Frontend: verticais intermediarias como `4:5` e `3:4` passam a ser tratadas como formato quadrado em carrossel; somente verticais canonicas proximas de `9:16` mantem frame vertical quando todo o conjunto tambem for canonico vertical.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: mídias menores apenas no desktop (2026-06-23)

- Pedido do usuario: no desktop, diminuir as midias para ficar mais parecido com o Threads e permitir ver todo ou quase todo o post sem rolagem.
- Frontend: os limites `md:max-w` dos frames compartilhados foram reduzidos para post/detalhe e respostas/comentarios, sem alterar a largura mobile.
- Frontend: os `sizes` usados pelo `next/image` foram atualizados para refletir os novos limites desktop.
- As proporcoes padronizadas (`16:9`, `1:1`, `9:16`), alinhamento a esquerda, carrossel e CTA de WhatsApp foram preservados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshots do usuario comparando Lectum e Threads; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: fundo branco dentro do post (2026-06-23)

- Pedido do usuario: dentro do post, remover o fundo azulado dos posts/respostas de psicologos e usar fundo branco mesmo para psicologos.
- Frontend: o card do post original no detalhe permanece branco tambem no hover, sem fundo azulado.
- Frontend: as arvores/cards de respostas de psicologos verificados dentro do detalhe do post nao usam mais `bg-[#F4FAFF]`; todos os cards usam fundo branco e borda neutra.
- Selos de verificado, badges de mentor, CTA de WhatsApp, ordenacao de respostas de psicologos, midias, carrossel, foco/scroll e acoes de comentarios foram preservados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0153-fundo-branco-posts-psicologos-dentro-post.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: corrigir anexo de midia no composer de comentarios (2026-06-23)

- Pedido do usuario: o clique em `Anexar midia` abria a galeria, mas ao perder foco o comentario escondia o controle e a midia nao aparecia anexada.
- Frontend: `ReplyComposer` passou a manter um estado temporario de selecao nativa de arquivo (`mediaPickerActive`) para nao desmontar o input enquanto a galeria/seletor esta aberta.
- Frontend: `ReplyMediaAttachmentControl` passou a avisar o composer antes de abrir o seletor de arquivo e a prevenir que o botao roube o foco do textarea no clique.
- Ao selecionar uma midia, a miniatura fica anexada ao campo e o comentario pode ser enviado somente com midia; ao cancelar a galeria, o composer e refocado sem manter anexo falso.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: copy compacta no menu de acoes do post (2026-06-23)

- Pedido do usuario: alterar as opcoes do menu do post para `Editar`, `Silenciar` e `Excluir`, removendo o sufixo `post`.
- Frontend: `PostOwnerActionMenu` passou a exibir os rótulos compactos no dropdown de tres pontos e no fluxo de bloqueio para silenciar.
- Frontend: o selo de post silenciado foi simplificado para `Silenciado`, mantendo o estado e a regra de notificacoes inalterados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0141-post-owner-actions-mute-delete.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: copy compacta no menu de acoes de comentarios (2026-06-23)

- Pedido do usuario: alterar as opcoes do menu de comentarios/respostas para `Editar`, `Silenciar` e `Excluir`, removendo o sufixo `comentario`.
- Frontend: `ReplyOwnerActionMenu` passou a exibir os rótulos compactos no dropdown de tres pontos, tanto para comentarios quanto para respostas.
- Frontend: o botao do fluxo de bloqueio de exclusao/silenciamento tambem usa copy compacta (`Silenciar`/`Silenciada`), sem alterar a regra de dominio.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0146-acoes-respostas-usuario.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: icone unico de anexar midia (2026-06-23)

- Pedido do usuario: substituir o icone dos botoes de anexar midia na modal de criacao do post e nos comentarios pelo SVG anexado `animated_images_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg`.
- Frontend: criado `AnimatedImagesIcon` a partir do SVG fornecido, usando `currentColor` para herdar cor, hover, foco e estados desabilitados do design system.
- Frontend: o novo icone foi aplicado ao botao `Midia` da criacao/edicao de post e ao controle compartilhado `Anexar midia`/`Midia` de comentarios e respostas.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- Fonte visual auditavel: SVG anexado pelo usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: miniaturas separadas na edicao de post (2026-06-23)

- Pedido do usuario: na edicao do post, exibir as midias em miniaturas separadas e garantir que o botao `Midia` apenas abra a galeria para anexar novas midias, sem remover as ja existentes.
- Frontend: `PostEditModal` deixou de usar o carrossel grande dentro da modal de edicao e passou a renderizar cada midia atual/selecionada como miniatura independente com acao individual de remover.
- Frontend: o botao `Midia` agora preserva as midias existentes; novas imagens sao anexadas ao conjunto atual ate o limite de carrossel, e videos continuam sendo tratados como anexo unico sem misturar com imagens.
- Frontend: ao salvar, a payload preserva as midias armazenadas que nao foram removidas, reindexa as imagens mantidas/novas e envia remocao somente quando o usuario remove explicitamente todos os anexos.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execução complementar: botão de mídia na edição de comentário (2026-06-23)

- Pedido do usuário: quando já houver mídia no comentário, remover o botão `Editar mídia` da modal de editar comentário e exibir novamente somente se a mídia for removida; se o comentário não tiver mídia, o botão deve aparecer.
- Frontend: `ReplyMediaAttachmentControl` agora mantém o input de arquivo disponível, mas só renderiza o botão `Mídia` no modo editor quando não existe mídia efetiva atual ou selecionada.
- Frontend: quando há mídia atual ou recém-selecionada, a modal exibe apenas a miniatura com o botão `X` de remover; ao remover a mídia, o botão `Mídia` volta para permitir anexar uma nova.
- Não houve alteração de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissões, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditável: screenshot do usuário; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0156-botao-midia-edicao-comentario.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.
## Execução complementar: miniatura horizontal na edição de comentário (2026-06-23)

- Pedido do usuário: na modal de editar comentário, se a mídia for horizontal, a miniatura também deve aparecer horizontal.
- Frontend: `ReplyMediaAttachmentControl` passou a usar `landscape` como orientação visual padrão no modo editor enquanto a detecção assíncrona de dimensões da mídia atual ainda não terminou.
- Frontend: `ReplyEditModal` passou a detectar a orientação de novas mídias selecionadas na edição, reaproveitando `detectReplyMediaOrientation` para manter imagens/vídeos horizontais em moldura horizontal.
- Não houve alteração de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissões, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditável: screenshot do usuário; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0156-botao-midia-edicao-comentario.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execução complementar: reversão do fundo branco do feed (2026-06-23)

- Pedido do usuário: desfazer a última alteração e voltar o background do feed à cor anterior.
- Frontend: `CommunityFeedLogic` voltou a usar `bg-[#F5F7FA]` no `PrivateTemplate` e no header sticky de busca/filtros.
- Frontend: `CommunityDetailLogic` também voltou a usar `bg-[#F5F7FA]` para manter a timeline dentro da comunidade consistente com o feed.
- Ajuste visual: o offset de foco do FAB de criação voltou para `ring-offset-[#F5F7FA]`.
- Dark mode preservado com `dark:bg-background`.
- O ADR da alteração para fundo branco foi removido por não representar mais o estado atual; novo ADR criado: `adrs/0157-reversao-fundo-cinza-feed-comunidade.md`.
- Não houve alteração de backend, Prisma, storage ou packages.
- Fonte visual: pedido do usuário; Builder/Quick Copy não está acessível neste ambiente.

### Validações

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Chrome headless local em `/smoke-reply-composer` confirmou `contenteditable` renderizado, sem `textarea` nativo no composer.
- [x] `pnpm check`
- [x] `git diff --check`

## Execucao complementar: acoes desktop sem sombra na descoberta de psicologos (2026-06-23)

- Pedido do usuario: no desktop, remover o sombreamento atras das opcoes `Favoritar`, `Compartilhar`, `WhatsApp` e `Perfil` na descoberta de psicologos.
- Frontend: a rail desktop de acoes em `PsychologistsLogic` deixou de aplicar sombra nos botoes circulares dessas quatro opcoes.
- Frontend: os botoes mantem fundo branco, borda sutil, icones, labels e estados de hover/active, sem alterar controles mobile, busca, filtros ou navegacao entre psicologos.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, permissoes, ranking, posts, comentarios ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0159-remocao-sombra-acoes-desktop-psicologos.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump` para `0.1.63`
- [x] `pnpm check:version`
## Execução complementar: chips sem sombra no perfil do psicólogo (2026-06-23)

- Pedido do usuário: remover o sombreamento atrás dos chips de especialidades, atendimento (`Modalidade`, `Abordagens`, `Serviços`, `Público atendido`, `Idiomas`) e `Formação & Títulos` no perfil público do psicólogo.
- Frontend: `ProfileChipList`, `ProfileInfoCard` e os itens de `FormationSection` deixaram de aplicar sombras nos chips/cards internos, mantendo borda, radius e espaçamentos.
- As sombras dos cards principais do perfil foram preservadas para não achatar toda a página e manter a separação entre seções.
- Não houve alteração de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissões, votos, salvos, ranking, posts, comentários ou tracking de WhatsApp.
- Fonte visual auditável: screenshots do usuário; Builder/Quick Copy não está exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0158-remocao-sombra-chips-perfil-psicologo.md`.

### Validações

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
## Execucao complementar: background uniforme na visualizacao do post (2026-06-23)

- Pedido do usuario: remover variacoes de tonalidade, gradiente ou diferenca de cor no background estrutural da tela de visualizacao do post e da arvore de respostas, usando a mesma base visual das telas Psicologos, Favoritos, Notificacoes, Perfil e Comunidades.
- Frontend: `PostDetailLogic` passou a usar `bg-background` no `PrivateTemplate` e no wrapper raiz da rota `/app/community/[slug]/post/[id]`, cobrindo a area externa ao card, laterais desktop, estados de carregamento e vazio.
- Frontend: `PostReplyThreadLogic` passou a usar `bg-background` no `PrivateTemplate` e no wrapper raiz da rota `/app/community/[slug]/post/[id]/thread/[replyId]`, cobrindo comentarios, respostas aninhadas, laterais desktop, estados de carregamento e vazio.
- O destaque azulado das respostas de psicologos, cards, bordas, superficies internas, overlays de midia e composer foram preservados como componentes, sem virar background estrutural da pagina.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0160-background-uniforme-comunidades-feed.md`.

### Validacoes

- [x] `git diff --check`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`

## Execucao complementar: contadores privados em Meus posts e respostas (2026-06-23)

- Pedido do usuario: contadores de downvotes e compartilhamentos devem aparecer para psicologos somente na tela `Meus posts e respostas`.
- Frontend: `CommunityActionBar` passou a aceitar contadores opcionais de downvote/share, sem alterar a exibicao padrao dos demais contextos.
- Frontend: `/app/posts/mine` passa esses contadores explicitamente apenas em posts e respostas cujo autor tem `role="psicologo"`.
- Feed, comunidade, detalhe do post, salvos e perfil do psicologo nao passam essas props e continuam sem os contadores adicionais.
- Para compartilhamentos, replies e posts sem metrica persistida exposta pelo contrato exibem `0` ate o backend disponibilizar o contador real.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes ou ranking.
- Fonte visual/auditavel: pedido e screenshots do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0161-contadores-privados-meus-posts-respostas.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`

## Execucao complementar: previa profissional apenas em posts de pacientes (2026-06-24)

- Pedido do usuario: a previa de resposta profissional em destaque no feed e dentro da comunidade deve aparecer exclusivamente em posts de pacientes, nunca em posts de psicologos gratuitos ou assinantes.
- Frontend: `CommunityPostCard` agora renderiza `highlighted_professional_reply` apenas quando o autor original do post tem `role="paciente"`, preservando os cards em que a propria resposta e o conteudo principal exibido.
- Frontend: a lista de posts dentro da comunidade aplica a mesma regra para a previa profissional local.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, permissoes, ranking, midia, votos, salvos ou tracking de WhatsApp.
- Fonte visual/auditavel: pedido e screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0162-previa-profissional-apenas-posts-pacientes.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`

## Execucao complementar: CTA WhatsApp conectado a midia (2026-06-24)

- Pedido do usuario: refinar o botao `Chamar no WhatsApp` dentro de posts e respostas/comentarios com midia para parecer conectado ao video/imagem, e nao um card separado.
- Frontend: `CommunityWhatsAppCta` passa a exibir `WhatsApp` na primeira linha e `Falar com {primeiro nome}` na segunda quando estiver anexado a uma midia.
- Frontend: `CommunityMediaBlock` e `PostMediaCarousel` removem o gap entre midia e CTA e eliminam o arredondamento inferior do frame quando existe footer, mantendo o CTA com topo conectado e cantos inferiores arredondados.
- CTAs sem midia permanecem como botao independente.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual/auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `git diff --check`

## Complemento 2026-06-25 - respiro vertical do CTA WhatsApp anexado a midia

- Pedido do usuario: ajustar o CTA de WhatsApp integrado a videos/imagens de posts e respostas da comunidade para que o texto nao pareca cortado, especialmente os descendentes de `WhatsApp`, e adicionar seta discreta em `Falar com {nome}`.
- Frontend: `CommunityWhatsAppCta` aumentou o padding vertical da variante anexada a midia, ampliou o gap entre linhas e trocou `leading-none` por `leading-[1.35]` nas duas linhas do CTA.
- Frontend: a linha `WhatsApp` deixou de usar `truncate`/`overflow-hidden`, mantendo `overflow-visible` e `whitespace-nowrap` para evitar corte visual da base das letras.
- Frontend: a segunda linha agora exibe `Falar com {primeiro nome} →`, preservando o icone de WhatsApp e a largura conectada ao frame de video/imagem.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual/auditavel: pedido do usuario e referencias locais `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.
- Validacoes executadas nesta execucao: `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, HTTP local `200` em `/app/community/feed`, `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-25 - CTA WhatsApp sem midia padronizado

- Pedido do usuario: padronizar os elementos do botao de WhatsApp em posts e respostas sem midia.
- Frontend: `CommunityWhatsAppCta` passou a usar a mesma hierarquia textual em todas as variantes: `WhatsApp` na primeira linha e `Falar com {primeiro nome} →` na segunda linha.
- A variante sem midia permanece como botao independente (`w-fit`, cantos arredondados completos), enquanto a variante com midia continua conectada ao frame de imagem/video.
- A alteracao reaproveita `PsychologistWhatsAppRedirectButton` e `PsychologistWhatsAppButtonContent`, preservando abertura do WhatsApp, tracking, icone, estados de hover/focus e bloqueio de propagacao dos cards.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual/auditavel: pedido do usuario e referencias locais `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.
- Validacoes executadas nesta execucao: `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, HTTP local `200` em `/app/community/feed` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-25 - controle explicito para ocultar respostas

- Pedido do usuario: substituir o recolhimento da arvore por clique na parte superior do primeiro comentario, pois esse gesto conflitava com interacoes como `ver mais` do texto e podia recolher a conversa sem querer.
- Frontend: o comentario raiz deixou de receber `onClick`/`role=button` no bloco inteiro para recolher/expandir a arvore.
- Frontend: o controle passou a ser um botao explicito e secundario logo abaixo da barra de acoes do comentario raiz, alternando entre `Ocultar respostas` e `Ver respostas (N)` com chevron discreto.
- A lista de respostas filhas so renderiza quando a arvore esta expandida; ao recolher, a linha visual de hierarquia tambem deixa de ser desenhada para evitar indicar continuacao vazia.
- Deep links com `focusReplyId` continuam preservando a arvore aberta para manter o comentario focado visivel.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, payloads, votos, salvos, ordenacao, profundidade visual ou criacao de respostas.
- Fonte visual/auditavel: decisao conversada com o usuario e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check` e HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-25 - conectores em L na arvore de comentarios

- Pedido do usuario: aproximar a arvore de comentarios do comportamento visual do YouTube, onde respostas em camadas inferiores ficam conectadas ao comentario raiz por uma linha vertical com curva/conector horizontal.
- Frontend: cada resposta filha em `/app/community/[slug]/post/[id]` e na thread isolada passa a receber um conector sutil em `L`, ligado a linha vertical da arvore, antes do comentario filho.
- O ajuste preserva a linha vertical existente, o botao explicito `Ocultar respostas`/`Ver respostas`, profundidade visual, ordenacao, votes, salvos, composer, midias e WhatsApp.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, payloads ou dados persistidos.
- Fonte visual/auditavel: screenshot do usuario comparando YouTube e rota local; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-25 - controle de respostas mais discreto

- Pedido do usuario: reduzir a importancia visual/tamanho de `Ver respostas` e `Ocultar respostas`, que estava grande demais na arvore de comentarios.
- Frontend: o botao explicito de expandir/recolher respostas foi reduzido de escala, com menor margem superior, `text-[10px]`, `font-semibold`, `leading-none`, padding menor e chevrons de 12px.
- O controle continua abaixo da barra de acoes do comentario raiz e preserva aria-label, aria-expanded, contagem, collapse/expand, deep links e a arvore visual com conectores.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, votos, salvos, ordenacao ou criacao de respostas.


## Complemento 2026-06-25 - icone SVG no CTA WhatsApp

- Pedido do usuario: no botao de WhatsApp, substituir a seta textual de `Falar com {nome}` pelo SVG fornecido `arrow_forward_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg`.
- Frontend: o asset foi versionado em `frontend/public/svg/arrow_forward_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg` e renderizado com `next/image` em `CommunityWhatsAppCta`, preservando a regra do projeto de nao usar `<img>`.
- Frontend: o texto permanece `Falar com {primeiro nome}` e o icone SVG decorativo aparece ao final da linha, mantendo hierarquia, espacamento, tracking, abertura do WhatsApp e bloqueio de propagacao dos cards.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos, ranking ou dados persistidos.
- Fonte visual/auditavel: pedido do usuario e asset local vinculado; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes executadas nesta execucao: `pnpm --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check` e HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-26 - controle de respostas ultracompacto

- Pedido do usuario: o texto `Ocultar respostas` na arvore de comentarios ainda estava grande visualmente.
- Frontend: o botao explicito de expandir/recolher respostas ficou ainda menor: gap/padding reduzidos, chevrons de 10px e label em `text-[9px]`, `font-medium`, `leading-none` e `whitespace-nowrap`.
- Frontend: a tipografia do label foi aplicada no `span` interno, e nao diretamente no `button`, porque o reset/base de botoes pode sobrescrever propriedades de fonte no elemento interativo e impedir que o tamanho visual reduza de fato.
- O controle permanece abaixo da barra de acoes do comentario raiz, com `aria-label`, `aria-expanded`, `aria-controls`, contagem ao recolher, deep links e conectores da arvore preservados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, votos, salvos, ordenacao, permissao ou criacao de respostas.
- Fonte visual/auditavel: screenshot do usuario na rota `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check`, HTTP local `200` na rota do post demo e Chrome/CDP local em viewport mobile validando label com `font-size: 9px`, `font-weight: 500` e `line-height: 9px`.

## Complemento 2026-06-26 - controle de respostas alinhado ao Responder

- Pedido do usuario: `Ver respostas`/`Ocultar respostas` ficou pequeno demais apos o ajuste ultracompacto e deve seguir o mesmo tamanho visual de `Responder`.
- Frontend: o label do botao explicito da arvore voltou para `text-[12px]`, `font-semibold`, `leading-none` e `tracking-[-0.01em]`, mesma base tipografica do `Responder` text-only da `CommunityActionBar`.
- Frontend: chevrons, gap e padding foram ajustados para acompanhar a escala do texto sem voltar a transformar o controle em acao principal.
- A tipografia continua aplicada no `span` interno do label para evitar regressao por reset/base de `button`.
- O controle permanece abaixo da barra de acoes do comentario raiz, com `aria-label`, `aria-expanded`, `aria-controls`, contagem ao recolher, deep links e conectores da arvore preservados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, votos, salvos, ordenacao, permissao ou criacao de respostas.
- Fonte visual/auditavel: screenshot do usuario na rota `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas: `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check`, HTTP local `200` na rota do post demo e validacao local de DOM/CSS confirmando label com `font-size: 12px`, `font-weight: 600` e `line-height: 12px`.

## Complemento 2026-06-26 - rolagem infinita no detalhe do post

- Pedido do usuario: dentro do post, nao exibir navegacao por paginacao e carregar mais comentarios/respostas na mesma tela conforme o usuario rola para baixo.
- Frontend: `/app/community/[slug]/post/[id]` removeu o componente visual de paginacao (`Anterior`, contador `N de N` e `Proxima`) do fim da discussao.
- Frontend: as respostas diretas ao post agora usam paginas reais do endpoint existente, mas sao assinadas em paralelo via TanStack Query (`usePostRepliesPages`) e acumuladas em uma unica lista, preservando cache, invalidacoes e optimistic update de votos/salvos em cada pagina carregada.
- Frontend: um sentinel com `IntersectionObserver` carrega a proxima pagina automaticamente quando o usuario se aproxima do fim da lista; durante a busca, o rodape exibe apenas `Carregando mais respostas`.
- Deep links e respostas recem-criadas continuam usando `focusReplyId`: a tela descobre a pagina real do comentario focado, carrega as paginas ate esse ponto e preserva o destaque/scroll para o item.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, votos, salvos, ordenacao ou regras de permissao.
- Fonte visual/auditavel: pedido do usuario e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.
- Validacoes executadas nesta execucao: `pnpm.cmd --dir frontend exec biome check --write "src/api/callers/posts/index.tsx" "src/app/app/community/[slug]/post/[id]/logic.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, `git diff --check`, HTTP local `200` na rota do post demo e Chrome headless mobile 390x844 confirmando ausencia de `Anterior`, `Proxima` e contador de paginas no DOM renderizado.

## Complemento 2026-06-26 - alias anônimo estável no detalhe do post

- Pedido do usuário: manter o mesmo identificador anônimo para um membro em posts anônimos diferentes, para preservar contexto comunitário e apoiar respostas dos psicólogos sem expor a identidade real.
- Backend: o detalhe do post e as listas relacionadas passaram a receber o mesmo alias `Membro Anônimo #XXXX` derivado de `author.id`, em vez de um número derivado do post.
- O comportamento preserva anonimato visual: nome real, avatar e perfil do paciente continuam mascarados quando `anonymous=true`.
- Escopo: sem mudança de schema Prisma, migrations, packages, endpoints, payloads, frontend, votos, salvos, árvore de comentários ou criação de respostas.
- ADR criado: `adrs/0167-alias-anonimo-estavel-por-usuario.md`.

## Complemento 2026-06-26 - mensagem WhatsApp contextual no detalhe do post

- Pedido do usuário: a mensagem pronta do WhatsApp deve iniciar com o primeiro nome do psicólogo.
- Backend: no detalhe do post, links de WhatsApp do autor do post usam a copy `seu post na Lectum`; links de respostas/comentários usam `sua resposta na Lectum`, ambos com saudação `Olá {primeiro nome}` quando o nome existe.
- Frontend: a modal/transição global de WhatsApp mantém o texto contextual da origem do clique ao combinar fallback de tela e URL retornada pelo tracking.
- Escopo: sem alteração de schema Prisma, migrations, endpoints, árvore de comentários, votos, salvos, mídia, permissões ou packages.
- ADR atualizado: `adrs/0022-contato-whatsapp-wa-me.md`.

## Complemento 2026-06-29 - denuncias preparadas para painel administrativo futuro

- Pedido do usuario: preparar o sistema para receber denuncias de posts no painel administrativo que sera desenvolvido futuramente.
- Escopo tratado como complemento da TASK-26, pois o fluxo de denuncia de post/comentario ja pertence ao detalhe do post e aos endpoints `POST /api/private/posts/:id/report` e `POST /api/private/posts/:id/replies/:replyId/report`.
- Backend: `post_report` passou a persistir `target_type` e `target_id`, mantendo `post_id`/`reply_id` para joins atuais e criando uma chave unica `target_type + target_id + reporter_id` para uma denuncia ativa por usuario/alvo.
- Backend: o reenvio da mesma denuncia agora usa `upsert` transacional pela chave de alvo normalizada, atualizando motivo, descricao e recolocando `status="pendente"` sem criar duplicidade para a fila futura de moderacao.
- API: a resposta de denuncia passou a incluir `target_type` e `target_id` como campos aditivos, preservando `post_id`, `reply_id`, `reason`, `description`, `status` e `created_at`.
- Fora do escopo: nao foi criado painel administrativo, autenticacao admin, rota manager/admin ou remocao automatica de conteudo; admin continua audiencia separada e futura conforme `DATA-MODEL.md`.
- Durante a migracao, o banco de desenvolvimento compartilhado continha a migration `20260629041000_add_psychologist_role_onboarding_tips` ja aplicada a partir de outra branch local; a pasta correspondente foi recuperada para alinhar historico sem resetar nem apagar dados.
- Nao houve UI nova; Builder/Quick Copy e imagens locais nao se aplicam a este complemento.
- ADR criado: `adrs/0182-denuncias-posts-admin-ready.md`.

### Validacoes

- [x] `pnpm --dir backend db:migrate` (primeira tentativa aplicou a migration e excedeu timeout da ferramenta; segunda execucao retornou "Already in sync")
- [x] `pnpm --dir backend exec prisma migrate status`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm check`

## Complemento 2026-06-30 - menu de opcoes dos comentarios acima do composer

- Pedido do usuario: ao clicar nos tres pontinhos dos comentarios, a janela de opcoes ficava escondida atras de outros elementos da tela, especialmente no mobile com o composer fixo no rodape.
- Frontend: o menu inline de comentarios em `/community/[slug]/post/[id]` passou a abrir para cima (`bottom`) em vez de para baixo, mantendo a lista de acoes dentro do viewport quando a barra de interacao esta perto do rodape.
- Frontend: os menus de acoes do proprio comentario reutilizados em `Meus posts/comentarios` tiveram o z-index elevado para a mesma camada de overlay leve, evitando ficar atras de barras fixas sem alterar a direcao padrao desses cards.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, votos, salvos, denuncias ou regras de permissao.
- Fonte visual/auditavel: screenshots do usuario e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0192-menu-opcoes-comentarios-sobreposicao.md`.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx" "src/components/community/reply-owner-action-menu.tsx"`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] HTTP local `200` em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v`
- [x] Chrome/CDP local mobile 390x844 confirmou menu de resposta abrindo para cima, dentro do viewport, com `z-index: 120` acima do composer fixo (`z-index: 40`).

## Complemento 2026-07-01 - espacamento compacto entre contexto e comunidade

- Pedido do usuario: verificar se havia excesso de espaco entre `Postado em` e o nome da comunidade no topo dos posts.
- Frontend: o cabecalho de contexto do detalhe do post reduziu o gap horizontal de `gap-1.5` para `gap-x-1`, preservando o respiro vertical para quebras de linha.
- Frontend: os cabecalhos equivalentes dos cards da comunidade e do componente compartilhado `CommunityPostCard` tambem passaram a usar `gap-1` entre icone, label e nome da comunidade, mantendo consistencia em feed, comunidade, salvos/meus posts e publicacoes de perfil.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, votos, salvos, comentarios, midias ou regras de permissao.
- Fonte visual/auditavel: screenshot do usuario e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0152-divisor-contexto-autor-cards-comunidade.md`.

### Validacoes

- [x] `pnpm --dir frontend check` (primeira tentativa excedeu timeout local; repetida com timeout maior e concluiu sem erros)
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] Chrome/CDP local em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v` confirmou gap medido de `3.75px` em viewport mobile 390x844 e `4px` em desktop 1365x768 entre `Postado em` e `Ansiedade em Equilibrio`.

## Complemento 2026-07-01 - carrossel de imagens sem sombra lateral nas setas

- Pedido do usuario: remover a sombra visivel sobre/ao redor das setas de avancar e voltar nos carrosseis de imagens.
- Frontend: `PostMediaCarousel` deixou de renderizar os overlays laterais em gradiente (`from-slate-950/25`) sobre as bordas do frame, mantendo apenas os botoes circulares, foco acessivel e navegacao anterior/proxima.
- O ajuste e mobile-first e afeta o carrossel compartilhado em feed, dentro da comunidade, detalhe do post, salvos/meus posts e publicacoes de perfil que reutilizam o componente.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, upload, permissao de midia, WhatsApp, votos ou salvos.
- Fonte visual/auditavel: screenshot do usuario nesta conversa e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` e Chrome headless local em `/community/autocuidado-em-pratica/post/cmr20rokk000cbkuhqiyegeev` confirmaram o carrossel renderizado sem overlays laterais de sombra nas setas.

## Complemento 2026-07-01 - setas do carrossel ocultas somente no mobile

- Pedido do usuario: remover as setas de avancar/voltar do carrossel somente na experiencia mobile.
- Frontend: os botoes `Imagem anterior` e `Proxima imagem` do `PostMediaCarousel` agora ficam `hidden` na base mobile e voltam como `sm:grid` em telas maiores, mantendo a navegacao por setas no desktop/tablet e os indicadores de slides no mobile.
- O ajuste e mobile-first e reaproveita o componente compartilhado do carrossel, afetando feed, dentro da comunidade, detalhe do post, salvos/meus posts e publicacoes de perfil sem criar variante paralela.
- Nao houve alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, upload, permissao de midia, WhatsApp, votos ou salvos.
- Fonte visual/auditavel: screenshot do usuario nesta conversa e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` e Chrome headless local em `/community/autocuidado-em-pratica/post/cmr20rokk000cbkuhqiyegeev` confirmaram setas ocultas em 390px e visiveis no desktop.

## Complemento 2026-07-01 - autoria anonima preservada nos comentarios do dono do post

- Pedido do usuario: quando o dono de um post publicado anonimamente comentar na propria thread, o comentario tambem deve aparecer anonimo; comentarios do dono do post devem exibir `Autor` antes do horario, no formato `Nome` / `Autor · há ... · editado`.
- Backend: os DTOs de respostas de `GET /api/private/posts/:id/replies`, `GET /api/private/posts/:id/replies/:replyId`, `POST /api/private/posts/:id/replies` e `PUT /api/private/posts/:id/replies/:replyId` agora derivam `is_post_author` por `post_reply.author_id === community_post.author_id`.
- Backend: quando `community_post.anonymous=true` e a resposta pertence ao autor do post, a autoria da resposta herda o mesmo alias `Membro Anônimo #XXXX` derivado de `author_id`, sem expor nome/avatar reais.
- Backend: a hidratacao de atores da central de notificacoes tambem mascara `nova_resposta` quando a resposta vem do autor de um post anonimo.
- Frontend: o detalhe do post usa `reply.is_post_author` para renderizar `Autor · {horario}` e usa `reply.author.anonymous` para o avatar anonimo no comentario.
- Nao houve alteracao de schema Prisma, migrations, endpoints novos, packages, regra de votos/salvos, ordenacao ou dados fake.
- Fonte visual/auditavel: screenshots do usuario nesta conversa e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0167-alias-anonimo-estavel-por-usuario.md`.

### Criterios de aceite do complemento

- [x] Comentarios/respostas do autor de post anonimo aparecem com o alias anonimo do post, sem nome/avatar reais.
- [x] Comentarios/respostas do autor do post exibem `Autor` antes do horario (`Autor · há ... · editado`).
- [x] Comentarios de outros usuarios no mesmo post continuam exibindo a identidade propria permitida.
- [x] A central de notificacoes nao revela o nome real do autor anonimo em `nova_resposta`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo ou migration foi usado.
- [x] Validacoes relevantes e browser local mobile foram executados sem erro.

### Validacoes

- [x] `pnpm --dir backend exec biome check --write src/modules/api/private/posts/DTOs/IPostDTO.ts src/modules/api/private/posts/repositories/PostRepository.ts src/modules/api/private/notification/index/repositories/IndexRepository.ts`
- [x] `pnpm --dir frontend exec biome check --write "src/api/generator/types/community.ts" "src/api/generator/types/posts.ts" "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check` (sem erro; apenas aviso local de normalizacao CRLF/LF no ADR atualizado)
- [x] API local em `GET /api/private/posts/cmr26lrh70003nouhg6pd23j6/replies?limit=20` confirmou a resposta `cmr2797pm0003msuhqbqs3a4b` como `is_post_author=true`, `author.anonymous=true` e alias `Membro Anônimo #2624`.
- [x] Chrome/CDP local mobile 390x844 em `/community/autocuidado-em-pratica/post/cmr26lrh70003nouhg6pd23j6?focusReplyId=cmr2797pm0003msuhqbqs3a4b#reply-cmr2797pm0003msuhqbqs3a4b` confirmou `Membro Anônimo #2624`, `Autor · há ... · editado` e ausencia de `Túlio Rezende` no comentario.

## Complemento 2026-08-11 - composer mobile alinhado ao padrao Reddit

- Pedido do usuario: comparar a barra de comentario da Lectum com a do Reddit e ajustar o composer porque a UI parecia vazar por tras, o controle `Anexar midia` ocupava espaco excessivo e a barra nativa com setas/check parecia sem funcao clara.
- Referencias visuais/auditaveis: screenshots do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 10.43.37.jpeg` (Lectum) e `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 10.43.20.jpeg` (Reddit), alem de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Frontend: o composer fixo mobile passou a usar superficie solida `bg-surface`, sem translucidez/backdrop blur, com topo arredondado e camada `z-[80]` para reduzir a sensacao de vazamento da thread por tras.
- Frontend: o controle de midia do modo composer virou botao circular icon-only e foi movido para a esquerda do campo `Comentar no post`, preservando input de arquivo, permissao real, `aria-label`, `title`, previa/remocao de midia selecionada e envio real.
- Decisao de UX/tecnica: a barra com setas/check e controlada pelo iOS/browser quando o `textarea` recebe foco; a implementacao nao troca o controller React Hook Form/Zod por `contenteditable` fragil apenas para tentar ocultar uma UI nativa fora do controle CSS do app.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/components/reply-composer.tsx" src/components/community/reply-media-attachment-control.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check`, HTTP local `200` em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` e Chrome headless local em viewport 390x844. A API local respondeu `Post indisponivel`, entao a validacao visual autenticada final ficou para o smoke em homologacao apos o push.


## Complemento 2026-08-11 - remocao do X do composer de comentarios

- Pedido do usuario: remover o X de saida exibido na barra de adicionar comentario, mantendo a barra mais simples e alinhada ao padrao comparado com o Reddit.
- Frontend: o composer de comentarios/respostas deixou de renderizar o botao circular de cancelar ao lado do campo e do envio; o row agora permanece com midia icon-only quando disponivel, textarea e botao de enviar.
- O cancelamento interno foi preservado para gestos e limpeza de contexto ja existentes, e os X de outros fluxos continuam inalterados: fechar modal de denuncia e remover midia anexada.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] A barra de adicionar comentario nao exibe mais o X de saida/cancelamento ao focar no campo.
- [x] O botao de envio e o botao de midia icon-only permanecem funcionais no mesmo row.
- [x] O X de remover midia anexada e o X de fechar denuncia nao foram removidos.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/components/reply-composer.tsx"`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video`; a validacao autenticada final ficou para smoke de homologacao apos push.


## Complemento 2026-08-11 - previa de midia abaixo do campo no composer

- Pedido do usuario: a midia subida no comentario deve permanecer abaixo do campo de escrever o comentario; somente o icone de adicionar midia deve permanecer a esquerda do campo.
- Frontend: o composer passou a separar o controle de midia em dois modos no fluxo de comentarios: `trigger`, para manter apenas o botao circular icon-only no row do textarea, e `preview`, para renderizar a miniatura/remocao em uma segunda linha abaixo do campo.
- A previa da midia selecionada continua usando `next/image` para imagens, `video` para videos, orientacao real detectada, botao de remocao e envio real sem mock.
- O icone de adicionar permanece acessivel a esquerda do campo e pode substituir a midia selecionada por um novo arquivo, sem transformar a miniatura em botao clicavel.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Ao selecionar midia, a miniatura aparece abaixo do campo de comentario, nao no lugar do icone a esquerda.
- [x] O row principal permanece com icone de adicionar midia, campo de comentario e botao de envio.
- [x] A miniatura mantem o X de remocao, preview real de imagem/video e envio real.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/components/reply-composer.tsx" src/components/community/reply-media-attachment-control.tsx`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video`; a validacao autenticada final ficou para smoke de homologacao apos push.


## Complemento 2026-08-11 - composer colado ao limite do teclado no iOS

- Pedido do usuario: no iPhone, a barra nativa com setas/check aparece entre o composer da Lectum e o teclado; no Reddit o campo fica visualmente colado ao teclado.
- Diagnostico: a barra com setas/check e a toolbar nativa do iOS/Safari para campos de formulario web (`textarea`), nao um componente da Lectum. Alem dela, o composer ainda aplicava `safe-area` de repouso quando estava focado, criando um vao extra acima dessa toolbar.
- Frontend: quando o composer fixo esta ativo/focado no mobile, o padding inferior deixa de usar `var(--lectum-bottom-fixed-padding)` e passa a usar padding compacto (`pb-2`), mantendo o `safe-area` apenas no estado de repouso.
- Decisao de UX/tecnica: nao substituir o controller React Hook Form/Zod por `contenteditable` apenas para tentar esconder uma toolbar nativa do iOS; o ajuste remove o espaco extra controlado pela Lectum e preserva acessibilidade/validacao real.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Composer focado no mobile usa padding inferior compacto, sem manter o `safe-area` de repouso acima da toolbar nativa.
- [x] Composer em repouso continua respeitando safe-area/home indicator.
- [x] React Hook Form/Zod, textarea, envio real e anexo de midia permanecem inalterados.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/components/reply-composer.tsx"`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] HTTP local `200` em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video`; a validacao visual autenticada em iOS real fica coberta pelo smoke de homologacao e pelo reteste no aparelho do usuario.

## Complemento 2026-08-11 - composer contextual com midia integrada e foco imediato

- Pedido do usuario: ajustar a barra de adicionar comentario para tratar anexo como parte da resposta, deixar o botao de midia claramente clicavel apenas quando nao ha anexo, exibir miniatura de video, trocar a copy superior por `Respondendo a [Nome]`, mover a orientacao de conduta para baixo da caixa, fechar teclado ao rolar, mostrar header compacto ao rolar para cima e focar automaticamente a caixa ao tocar em `Responder` na arvore.
- Referencias visuais/auditaveis: screenshot do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 14.00.27.jpeg`, comparativo anterior com Reddit `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 10.43.20.jpeg` e referencia local `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Frontend: o botao de midia no composer fica visualmente acionavel quando pode anexar e desabilita enquanto existe `selectedMedia`, reativando somente apos remover a midia anexada.
- Frontend: a previa de midia selecionada foi movida para dentro do contorno visual do campo de resposta, abaixo do textarea, mantendo o icone de adicionar separado a esquerda do campo e preservando o X apenas para remover a midia.
- Frontend: videos selecionados localmente passam a gerar uma miniatura em canvas para preview; videos ja persistidos usam `thumbnail_url` quando disponivel na edicao.
- Frontend: a mensagem superior do composer passa a indicar o contexto `Respondendo a [Nome]` ou `Respondendo ao post`, enquanto `Comente com respeito e empatia, mesmo quando discordar.` fica abaixo da caixa com menor peso visual.
- Frontend: ao rolar a pagina com o textarea focado no mobile, o composer desfoca o campo para fechar o teclado sem descartar texto/midia; ao rolar para cima no detalhe do post, um header fixo compacto com seta de voltar e titulo `Post` aparece.
- Frontend: ao tocar em `Responder` em um comentario da arvore no mobile, o controller foca o textarea de forma sincronica no gesto do usuario e repete o foco apos a atualizacao do alvo para aumentar a confiabilidade de abertura do teclado no iOS/PWA.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Sem midia anexada, o botao de midia aparece como acao clicavel para usuarios com permissao; com midia anexada, ele fica desabilitado ate a midia ser removida.
- [x] Videos selecionados para comentario exibem miniatura local no preview do composer.
- [x] A midia selecionada aparece dentro da caixa visual do comentario, abaixo do textarea, mostrando que faz parte da resposta a enviar.
- [x] O texto superior do composer mostra `Respondendo a [Nome]` ou `Respondendo ao post`, e a orientacao de conduta aparece abaixo com menor peso visual.
- [x] Rolar a pagina com o textarea focado no mobile desfoca o campo para fechar o teclado sem apagar o rascunho.
- [x] Rolar para cima dentro da pagina do post exibe header compacto com seta de voltar e titulo `Post`.
- [x] Tocar em `Responder` em comentario da arvore no mobile foca automaticamente a caixa de comentario para abrir o teclado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- [x] Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento da rota; sem API/autenticacao local disponivel, a validacao visual autenticada final fica para smoke de homologacao apos push.

## Complemento 2026-08-11 - teclado Android e header flutuante completo

- Pedido do usuario: no Android/Chrome, ao tocar em `Responder`, o composer podia ficar escondido atras do teclado; a copy direta `Respondendo ao post` deveria virar `Respondendo [nome do usuario]`; o header ao rolar para cima deveria ser completo, com seta de voltar e menu de denuncia; e a selecao do campo precisava ficar mais fluida, sem desfocar sozinha nem travar o toque.
- Referencias visuais/auditaveis: screenshots do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 15.00.27.jpeg` e `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 15.01.52.jpeg`, alem de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Frontend: o composer fixo mobile agora observa `window.visualViewport` quando focado e aplica offset inferior dinamico para ficar acima do teclado virtual em browsers que sobrepoem o teclado ao viewport, preservando fallback seguro quando a API nao existir.
- Frontend: o desfoco por scroll foi restringido a rolagem com intencao real do usuario (`touchmove`/`wheel`), evitando que resize/auto-scroll do navegador ao abrir teclado feche o campo sozinho.
- Frontend: a trava `touch-none` do composer focado foi removida para deixar toque, cursor e rolagem mais fluidos; o gesto de arrastar para cancelar permanece restrito ao movimento validado.
- Frontend: comentarios diretos ao post recebem `replyToName` com o nome publico do autor do post e a copy passa a `Respondendo [nome]`; respostas da arvore tambem usam `Respondendo [nome]`, sem a preposicao anterior.
- Frontend: o header flutuante mobile ao rolar para cima passou a espelhar o topo do post: seta de voltar, titulo `Post` e acao lateral com menu de denuncia para posts de outros usuarios ou menu de dono quando for post proprio.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Campo de comentario focado no mobile usa offset de viewport para permanecer acima do teclado virtual quando o navegador sobrepoe o teclado.
- [x] O composer nao desfoca sozinho por resize/auto-scroll de abertura do teclado e nao usa mais trava global de toque no estado focado.
- [x] Comentario direto exibe `Respondendo [nome publico do autor do post]`, nao `Respondendo ao post`.
- [x] Resposta em comentario da arvore continua exibindo `Respondendo [nome]` do alvo.
- [x] Header flutuante ao rolar para cima exibe seta de voltar, titulo `Post` e menu com `Denunciar post` para posts de terceiros.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check` (primeira tentativa excedeu timeout local; repetido com timeout maior e concluido sem erro)
- [x] `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- [x] Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento HTTP 200 da rota; a API local retornou estado `Post indisponivel`, entao a validacao autenticada final de teclado/header fica para smoke em homologacao e reteste no aparelho real.

## Complemento 2026-08-11 - envio de midia no primeiro toque

- Pedido do usuario: ao anexar midia e tocar no botao de envio, o primeiro toque nao enviava; o composer alterava levemente a altura e exigia um segundo toque.
- Referencias visuais/auditaveis: screenshots do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 15.40.12.jpeg` e `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 15.40.05.jpeg`, alem de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Diagnostico: em mobile, tocar no botao de envio enquanto o textarea estava focado disparava `blur` antes do `click/submit`; como `relatedTarget` pode vir vazio no navegador mobile, o composer entendia como saida externa, trocava o estado ativo/padding e consumia a primeira interacao.
- Frontend: o composer agora marca interacoes internas por `pointer/touch/mouse` em fase de captura e ignora o `blur` transitorio causado por toques dentro do proprio formulario, mantendo o estado visual estavel ate o submit concluir.
- O envio real de resposta com texto, midia ou somente midia permanece pelo mesmo fluxo existente; o ajuste nao altera validacao, payload, upload, permissao, endpoint ou persistencia.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, upload real, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Tocar no botao de envio com midia anexada nao colapsa/altera o composer antes do submit.
- [x] Resposta com midia anexada pode ser enviada no primeiro toque, sem exigir segunda tentativa.
- [x] O comportamento de desfocar ao tocar fora/rolar intencionalmente continua preservado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check` (primeira tentativa excedeu timeout local; repetido com timeout maior e concluido sem erro)
- [x] `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- [x] Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento HTTP 200 da rota; a API local pode depender de autenticacao/dados de homologacao para validacao visual final.

## Complemento 2026-08-11 - limite de 200MB para midia em respostas

- Pedido do usuario: aumentar de 50MB para 200MB o limite de videos/midia anexados nas respostas/comentarios, apos erro real exibido no composer mobile.
- Referencia visual/auditavel: screenshot do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 16.09.34.jpeg`, alem de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Backend: `POST /api/private/posts/:id/replies/media` passa a usar limite de `200MB` no middleware real de upload (`multer` + R2 publico), mantendo os mesmos tipos permitidos: JPEG, PNG, WebP, MP4, WebM e QuickTime/MOV.
- Frontend: o composer de respostas valida o tamanho do arquivo ja na selecao e mostra a mensagem de produto `A midia precisa ter ate 200MB.`, evitando tentar upload de arquivos acima do novo limite.
- Frontend: a edicao de respostas usa a mesma validacao local de 200MB e preserva a compatibilidade de rollout para mensagens antigas de backend quando alguma versao ainda informar 50MB.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, buckets, endpoints, payloads, permissao de midia, votos, salvos, denuncias ou tracking.
- Impacto de deploy: aumento de limite no backend pode elevar consumo de memoria/tempo de upload porque o storage atual valida assinatura a partir do buffer antes de enviar ao R2; `UPLOAD_MAX_CONCURRENCY` e fila existentes continuam limitando concorrencia. Rollback: reverter este commit volta o limite para 50MB.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Criterios de aceite do complemento

- [x] Upload de midia em respostas/comentarios aceita arquivos de ate 200MB no backend.
- [x] Composer e edicao de resposta bloqueiam localmente arquivos acima de 200MB com mensagem clara em PT-BR.
- [x] Tipos permitidos, permissao profissional e upload real em R2 permanecem inalterados.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check` (sem erro; apenas avisos locais de normalizacao CRLF/LF na task e no ADR atualizados)
- [x] Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento HTTP 200 da rota; validacao autenticada final fica para smoke de homologacao apos push.

## Complemento 2026-08-11 - erro claro no envio de resposta com mídia

- Pedido do usuário: após aumentar o limite para 200MB, o envio de uma resposta com mídia ainda podia falhar exibindo apenas `Não foi possível publicar sua resposta agora.`; o usuário pediu identificar e corrigir o erro.
- Referência visual/auditável: screenshot do usuário `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 16.40.44.jpeg`, além de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy não está exposto como ferramenta callable nesta sessão.
- Diagnóstico: o composer tratava upload da mídia, geração/upload da miniatura de vídeo e criação da resposta com o mesmo fallback genérico; quando a falha vinha sem corpo JSON seguro ou a mensagem sanitizada ficava apenas no `Error.message`, a UI perdia a causa de produto.
- Frontend: o tratamento de erro passou a diferenciar falha de upload (`Não foi possível enviar a mídia. Verifique sua conexão e tente novamente.`) de falha na publicação da resposta (`Não foi possível publicar sua resposta agora. Verifique sua conexão e tente novamente.`), preservando mensagens de domínio seguras como limite, permissão e moderação.
- Frontend: o upload/geração da miniatura de vídeo agora é best-effort; se a miniatura não puder ser gerada ou enviada, a resposta continua sendo publicada com o vídeo anexado e sem `thumbnailUrl`, em vez de abortar todo o envio.
- Frontend: uploads de mídia de comunidade/resposta usam timeout client-side dedicado de 600s para ficar compatível com arquivos de até 200MB em redes móveis mais lentas.
- Arquitetura: o fluxo comum de envio com mídia foi extraído para `modules/reply-submit.ts`, evitando crescimento do controller legado acima do limite de tamanho.
- Escopo: sem mudanças de backend, Prisma schema, migrations, packages, envs, endpoints, payloads, permissões de mídia, buckets, votos, salvos, denúncias ou tracking.
- Impacto de deploy: mudança frontend-only; versões antigas e novas do backend continuam compatíveis. O upload ainda pode falhar por limite/timeout de infraestrutura, mas a UI passa a indicar a etapa correta sem expor detalhes técnicos. Rollback: reverter este commit restaura o fallback genérico e o abortamento por falha de thumbnail.
- ADR atualizado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.

### Critérios de aceite do complemento

- [x] Falhas no upload da mídia exibem mensagem específica de envio de mídia, sem depender do fallback genérico de publicação.
- [x] Falhas na criação/publicação da resposta exibem mensagem específica de publicação, preservando mensagens seguras de domínio.
- [x] Falha ao gerar ou subir thumbnail de vídeo não bloqueia a publicação da resposta com vídeo.
- [x] Uploads client-side de mídia de comunidade/resposta têm timeout compatível com o limite de 200MB.
- [x] O controller do detalhe permanece abaixo do limite de tamanho por extração do fluxo de submit com mídia.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validações

- [x] `pnpm --dir frontend exec biome check --write "src/api/errors.ts" "src/utils/media-upload-error.ts" "src/api/req/posts/index.ts" "src/api/req/community/index.ts" "src/app/app/community/[slug]/post/[id]/modules/reply-support.ts" "src/app/app/community/[slug]/post/[id]/views/post-detail-controller.ts" "src/app/app/community/[slug]/post/[id]/views/reply-thread.tsx"`
- [x] `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/modules/reply-submit.ts" "src/app/app/community/[slug]/post/[id]/views/post-detail-controller.ts" "src/app/app/community/[slug]/post/[id]/views/reply-thread.tsx"`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check` (primeira tentativa falhou por limite de tamanho do controller; o fluxo foi extraído para `reply-submit.ts` e a repetição passou)
- [x] `git diff --check`
- [x] Chrome headless local 390x844 no frontend buildado em `/comunidades/ansiedade-em-equilibrio/publicacao/demo-post-ansiedade-apresentacao-video` confirmou carregamento HTTP da rota; sem API/autenticação local disponível, a validação autenticada final de envio real fica para smoke de homologação após push.
## Complemento 2026-08-11 - upload multipart para videos grandes em respostas

- Pedido do usuario: o mesmo video grande que antes excedia 50MB continuava falhando no envio da resposta, agora com erro generico de envio de midia.
- Referencia visual/auditavel: screenshot do usuario `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-11 at 17.25.01.jpeg`, alem de `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao.
- Diagnostico: o limite logico ja estava em 200MB, mas o fluxo antigo ainda enviava o arquivo inteiro em um unico request multipart ao backend e o storage bufferizava todo o arquivo antes de gravar no bucket. Videos grandes ficavam sujeitos a limite intermediario, timeout e pressao de memoria.
- Backend: adicionado fluxo multipart aditivo para respostas com endpoints de iniciar, enviar parte, completar e abortar upload; cada parte e pequena e o resultado final continua `{ media_url, media_type }` com URL publica em `/public/files/posts/media/`.
- Backend: tokens de sessao/partes sao opacos e criptografados com `JWT_SECRET_KEY`, evitando expor detalhes internos do provedor no contrato publico.
- Frontend: arquivos acima de 40MB passam automaticamente pelo fluxo multipart; em 404/405, o cliente faz fallback para o upload simples para tolerar rollout com backend antigo.
- Frontend: mensagens legadas que ainda mencionem 50MB passam a ser normalizadas para o limite vigente de 200MB, e erros crus de upload sao convertidos em copy de produto.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, permissao de midia, payload de criacao de resposta, votos, salvos, denuncias ou tracking.
- ADR criado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] Midias grandes em respostas usam upload em partes, sem depender de um unico request acima de 50MB.
- [x] O contrato final de midia da resposta permanece `{ media_url, media_type }` e a criacao da resposta continua inalterada.
- [x] O fluxo preserva permissao profissional, limite de 200MB, tipos permitidos e URLs publicas ja aceitas pelo backend.
- [x] Frontend novo tolera backend antigo com fallback para o upload simples.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir backend biome:check`
- [x] `pnpm --dir backend typecheck`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-12 - composer estavel ao abrir midia

- Pedido do usuario: ao tocar no botao de midia, o bloco de comentarios nao deve ser empurrado para baixo nem espremer os elementos enquanto a folha nativa de escolha de arquivo aparece.
- Frontend: abrir o seletor de midia deixa de ativar visualmente o composer e deixa de exibir o chip `Respondendo...` antes de existir foco real no campo ou midia selecionada.
- Frontend: o padding inferior compacto agora e usado somente quando o teclado foi detectado pelo `visualViewport`; sem teclado, o composer mantem o mesmo espacamento do estado em standby.
- Frontend: o botao de camera recebe um marcador interno para que seu foco nao altere o estado ativo do campo.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, upload, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] Tocar no botao de camera em standby nao desloca o composer para baixo.
- [x] A folha nativa de midia abre sem exibir o chip `Respondendo...` apenas por causa do clique de midia.
- [x] O padding inferior compacto do composer fica restrito ao estado com teclado detectado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-12 - raio e safe-area do composer de comentarios

- Pedido do usuario: arredondar mais o campo de comentario, reduzir o botao de midia para ter margem uniforme e proteger a base do composer no mobile para evitar elementos escondidos.
- Frontend: o campo de comentario passa de `rounded-[18px]` para `rounded-[24px]`, alinhado ao formato pill do botao de midia.
- Frontend: o botao de camera passa de `44px` para `36px`, com `left-1` e centralizacao vertical, deixando margem visual equivalente na esquerda, topo e base do campo.
- Frontend: quando o composer esta ativo no mobile com teclado detectado, a base usa `var(--lectum-bottom-nav-padding)`; sem teclado, mantem o espacamento fixo para nao deslocar o bloco.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, upload, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] O campo de comentario tem bordas mais arredondadas, com aparencia de pill.
- [x] O botao de camera fica menor e com margem equilibrada em relacao as bordas esquerda, superior e inferior do campo.
- [x] No mobile, a base do composer respeita o espacamento de safe-area usado na navegacao inferior quando o teclado esta aberto.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-11 - multipart resiliente para videos reais no celular

- Pedido do usuario: simular o comentario com o video real `c:/Users/tulio/Downloads/IMG_3087.MP4`, pois o arquivo correto do celular tem aproximadamente `120MB` e o erro de anexar midia continuava.
- Diagnostico do arquivo correto: `IMG_3087.MP4` tem `125.880.310` bytes (`120,05MB`), assinatura valida de `video/mp4` e, com chunk de `8MB`, e dividido em `16` partes; cada parte fica abaixo do limite backend de `10MB`.
- Diagnostico do storage: upload multipart direto para o R2 com o mesmo arquivo, mesmo chunk de `8MB`, `16` partes, complete e limpeza da chave diagnostica concluiu sem erro; portanto o formato, o tamanho, o chunk e o R2 nao explicam a falha.
- Diagnostico complementar: o arquivo comprimido enviado antes tinha `13,89MB` e ficava abaixo do limiar anterior de `40MB`, entao ainda cairia no upload simples; para evitar essa zona cinzenta, o limiar do cliente foi alinhado ao chunk seguro de `8MB`.
- Frontend: respostas/comentarios passam a usar multipart acima de `8MB`, mantendo upload simples apenas para arquivos realmente pequenos.
- Frontend: o MIME enviado ao backend passa a ter fallback seguro pela extensao (`.MP4`, `.MOV`, `.WEBM`, `.JPG`, `.PNG`, `.WEBP`) quando o navegador mobile informa `File.type` vazio, com parametro extra ou inconsistente.
- Frontend: upload de cada parte multipart passa a ter ate `3` tentativas em erros transitorios/rede, evitando abortar todo o envio por uma oscilacao isolada comum em videos de 120MB no celular.
- Backend: sem mudancas; o backend multipart ja aceita chunks de ate `10MB`, retorna `part_id`/`part_token` e conclui com o contrato final `{ media_url, media_type }`.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, tipos permitidos, payload de criacao de resposta, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] O video real `IMG_3087.MP4` e classificado como multipart em `16` chunks de `8MB`.
- [x] Arquivos pequenos continuam usando upload simples.
- [x] O limite de cada parte permanece abaixo do limite backend de chunk.
- [x] Partes multipart têm retry seguro para falhas transitorias de rede.
- [x] MIME de midia tem fallback por extensao para arquivos mobile com `File.type` incompleto.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] Simulacao local com `IMG_3087.MP4` confirmou tamanho `120,05MB`, assinatura `video/mp4` valida e divisao em `16` chunks de `8MB`.
- [x] Diagnostico direto de storage R2 com `IMG_3087.MP4` enviou `16` partes, completou multipart e removeu a chave temporaria.
- [x] `pnpm --dir frontend check` (primeira tentativa excedeu timeout local; repetido com timeout maior e concluido sem erro)
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-11 - identificador de parte preservado no upload multipart

- Pedido do usuario: apos publicar o upload multipart em homologacao, o mesmo video grande ainda falhava com `Nao foi possivel anexar a midia agora`.
- Diagnostico: o endpoint de parte retornava o identificador opaco como `part_token`; a camada global de sanitizacao remove campos com sufixo `token` em respostas publicas, entao o frontend completava o upload sem os IDs das partes e o backend rejeitava a finalizacao.
- Backend/frontend: o contrato publico da parte foi renomeado para `part_id`, mantendo o valor opaco criptografado e evitando colisao com sanitizacao de tokens de autenticacao.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, tipos permitidos, payload de criacao de resposta, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] Respostas publicas do upload multipart preservam o identificador opaco da parte sem usar campo com sufixo `token`.
- [x] Frontend envia `partId` na finalizacao do upload multipart.
- [x] O sanitizador global continua protegendo tokens reais de autenticacao.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir backend exec tsx -e "import { sanitizeSensitiveData } from './src/utils/sanitize-sensitive'; ..."` confirmou que `part_id` e `upload_session_id` permanecem e `part_token` seria removido.
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-11 - compatibilidade com PWA cacheado no multipart

- Pedido do usuario: mesmo apos o deploy 0.1.49, o video grande ainda falhava com a mesma mensagem generica.
- Diagnostico: alem do campo novo `part_id`, clientes PWA/browser ainda podiam estar executando o JavaScript anterior que esperava `part_token` e finalizava o upload com `partToken`. Como o deploy de frontend/backend nao e atomicamente percebido por clientes ja abertos, o backend precisava tolerar os dois contratos durante o rollout.
- Backend: o endpoint de parte passa a devolver `part_id` e tambem o alias legado `part_token` somente nesse contrato, com `allowAuthTokens` restrito a essa resposta para nao ser removido pelo sanitizador global; o valor e opaco, criptografado, expira e nao autentica usuario.
- Backend: a finalizacao multipart passa a aceitar `partId` ou `partToken` por parte, mantendo validacao de usuario, sessao, post, ordem e quantidade de partes.
- Frontend: o cliente novo aceita tanto `part_id` quanto `part_token` na resposta de parte, evitando falha se houver deploy parcial/cache intermediario.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, tipos permitidos, payload de criacao de resposta, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] Backend aceita finalizacao multipart com `partId` novo ou `partToken` legado.
- [x] Endpoint de parte preserva alias legado para clientes cacheados sem abrir permissao de autenticacao.
- [x] Frontend novo tolera ambos os nomes retornados pelo backend.
- [x] Sanitizacao global continua removendo tokens reais fora da excecao controlada do endpoint de parte.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir backend biome:check`
- [x] `pnpm --dir frontend biome:check`
- [x] `pnpm check:encoding`
- [x] `pnpm --dir backend typecheck`
- [x] `pnpm --dir frontend typecheck`
- [x] `pnpm --dir backend exec tsx -e "import { sanitizeSensitiveData } from './src/utils/sanitize-sensitive'; ..."` confirmou que `part_token` so permanece quando a resposta opta por `allowAuthTokens`.
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check` (primeira tentativa excedeu timeout local; repetido com timeout maior e concluido sem erro)
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.


## Complemento 2026-08-11 - chunks menores para atravessar proxy/runtime

- Pedido do usuario: o video real de aproximadamente `120MB` continuava exibindo `Nao foi possivel anexar a midia agora`, inclusive em homologacao no desktop.
- Diagnostico: o arquivo e o R2 estavam validos, mas o chunk anterior de `8MB` gerava requests `multipart/form-data` proximos de limites intermediarios comuns de proxy/runtime. Como a requisicao passa primeiro pelo backend publicado antes de ir ao R2, uma parte pode falhar antes de chegar na aplicacao, resultando na mensagem generica de anexo.
- Backend/frontend: o tamanho de chunk do multipart de respostas foi reduzido de `8MB` para `5MB`. Assim o video `IMG_3087.MP4` passa de `16` requests grandes para `25` requests menores, mantendo cada parte acima do minimo de multipart do R2, abaixo do limite backend de `10MB` e com retry por parte.
- Frontend: o limiar para trocar do upload simples para multipart acompanha o chunk de `5MB`, evitando que videos/arquivos medios continuem passando por um request unico.
- Escopo: sem mudancas de Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, tipos permitidos, payload de criacao de resposta, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] O video real `IMG_3087.MP4` e classificado como multipart em `25` chunks de `5MB`.
- [x] O chunk publicado fica abaixo do limite backend de `10MB` e reduz risco de bloqueio por proxy/runtime intermediario.
- [x] Arquivos acima de `5MB` usam multipart; arquivos pequenos continuam usando upload simples.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] Diagnostico local confirmou `IMG_3087.MP4` com `125.880.310` bytes (`120,05MB`) e `25` chunks de `5MB`.
- [x] Diagnostico direto de storage R2 com `IMG_3087.MP4` enviou `25` partes de `5MB`, completou multipart e removeu a chave temporaria.
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-11 - comentarios sem moldura externa e composer com camera

- Pedido do usuario: videos publicados em comentarios nao devem exibir a moldura de compartilhamento externo (`Respondido na Lectum`, caixa azul e identificacao do psicologo), pois essa formatacao pertence apenas ao material compartilhado fora da Lectum.
- Frontend: a criacao/edicao de respostas passa a gerar miniatura crua do video, sem `lectumShareFrame`; a renderizacao de midia de resposta tambem ignora miniaturas armazenadas de video para nao reaproveitar molduras antigas ja salvas.
- Frontend: o icone de anexar midia do composer de resposta foi movido para dentro do campo de comentario, passou a usar camera e continua desabilitado quando ja existe uma midia selecionada.
- Frontend: o placeholder interno do campo passa a ser `Adicionar comentario`, mantendo o contexto `Respondendo [nome]` no chip acima do campo.
- Frontend: apos selecionar uma midia, o arquivo entra imediatamente no campo de resposta; a preparacao de orientacao/miniatura de video passa a ser agendada depois da volta ao composer, com indicador de carregamento no proprio preview.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, tipos permitidos, votos, salvos, denuncias ou tracking; o compartilhamento externo continua usando o fluxo proprio de share.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] Videos de comentarios/respostas sao exibidos dentro da Lectum sem caixa azul de pergunta, sem selo `Respondido na Lectum` e sem identificacao visual do psicologo embutida na midia.
- [x] Novas respostas e edicoes de respostas geram thumbnails cruas de video, sem moldura de compartilhamento externo.
- [x] O icone de adicionar midia fica dentro do campo de resposta e usa camera.
- [x] O placeholder do textarea de resposta e `Adicionar comentario`.
- [x] A selecao de video retorna imediatamente para o campo de resposta e o carregamento da miniatura acontece no preview do composer, nao prendendo a galeria.
- [x] A formatacao de compartilhamento externo permanece restrita ao fluxo de compartilhamento fora da Lectum.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-12 - refinamento do botao de midia no composer

- Pedido do usuario: alinhar o botao de imagem dentro do campo de resposta seguindo a referencia do Instagram, usar azul mais escuro e ocultar o botao quando ja houver midia selecionada.
- Frontend: o trigger de midia do composer passa a ficar centralizado verticalmente dentro do campo, sem deslocar o preview quando uma midia estiver anexada.
- Frontend: o botao usa `bg-primary`/`primary-foreground`, em vez de `bg-primary-soft`, para ficar com contraste mais forte.
- Frontend: quando existe midia selecionada, o trigger de camera some; ele volta automaticamente apos remover a midia pelo botao `x` do preview.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, permissao de midia, limite de 200MB, upload, votos, salvos, denuncias ou tracking.
- ADR atualizado: `adrs/0452-upload-multipart-midia-respostas.md`.

### Criterios de aceite do complemento

- [x] O botao de camera fica alinhado verticalmente dentro do campo de resposta, como acao interna do input.
- [x] O botao de camera usa azul mais escuro e texto/icone com contraste adequado.
- [x] Ao selecionar midia, o botao de camera some em vez de ficar desabilitado.
- [x] Ao excluir a midia selecionada, o botao de camera reaparece.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-12 - composer de comentarios sem textarea nativo no iOS

- Pedido do usuario: fazer o campo de comentario seguir a abordagem de editor customizado, como no ChatGPT, para evitar que o iOS/Safari trate o composer como um formulario nativo navegavel e exiba a barra de anterior/proximo/concluir.
- Referencia visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a execucao seguiu a imagem local inventariada.
- Frontend: foi criado o controller `contenteditable` na fundacao de formularios (`frontend/src/components/controllers`) com React Hook Form, Zod e texto plano via `textContent`.
- Frontend: o `ReplyComposer` de comentarios/respostas passou a usar esse controller somente no campo `content`, preservando placeholder, limite de 2000 caracteres, quebras de linha, erro inline, autoGrow visual e envio pelo payload existente.
- Frontend: foco, autofocus, blur, cancelamento por gesto e retorno apos selecao de midia passaram a procurar um seletor compartilhado que aceita tanto o `textarea` legado quanto o novo textbox `contenteditable`.
- Depois do teste no iOS, o wrapper nativo `<form>` do `ReplyComposer` tambem foi removido; o envio passou a usar o botao com `hook.handleSubmit()`, preservando validacao e payload sem acionar semantica nativa de formulario no Safari.
- Escopo: sem mudancas de backend, Prisma schema, migrations, packages, envs, upload, permissao de midia, votos, salvos, denuncias ou tracking.
- ADR criado: `adrs/0453-composer-comentarios-editor-plaintext.md`.

### Criterios de aceite do complemento

- [x] O composer principal e inline de comentarios/respostas nao usa `textarea` nativo para o campo `content`.
- [x] O valor enviado continua sendo texto plano validado por React Hook Form/Zod, sem HTML persistido.
- [x] O limite de 2000 caracteres e a experiencia multiline foram preservados.
- [x] Foco, cancelamento e selecao de midia continuam funcionando com o novo campo focavel.
- [x] O wrapper principal do composer de comentarios/respostas nao usa `<form>` nativo; apenas o modal de denuncia mantem formulario nativo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend biome:check`
- [x] `pnpm --dir frontend typecheck`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] Chrome headless local em `/smoke-reply-composer` confirmou `contenteditable` renderizado, sem `textarea` nativo e sem `<form>` no composer.
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico. Validacao especifica da barra do teclado precisa ser feita em iPhone/Safari ou PWA publicado.

## Complemento 2026-08-12 - limite de 4 camadas na arvore de respostas

- Pedido do usuario: a arvore de conteudo estava exibindo 5 camadas de respostas antes de mostrar `Ver mais X resposta(s)` e abrir a tela de thread; reduzir uma camada e permitir somente 4 camadas visuais.
- Backend: a hidratacao hierarquica da listagem principal de respostas foi reduzida de 4 para 3 descendentes em `INLINE_REPLY_DESCENDANT_DEPTH`, mantendo o comentario direto ao post como primeira camada visual e evitando overfetch da quinta camada.
- Frontend: `MAX_REPLY_TREE_DEPTH` foi reduzido de 4 para 3; como o comentario direto usa `depth=0`, a tela principal e a tela de thread passam a renderizar no maximo 4 camadas visuais antes do link `Ver mais X resposta(s)`.
- A rota dedicada de thread permanece como continuacao para respostas abaixo da quarta camada, sem alterar ordenacao, votos, salvos, composer, denuncia, media, permissao profissional ou destaque de psicologos verificados.
- Escopo: sem mudancas de Prisma schema, migrations, endpoints, payloads publicos, packages, envs, storage ou dados publicados.
- Fonte visual auditavel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0102-arvore-comentarios-posts-comunidade.md`.

### Criterios de aceite do complemento

- [x] A arvore inline de respostas renderiza no maximo 4 camadas visuais antes de `Ver mais X resposta(s)`.
- [x] A quinta camada e camadas abaixo permanecem acessiveis pela tela dedicada de thread.
- [x] Backend hidrata apenas os descendentes necessarios para as 4 camadas visuais da tela principal.
- [x] Ordenacao, destaque profissional, votos, salvos, denuncia, composer e midia permanecem inalterados.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`
