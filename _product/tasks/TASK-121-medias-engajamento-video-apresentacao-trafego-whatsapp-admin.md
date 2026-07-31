# TASK-121 - Medias de engajamento no Video de apresentacao do trafego WhatsApp Admin

## Status

Completed

## Contexto

Depois das TASK-114 a TASK-120, a tabela **Origem do trafego para psicologos** em `/psicologos` ja possui grupos expansivos para **Comunidades**, **Video de apresentacao** e **Perfil**. As sublinhas de Comunidades exibem medias reais de engajamento, mas dentro de **Video de apresentacao** as sublinhas **Explorar** e **Busca e filtros** ainda exibem apenas descricao textual.

Em 2026-07-31, o usuario pediu que **Explorar** e **Busca e filtros** exibam, assim como as categorias das comunidades, as medias de engajamento: Visualizacoes, Retencao, Tempo de permanencia, Taxa de replay, Acessos ao perfil, Favoritado e Compartilhado.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando o grupo **Video de apresentacao** expandido em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Adicionar medias reais de engajamento nas sublinhas **Explorar** e **Busca e filtros** do grupo **Video de apresentacao** na tabela de trafego WhatsApp do Admin de psicologos, preservando o agrupamento existente, filtros por plano e sem criar mocks, seeds, backfill, endpoint paralelo, package novo ou migration.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-75: analytics de conteudo e retencao de video.
- TASK-76: periodo global do Admin.
- TASK-97: visibilidade Comunidade x Video.
- TASK-114 a TASK-120: tabela de trafego WhatsApp, grupos expansivos e metricas medias.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Estender o contrato `traffic_sources.sources[].platform_metrics` para preencher tambem as fontes tecnicas `explore` e `search_filters`.
- Reusar `profile_video_watch_session` para Visualizacoes, Retencao, Tempo de permanencia e Taxa de replay.
- Reusar `important_action_event` com `psychologist_video_profile_access`, `psychologist_video_favorite` e `psychologist_video_share` para Acessos ao perfil, Favoritado e Compartilhado.
- Manter o filtro por plano aplicando o mesmo recorte de psicologos permitido no segmento.
- Renderizar os chips nos filhos **Explorar** e **Busca e filtros** usando o mesmo componente visual de `platform_metrics` ja usado em Comunidades e Perfil.

## Regras de calculo

- Base de media: videos de apresentacao publicados dos psicologos do segmento selecionado.
- `Visualizacoes`, `Acessos ao perfil`, `Favoritado` e `Compartilhado` sao medias por video publicado no segmento.
- `Retencao` e a media percentual de `watched_seconds / duration_seconds` em sessoes reais do video de apresentacao com duracao positiva.
- `Tempo de permanencia` e a media de `watched_seconds` por sessao real do video de apresentacao.
- `Taxa de replay` e a proporcao de sessoes reais do video com `replay_count > 0`.
- `Acessos ao perfil`, `Favoritado` e `Compartilhado` usam o `path` do `important_action_event` para separar **Busca e filtros** quando ha parametros reais de pesquisa/filtro e **Explorar** quando nao ha.
- Como `profile_video_watch_session` ainda nao possui dimensao persistida de origem/query, os indicadores de consumo do video sao agregados do video de apresentacao e anexados igualmente a **Explorar** e **Busca e filtros**, sem simular distribuicao historica por query.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Criar backfill historico, seed, mock ou endpoint simulado.
- Alterar o tracking frontend ja existente de acoes do video.
- Alterar os calculos de Comunidades ou Perfil.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.
- Instalar package novo.

## Criterios de aceite

- [x] Ao expandir **Video de apresentacao** em `/psicologos`, **Explorar** exibe os chips: Visualizacoes, Retencao, Tempo de permanencia, Taxa de replay, Acessos ao perfil, Favoritado e Compartilhado.
- [x] Ao expandir **Video de apresentacao** em `/psicologos`, **Busca e filtros** exibe os chips: Visualizacoes, Retencao, Tempo de permanencia, Taxa de replay, Acessos ao perfil, Favoritado e Compartilhado.
- [x] As metricas usam somente eventos first-party reais e mostram `Sem dados` quando a base temporal nao existe.
- [x] O filtro por plano do bloco continua filtrando as metricas do Video de apresentacao.
- [x] Comunidades e Perfil preservam seus expansivos e metricas existentes.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0385-medias-engajamento-video-apresentacao-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/utils/admin-psychologist-analytics.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke de API Admin real em `/api/admin/private/psychologists/dashboard?period=30d`, confirmando os 7 labels em `explore.platform_metrics` e `search_filters.platform_metrics`.
- Browser local com Chrome/CDP headless em `http://localhost:3002/psicologos`, desktop 1440x900 e mobile 390x900, expandindo **Video de apresentacao** e confirmando os 7 chips nas sublinhas.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
