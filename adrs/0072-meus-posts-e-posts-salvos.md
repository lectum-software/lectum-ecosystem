# ADR-0072: Meus posts e posts salvos reais

## Status

Accepted

## Task relacionada

TASK-28

## Contexto

A TASK-28 exige as telas `/app/posts/mine` e `/app/posts/saved` usando posts reais das
comunidades, sem mock, e mantendo o mesmo modelo de interacao de `community_post` e `post_save`.
As imagens locais consultadas foram `_product/proto/Meus Posts - Paciente.jpg`,
`_product/proto/Meus Posts - Psicólogo.jpg` e `_product/proto/Posts Salvos.jpg`.
O Builder/Quick Copy ativo nao estava exposto como ferramenta callable neste ambiente, entao a
validacao visual usou as imagens exportadas em `_product/proto`.

## Decisao

Criar endpoints privados sob o namespace existente `/api/private/posts`:

- `GET /api/private/posts/mine`: lista conteudo do usuario autenticado, escopando posts por
  `community_post.author_id=req.auth.id` e respostas por `post_reply.author_id=req.auth.id`.
  O filtro `type=all|posts|replies` sustenta as abas do prototipo.
- `GET /api/private/posts/saved`: lista somente posts salvos ativos do usuario autenticado,
  escopando por `post_save.user_id=req.auth.id`, `post_save.deleted=false` e post publicado.
- `DELETE /api/private/posts/:id/save`: permanece como acao canonica para remover salvo.

As respostas usam paginacao no padrao real do backend (`data`, `page`, `pages`, `count`) e tambem
exponem aliases `items`, `total` e `limit` para compatibilizar o contrato textual da TASK-28 sem
quebrar o padrao usado nas demais listas.

No frontend:

- rotas novas em `frontend/src/app/app/posts/mine` e `frontend/src/app/app/posts/saved`;
- chamadas via `frontend/src/api/req/posts`, hooks em `frontend/src/api/callers/posts` e keys em
  `frontend/src/api/cache/keys.ts`;
- componente reutilizavel `CommunityPostCard` para manter a apresentacao de posts consistente com
  o feed;
- acesso pelas opcoes "Meus posts e comentarios" e "Salvos" no menu de Comunidade da tela de Perfil;
- estados de loading, erro, vazio, sucesso e feedback de remocao dos salvos em PT-BR.

Nao houve alteracao de schema Prisma nem nova dependencia.

## Consequencias

- Meus Posts nunca retorna posts de outros usuarios.
- Posts Salvos nunca retorna salvos de outro usuario e permite remover o salvo real por soft delete.
- O backend segue retornando `community_post.status` em Meus Posts para compatibilidade e regras de
  moderacao futuras, mas a tela `/app/posts/mine` nao exibe mais selo visual de status nos cards de
  post; o contexto principal fica apenas em "Postado em [comunidade]".
- Posts Salvos mostra apenas posts publicados disponiveis.
- Respostas do usuario entram em Meus Posts para cumprir a variacao visual das abas "Todos",
  "Posts" e "Respostas", sem criar modelo novo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local Chrome headless em 390x844 para `/app/posts/mine` e `/app/posts/saved`: sem sessao
  persistida, ambas redirecionaram para login como esperado para rotas privadas, sem overflow
  horizontal (`documentElement.scrollWidth=390`, `body.scrollWidth=390`).

## Complemento 2026-06-16

- A tela `/app/posts/mine` passou a ser a area de acompanhamento "Meus posts e comentarios" para pacientes, mantendo o endpoint existente e sem criar rota paralela.
- O filtro visual "Todos" foi removido desta tela; "Posts" passa a ser o estado inicial padrao, e "Comentarios" consulta apenas `type=replies`. O contrato legado `type=all` permanece no backend para compatibilidade com outras listas.
- Comentarios do usuario agora retornam metadados derivados `replies_received_count` e `has_verified_professional_reply`, calculados por dados reais de `post_reply`, para permitir acompanhamento de conversa sem expor upvotes, compartilhar ou CTA de abrir post no card.
- O indicador profissional so aparece quando ha resposta direta ativa de psicologo com `cfp_verified_at`; nao ha estado negativo quando a conversa ainda nao recebeu resposta profissional.

## Complemento 2026-06-17

- A tela `/app/posts/mine` removeu a badge visual "PUBLICADO" dos cards de post.
- A decisao reduz ruido visual e preserva apenas a linha de contexto "Postado em [comunidade]" sem
  criar status substituto.
- A mudanca e apenas de apresentacao: nenhum endpoint, schema Prisma ou regra de ordenacao foi
  alterado, e o status permanece disponivel no contrato backend.

## Complemento 2026-06-17: Deep link para comentarios do usuario

### Contexto

Na aba "Comentarios" de `/app/posts/mine`, o paciente precisa voltar diretamente para a conversa em
que participou. Comentarios diretos no post tambem nao possuíam contexto textual suficiente quando
nao havia `parent_reply`.

### Decisao

- Adotar o formato de deep link
  `/app/community/:slug/post/:postId?focusReplyId=:replyId#reply-:replyId` para comentarios listados
  em "Meus posts e comentarios".
- Estender `GET /api/private/posts/:id/replies` com o query param opcional `focusReplyId`, sem novo
  endpoint, para resolver o comentario raiz da participacao e retornar a pagina correta da arvore.
- Manter a arvore e a ordenacao existentes; o `focusReplyId` altera somente a pagina inicial
  retornada quando necessario.
- Aplicar scroll suave e destaque temporario no frontend por `id="reply-:replyId"`, sem persistir
  estado adicional e sem criar modelo novo.
- Exibir o titulo real de `community_post` no card quando o comentario for direto no post; respostas
  continuam usando `post_reply.parent_reply.content`.

### Consequencias

- A navegacao de acompanhamento leva o usuario ao post original e posiciona a tela no comentario
  especifico, mesmo quando o comentario nao esta na primeira pagina de raizes da discussao.
- Comentarios diretos passam a ter contexto claro por titulo de post, enquanto respostas preservam o
  contexto do comentario pai.
- Nao houve alteracao de schema Prisma nem dependencia nova.

## Complemento 2026-06-17: Salvos com barra de interacao padrao

### Contexto

A tela `/app/posts/saved` havia acumulado acoes paralelas aos componentes de comunidade, como
botao textual `Abrir post`, lixeira vermelha e compartilhamento fora do padrao. Alem disso, um post
principal salvo podia carregar automaticamente a resposta profissional em destaque, criando a
percepcao de que a resposta tambem havia sido salva.

### Decisao

- Reutilizar `CommunityActionBar` em todos os cards salvos, tanto posts quanto respostas, para
  manter a mesma linguagem de interacao do feed/comunidade: upvote/downvote, comentarios ou
  respostas, salvar ativo e compartilhar.
- Transformar a remocao de salvo na propria acao de salvar ativa da barra padrao, sem lixeira ou
  botao destrutivo paralelo.
- Adicionar `saveActionOverride` e `showHighlightedProfessionalReply` ao `CommunityPostCard` para
  permitir que a tela de Salvos remova itens pelo icone de salvar e oculte a resposta destacada sem
  duplicar card de post.
- Estender o DTO de respostas em listas de usuario com `author`, `media_url`, `media_type`,
  `current_user_vote` e `saved`, derivados das tabelas reais `post_reply`, `post_vote` e
  `post_reply_save`, para que respostas salvas tenham interacoes, midia e WhatsApp profissional
  consistentes.
- Padronizar o CTA `Chamar no WhatsApp` de respostas profissionais como outline verde
  (`bg-transparent`, borda/texto/icone verdes), alinhado ao feed.

### Consequencias

- Salvar um post principal guarda apenas o post; uma resposta profissional so aparece em Salvos se
  tiver sido salva como item independente.
- A tela de Salvos deixa de ter acoes duplicadas e passa a depender da mesma barra de interacao das
  comunidades, reduzindo manutencao visual paralela.
- Nao houve mudanca de schema Prisma nem dependencia nova; apenas enriquecimento de DTO e ajuste de
  apresentacao/contrato de resposta existente.
- A validacao visual foi feita com Chrome headless em 390x844 usando sessao real local com itens
  salvos, confirmando que nao ha `Abrir post`, lixeira extra ou resposta destacada embutida no post
  salvo.

## Complemento 2026-06-17: Comentarios em Meus posts com barra padrao

### Contexto

A tela `/app/posts/mine` precisava reduzir ruido visual na aba "Comentarios" e voltar a usar os controles padronizados da comunidade. O chip `X respostas recebidas`, o rotulo `POST ORIGINAL` e o glow do seletor segmentado criavam uma linguagem paralela ao feed/post.

### Decisao

- Reutilizar `CommunityActionBar` nos cards de comentarios de `/app/posts/mine`, com upvote, downvote, respostas, salvar e compartilhar.
- Enriquecer `GET /api/private/posts/mine` com `current_user_vote` e `saved` para replies, consultando `post_vote` e `post_reply_save` reais.
- Manter a navegacao do card por overlay de `Link`, permitindo que a area inteira do comentario abra o post com `focusReplyId`, enquanto os controles internos continuam independentes.
- Simplificar o contexto de comentario direto para exibir apenas `community_post.title`; respostas continuam mostrando `parent_reply.content`.
- Exibir a flag `Respondido por psicologo verificado` a partir de `highlighted_professional_reply` quando o post ja recebeu resposta verificada.
- Remover box-shadow/glow do seletor `Posts / Comentarios`, preservando o estado ativo azul.

### Consequencias

- A aba de comentarios passa a compartilhar os mesmos padroes visuais e interativos do feed, do post e de Salvos.
- Salvar e votar em comentarios listados em "Meus posts e comentarios" usa estado persistido real e feedback otimista local, sem endpoint paralelo.
- Nao houve alteracao de schema Prisma nem pacote novo; o custo extra da listagem e limitado aos itens paginados exibidos.

## Complemento 2026-06-17: Salvos como biblioteca de conteudo

### Contexto

A tela `/app/posts/saved` ainda exibia respostas salvas com uma caixa azul de referencia do pai e
posts salvos com chip de data em destaque. Isso fazia a biblioteca competir com o conteudo
realmente salvo e mantinha diferencas visuais em relacao aos cards do feed e aos comentarios dentro
do post.

### Decisao

- Respostas salvas exibem apenas o comentario salvo, sem `parent_content` em bloco de referencia.
- O cabecalho de respostas salvas usa `Respondido em [comunidade]` e preserva `Salvo em ...` como
  metadado cinza secundario.
- O card de resposta salva passa a renderizar uma linha de autor equivalente ao comentario no post:
  avatar, nome, verificado, Top Mentor quando houver, tipo/cargo e data relativa da publicacao.
- Posts salvos mantem o `CommunityPostCard`, mas a data de salvamento deixa de ser chip azul
  uppercase e passa a ser texto simples cinza no header.

### Consequencias

- Salvos fica mais proximo de uma biblioteca de conteudo salvo, reduzindo ruido de contexto e
  destaque visual indevido para a data de salvamento.
- A mudanca e somente de apresentacao; os endpoints, o DTO enriquecido de respostas salvas, a
  persistencia e as barras de interacao existentes permanecem inalterados.

## Complemento 2026-06-17: Contador real de salvamentos em Meus posts

### Contexto

A barra padrao de acoes dos cards de comentarios em `/app/posts/mine` ja permitia salvar e compartilhar, mas o icone de salvar nao exibia a quantidade de salvamentos como ocorre nos posts do feed e nos cards da aba "Posts".

### Decisao

- Estender `PostListReplyDTO`/`UserPostReply` com `saves_count` para listas de comentarios do usuario.
- Calcular o valor com `_count` filtrado em `post_reply_save.deleted=false`, mantendo a fonte de verdade no banco e sem coluna denormalizada nova.
- Fazer `saveReply` e `unsaveReply` retornarem a contagem real apos a transacao, igualando o contrato de reconciliacao usado em salvamento de posts.
- Reusar o `count` nativo de `CommunityActionBar.save`, sem criar componente paralelo para a tela.

### Consequencias

- Comentarios da aba "Comentarios" passam a exibir upvote, downvote, respostas, salvamentos e compartilhar com os mesmos controles do feed/post.
- O feedback de salvar/desfazer salvo em comentario atualiza a contagem imediatamente e corrige o valor com o retorno real da API.
- A aba "Posts" permanece consistente por continuar usando `CommunityPostCard` e `community_post.saves_count`.
- Nao houve alteracao de schema Prisma nem dependencia nova.

## Complemento 2026-06-17: Flag profissional vinculada ao comentario do usuario

### Contexto

A aba "Comentarios" em `/app/posts/mine` exibia a flag `Respondido por psicologo verificado` a partir de `post.highlighted_professional_reply`. Esse campo pertence ao post principal e pode ser preenchido por uma resposta profissional ao post ou a outro ponto da conversa, criando a impressão incorreta de que o comentário específico do usuário havia recebido atenção profissional.

### Decisao

- A flag de comentário em `/app/posts/mine` passa a usar somente `reply.has_verified_professional_reply`.
- O backend mantém `has_verified_professional_reply` como metadado do item de comentário, calculado sobre respostas diretas ativas daquele comentário específico feitas por psicólogo verificado.
- A tag é renderizada abaixo do texto do comentário do usuário e antes da linha padrão de ações, nunca dentro do bloco de contexto do post/comentário pai.
- A linha `Comentado em [comunidade]` passa a ser tratada visualmente como metadado de contexto: cinza discreto, tipografia compacta e comunidade com destaque leve, sem virar título do card.

### Consequencias

- O indicador profissional passa a representar apenas interação profissional relacionada ao comentário do usuário.
- Respostas profissionais ao post principal ou a comentários de terceiros não acionam a tag no card do comentário do usuário.
- A aba "Posts" continua podendo usar `highlighted_professional_reply` para sinalizar posts com resposta profissional, pois ali o escopo é o post principal.
- Não houve mudança de schema Prisma, endpoint novo ou dependência nova.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/mine` mobile confirmou a composição sem overflow horizontal e a tag fora do bloco de contexto.


## Complemento 2026-06-17: Salvos sem data de salvamento nos cards

### Contexto

A tela `/app/posts/saved` ainda mantinha a data de salvamento no header dos cards. Mesmo como texto cinza, esse metadado competia com o contexto real do conteudo e mantinha diferencas entre posts e respostas salvas. Alem disso, respostas salvas usavam uma barra de acoes mais compacta que os posts, gerando inconsistencia no conjunto de up/downvotes e salvamentos.

### Decisao

- Remover completamente a data `Salvo em ...` dos cards salvos.
- Manter no header apenas o contexto do conteudo: `Postado em [comunidade]` para posts e `Respondido em [comunidade]` para respostas.
- Renderizar respostas salvas com a mesma cadencia visual de `CommunityPostCard`: contexto, autor, conteudo, midia/CTA opcional e barra padrao no rodape.
- Para autores pacientes em respostas salvas, ocultar o tipo `Paciente` e exibir apenas o tempo; para psicologos, manter `Psicologo • tempo`.
- Usar a apresentacao padrao da `CommunityActionBar` tambem em respostas salvas, incluindo cluster de voto, respostas, contador de salvamentos ativo e compartilhar.
- Adicionar um tom de contexto discreto ao `CommunityPostCard` para uso em Salvos sem alterar o padrao das demais telas.

### Consequencias

- A unica diferenca relevante entre post salvo e comentario salvo passa a ser o conteudo exibido.
- A tela Salvos deixa de destacar o ato de salvar e prioriza o material guardado pelo usuario.
- A alteracao nao muda contratos de API, schema Prisma, endpoints ou regras de persistencia.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/saved` mobile confirmou cards sem `Salvo em`, sem contexto azul e sem overflow horizontal.

## Complemento 2026-06-17: Cards de posts alinhados aos comentarios em Meus posts

### Contexto

A aba "Posts" em `/app/posts/mine` ainda reutilizava o card completo do feed, com avatar, nome do autor e metadados em uma segunda linha. Como a tela e uma area de acompanhamento do proprio usuario, essa repeticao deixava a aba visualmente diferente da aba "Comentarios" e aumentava a altura dos cards sem acrescentar contexto util.

### Decisao

- Adicionar props opt-in ao `CommunityPostCard` para ocultar o header de autor, incluir o tempo de publicacao na linha de comunidade e escolher a apresentacao da `CommunityActionBar`.
- Usar essas props apenas em `/app/posts/mine` na aba "Posts", preservando o comportamento padrao do feed, comunidade, perfil e salvos.
- Manter a linha de contexto como `Postado em [comunidade] • [tempo]`, com label em cinza discreto e comunidade em destaque leve, seguindo o tratamento visual da linha `Comentado em`.
- Padronizar a barra de acoes dos posts da tela com a apresentacao inline ja usada nos comentarios: upvote, downvote, comentarios, salvamentos e compartilhar.

### Consequencias

- Posts e comentarios em `/app/posts/mine` passam a parecer da mesma familia visual, diferenciando apenas o conteudo.
- O componente compartilhado continua com defaults retrocompativeis, sem impacto visual em outros contextos.
- Nao houve alteracao de API, schema Prisma, persistencia, ordenacao ou pacote.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/posts/mine` mobile confirmou ausencia de avatar/nome nos posts, contexto com tempo na linha superior e ausencia de overflow horizontal.

## Complemento 2026-06-20: foco temporário em respostas e navegação consistente

### Contexto

O fluxo de abrir uma resposta salva usa `focusReplyId` para carregar a árvore correta, rolar até o comentário e aplicar um destaque azul temporário. Em revalidações do TanStack Query, o efeito podia ser desmontado antes do timeout de remoção e deixar as classes de destaque presas no comentário. Além disso, os cards de respostas/comentários em `/app/posts/mine` ainda dependiam de um overlay de `Link`, enquanto Salvos já usava navegação programática com proteção explícita para controles internos.

### Decisão

- Remover as classes de destaque também no cleanup do efeito de foco, garantindo que o fundo azul pisque e desapareça mesmo se houver re-fetch durante o timer.
- Reduzir o tempo visual do destaque para 2,2s, mantendo o scroll suave e a busca por `reply-:id`.
- Em `/app/posts/mine`, abrir respostas/comentários por clique nas áreas neutras do card via `router.push` para a mesma URL com `focusReplyId` e `#reply-:id`.
- Preservar independentes os controles internos da barra de ações por detecção de alvo interativo (`a`, `button`, campos, mídia, menu e roles interativas).

### Consequências

- Respostas vindas de Salvos e de Meus posts/comentários mantêm o mesmo destino e foco no detalhe do post.
- O destaque azul deixa de ficar fixo após navegação para comentário salvo ou próprio.
- Não houve alteração de backend, schema Prisma, persistência, votos, salvos ou contratos HTTP.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local:
  - `http://127.0.0.1:3000/app/posts/saved` retornou 200.
  - `http://127.0.0.1:3000/app/posts/mine` retornou 200.
  - `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video?focusReplyId=cmqfzkzn90000g8uh3n4dn24i#reply-cmqfzkzn90000g8uh3n4dn24i` retornou 200.

## Complemento 2026-06-21: topo e menu de cards em Meus posts

### Contexto

As abas `Posts` e `Respostas` em `/app/posts/mine` ainda apresentavam diferencas no topo dos cards: respostas mantinham o horario solto no canto direito e posts nao exibiam o menu de acoes do proprio post no card. O objetivo era aproximar a area pessoal do padrao ja usado no detalhe do post, sem criar regras paralelas de exclusao.

### Decisao

- Padronizar a linha superior como `Postado em [comunidade] - [tempo]` para posts e `Respondido em [comunidade] - [tempo]` para respostas de psicologos, usando o separador visual de bullet na UI.
- Manter o nome da comunidade truncavel no mobile e reservar o lado direito do header para o menu de tres pontos.
- Reutilizar `PostOwnerActionMenu` nos cards, preservando as regras existentes de propriedade, silenciamento e bloqueio de exclusao quando aplicavel.
- Em respostas, aplicar o mesmo menu ao post original quando o usuario logado for dono desse post; caso contrario, a regra de permissao existente impede exibir a acao de dono.

### Consequencias

- O horario deixa de competir visualmente no canto direito e passa a compor o contexto do conteudo.
- As acoes `Silenciar post` e `Excluir post` reaproveitam o mesmo modal e as mesmas validacoes do detalhe do post.
- Nao houve alteracao de backend, schema Prisma, endpoints, pacotes, votos, salvos ou contratos HTTP.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/mine` retornou 200.
- `pnpm check`

## Complemento 2026-06-21: contadores no switch de Meus posts

### Contexto

O switch de `/app/posts/mine` mostrava apenas os rotulos `Posts` e `Respostas`/`Comentarios`, obrigando o usuario a alternar abas para entender o volume de cada tipo de contribuicao.

### Decisao

- Exibir a quantidade real de itens ao lado de cada opcao do switch.
- Usar consultas leves ao endpoint existente `/api/private/posts/mine` com `limit=1` para obter apenas o `count` de `posts` e `replies`, sem criar endpoint paralelo nem mockar dados.
- Reaproveitar a contagem da aba ativa a partir da consulta principal quando disponivel, evitando depender de dados locais inventados.
- Manter o layout em pill dentro do switch, com contraste diferente para estado ativo e inativo.

### Consequencias

- O usuario entende imediatamente quantos posts e respostas/comentarios possui em cada aba.
- A alteracao nao muda backend, schema Prisma, contratos HTTP, paginacao, ordenacao ou persistencia.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/mine` retornou 200.

## Complemento 2026-06-21: hover neutro em Meus posts

A tela `/app/posts/mine` estava herdando o hover azul dos cards compartilhados de comunidade. No desktop, isso fazia o card e o nome da comunidade parecerem um link tradicional quando o mouse passava por cima.

Decisao:

- Manter os cards de `Meus posts e respostas` clicaveis nas areas neutras, mas trocar o hover azul por um hover neutro baseado em `surface-muted` e borda cinza.
- Adicionar uma variacao `hoverTone="neutral"` ao `CommunityPostCard` para permitir essa excecao sem alterar o comportamento padrao do feed, comunidade, salvos e perfil.
- Usar `desktopPlainLinks` nos cards de posts dessa tela para que o nome da comunidade mantenha a cor tipografica no hover, sem azul nem sublinhado, exibindo apenas o cursor de interacao.

Impacto:

- A mudanca e apenas visual no frontend.
- Nao altera backend, Prisma, endpoints, votos, salvos, notificacoes, paginacao ou contratos HTTP.
- Builder/Quick Copy nao foi acessado diretamente neste ambiente; a referencia visual usada foi a tela local apontada pelo usuario e os prototipos registrados em `_product/tasks/PROTO-INVENTORY.md`.

Validacao:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local: `http://127.0.0.1:3000/app/posts/mine` retornou 200.

## Complemento 2026-06-22: sem WhatsApp proprio e flag profissional externa

### Contexto

Em `Meus posts e respostas`, o conteudo listado pertence ao proprio usuario autenticado. Para psicologos, exibir `Chamar no WhatsApp` no proprio conteudo gera uma acao redundante. Alem disso, a flag `Respondido por psicologo verificado` deve representar resposta de outro profissional, nao uma resposta direta criada pelo proprio psicologo autor.

### Decisao

- Criar uma prop opt-in em `CommunityPostCard` para ocultar CTAs de WhatsApp em contextos pessoais, mantendo o default publico inalterado para feed, salvos, perfil e detalhe.
- Usar essa prop apenas em `/app/posts/mine`, onde o objetivo e gestao/acompanhamento do proprio conteudo.
- Ajustar o backend de `GET /api/private/posts/mine?type=replies` para calcular `has_verified_professional_reply` apenas com respostas diretas de outros psicologos verificados.

### Consequencias

- Psicologos nao veem botao para chamar o proprio WhatsApp na area pessoal.
- Comentarios/respostas do proprio psicologo nao ganham a flag profissional por causa de respostas dele mesmo.
- A experiencia publica continua exibindo WhatsApp para psicologos com numero cadastrado e continua mostrando respostas profissionais de terceiros quando aplicavel.
- Nao houve mudanca de schema, endpoints, packages, votos, salvos, exclusao, edicao ou notificacoes.

### Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke API real em `GET /api/private/posts/mine?type=replies`: criou uma resposta propria e uma resposta filha propria do psicologo `<CONTA_DE_TESTE_AUTORIZADA>`, confirmou `replies_received_count=1` e `has_verified_professional_reply=false`, e removeu os registros temporarios ao final.
- Chrome/CDP mobile `390x844` em `/app/posts/mine`: confirmou ausencia de `Chamar no WhatsApp` em conteudo proprio e ausencia de `Respondido por psicologo verificado` no card da resposta propria com filho criado pelo mesmo psicologo.

## Complemento 2026-07-01: resposta profissional destacada em posts salvos

### Contexto

O prototipo local de `Posts Salvos` e o feed exibem a resposta de psicologo em destaque dentro do
card do post quando o post principal salvo possui `highlighted_professional_reply`. Uma decisao
anterior ocultava esse bloco em `/app/posts/saved` para evitar ambiguidade com respostas salvas
independentes, mas o pedido de produto atual prioriza consistencia visual com o feed: salvar o post
deve preservar tambem a resposta-destaque associada ao post no card.

### Decisao

- Remover a excecao `showHighlightedProfessionalReply={false}` dos cards de posts em
  `/app/posts/saved`.
- Reutilizar o default de `CommunityPostCard`, que so renderiza a resposta destacada para posts
  originais de pacientes com resposta profissional verificada (`highlighted_professional_reply` real
  vindo do backend).
- Manter respostas salvas como itens independentes quando o usuario salva uma resposta diretamente;
  a resposta-destaque dentro de um post salvo continua sendo contexto do post, nao um novo item
  salvo.

### Consequencias

- A tela Salvos fica alinhada ao feed/comunidade para posts com resposta profissional em destaque.
- O contrato existente de `GET /api/private/posts/saved` ja era suficiente; nao ha schema novo,
  endpoint novo, migration ou package novo.
- A ambiguidade e mitigada pela separacao visual existente: posts principais seguem em
  `CommunityPostCard`, enquanto respostas salvas independentes usam o header `Respondido em`.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Chrome headless mobile `390x844` em `/app/posts/saved`; sem sessao persistida no perfil headless,
  a rota redirecionou para login. A comparacao visual autenticada usou as imagens locais
  `_product/proto/Posts Salvos.jpg` e `_product/proto/Feed Comunidade.jpg`, alem do reuso do
  `CommunityPostCard` ja validado no feed.

## Complemento 2026-07-01: card de Salvos com apresentacao do feed

### Contexto

A tela `/app/posts/saved` ja exibia `highlighted_professional_reply`, mas o card salvo ainda divergia do feed: a resposta vinha com rotulo extra, outro padding e outra composicao, e o card principal nao tinha o mesmo header, follow toggle, bordas, sombras, gaps e labels do feed. O pedido atual exige que Salvos seja visualmente identico ao feed para posts salvos.

### Decisao

- Adicionar `presentation="feed"` como variacao opt-in de `CommunityPostCard`, mantendo o comportamento default usado por Meus posts/perfis.
- Aplicar essa apresentacao apenas aos itens do tipo post em `/app/posts/saved`.
- Na apresentacao feed, reutilizar `CommunityFollowToggle` no header e renderizar a resposta profissional destacada com a mesma hierarquia visual do feed: card azul claro, linha vertical lateral, metadados com upvotes, texto expansivel e midia no bloco.
- Manter respostas salvas diretamente como cards independentes de resposta, pois elas representam outro tipo de item salvo.

### Consequencias

- Salvos passa a preservar o mesmo contexto visual do feed quando o usuario salvou um post com resposta profissional destacada.
- A mudanca e somente de frontend/apresentacao; nao ha schema novo, endpoint novo, migration, package novo, mock ou dado artificial.
- O componente compartilhado concentra a variacao para evitar copiar o card local do feed para a rota de Salvos.

### Validacao

- `pnpm --dir frontend exec biome check --write src/components/community/community-post-card.tsx src/app/app/posts/saved/logic.tsx`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Smoke HTTP local em `/app/posts/saved` retornou 200.
- Chrome headless mobile `390x844` sem sessao autenticada nao permitiu comparacao autenticada; a decisao visual foi validada pelo reuso da apresentacao do feed e pelas referencias locais `Posts Salvos`/`Feed Comunidade`.

## Complemento 2026-07-16: indicadores de acolhimento apenas para pacientes em Meus posts

### Contexto

A rota `/app/posts/mine` e compartilhada por pacientes e psicologos. O card de posts exibia o chip
`Respondido por psicologo verificado` sempre que `highlighted_professional_reply` existia, inclusive
para contas de psicologo. O mesmo conceito tambem podia aparecer na aba de respostas por meio de
`has_verified_professional_reply`.

Esses indicadores sao sinais de acolhimento para pacientes: comunicam que uma duvida/relato recebeu
atencao profissional. Para psicologos, a finalidade e diferente: a tela lista publicacoes e respostas
do proprio profissional, e o destaque de acolhimento por outro psicologo gera ruido e interpretacao
equivocada.

### Decisao

- Em `/app/posts/mine`, quando `sessionUser.role === "psicologo"`, ocultar o chip
  `Respondido por psicologo verificado` nos cards de posts.
- Na mesma condicao, passar `showHighlightedProfessionalReply={false}` para `CommunityPostCard`,
  impedindo a renderizacao da resposta profissional em destaque dentro dos posts do psicologo.
- Na aba de respostas/comentarios da mesma rota, ocultar `ProfessionalAnsweredBadge` para contas de
  psicologo, mesmo que o backend retorne `has_verified_professional_reply`.
- Manter o comportamento para pacientes, pois o indicador segue sendo parte da experiencia de
  acolhimento e acompanhamento.

### Consequencias

- A alteracao e apenas de apresentacao no frontend; nao muda contrato, endpoint, schema Prisma,
  migration, permissao, votos, salvos, compartilhamento ou dados persistidos.
- O backend pode continuar retornando `highlighted_professional_reply` e
  `has_verified_professional_reply` para reuso em outros contextos, mas `/app/posts/mine` decide a
  exibicao conforme o papel da sessao.
- A referencia visual de `Meus Posts - Psicologo` permanece sem tags de acolhimento no topo do card,
  enquanto `Meus Posts - Paciente` preserva a resposta profissional destacada.

### Validacao

- `_product/proto/Meus Posts - Psicologo.jpg` e `_product/proto/Meus Posts - Paciente.jpg`
  consultados como referencia visual local; Builder/Quick Copy nao esta exposto como ferramenta
  callable neste ambiente.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Browser local mobile `390x844` em `/app/posts/mine`.
- Browser headless sem sessao persistida redirecionou para `/auth/login?callbackUrl=/app/posts/mine`; a regra autenticada foi validada por codigo, referencias locais e reuso do papel real da sessao.

## Complemento 2026-08-10: contexto de comentário pai em respostas pessoais

### Contexto

No mobile de `/app/posts/mine`, respostas do usuário a outros comentários ainda exibiam o bloco
`POST DE ORIGEM`, mesmo quando a origem contextual correta da resposta era o comentário pai. Isso
fazia respostas aninhadas parecerem vinculadas diretamente ao post raiz.

### Decisão

- Usar `reply.parent_reply_id` como discriminador visual do card de resposta/comentário.
- Quando houver `parent_reply_id`, renderizar o bloco como `COMENTÁRIO DE ORIGEM` usando
  `reply.parent_content`, dado real já retornado por `GET /api/private/posts/mine?type=replies`.
- Quando não houver `parent_reply_id`, manter `POST DE ORIGEM` com título e trecho do post.

### Consequências

- A hierarquia visual acompanha a árvore real de `post_reply` sem criar contrato novo.
- O ajuste é compatível com rollout independente, pois consome campos já existentes e mantém fallback
  de texto para conteúdo vazio.
- Não há migration, endpoint novo, package novo, mock ou alteração de dados persistidos.
