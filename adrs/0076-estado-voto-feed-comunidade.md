# ADR-0076: Estado de voto no feed da comunidade

## Status

Accepted

## Task relacionada

Ajuste pontual de microinteracoes no feed/post da comunidade.

## Contexto

Os botoes de upvote e downvote precisam responder imediatamente com estado visual neutro, positivo ou negativo, contador atualizado, animacao discreta e feedback tatil. A pagina de detalhe do post ja tinha `current_user_vote`, mas o feed da comunidade retornava apenas contadores, o que impediria exibir corretamente o estado verde/vermelho sem inferencia local.

## Decisao

O backend passa a retornar `current_user_vote` tambem em `CommunityPostDTO` para listagens de comunidade/feed. O frontend usa esse estado para renderizar botoes reais de voto no feed e reaproveita um componente comum `VoteActionButton` para:

- escala suave do icone em ate `1.15`;
- cores por tokens (`success` para upvote e `danger` para downvote);
- transicao discreta dos contadores;
- indicador `+1` apenas ao aplicar upvote;
- `navigator.vibrate(10)` quando o dispositivo suportar feedback tatil.

As animacoes permanecem curtas e discretas, sem confete, particulas ou gamificacao visual.

## Consequencias

- O feed consegue exibir estado de voto real sem mock ou estado inventado permanente.
- O endpoint de comunidade ganha um campo adicional retrocompativel para consumidores que precisem saber o voto do usuario atual.
- Respostas continuam sem contador de downvote porque o modelo `post_reply` ainda persiste apenas `upvotes_count`; a seta de downvote ainda recebe estado vermelho e feedback tatil quando votada.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start -p 3007`:
  - `GET /app/community/feed` retornou HTTP 200
  - `GET /app/community/ansiedade-em-equilibrio/post/smoke-post` retornou HTTP 200

## Pendencias

- Se o produto exigir contador publico de downvotes em respostas, sera necessario adicionar `downvotes_count` em `post_reply` com migration especifica.
