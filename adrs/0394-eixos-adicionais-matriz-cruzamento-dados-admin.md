# ADR-0394: Eixos adicionais na matriz de cruzamento de dados Admin

## Status

Accepted

## Task relacionada

TASK-130

## Contexto

A matriz de cruzamento de dados do dashboard Admin de Psicólogos já possuía seletores independentes de **Linha** e **Coluna**. O produto precisava ampliar esse catálogo com dimensões mais acionáveis para comparar conversão contra atividade/engajamento de comunidade, formato de conteúdo, abertura de perfil, avaliações e posição do vídeo de apresentação.

## Decisão

- Manter o contrato agregado `profile_cross_matrix` como fonte única da matriz no endpoint Admin de psicólogos.
- Renomear os eixos existentes `Atividade` e `Engajamento` para `Atividade comunidade` e `Engajamento comunidade`, preservando os ids técnicos `activity` e `engagement`.
- Substituir o eixo técnico `community_video_posts` por `community_content_format`, rotulado como `Formato de conteúdo`.
- Classificar `Formato de conteúdo` por psicólogo de forma exclusiva e determinística, a partir de posts e respostas reais no período:
  1. posts com vídeo;
  2. respostas com vídeo;
  3. posts sem vídeo;
  4. respostas sem vídeo;
  5. sem conteúdo.
- Adicionar `Abertura de perfil` usando contagens reais de `profile_view_event.source=profile_page`.
- Adicionar `Avaliações` usando avaliações publicadas reais (`professional_review.status=publicada`).
- Adicionar `Posição vídeo de apresentação` usando a posição 1-based do helper compartilhado de ranking público dos psicólogos, agrupada em `Top 10`, `Top 30`, `Top 50` e `50+`.
- Não criar schema, migration, tracking ou package novo.

## Consequências

- O Admin passa a conseguir cruzar conversão com dimensões mais específicas sem depender de mock ou backfill.
- A categorização por percentis para abertura de perfil e avaliações acompanha a distribuição real do período selecionado.
- `Formato de conteúdo` é uma leitura predominante, não multisseleção; psicólogos com múltiplos formatos entram em uma única faixa por matriz.
- Psicólogos sem posição até 50 no ranking público aparecem como `50+`, incluindo ausência no ranking.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local com `.tmp/validate-task130.mjs`, validando:
  - 11 eixos e 110 matrizes;
  - novos rótulos nos seletores Linha/Coluna;
  - categorias de formato de conteúdo e posição do vídeo;
  - ausência do eixo técnico antigo `community_video_posts`;
  - ausência de overflow em desktop e mobile 390px.

## Pendências

- Nenhuma pendência externa.
