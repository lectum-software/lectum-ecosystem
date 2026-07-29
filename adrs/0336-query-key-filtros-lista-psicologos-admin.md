# ADR-0336: Query key canonica para filtros da lista Admin de psicologos

## Status

Accepted

## Task relacionada

TASK-54

## Contexto

A lista Admin `/psicologos/lista` ja enviava `profile_conversion` e `engagement` ao endpoint real quando esses filtros estavam na URL, mas a `queryKey` do TanStack Query nao incluia todos os parametros suportados pela lista. Com isso, mudar somente filtros novos como **Conversão** e **Engajamento** podia reaproveitar o cache da lista sem filtros e deixar linhas incompatíveis visiveis.

## Decisao

`admin/src/api/cache/keys.ts` passa a normalizar na chave da lista todos os filtros suportados por `PsychologistsListQuery`, incluindo:

- `profile_conversion`, `engagement` e `profile_conversion_engagement`;
- `profile_status`, `registry_status`, `available_today`, `more_experienced` e `verified`;
- `specialty`, `race_color` e `religion`.

A chave de cache fica alinhada ao contrato HTTP real (`cleanListParams`) para que cada alteracao de filtro produza uma chave diferente e force nova leitura da API, sem criar endpoint paralelo, mock ou estado local especial.

## Consequencias

- Tags de filtros ativos e linhas da tabela passam a responder ao mesmo estado de URL/API.
- Filtros adicionados no Admin nao podem ficar apenas no request HTTP; precisam entrar tambem na normalizacao de query key.
- Pode haver mais entradas de cache para combinacoes distintas de filtros, mas esse e o comportamento correto para listas filtradas.

## Validacao

- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- HTTP local `GET http://localhost:3002/psicologos/lista?engagement=muito_ativo&profile_conversion=strong_profile_conversion` retornou `200`.

## Pendencias

- Nenhuma pendencia externa.
