# ADR-0385 - Medias de engajamento no Video de apresentacao do trafego WhatsApp Admin

## Status

Accepted

## Contexto

O dashboard Admin de psicologos ja usava `traffic_sources.sources[].platform_metrics` para exibir medias reais nas sublinhas de Comunidades e na linha expansiva de Perfil. O grupo **Video de apresentacao** ja agrupava **Explorar** e **Busca e filtros**, mas essas sublinhas ainda nao apresentavam as medias de engajamento pedidas pelo usuario.

## Decisao

1. Reutilizar o contrato existente `traffic_sources.sources[].platform_metrics` tambem para as fontes `explore` e `search_filters`, sem criar endpoint paralelo.
2. Calcular medias de consumo do video com `profile_video_watch_session`: Visualizacoes, Retencao, Tempo de permanencia e Taxa de replay.
3. Calcular acoes do video com `important_action_event`: `psychologist_video_profile_access`, `psychologist_video_favorite` e `psychologist_video_share`, separando **Busca e filtros** por parametros reais no `path` e mantendo os demais eventos em **Explorar**.
4. Usar videos publicados do segmento como denominador das medias de contagem e o mesmo filtro por plano do bloco.
5. Nao criar migration nem backfill: como `profile_video_watch_session` nao guarda origem/query historica, os indicadores de consumo sao agregados do video e exibidos igualmente em **Explorar** e **Busca e filtros**, sem inventar distribuicao por query.

## Consequencias

- O Admin passa a exibir o mesmo padrao de leitura de engajamento em Comunidades, Perfil e Video de apresentacao.
- Os chips de **Explorar** e **Busca e filtros** usam dados first-party reais ja persistidos.
- A leitura por origem/query fica honesta: os cliques WhatsApp e as acoes do video usam a origem disponivel, mas o consumo do video permanece agregado ate existir uma dimensao persistida especifica.
- Nao ha nova tabela, migration, package ou contrato paralelo.

## Task relacionada

- `_product/tasks/TASK-121-medias-engajamento-video-apresentacao-trafego-whatsapp-admin.md`

## Validacoes

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke de API Admin real em `/api/admin/private/psychologists/dashboard?period=30d` validando labels em `explore` e `search_filters`.
- Browser local Chrome/CDP headless desktop 1440x900 e mobile 390x900 validando os chips do grupo **Video de apresentacao**.
