# ADR-0076: Estado de interacoes no feed da comunidade

## Status

Accepted

## Task relacionada

Ajuste pontual de microinteracoes e acoes do feed/post da comunidade.

## Contexto

Os botoes de upvote e downvote precisam responder imediatamente com estado visual neutro, positivo ou negativo, contador atualizado, animacao discreta e feedback tatil. A pagina de detalhe do post ja tinha `current_user_vote`, mas o feed da comunidade retornava apenas contadores, o que impediria exibir corretamente o estado verde/vermelho sem inferencia local.

Na evolucao seguinte, o feed tambem passou a precisar de estado persistido para `Seguir/Seguindo` e `Salvar/Salvo`. Sem os campos de relacao do usuario atual, o frontend so conseguiria trocar visualmente o botao ate o proximo refetch, sem refletir a participacao/salvamento real.

## Decisao

O backend passa a retornar `current_user_vote` tambem em `CommunityPostDTO` para listagens de comunidade/feed. O frontend usa esse estado para renderizar botoes reais de voto no feed e reaproveita um componente comum `VoteActionButton` para:

- escala suave do icone em ate `1.15`;
- cores por tokens (`success` para upvote e `danger` para downvote);
- transicao discreta dos contadores;
- indicador `+1` apenas ao aplicar upvote;
- `navigator.vibrate(10)` quando o dispositivo suportar feedback tatil.

As animacoes permanecem curtas e discretas, sem confete, particulas ou gamificacao visual.

O mesmo contrato de listagem agora inclui:

- `saved` em `CommunityPostDTO`, derivado de `post_save` do usuario autenticado;
- `community.following` nos posts do feed/lista da comunidade, derivado de `community_member`;
- `community.following` no detalhe do post, para o botao `Seguir/Seguindo` funcionar tambem dentro do post.

No frontend, os controles compartilhados `CommunityFollowButton`, `CommunityFollowToggle` e `PostActionButton/PostActionLink` centralizam o visual pill discreto, estados ativos e transicoes curtas. O estado local e otimista apenas durante a mutation e faz rollback em erro; a fonte final segue sendo o backend persistido.

Os selos `TOP #1/#2/#3 MENTOR` no feed passam a reutilizar a mesma regra visual dos autores profissionais ja usada no detalhe: psicologo verificado, com direito profissional ativo, recebe selo compacto quando a pontuacao usada naquele contexto atinge os patamares persistidos.

## Consequencias

- O feed consegue exibir estado de voto real sem mock ou estado inventado permanente.
- O endpoint de comunidade ganha campos adicionais retrocompativeis para consumidores que precisem saber voto, salvamento e relacionamento do usuario atual.
- O detalhe do post passa a receber `community.following`, evitando botao `Seguir` estatico.
- Respostas continuam sem contador de downvote porque o modelo `post_reply` ainda persiste apenas `upvotes_count`; a seta de downvote ainda recebe estado vermelho e feedback tatil quando votada.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `http://localhost:3000/app/community/feed` retornou HTTP 200 no dev server em execucao.
- Smoke local anterior com `next start -p 3007`:
  - `GET /app/community/feed` retornou HTTP 200
  - `GET /app/community/ansiedade-em-equilibrio/post/smoke-post` retornou HTTP 200

## Pendencias

- Se o produto exigir contador publico de downvotes em respostas, sera necessario adicionar `downvotes_count` em `post_reply` com migration especifica.
