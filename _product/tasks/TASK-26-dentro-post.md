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
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, script local confirmando `canAttachReplyMedia=true` para `tuliosrezende@gmail.com` com `cfp_verified_at=null` e `admin_grant` ativo, e service real `authorizeReplyMediaUpload` retornando `status=200` para post publicado existente.

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
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, smoke real de API em `/api/private/community/feed/posts?search=teste%20novo&limit=20` confirmando `verified=true`, `whatsapp_url` e `edited_at` para `tuliosrezende@gmail.com`, e Chrome/CDP autenticado em `/app/community/feed` confirmando selo verificado, texto `editado`, botao `Chamar no WhatsApp` no card `teste novo` e botao de WhatsApp em resposta profissional destacada.

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
- Validacoes executadas: `pnpm --dir backend db:migrate -- --name add_post_reply_edited_at`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile `390x844` no detalhe do post demo, confirmando `Psic?logo ? h? 1 d ? editado` no comentario editado.

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
