# ADR-0384 - Expansivo de Perfil com medias de engajamento no trafego WhatsApp Admin

## Status

Accepted

## Contexto

A tabela **Origem do trafego para psicologos** do dashboard Admin ja exibia cliques reais de WhatsApp por superficie e possuia expansivos para Comunidades e Video de apresentacao. A linha **Perfil** permanecia plana, apesar de o usuario precisar ver medias de engajamento medio dentro do perfil publico junto ao total de cliques WhatsApp originados nessa superficie.

As fontes first-party ja existentes permitem medir aberturas de perfil, duracao de pageviews, sessoes do video de apresentacao, favoritos e eventos importantes. As abas Publicacoes e Avaliacoes ainda nao tinham evento especifico.

## Decisao

1. Manter **Perfil** como linha principal ordenada por cliques WhatsApp, mas transforma-la em grupo expansivo visual no Admin.
2. Reutilizar `traffic_sources.sources[].platform_metrics` para anexar metricas ao item tecnico `profile`, evitando endpoint paralelo.
3. Calcular contagens de Perfil como medias por psicologo do segmento selecionado; calcular `Tempo de permanencia` por media de `page_view_event.duration_seconds`; calcular `Retencao` por media percentual de sessoes reais de `profile_video_watch_session`.
4. Criar dois `important_action_event.action_type` novos para eventos futuros de abertura das abas do perfil publico: `psychologist_profile_publications_tab_open` e `psychologist_profile_reviews_tab_open`.
5. Nao fazer backfill das abas: historico anterior permanece zerado/sem base ate que o novo tracking acumule eventos reais.
6. Preservar os grupos e calculos existentes de Comunidades e Video de apresentacao.

## Consequencias

- O Admin passa a auditar engajamento dentro do perfil no mesmo bloco operacional de origem de WhatsApp.
- O filtro por plano reaproveita o mesmo recorte por psicologos permitido no segmento.
- Dados historicos das abas comecam zerados/sem base ate o novo tracking acumular eventos reais.
- `Tempo de permanencia` em Comunidades passa a refletir segundos medios por exposicao mensuravel, em vez de segundos acumulados divididos por quantidade de conteudos.
- Nao ha nova tabela, migration, package ou endpoint.

## Task relacionada

- `_product/tasks/TASK-120-expansivo-perfil-medias-engajamento-trafego-whatsapp-admin.md`

## Validacoes

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend build`
- `pnpm check`
- Smoke backend de `buildPsychologistsDashboard({ period: "30d" })` com os sete ids de `profile.platform_metrics`.
- Browser local via Chrome/CDP em desktop 1440px e mobile 390px, expandindo **Perfil** e validando os sete chips.
