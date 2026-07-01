# TASK-26: Dentro do post

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-26 |
| Prioridade | P0 |
| EsforÃƒÆ’Ã‚Â§o | L |
| Fase | Comunidades |
| Status | Completed |
| DependÃƒÆ’Ã‚Âªncias | TASK-02, TASK-24, TASK-25 |
| ADR alvo | ADR de respostas e votos em posts |

## ReferÃƒÆ’Ã‚Âªncias obrigatÃƒÆ’Ã‚Â³rias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## ReferÃƒÆ’Ã‚Âªncias visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Dentro do Post.jpg` | `figma-design-frame-2-Dentro-do-Post.html` |

As referÃƒÆ’Ã‚Âªncias visuais sÃƒÆ’Ã‚Â£o norte de produto e layout. Elas nÃƒÆ’Ã‚Â£o autorizam recriar arquitetura, aceitar cÃƒÆ’Ã‚Â³digo gerado sem revisÃƒÆ’Ã‚Â£o, usar mock ou ignorar os padrÃƒÆ’Ã‚Âµes atuais do projeto.

ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o: Builder/Quick Copy nÃƒÆ’Ã‚Â£o estava disponÃƒÆ’Ã‚Â­vel no ambiente Codex; a referÃƒÆ’Ã‚Âªncia visual foi consultada pela imagem local `_product/proto/Dentro do Post.jpg`.

## Contexto

`Dentro do Post.jpg` ÃƒÆ’Ã‚Â© uma tela muito longa. A implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o precisa quebrar em componentes e carregar respostas de forma paginada.

## Objetivo

Criar detalhe de post com respostas, votos, salvamento e paginaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comentÃƒÆ’Ã‚Â¡rios.

## PrÃƒÆ’Ã‚Â©-requisitos e bloqueios

- Regras de moderaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/downvote devem estar em ADR antes de implementar comportamento destrutivo.

Se qualquer bloqueio obrigatÃƒÆ’Ã‚Â³rio estiver ativo, pare a implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, registre ADR/pendÃƒÆ’Ã‚Âªncia e nÃƒÆ’Ã‚Â£o marque a task como concluÃƒÆ’Ã‚Â­da.

## Escopo frontend

Rotas esperadas (convenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o canÃƒÆ’Ã‚Â´nica de `DATA-MODEL.md`):

- `/app/community/[slug]/post/[id]`

ImplementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o esperada:

- Criar rota de detalhe do post.
- Exibir post, autor, comunidade, votos, salvar e respostas.
- Criar formulÃƒÆ’Ã‚Â¡rio de resposta com validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
- Paginar respostas e evitar render gigante.
- Aplicar optimistic update com rollback em votos/salvar.

DecomposiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de componentes (a tela ÃƒÆ’Ã‚Â© muito longa ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â quebrar para evitar render monolÃƒÆ’Ã‚Â­tico):

- `PostHeader`: avatar/autor (`author_id` + `user.role`), comunidade (`community.slug`/nome), data, menu de aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
- `PostBody`: `community_post.title` + `content`.
- `PostVoteBar`: upvote/downvote a partir de `community_post.upvotes_count`/`downvotes_count` e do voto do usuÃƒÆ’Ã‚Â¡rio; aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de salvar usando `saves_count`. Downvote nunca exibido como nÃƒÆ’Ã‚Âºmero pÃƒÆ’Ã‚Âºblico (regra `DATA-MODEL.md`).
- `ReplyComposer`: formulÃƒÆ’Ã‚Â¡rio (React Hook Form + Zod, `TASK-02`) para criar comentÃƒÆ’Ã‚Â¡rio (`parent_reply_id = null`) ou resposta (1 nÃƒÆ’Ã‚Â­vel, `parent_reply_id` preenchido).
- `RepliesList`: lista de `post_reply` paginada por ÃƒÆ’Ã‚Â¢ncora (`@@index([post_id, parent_reply_id, createdAt])`), com respostas aninhadas em 1 nÃƒÆ’Ã‚Â­vel apenas.

## Escopo backend

ImplementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o esperada:

- Endpoints de detalhe, respostas, criar resposta, votar e salvar.
- Unicidade de voto via `post_vote` (`@@unique([user_id, post_id])` / `@@unique([user_id, reply_id])`); upsert para alterar voto.
- `value` aceita apenas `1` (upvote) ou `-1` (downvote); downvotes nunca expostos individualmente.
- Paginar respostas por ÃƒÆ’Ã‚Â¢ncora.
- Validar permissÃƒÆ’Ã‚Â£o e `community_post.status`.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post`
- `post_reply` (`parent_reply_id` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã‚Â¡rvore de 1 nÃƒÆ’Ã‚Â­vel)
- `post_vote`
- `post_save`

Endpoints esperados (convenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o canÃƒÆ’Ã‚Â´nica de `DATA-MODEL.md`):

- GET `/api/private/posts/:id` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â detalhe do post.
- GET `/api/private/posts/:id/replies` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â respostas paginadas por ÃƒÆ’Ã‚Â¢ncora.
- POST `/api/private/posts/:id/replies` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â criar comentÃƒÆ’Ã‚Â¡rio/resposta; payload `{ content: string, parentReplyId?: string }`.
- POST `/api/private/posts/:id/vote` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â votar/alterar voto; payload `{ value: 1 | -1, replyId?: string }` (sem `replyId` = voto no post). Reenviar o mesmo `value` remove o voto (toggle); upsert por `@@unique`.
- POST `/api/private/posts/:id/save` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â salvar; DELETE `/api/private/posts/:id/save` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â remover salvo (`post_save`).

Request/response: seguir o "Contrato padrÃƒÆ’Ã‚Â£o de API" de `DATA-MODEL.md` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â replies paginadas (`page`/`limit` ou cursor por ÃƒÆ’Ã‚Â¢ncora); votos/salvar retornam o estado atualizado no envelope de sucesso para o optimistic update reconciliar.

## Contrato tÃƒÆ’Ã‚Â©cnico detalhado

Arquitetura frontend obrigatÃƒÆ’Ã‚Â³ria:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulÃƒÆ’Ã‚Â¡rio.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulÃƒÆ’Ã‚Â¡rio ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatÃƒÆ’Ã‚Â³ria:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
- Services e repositories separados quando houver regra de domÃƒÆ’Ã‚Â­nio ou persistÃƒÆ’Ã‚Âªncia.
- Respostas usando `send`, `error500`, `error` e traduÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrÃƒÆ’Ã‚Âµes jÃƒÆ’Ã‚Â¡ definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- React Hook Form
- Zod
- TanStack Query
- Prisma

Regras anti-recriaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o especÃƒÆ’Ã‚Â­ficas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- NÃƒÆ’Ã‚Â£o criar client HTTP paralelo, store paralela, autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o paralela, validator paralelo ou design system paralelo.
- NÃƒÆ’Ã‚Â£o usar `sample/` como referÃƒÆ’Ã‚Âªncia direta de implementaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o futura.
- NÃƒÆ’Ã‚Â£o instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatÃƒÆ’Ã‚Â³rios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando nÃƒÆ’Ã‚Â£o houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o externa ausente.
- Refatorar mÃƒÆ’Ã‚Â³dulos nÃƒÆ’Ã‚Â£o relacionados ÃƒÆ’Ã‚Â  task.
- Trocar package manager ou stack base.

## CritÃƒÆ’Ã‚Â©rios de aceite

- [x] As referÃƒÆ’Ã‚Âªncias visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o canÃƒÆ’Ã‚Â´nica do `DATA-MODEL.md`.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicÃƒÆ’Ã‚Â¡vel.
- [x] Todos os estados obrigatÃƒÆ’Ã‚Â³rios existem e usam textos em PT-BR.
- [x] FormulÃƒÆ’Ã‚Â¡rios e campos usam a fundaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da `TASK-02` quando aplicÃƒÆ’Ã‚Â¡vel.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum cÃƒÆ’Ã‚Â³digo gerado por Builder foi aceito sem revisÃƒÆ’Ã‚Â£o e adequaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ÃƒÆ’Ã‚Â  arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o mÃƒÆ’Ã‚Â­nima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluÃƒÆ’Ã‚Â­da em um commit prÃƒÆ’Ã‚Â³prio. Se houver bloqueio externo, registre claramente o bloqueio e nÃƒÆ’Ã‚Â£o avance para a prÃƒÆ’Ã‚Â³xima task.


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

## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: detalhe do post inspirado no Reddit (2026-06-15)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: ajustar a tela interna do post conforme referÃƒÆ’Ã‚Âªncia `Dentro do Post`, com menu de denÃƒÆ’Ã‚Âºncia, composer compacto, composer mobile fixo, mÃƒÆ’Ã‚Â­dia restrita a psicÃƒÆ’Ã‚Â³logos assinantes/verificados e vÃƒÆ’Ã‚Â­deo de resposta em proporÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o 9:16 controlada.
- ReferÃƒÆ’Ã‚Âªncia visual consultada: `_product/proto/Dentro do Post.jpg`. Builder/Quick Copy nÃƒÆ’Ã‚Â£o foi usado diretamente no ambiente; a imagem local/PDF foi usada como fallback auditÃƒÆ’Ã‚Â¡vel.
- O menu de trÃƒÆ’Ã‚Âªs pontos do post passou a abrir a opÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o `Denunciar post` e o fluxo persistente `POST /api/private/posts/:id/report`.
- O composer usa placeholder `Participe da conversa`, fica compacto no desktop e fixo no rodapÃƒÆ’Ã‚Â© mobile, expandindo apenas durante interaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o/digitaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o.
- O upload real de mÃƒÆ’Ã‚Â­dia de resposta foi adicionado em `POST /api/private/posts/:id/replies/media` e a criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de resposta aceita `mediaUrl`/`mediaType` somente quando originados do fluxo permitido.
- Backend bloqueia upload e criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de resposta com mÃƒÆ’Ã‚Â­dia para pacientes, psicÃƒÆ’Ã‚Â³logos sem CFP verificado ou sem Plano Profissional ativo.
- VÃƒÆ’Ã‚Â­deos anexados em respostas usam card 9:16 com largura mÃƒÆ’Ã‚Â¡xima, alinhado ao padrÃƒÆ’Ã‚Â£o do feed/comunidade.
- ADR criado: `adrs/0096-detalhe-post-composer-denuncia-midia.md`.
- ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes executadas: `pnpm --dir backend db:migrate --name add_post_reports`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` na rota do detalhe.

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

## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: ÃƒÆ’Ã‚Â¡rvore compacta e controles de comentÃƒÆ’Ã‚Â¡rios (2026-06-16)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: ajustar a ÃƒÆ’Ã‚Â¡rvore de comentÃƒÆ’Ã‚Â¡rios e os controles de interaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o em feed, comunidade e detalhe do post, preservando ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, regra do psicÃƒÆ’Ã‚Â³logo verificado mais votado e responsividade mobile.
- Fonte visual auditÃƒÆ’Ã‚Â¡vel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ exposto como ferramenta direta nesta sessÃƒÆ’Ã‚Â£o, entÃƒÆ’Ã‚Â£o a execuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o seguiu as imagens locais/protÃƒÆ’Ã‚Â³tipos inventariados.
- O cabeÃƒÆ’Ã‚Â§alho `DiscussÃƒÆ’Ã‚Â£o` passou a ser independente, sem a linha azul lateral e sem parecer parte do primeiro comentÃƒÆ’Ã‚Â¡rio.
- Cada comentÃƒÆ’Ã‚Â¡rio direto ao post agora ÃƒÆ’Ã‚Â© uma ÃƒÆ’Ã‚Â¡rvore prÃƒÆ’Ã‚Â³pria de primeira camada; apenas respostas ficam aninhadas sob o comentÃƒÆ’Ã‚Â¡rio correspondente.
- O fundo de cada ÃƒÆ’Ã‚Â¡rvore passou a depender do comentÃƒÆ’Ã‚Â¡rio raiz: branco para paciente e azul claro para psicÃƒÆ’Ã‚Â³logo verificado; fundos esverdeados foram removidos dos blocos de destaque compartilhados.
- A barra azul grossa lateral foi removida; a hierarquia usa apenas linhas finas cinza, com recuos mais compactos e limite visual de trÃƒÆ’Ã‚Âªs nÃƒÆ’Ã‚Â­veis.
- Nos comentÃƒÆ’Ã‚Â¡rios, `CommunityActionBar` usa `size="xs"`, reduzindo upvote/downvote e `Responder`, que permanece texto sem ÃƒÆ’Ã‚Â­cone.
- O botÃƒÆ’Ã‚Â£o `Ver mais resposta(s)` foi alinhado ao nÃƒÆ’Ã‚Â­vel onde a resposta serÃƒÆ’Ã‚Â¡ expandida.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de backend, Prisma, migrations, packages, endpoints, payloads, ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, prioridade de psicÃƒÆ’Ã‚Â³logo verificado ou lÃƒÆ’Ã‚Â³gica de envio.
- ADRs atualizados: `adrs/0102-arvore-comentarios-posts-comunidade.md` e `adrs/0104-barra-acoes-comunidade-unificada.md`.
- ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` em `/app/community/feed`, `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: profundidade 5 e thread isolada (2026-06-16)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: permitir atÃƒÆ’Ã‚Â© 5 nÃƒÆ’Ã‚Â­veis visuais na ÃƒÆ’Ã‚Â¡rvore de comentÃƒÆ’Ã‚Â¡rios dentro do post, abrir uma tela de thread ao exceder o limite e refinar os controles dos comentÃƒÆ’Ã‚Â¡rios sem alterar ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o ou destaque de psicÃƒÆ’Ã‚Â³logos verificados.
- Fonte visual auditÃƒÆ’Ã‚Â¡vel: `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ exposto como ferramenta direta nesta sessÃƒÆ’Ã‚Â£o, entÃƒÆ’Ã‚Â£o a validaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o visual usou a referÃƒÆ’Ã‚Âªncia local e browser local.
- A tela principal do post agora renderiza o comentÃƒÆ’Ã‚Â¡rio raiz mais 4 nÃƒÆ’Ã‚Â­veis de respostas aninhadas; nÃƒÆ’Ã‚Â­veis abaixo disso exibem `Ver mais resposta(s)` alinhado ÃƒÆ’Ã‚Â  camada onde a continuaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o existiria.
- O backend deixou de usar o `take: 3` de respostas imediatas e passou a hidratar descendentes dos comentÃƒÆ’Ã‚Â¡rios diretos paginados com profundidade limitada por `INLINE_REPLY_DESCENDANT_DEPTH`, preservando comentÃƒÆ’Ã‚Â¡rios diretos como ÃƒÆ’Ã‚Â¡rvores de primeira camada.
- A rota de thread `/app/community/[slug]/post/[id]/thread/[replyId]` passou a exibir o post original no topo e, abaixo, o comentÃƒÆ’Ã‚Â¡rio raiz do fio selecionado com a continuaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da conversa; o composer fica depois da ÃƒÆ’Ã‚Â¡rvore no desktop e permanece fixo no mobile.
- A resposta da API de thread foi normalizada no client para `{ reply }`, compatibilizando o contrato tipado com o payload real do backend e destravando a tela isolada.
- Nos comentÃƒÆ’Ã‚Â¡rios, o grupo de upvote/downvote usa `votePresentation="inline"`, sem cÃƒÆ’Ã‚Â¡psula/fundo cinza; `Responder` permanece sem ÃƒÆ’Ã‚Â­cone, em escala menor e com espaÃƒÆ’Ã‚Â§amento consistente com salvar/compartilhar.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de Prisma schema, migrations, packages, regra de ordenaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, prioridade de psicÃƒÆ’Ã‚Â³logo verificado ou lÃƒÆ’Ã‚Â³gica de envio.
- ADRs atualizados: `adrs/0102-arvore-comentarios-posts-comunidade.md` e `adrs/0104-barra-acoes-comunidade-unificada.md`.
- ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video/thread/demo-reply-ansiedade-apresentacao-psi-video` com cookie de sessÃƒÆ’Ã‚Â£o local.
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
- Frontend: o componente compartilhado `PostMediaCarousel` recebeu botoes nativos de navegacao anterior/proxima com `z-index` alto, fundo escuro translÃƒÆ’Ã‚Âºcido, blur e gradientes laterais para manter contraste sobre imagens claras ou escuras.
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

- Pedido do usuario: nos cards de conteudo, em todos os contextos exceto no detalhe do post, adicionar uma linha fina entre o cabeÃƒÂ¯Ã‚Â¿Ã‚Â½alho `Postado em` e o nome do psicologo.
- Frontend: `CommunityPostCard` passou a renderizar um divisor sutil quando o card exibe simultaneamente contexto da comunidade (`Postado em`/`Respondido em`) e autoria.
- Frontend: a listagem interna de comunidade recebeu o mesmo divisor no `PostCard` local quando o cabeÃƒÂ¯Ã‚Â¿Ã‚Â½alho `Postado em` esta visivel.
- Frontend: os cards de respostas salvas tambem receberam o divisor entre `Respondido em` e o cabeÃƒÂ¯Ã‚Â¿Ã‚Â½alho do autor, mantendo consistencia nas listas fora do detalhe do post.
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

## Execucao complementar: carrossel com fallback quadrado e formatos canÃƒÆ’Ã‚Â´nicos (2026-06-23)

- Pedido do usuario: o carrossel continuava vertical no feed mesmo apos a regra de carrossel misto.
- Frontend: `PostMediaCarousel` passou a resolver o frame a partir dos metadados reais de largura/altura de todas as imagens do carrossel.
- Frontend: enquanto os metadados de um carrossel multiplo nao estiverem completos, o fallback agora e `1:1`, evitando renderizacao vertical por deteccao parcial.
- Frontend: verticais intermediarias como `4:5` e `3:4` passam a ser tratadas como formato quadrado em carrossel; somente verticais canonicas proximas de `9:16` mantem frame vertical quando todo o conjunto tambem for canonico vertical.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0151-padronizacao-frames-midia-comunidade.md`.
- Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: mÃƒÆ’Ã‚Â­dias menores apenas no desktop (2026-06-23)

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
- Frontend: `PostOwnerActionMenu` passou a exibir os rÃƒÆ’Ã‚Â³tulos compactos no dropdown de tres pontos e no fluxo de bloqueio para silenciar.
- Frontend: o selo de post silenciado foi simplificado para `Silenciado`, mantendo o estado e a regra de notificacoes inalterados.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissoes, votos, salvos, ranking, midia publicada ou tracking de WhatsApp.
- Fonte visual auditavel: screenshot do usuario; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0141-post-owner-actions-mute-delete.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## Execucao complementar: copy compacta no menu de acoes de comentarios (2026-06-23)

- Pedido do usuario: alterar as opcoes do menu de comentarios/respostas para `Editar`, `Silenciar` e `Excluir`, removendo o sufixo `comentario`.
- Frontend: `ReplyOwnerActionMenu` passou a exibir os rÃƒÆ’Ã‚Â³tulos compactos no dropdown de tres pontos, tanto para comentarios quanto para respostas.
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

## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: botÃƒÆ’Ã‚Â£o de mÃƒÆ’Ã‚Â­dia na ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comentÃƒÆ’Ã‚Â¡rio (2026-06-23)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: quando jÃƒÆ’Ã‚Â¡ houver mÃƒÆ’Ã‚Â­dia no comentÃƒÆ’Ã‚Â¡rio, remover o botÃƒÆ’Ã‚Â£o `Editar mÃƒÆ’Ã‚Â­dia` da modal de editar comentÃƒÆ’Ã‚Â¡rio e exibir novamente somente se a mÃƒÆ’Ã‚Â­dia for removida; se o comentÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o tiver mÃƒÆ’Ã‚Â­dia, o botÃƒÆ’Ã‚Â£o deve aparecer.
- Frontend: `ReplyMediaAttachmentControl` agora mantÃƒÆ’Ã‚Â©m o input de arquivo disponÃƒÆ’Ã‚Â­vel, mas sÃƒÆ’Ã‚Â³ renderiza o botÃƒÆ’Ã‚Â£o `MÃƒÆ’Ã‚Â­dia` no modo editor quando nÃƒÆ’Ã‚Â£o existe mÃƒÆ’Ã‚Â­dia efetiva atual ou selecionada.
- Frontend: quando hÃƒÆ’Ã‚Â¡ mÃƒÆ’Ã‚Â­dia atual ou recÃƒÆ’Ã‚Â©m-selecionada, a modal exibe apenas a miniatura com o botÃƒÆ’Ã‚Â£o `X` de remover; ao remover a mÃƒÆ’Ã‚Â­dia, o botÃƒÆ’Ã‚Â£o `MÃƒÆ’Ã‚Â­dia` volta para permitir anexar uma nova.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissÃƒÆ’Ã‚Âµes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditÃƒÆ’Ã‚Â¡vel: screenshot do usuÃƒÆ’Ã‚Â¡rio; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0156-botao-midia-edicao-comentario.md`.
- ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.
## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: miniatura horizontal na ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de comentÃƒÆ’Ã‚Â¡rio (2026-06-23)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: na modal de editar comentÃƒÆ’Ã‚Â¡rio, se a mÃƒÆ’Ã‚Â­dia for horizontal, a miniatura tambÃƒÆ’Ã‚Â©m deve aparecer horizontal.
- Frontend: `ReplyMediaAttachmentControl` passou a usar `landscape` como orientaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o visual padrÃƒÆ’Ã‚Â£o no modo editor enquanto a detecÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o assÃƒÆ’Ã‚Â­ncrona de dimensÃƒÆ’Ã‚Âµes da mÃƒÆ’Ã‚Â­dia atual ainda nÃƒÆ’Ã‚Â£o terminou.
- Frontend: `ReplyEditModal` passou a detectar a orientaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de novas mÃƒÆ’Ã‚Â­dias selecionadas na ediÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o, reaproveitando `detectReplyMediaOrientation` para manter imagens/vÃƒÆ’Ã‚Â­deos horizontais em moldura horizontal.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissÃƒÆ’Ã‚Âµes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual auditÃƒÆ’Ã‚Â¡vel: screenshot do usuÃƒÆ’Ã‚Â¡rio; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0156-botao-midia-edicao-comentario.md`.
- ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `git diff --check`.

## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: reversÃƒÆ’Ã‚Â£o do fundo branco do feed (2026-06-23)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: desfazer a ÃƒÆ’Ã‚Âºltima alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e voltar o background do feed ÃƒÆ’Ã‚Â  cor anterior.
- Frontend: `CommunityFeedLogic` voltou a usar `bg-[#F5F7FA]` no `PrivateTemplate` e no header sticky de busca/filtros.
- Frontend: `CommunityDetailLogic` tambÃƒÆ’Ã‚Â©m voltou a usar `bg-[#F5F7FA]` para manter a timeline dentro da comunidade consistente com o feed.
- Ajuste visual: o offset de foco do FAB de criaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o voltou para `ring-offset-[#F5F7FA]`.
- Dark mode preservado com `dark:bg-background`.
- O ADR da alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para fundo branco foi removido por nÃƒÆ’Ã‚Â£o representar mais o estado atual; novo ADR criado: `adrs/0157-reversao-fundo-cinza-feed-comunidade.md`.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de backend, Prisma, storage ou packages.
- Fonte visual: pedido do usuÃƒÆ’Ã‚Â¡rio; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ acessÃƒÆ’Ã‚Â­vel neste ambiente.

### ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
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
## ExecuÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o complementar: chips sem sombra no perfil do psicÃƒÆ’Ã‚Â³logo (2026-06-23)

- Pedido do usuÃƒÆ’Ã‚Â¡rio: remover o sombreamento atrÃƒÆ’Ã‚Â¡s dos chips de especialidades, atendimento (`Modalidade`, `Abordagens`, `ServiÃƒÆ’Ã‚Â§os`, `PÃƒÆ’Ã‚Âºblico atendido`, `Idiomas`) e `FormaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o & TÃƒÆ’Ã‚Â­tulos` no perfil pÃƒÆ’Ã‚Âºblico do psicÃƒÆ’Ã‚Â³logo.
- Frontend: `ProfileChipList`, `ProfileInfoCard` e os itens de `FormationSection` deixaram de aplicar sombras nos chips/cards internos, mantendo borda, radius e espaÃƒÆ’Ã‚Â§amentos.
- As sombras dos cards principais do perfil foram preservadas para nÃƒÆ’Ã‚Â£o achatar toda a pÃƒÆ’Ã‚Â¡gina e manter a separaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o entre seÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes.
- NÃƒÆ’Ã‚Â£o houve alteraÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de backend, Prisma schema, migrations, packages, endpoints, storage, upload, limites de arquivo, permissÃƒÆ’Ã‚Âµes, votos, salvos, ranking, posts, comentÃƒÆ’Ã‚Â¡rios ou tracking de WhatsApp.
- Fonte visual auditÃƒÆ’Ã‚Â¡vel: screenshots do usuÃƒÆ’Ã‚Â¡rio; Builder/Quick Copy nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0158-remocao-sombra-chips-perfil-psicologo.md`.

### ValidaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes

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
- Frontend: a segunda linha agora exibe `Falar com {primeiro nome} â†’`, preservando o icone de WhatsApp e a largura conectada ao frame de video/imagem.
- Nao houve alteracao de backend, Prisma schema, migrations, packages, endpoints, storage, permissoes, votos, salvos, ranking ou tracking de WhatsApp.
- Fonte visual/auditavel: pedido do usuario e referencias locais `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0164-cta-whatsapp-conectado-midias-comunidade.md`.
- Validacoes executadas nesta execucao: `pnpm.cmd --dir frontend exec biome check --write "src/components/community/community-whatsapp-cta.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check`, HTTP local `200` em `/app/community/feed`, `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.

## Complemento 2026-06-25 - CTA WhatsApp sem midia padronizado

- Pedido do usuario: padronizar os elementos do botao de WhatsApp em posts e respostas sem midia.
- Frontend: `CommunityWhatsAppCta` passou a usar a mesma hierarquia textual em todas as variantes: `WhatsApp` na primeira linha e `Falar com {primeiro nome} â†’` na segunda linha.
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

## Complemento 2026-06-26 - alias anÃ´nimo estÃ¡vel no detalhe do post

- Pedido do usuÃ¡rio: manter o mesmo identificador anÃ´nimo para um membro em posts anÃ´nimos diferentes, para preservar contexto comunitÃ¡rio e apoiar respostas dos psicÃ³logos sem expor a identidade real.
- Backend: o detalhe do post e as listas relacionadas passaram a receber o mesmo alias `Membro AnÃ´nimo #XXXX` derivado de `author.id`, em vez de um nÃºmero derivado do post.
- O comportamento preserva anonimato visual: nome real, avatar e perfil do paciente continuam mascarados quando `anonymous=true`.
- Escopo: sem mudanÃ§a de schema Prisma, migrations, packages, endpoints, payloads, frontend, votos, salvos, Ã¡rvore de comentÃ¡rios ou criaÃ§Ã£o de respostas.
- ADR criado: `adrs/0167-alias-anonimo-estavel-por-usuario.md`.

## Complemento 2026-06-26 - mensagem WhatsApp contextual no detalhe do post

- Pedido do usuÃ¡rio: a mensagem pronta do WhatsApp deve iniciar com o primeiro nome do psicÃ³logo.
- Backend: no detalhe do post, links de WhatsApp do autor do post usam a copy `seu post na Lectum`; links de respostas/comentÃ¡rios usam `sua resposta na Lectum`, ambos com saudaÃ§Ã£o `OlÃ¡ {primeiro nome}` quando o nome existe.
- Frontend: a modal/transiÃ§Ã£o global de WhatsApp mantÃ©m o texto contextual da origem do clique ao combinar fallback de tela e URL retornada pelo tracking.
- Escopo: sem alteraÃ§Ã£o de schema Prisma, migrations, endpoints, Ã¡rvore de comentÃ¡rios, votos, salvos, mÃ­dia, permissÃµes ou packages.
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
