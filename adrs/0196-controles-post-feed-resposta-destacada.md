# ADR-0196: Controles do card pertencem ao post mesmo com resposta destacada

## Status

Accepted

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
