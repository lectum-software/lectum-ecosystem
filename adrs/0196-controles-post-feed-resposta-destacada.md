# ADR-0196: Controles do card pertencem ao post mesmo com resposta destacada

## Status

Accepted

## Ajuste 2026-10-05 - Descoberta contextual de comunidades (0.1.582)

Adicionar um componente horizontal compartilhado fora dos cards de posts, no
Inicio (apos 4 posts, intervalo de 12, lotes distintos de 6) e ao esgotar a
paginacao da comunidade. Feed curto esgotado recebe o primeiro lote apos o ultimo
post. Busca, filtro de comunidade no Inicio, oportunidades e erros nao sinalizam
fim de todos os posts. Refetch em segundo plano conserva cards ja carregados.

Usar o adaptador e imagens do Explorar, com cards compactos e link separado da
mutacao. O botao usa a mutacao e conversao anonima existentes, com + Seguir,
loading e Seguindo sem alterar largura. Congelar apenas os slugs sugeridos por
visita/usuario para seguir nao remover nem reordenar cards; dados e vinculos
continuam atualizados. Consulta limitada a 50 candidatas com cache por usuario,
invalidado pelas mesmas mutacoes de comunidade; excluir seguidas e comunidade
atual na selecao, ordenar por categoria atual e atividade. Sem inferencia de
condicoes de saude, novo endpoint, dependencia ou persistencia.

Rolagem nativa com snap, setas acessiveis e movimento reduzido; nomes longos
limitados a tres linhas com nome completo acessivel no link. Sem bloco vazio
quando nao ha sugestoes. Risco: frequencia e conversao devem ser avaliadas em
homologacao. Rollback: reverter apenas componentes e insercoes deste ajuste.
Nenhuma migracao, variavel nova ou acao manual de infraestrutura.

## Ajuste 2026-10-05 - restaurar Plus no estado inativo (0.1.581)

Por escolha do usuario, reverter apenas o icone inativo de FavoriteHeart para
Plus no FeedFavoriteButton. A ampliacao de fonte foi cancelada antes de commit
e nao integra esta versao. Preservar fonte, geometria, estado ativo e mutacoes.
Manter os ajustes de espacamento e salvos do detalhe entregues na versao 0.1.580.

## Ajuste 2026-10-05 - detalhe com ritmo vertical do feed (0.1.580)

PostHeader usa gap de 12px e a mesma divisoria discreta entre comunidade e autor
do feed, totalizando 25px entre as duas linhas. PostBody conserva 12px apos o
autor e adota 8px entre titulo e descricao. Preservar margens laterais e tipografia
da pagina de detalhe, sem alterar o compositor ou os cards de discussao.
PostVoteBar deixa de fornecer save.count; bookmark continua interativo e acessivel.
Nao modificar contratos, persistencia nem contadores de outros tipos de interacao.

## Ajuste 2026-10-05 - coracao contornado no rotulo Favoritar (0.1.579)

Reutilizar FavoriteHeart sem active no rotulo compacto, substituindo apenas o Plus.
O contorno herda currentColor do texto azul e permanece sem preenchimento.
Manter alinhamento a direita, slot de 66px, transicao e coracao vermelho ativo.
Nenhuma alteracao em mutacoes, perfil, comunidade, player ou contratos.

## Ajuste 2026-10-05 - acao compacta Plus Favoritar (0.1.578)

- Adicionar o icone Plus da biblioteca existente e retirar apenas a borda no FeedFavoriteButton compartilhado por posts/respostas.
- Manter o slot de 66px: Plus de 12px e gap de 4px aproveitam o espaco interno. Por confirmacao do usuario, alinhar o slot a direita, com largura fixa mesmo no estado ativo; nome e selo ficam juntos a esquerda, com truncamento do nome quando necessario.
- Manter nome acessivel Favoritar, estado pressionado e transicao para coracao; o Plus e decorativo.
- Perfil do psicologo e cabecalho de comunidade permanecem intactos. Publicar em homologacao para avaliacao; producao somente mediante nova solicitacao.

## Ajuste 2026-10-05 - seguir da comunidade em circulo (0.1.576)

O cabecalho da comunidade adota a mesma geometria do favorito do perfil:
altura h-10, cantos completos, borda discreta e sombra leve. Inativo mostra
Plus + Seguir em 112px; ativo contrai para w-10 com Check azul, sem rotulo
visivel permanente. O coracao permanece exclusivo dos favoritos.
Nome acessivel informa estado e acao de deixar de seguir; hover/foco exibe
Seguindo comunidade. Largura, rotulo e icones transicionam em 200ms, respeitando
movimento reduzido. Pendente preserva dimensoes e exibe loader desabilitado.
A variante compacta e as mutations existentes nao mudam. Publicar em homolog.

## Ajuste 2026-10-05 - favorito de producao e rotulo no perfil (0.1.575)

Por nova referencia do usuario, os tokens de favorito passam a referenciar as
cores originais de producao (danger, danger-soft, danger-border), preservando
a semantica separada sem duplicar valores. O tema escuro acompanha os tokens.
No perfil, o controle inativo acomoda coracao contornado e Favoritar em 112px;
ativo retorna ao circulo h-10/w-10, somente com coracao preenchido. Altura e
posicao permanecem, largura e rotulo transicionam com suporte a movimento reduzido.
Feed/respostas conservam proximidade do selo e animacao de 0.1.574. Nenhuma
mudanca em mutations, cache, contratos ou comunidade. Somente homologacao.

## Ajuste 2026-10-05 - proximidade e transicao do favorito (0.1.574)

O slot fixo anterior centralizava o coracao longe do selo. O controle compacto
agora transiciona entre 66px (texto) e 24px (icone), com o coracao alinhado a
esquerda e altura inalterada. Duas camadas decorativas persistentes permitem
crossfade sem anunciar texto duplicado; aria-label e aria-pressed mantem a acao.
CSS respeita prefers-reduced-motion. O estado continua dependendo da mutation
real confirmada, sem sucesso visual antecipado nem mudanca de cache/conversao.

FavoriteHeart reutiliza Heart/Lucide com o mesmo desenho e traco de producao.
Tokens favorite separados de danger permitem vermelho menos saturado, incluindo
tema escuro, sem alterar alertas ou exclusoes. Perfil recupera o botao circular
da referencia, substituindo a padronizacao textual de 0.1.573 somente no perfil.
Comunidade conserva Seguir/Seguindo. Busca e lista reutilizam desenho/cor, sem
alterar suas dimensoes ou comportamento de relacionamento.

Sem contrato, schema ou dependencia novos. Rollback somente visual. Homologacao.

## Ajuste 2026-10-05 - feedback persistente e cabecalhos padronizados (0.1.573)

Substituir ocultacao de favoritos por alternancia Favoritar/coracao preenchido
vermelho, com aria-pressed e nome acessivel para desfavoritar. Vermelho diferencia
favorito do selo azul e acompanha a identidade dos favoritos na busca. O slot
compacto permanece com largura fixa, evitando deslocar a identificacao ao mudar
de estado. Remover hideFavorited de todos os callsites; mutations, cache por conta,
conversao de visitante e bloqueio concorrente permanecem inalterados.

O cabecalho da comunidade sempre exibe Seguir/Seguindo, permitindo desfazer a
acao no mesmo local. Posts continuam sem Seguir. O perfil profissional adota
Favoritar/coracao; ambos os cabecalhos usam RelationshipButton para compartilhar
dimensoes fixas, fonte, foco, raio 6px e fundo transparente. A variante compacta
serve os autores de posts, sem ampliar a altura da linha. Controles da busca e
da lista de comunidades seguidas nao mudam.

Sem backend, schema, package ou env novos. Rollback visual por reversao do
frontend, sem afetar relacionamentos persistidos. Publicar apenas em homolog.

## Ajuste 2026-10-05 - formato do Favoritar (0.1.572)

Usar rounded-[6px] no FeedFavoriteButton compartilhado para diferenciar a acao
de uma etiqueta, sem aumentar a linha de identificacao. Somente o raio muda;
nao alterar tipografia, dimensoes, estados, conversao ou mutations.

## Ajuste 2026-10-05 - concentrar Seguir no cabecalho da comunidade (0.1.571)

Posts deixam de apresentar o controle de seguir, independentemente do estado
do relacionamento. Remover somente os callsites dos tres componentes de post;
preservar os links de comunidade e Favoritar nos autores profissionais.
O cabecalho da comunidade continua oferecendo Seguir, sem repeti-lo nos posts.
Nao alterar mutations, conversao, gerenciamento de comunidades ou estilos globais.
Trade-off aprovado: um passo adicional para seguir em troca de menos acoes
concorrentes durante a leitura. Substitui as regras anteriores de Seguir nos posts.

## Ajuste 2026-10-05 - relacionamentos ocultos dentro do post (0.1.570)

O detalhe passa hideFollowing ao controle de comunidade e utiliza o padrao
hideFavorited=true em seus autores profissionais, incluindo a arvore recursiva
de respostas/comentarios e o post original da thread. Isso substitui a decisao
anterior de manter os estados ativos visiveis no detalhe, conforme novo pedido.
Nao alterar defaults globais nem controles de perfil/salvos. Mutations, cache,
conversao de visitantes e tratamento de falhas permanecem compartilhados.

## Ajuste 2026-10-05 - favoritos em todas as publicacoes profissionais (0.1.569)

Reutilizar FeedFavoriteButton com hideFavorited=true por padrao preserva o
feed existente. Detalhe, comentarios, thread e cards de perfil/salvos optam
por false: Favoritado permanece acessivel para desfavoritar usando as
mutations e o cache de IDs existentes. Intencao de conversao pendente nunca
deve desfavoritar um profissional ja favoritado.

Favoritar e desfavoritar compartilham a mutation key por conta. Assim os
controles do mesmo profissional bloqueiam cliques concorrentes nas duas direcoes.

O papel do autor e validado no controle; paciente e proprio autor nao recebem
o botao. Slots junto ao selo preservam a altura e o nome truncavel. Remover
overflow-hidden apenas dos wrappers de identificacao evita cortar o foco e
o contorno. Seguir no detalhe conserva sua alternancia, apenas mais compacto.

## Ajuste 2026-10-05 - fundo de Favoritar (0.1.568)

Usar bg-transparent e retirar o preenchimento de hover no FeedFavoriteButton.
O controle acompanha a superficie do card sem um fundo branco proprio.
Contorno, foco visivel, fonte e regras de relacionamento permanecem intactos.

## Ajuste 2026-10-05 - peso de Favoritar (0.1.567)

A comparacao de estilos computados confirmou Seguir com peso 600 e Favoritar
com 400. O reset global de button tambem sobrescreve o peso da utility.
Definir fontWeight: 600 junto ao fontSize local e alinhar a utility a semibold
mantem os dois controles equivalentes sem alterar a cascata global.

## Ajuste 2026-10-05 - posicao e fonte de Favoritar (0.1.566)

Retirar ml-auto do slot de acao coloca Favoritar junto ao selo, mantendo h-0
e shrink-0 para preservar a altura da linha e o nome truncavel. O reset global
nao estratificado `button { font: inherit }` prevalecia sobre a utility de 11px:
Favoritar herdava 15px, enquanto Seguir herdava 11px do cabecalho do post.
Definir fontSize: 11 no proprio botao segue o precedente dos controles do perfil
e corrige apenas esta acao, sem alterar a cascata tipografica de todo o produto.
Regras de seguir/favoritar e demais superficies permanecem inalteradas.

## Ajuste 2026-10-05 - controles de relacionamento no feed (0.1.565)

O card deixa de mostrar o icone decorativo de post e o contador de salvos, sem
alterar endpoints ou os contadores de outras superficies. Favoritar textual
entra na linha do nome com slot h-0 centralizado, preservando altura e metadados;
botao e Seguir usam h-5. Nome segue truncavel e selo nao encolhe.

Favoritos sao lidos pela API existente, percorrendo todas as paginas de 50 itens,
em cache de IDs separado das listas completas e isolado pelo usuario. Cards
compartilham a consulta e aguardam carregamento para evitar mostrar Favoritar
para quem ja e favorito. A mutation existente atualiza esse cache no sucesso,
usa o usuario capturado no inicio e invalida para reconciliar com o servidor.
Estado pendente e compartilhado por psicologo. Sem remocao otimista que exija
restaurar listas completas em erros. Apos login a intencao pendente e retomada.

CommunityFollowToggle usa o snapshot de interacao ja existente para receber
mudancas da consulta e isolar usuario/comunidade; hideFollowing e opt-in do card.
O cabecalho da pagina da comunidade tambem oculta Seguir quando following=true.
A ocultacao fica restrita ao feed e a comunidade: Favoritos, Comunidades seguidas
e perfil do psicologo preservam os controles para desfazer as acoes. Sem mudancas
de banco, contratos, autoplay/volume ou de layout da resposta profissional.
Rollback por reversao desses componentes/hooks; nenhum procedimento de dados.

## Ajuste 2026-10-04 - resposta contida e Plus preto (0.1.564)

O usuario pediu que o fundo da resposta volte a parecer contido dentro do post.
A margem negativa diminui de 1rem para 0.5rem, compensada pelo padding de 0.5rem,
mantendo as coordenadas do autor e a largura do video. Cantos de 1rem e contorno
interno usam os padroes existentes; o link de abertura acompanha os cantos.
O circulo final usa media-background/media-foreground (preto/branco invariantes
nos temas), sem novo token global. Demais decisoes de 0.1.563 permanecem intactas.

## Ajuste 2026-10-04 - resposta alinhada sem arvore (0.1.563)

Novo pedido explicito apos a reversao: remover divisoria dos controles e tornar
grupo de votos transparente. O preview profissional perde a coluna decorativa e
o recuo, mas conserva o fundo suave como faixa. Foto de 36px e gap de 12px iguais
ao autor do post alinham avatar e nome, com RESPOSTA PROFISSIONAL em azul acima.
O player existente continua variant reply, portanto 9:16, fit contain e mesmos
autoplay/volume. Largura mobile preenche a area util e limite desktop sobe a 300px.

MoreProfessionalReplies conserva elegibilidade e destino; limita autores reais
distintos a dois e acrescenta Plus Lucide em circulo azul no fim. Com apenas um
outro autor mostra uma foto e Plus, sem inventar ou repetir pessoas. Fonte system-ui
semibold fica restrita ao link. Sem nova fonte remota ou alteracao de API.
O grid do feed e a quebra dos controles em ate 380px evitam os problemas de largura
da versao restaurada. Nenhuma arvore de comentarios foi reintroduzida.

## Reversao 2026-10-04 - layout anterior aprovado (0.1.562)

A pedido explicito do usuario, o experimento 0.1.559-0.1.561 foi revertido.
Os arquivos do card, feed, barra de acoes e testes retornam exatamente a 0.1.558,
removendo os dois componentes extraidos exclusivamente para a arvore.
Preservam-se controles acima da resposta e Ver mais respostas com avatares.
As decisoes experimentais abaixo ficam registradas como historico, nao como
layout ativo. Versao avanca para 0.1.562, sem apagar commits ou alterar dados.

## Complemento 2026-10-04 - votos sem preenchimento proprio (0.1.561)

O usuario esclareceu que deseja a mesma aparencia do fundo ao redor, e nao branco
fixo. O grupo usa bg-transparent e nao tem override de fundo no tema escuro.
Assim acompanha tambem a superficie do card durante hover. Esta decisao substitui
o token opaco de 0.1.560. Borda, dimensoes, preenchimento de selecao, hover dos
botoes e callbacks permanecem intactos. Nenhuma alteracao de backend.

No PostCard do feed/comunidade, salvar e compartilhar passam ao mesmo grupo de
comentar usando secondaryActionsPlacement="inline", ja suportado pelo componente.
Em telas ate 380px, o grupo pode quebrar linha para evitar sobreposicao. Os demais
usos da barra mantem seu posicionamento atual.

## Complemento 2026-10-04 - grupo de votos branco (0.1.560)

O fundo neutro do grupo upvote/downvote usa bg-surface (branco no tema claro),
em vez de bg-surface-muted. Mantem borda, dimensoes, hover, cores de selecao,
callbacks e override do tema escuro. A apresentacao inline continua transparente.
Usa-se o token existente no componente compartilhado para evitar divergencia
visual entre cards. Sem nova API de componente ou alteracao de backend.
Reversao consiste em restaurar o token anterior, sem afetar o layout de arvore.

## Complemento 2026-10-04 - experimento de arvore no feed (0.1.559)

Experimento visual autorizado somente em homologacao, preservando a producao em
0.1.558 ate nova aprovacao. O PostCard usado pelo feed geral e pela comunidade
alinha nome, titulo, descricao e controles na mesma coluna, com avatar no recuo
esquerdo. Quando existe resposta profissional destacada, uma haste e a mesma
curva/cor/espessura da arvore do detalhe ligam os avatares. Sem resposta, nao ha linha.

Retiram-se apenas a divisoria acima dos controles e o painel colorido/borda da
resposta. A divisoria do cabecalho da comunidade permanece. Texto da resposta
acompanha seu autor, mas a midia nao recebe um segundo recuo, preservando largura
no mobile. Player, autoplay, volume, CTA WhatsApp, navegacao, contadores e resumo
de outras respostas continuam usando os componentes/contratos existentes.
Em viewports de ate 380px, os grupos de acoes podem ocupar duas linhas, sem
reduzir alvos de toque nem sobrepor os botoes; o alinhamento inicial e preservado.

ProfessionalReplyPreview e sua midia foram extraidos do PostCard para manter o
arquivo de composicao abaixo do limite. FeedThreadRoot/FeedThreadReply isolam
somente a geometria decorativa, sem estado ou nova regra de dominio. O detalhe,
salvos, minhas publicacoes e perfil profissional nao mudam nesta experiencia.

Sem backend, migration, dependencia ou configuracao de deploy nova. Um commit
isolado em homolog permite reverter exclusivamente este layout e suas extracoes,
preservando as funcionalidades de 0.1.558. Nao promover automaticamente para main.

## Complemento 2026-10-04 - acesso discreto a outras respostas

Abaixo da resposta destacada, o PostCard exibe um unico link cinza com ate tres
avatares sobrepostos: "Ver mais respostas". Sem nova divisoria, fundo ou controles
de resposta. O link abre o post pela navegacao existente, com memoria de scroll.

Feed geral e comunidade recebem `other_professional_reply_authors`, campo aditivo
opcional com ID, nome publico e avatar. Uma consulta em lote por pagina seleciona
respostas diretas de psicologos nao excluidos, excluindo respostas removidas e o
ID da resposta destacada; deduplica autores e limita o payload a tres por post.
Nao exige midia ou selo, pois respostas de texto tambem sao respostas profissionais.
Comentarios de pacientes e comentarios aninhados nao acionam o link. Outra resposta
do autor destacado e elegivel, mas seu avatar aparece uma unica vez.

Frontend oculta o link quando o campo nao existe ou esta vazio. Nao infere outras
respostas a partir de replies_count. Isso permite rollout independente de frontend
e backend. Sem migration, dependencias, envs novas ou alteracao do ranking. Rollback:
reverter a UI; o campo extra da API permanece inofensivo para clientes anteriores.

## Complemento 2026-10-04 - barra logo abaixo da descricao

No PostCard compartilhado, a barra unica do post passa a vir imediatamente depois
do bloco autor/titulo/descricao e antes do bloco de midia/resposta destacada.
Somente a ordem JSX muda: a linha fina, espacamentos, cores, destaque da resposta,
handlers e entidades-alvo permanecem iguais. Nao se adicionam divisorias ou acoes.
O detalhe do post e os controles proprios de respostas nao sao alterados.
Motivo: impedir que a proximidade com o video sugira que a barra pertence a resposta.
Alteracao somente de frontend, sem API, dados, dependencias ou configuracao nova.
Rollback por reversao da ordem no frontend.

## Task relacionada

Complemento da TASK-42, com impacto nos cards da TASK-23/TASK-25/TASK-28.

## Contexto

Cards de feed podem exibir uma resposta destacada de psicologo dentro do post. A barra unica abaixo
do card contem upvote/downvote, comentarios, salvar e compartilhar. Quando o compartilhamento dessa
barra abria diretamente o layout da video-resposta destacada, a UI misturava alvos diferentes na
mesma barra: votos, comentarios e salvar atuavam no post, mas compartilhar atuava na resposta.

Essa ambiguidade fica mais forte no mobile, onde o usuario percebe a barra como um unico grupo de
controles do card inteiro. Se quiser compartilhar especificamente o video-resposta destacado, o fluxo
mais claro e entrar no detalhe do post, onde a resposta tem contexto proprio e controles dedicados.

## Decisao

- Em cards de post no feed geral, dentro da comunidade, meus posts e posts salvos, a barra unica de
  acoes pertence sempre ao `community_post`.
- O botao de compartilhar desses cards agora compartilha o post: se o post original for de
  psicologo com midia, usa o layout social `Postado na Lectum`; caso contrario, usa a share sheet de
  link do post.
- O compartilhamento de video-resposta destacada nao e mais acionado pela barra do card do post.
- Para compartilhar uma video-resposta destacada, o usuario deve abrir o detalhe do post e usar o
  compartilhamento da propria resposta.
- Superficies onde o item exibido e a propria resposta, como listas de respostas salvas ou
  publicacoes de resposta no perfil profissional, continuam podendo compartilhar a resposta porque o
  alvo da barra e o conteudo exibido.

## Consequencias

- A barra de acoes deixa de misturar entidades diferentes na mesma linha.
- Votos, comentarios, salvamento e compartilhamento passam a ter a mesma entidade-alvo em cards de
  post: o post original.
- O layout social de video-resposta continua disponivel, mas por um gesto mais contextual dentro do
  detalhe/thread.
- Nao houve mudanca de schema Prisma, migrations, endpoints, contratos de API ou packages.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile-first em `/`: shell do feed renderizou em 390x844, mas os cards nao foram
  exercitados porque a API local `localhost:3001` retornou 500 para o feed nesta sessao. Nenhum
  mock/seed foi criado para mascarar a ausencia de dados carregados.

## Pendencias

- Nenhuma.
