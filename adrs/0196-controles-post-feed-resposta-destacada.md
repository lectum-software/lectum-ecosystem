# ADR-0196: Controles do card pertencem ao post mesmo com resposta destacada

## Status

Accepted

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
