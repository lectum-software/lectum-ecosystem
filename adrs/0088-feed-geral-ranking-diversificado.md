# ADR-0088: Ranking diversificado do feed geral de comunidades

## Status

Accepted

## Task relacionada

TASK-23

## Contexto

O feed geral `/app/community/feed` reune posts de varias comunidades. A ordenacao anterior priorizava metricas agregadas dentro da pagina retornada, o que favorecia comunidades grandes e nao criava uma mistura consistente entre temas. As paginas internas `/app/community/[slug]` ja possuem algoritmo proprio de relevancia comunitaria e nao devem ser afetadas por uma logica global.

## Decisao

- Aplicar o ranking diversificado somente no endpoint agregado `GET /api/private/community/feed/posts`.
- Manter `GET /api/private/community/:slug/posts` com o algoritmo interno de comunidade ja definido anteriormente.
- Calcular, para cada post elegivel, metricas reais de:
  - upvotes persistidos;
  - comentarios/respostas persistidas;
  - respostas de psicologos verificados;
  - respostas de Top Mentor;
  - penalidade interna leve por downvotes persistidos.
- Manter `shares_count` como `0` enquanto nao houver evento persistido de compartilhamento por post comunitario.
- Excluir posts removidos pela propria query (`status = publicado`) e deixar a estrutura preparada para futuras penalidades de denuncia, ocultacao ou moderacao quando esses campos existirem no schema.
- Criar filas por comunidade ordenadas por `CommunityHotScore`, carregar uma janela inicial de ate 5 candidatos por comunidade e recarregar proximos candidatos da fila quando o pool daquela comunidade ficar baixo.
- Montar a ordem global por `FeedScore = CommunityHotScore * FreshnessWeight * CommunitySizeWeight * DiversityWeight`.
- Usar `CommunitySizeWeight` com clamp `0.75..1.15` considerando posts recentes dos ultimos 7 dias por comunidade, com fallback minimo de 1 para comunidades sem posts recentes no recorte.
- Usar `DiversityWeight` dinamico durante a montagem: `0.35` quando a comunidade apareceu imediatamente antes, `0.70` quando apareceu nos ultimos 3 posts, `1.00` quando nao apareceu recentemente.
- Continuar usando paginacao `page`/`limit`: a pagina recebe uma fatia da ordem global ja diversificada. Isso preserva o contrato atual e e compativel com infinite scroll no cliente sem repetir posts enquanto o conjunto persistido nao mudar.

## Consequencias

- O feed geral deixa de ser dominado por uma unica comunidade com muitos posts recentes.
- A janela Top 5 por comunidade e apenas o primeiro pool de candidatos; posts abaixo dela continuam elegiveis conforme a montagem avanca e a paginacao/infinite scroll solicita novas fatias.
- Posts com respostas de psicologos e, principalmente, respostas de Top Mentor ganham prioridade no feed geral.
- A logica global fica isolada do ranking interno de comunidade.
- A implementacao busca o conjunto elegivel antes de paginar para garantir diversidade real. Se o volume de posts crescer significativamente, podera ser necessario evoluir para cursor/materializacao de ranking sem mudar a regra de produto.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- HTTP local sem cookie autenticado retornou 307 esperado para `http://localhost:3000/app/community/feed` e `http://localhost:3000/app/community/ansiedade-em-equilibrio`.