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
