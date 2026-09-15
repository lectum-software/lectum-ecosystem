# ADR-0087 - Header interno preso ao card no feed desktop de Psicologos

## Status

Accepted

## Contexto

No desktop da tela `/app/psychologists`, o feed em estilo Shorts usa um container interno com `scroll-snap` e cards verticais 9:16. O menu interno `Explorar / Minha Busca` era renderizado como uma camada global absoluta sobre a area do feed, com offset alinhado ao topo do card desktop.

Durante a transicao entre slides, especialmente no ultimo video, essa camada podia permanecer visivel na area entre cards porque nao pertencia ao card que estava sendo rolado. Visualmente, o header parecia fixo ou herdado de outro card, vazando acima do video ativo.

## Decisao

- Manter o header global `Explorar / Minha Busca` apenas para o comportamento mobile, ocultando-o em `lg`.
- Renderizar no desktop uma instancia do mesmo menu dentro do container visual de cada card/slide.
- Deixar apenas o slide ativo com esse header interativo; slides inativos mantem a camada invisivel e sem pointer events.
- Posicionar o header em `top: 0` dentro do card, aproveitando o `overflow-hidden` e o `border-radius` do proprio card.
- Preservar a proporcao 9:16, o scroll-snap, dados, gestos e UI interna do card ativo.

## Consequencias

- O menu acompanha o card ativo durante a rolagem/snap em desktop.
- O header nao fica mais solto na viewport nem aparece entre cards.
- O ultimo card nao herda header/overlay acima do video.
- Mobile permanece com a renderizacao global anterior e sem mudanca de comportamento.
- Nao houve alteracao de backend, contratos de API, Prisma, packages ou conteudo textual.

## Task relacionada

Ajuste complementar de UX visual da TASK-13 em `/app/psychologists`.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local em `http://127.0.0.1:3000/app/psychologists`
