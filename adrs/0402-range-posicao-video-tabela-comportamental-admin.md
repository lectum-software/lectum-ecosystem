# ADR-0402: Range predominante na tag Posição do vídeo na tabela comportamental Admin

## Status

Accepted

## Task relacionada

TASK-138

## Contexto

A coluna **Video de apresentacao** da tabela comportamental por conversao em `/psicologos`
mostrava `Posição média: Xª`. A media ajuda como indicador tecnico, mas nao responde claramente a
pergunta operacional do produto: em qual range os videos dos psicologos de uma faixa de conversao
se concentram.

O produto definiu os ranges `Top 10`, `Top 30`, `Top 50` e `50+` e pediu manter o nome visivel da
tag como `Posição`.

## Decisão

- A tag visual da tabela passa a usar o `display_value` de
  `presentation_video_average_ranking_position` para exibir o range predominante:
  `Posição: Top 10`, `Posição: Top 30`, `Posição: Top 50` ou `Posição: 50+`.
- O campo tecnico `value` da mesma metrica continua carregando a posicao media numerica quando
  houver posicoes reais, preservando compatibilidade para consumidores que ja usam a media.
- Profissionais com video publicado, mas sem posicao confiavel na lista publica ranqueada, entram
  no range `50+`.
- Em empates entre ranges, a regra escolhe a pior faixa para evitar uma leitura otimista sem
  predominancia clara.

## Consequências

- A leitura visual responde melhor a pergunta de negocio sobre concentracao por range.
- A media numerica permanece disponivel no payload, mas deixa de ser o texto principal da tag.
- `50+` passa a representar tanto posicoes acima de 50 quanto ausencia de posicao confiavel para
  video publicado.
- O frontend nao precisa de novo componente; a curadoria de tags existente ja prioriza
  `display_value`.

## Validação

- `npx "@builder.io/dev-tools@latest" auth status` retornou `Not Authenticated to Builder.io`; usado fallback local.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos?period=all` via Chrome/CDP desktop `1440x1000` e mobile `390x900`, validando `Posição: Top 10`, ausencia de `Posição média:` e ausencia de overflow horizontal mobile.

## Pendências

- Builder/Quick Copy nao estava autenticado/callable nesta execucao; fallback visual usado:
  `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e screenshot do usuario.
