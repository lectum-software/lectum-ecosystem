# ADR-0076: Estado de interacoes no feed da comunidade

## Status

Accepted

## Task relacionada

Ajuste pontual de microinteracoes e acoes do feed/post da comunidade.

## Contexto

Os botoes de upvote e downvote precisam responder imediatamente com estado visual neutro, positivo ou negativo, contador atualizado, animacao discreta e feedback tatil. A pagina de detalhe do post ja tinha `current_user_vote`, mas o feed da comunidade retornava apenas contadores, o que impediria exibir corretamente o estado verde/vermelho sem inferencia local.

Na evolucao seguinte, o feed tambem passou a precisar de estado persistido para `Seguir/Seguindo` e `Salvar/Salvo`. Sem os campos de relacao do usuario atual, o frontend so conseguiria trocar visualmente o botao ate o proximo refetch, sem refletir a participacao/salvamento real.


Em 2026-06-14, o produto reforcou a regra ja documentada no DATA-MODEL: downvotes influenciam estado/score interno, mas nao devem aparecer como numero publico em posts ou respostas. O mesmo ajuste pediu que o feedback visual do upvote nao ficasse preso dentro do pill de votos.

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

- A partir de 2026-06-14, o frontend nao renderiza contagem de downvotes em posts nem respostas. O botao de downvote permanece funcional e continua enviando `value=-1` para o endpoint real de votos.
- `VoteActionButton` passa a renderizar o indicador `+1` em um wrapper externo ao `button`, com `overflow-visible` e camada acima do pill, evitando corte pelo fundo do botao.
- Containers de voto que tinham `overflow-hidden` devem abrir excecao para `overflow-visible` quando abrigarem a microinteracao de upvote.

## Consequencias

- O feed consegue exibir estado de voto real sem mock ou estado inventado permanente.
- O endpoint de comunidade ganha campos adicionais retrocompativeis para consumidores que precisem saber voto, salvamento e relacionamento do usuario atual.
- O detalhe do post passa a receber `community.following`, evitando botao `Seguir` estatico.
- Posts e respostas continuam sem contador publico de downvote; a seta de downvote ainda recebe estado vermelho e feedback tatil quando votada, preservando a logica interna e o score.

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

- Validacao complementar de downvote privado/upvote externo em 2026-06-14:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local em `/app/community/feed` respondeu `200`.

## Pendencias

- Se o produto exigir contador publico de downvotes em qualquer superficie futura, sera necessario reabrir a regra de produto em ADR e avaliar impacto de privacidade/score antes de expor o numero.
