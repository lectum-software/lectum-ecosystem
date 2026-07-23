# ADR-0311: Distribuição de posts e respostas por tipo de conteúdo em comunidades Admin

## Status

Accepted

## Task relacionada

TASK-51, TASK-71

## Contexto

O Admin já exibia **Cobertura de acolhimento** no dashboard geral de comunidades e na aba **Estatísticas** de cada comunidade. A operação pediu, logo após esse bloco, uma leitura de quantidade e taxa dos posts e das respostas por tipo de conteúdo: texto, vídeo, imagem e carrossel de imagens.

Os dados reais de formato vivem em `community_post.media_type`/`media_url` para posts legados, em `community_post_media` para posts com múltiplas mídias e em `post_reply.media_type`/`media_url` para respostas. Não há necessidade de migration, pacote de gráfico ou backfill.

## Decisão

- Expor nos contratos reais de comunidades `posts_by_content_format` e `replies_by_content_format`.
- Calcular posts no backend a partir de `community_post.media_type`, `community_post.media_url` e `community_post_media`.
- Calcular respostas no backend a partir de `post_reply.media_type` e `post_reply.media_url`.
- Classificar conteúdo publicado no período selecionado:
  - sem mídia publicada: `Apenas texto`;
  - qualquer mídia de vídeo: `Vídeo`;
  - uma imagem: `Imagem`;
  - duas ou mais imagens em posts: `Carrossel de imagens`.
- Em respostas, `Carrossel de imagens` permanece disponível no contrato com valor `0` enquanto `post_reply` suportar apenas uma mídia direta.
- Aplicar a mesma regra no dashboard geral `/comunidades` e no detalhe `/comunidades/[slug]?tab=estatisticas`.
- Renderizar posts e respostas como dois gráficos de pizza SVG com legenda textual contendo quantidade e percentual, sem pacote novo de charts.

## Consequências

- A operação passa a ver a composição real de posts e respostas no mesmo recorte temporal da cobertura.
- Conteúdos com vídeo e imagem são priorizados como `Vídeo`, preservando um formato primário por item.
- A leitura de carrossel de posts depende de `community_post_media` e não de inferência visual no frontend.
- O código mantém duplicação pontual dos componentes SVG nas duas telas de comunidades para não criar um design system paralelo nesta task.

## Validação

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/communities/dashboard/DTOs/IAdminCommunitiesDashboardDTO.ts" "src/modules/api/admin/private/communities/dashboard/repositories/AdminCommunitiesDashboardRepository.ts" "src/modules/api/admin/private/communities/dashboard/use-cases/services.ts" "src/modules/api/admin/private/communities/manage/DTOs/IAdminCommunityManageDTO.ts" "src/modules/api/admin/private/communities/manage/repositories/AdminCommunityManageRepository.ts" "src/modules/api/admin/private/communities/manage/use-cases/services.ts"`: sem erros.
- `pnpm --dir admin exec biome check "src/api/req/communities/index.ts" "src/app/(admin)/comunidades/client.tsx" "src/app/(admin)/comunidades/[slug]/client.tsx"`: sem erros.
- `pnpm --dir backend exec tsc --noEmit --pretty false`: sem erros.
- `pnpm --dir admin exec tsc --noEmit --pretty false`: sem erros.
- `pnpm --dir backend check`: sem erros.
- `pnpm --dir admin check`: sem erros.
- `pnpm --dir backend build`: sem erros.
- `pnpm --dir admin build`: sem erros.
- `pnpm check`: sem erros.
- Smoke real do dashboard `buildCommunitiesDashboard({ period: "all" })` retornou `posts_by_content_format` e `replies_by_content_format` com totais e percentuais por formato.
- Smoke API real autenticado em `GET /api/admin/private/communities/dashboard?period=all`: `posts_by_content_format.total=24` e `replies_by_content_format.total=80` no banco local.
- Smoke real de `showStatistics` para `perguntas-da-comunidade-layout?period=all`: `posts_by_content_format.total=7` e `replies_by_content_format.total=18` no banco local.
- Browser local/headless com Admin real temporário validou `/comunidades` e `/comunidades/perguntas-da-comunidade-layout?tab=estatisticas`, ambos com **Cobertura de acolhimento**, **Posts por tipo de conteúdo**, **Respostas por tipo de conteúdo**, 1 pizza de posts e 1 pizza de respostas.

## Pendências

- Nenhuma pendência externa.
