# ADR-0310: Distribuição de formato de conteúdo no detalhe Admin do psicólogo

## Status

Accepted

## Task relacionada

Complemento da TASK-57.

## Contexto

O bloco **Comunidades ativas** do detalhe administrativo do psicólogo mostra atividade por comunidade, mas não mostrava a composição dos formatos dos conteúdos publicados pelo psicólogo no período. O produto solicitou dois blocos, um para **Posts** e outro para **Respostas**, entre **Comunidades ativas** e **Horários de maior atividade**, com quantidade e taxa de conteúdos **apenas texto**, **vídeo**, **imagem** e **carrossel de imagens**, em gráfico de pizza.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual usada foi o screenshot enviado pelo usuário em 2026-07-22 e o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.

## Decisão

- Reaproveitar o endpoint real `GET /api/admin/private/psychologists/:id/statistics`, sem criar endpoint paralelo.
- Adicionar `community.content_distribution` ao contrato de estatísticas, com `posts` e `replies`.
- Cada grupo retorna sempre as quatro categorias canônicas, com `count`, `percentage`, `id` e `label`.
- A regra de classificação V1 é determinística:
  - sem mídia persistida: **Apenas texto**;
  - qualquer mídia de vídeo: **Vídeo**;
  - uma mídia de imagem: **Imagem**;
  - duas ou mais mídias de imagem no post: **Carrossel de imagens**.
- Respostas usam os campos reais `post_reply.media_url`/`media_type`; como ainda não há tabela de múltiplas mídias para respostas, **Carrossel de imagens** permanece possível no contrato visual, mas tende a retornar `0` até existir suporte real.
- A UI usa SVG com segmentos reais, legenda textual e rótulo percentual, mantendo layout mobile-first: uma coluna em telas estreitas e duas colunas em desktop.

## Consequências

- O Admin passa a enxergar composição de formato sem abrir a aba **Publicações**.
- A leitura acompanha o mesmo período do bloco **Comunidades ativas**, preservando filtros independentes das demais seções.
- Não há migration, package novo, mock, seed ou dado estimado.
- A classificação prioriza vídeo quando houver mídia mista com vídeo; se o produto futuramente aceitar carrossel misto, a regra deve ser revisitada.

## Validação

- `pnpm --dir backend biome:check` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Chamada direta do service `showAdminPsychologistStatistics({ id: "cmrgztri7000tn0uh1q4n8vxf", period: "all" })` retornou `community.content_distribution.posts` e `community.content_distribution.replies` com as quatro categorias, contagens e percentuais reais.
- Browser local/headless via Chrome/CDP em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` confirmou em 1365px e 390px os dois gráficos de pizza, legendas **Apenas texto**, **Vídeo**, **Imagem** e **Carrossel de imagens**, e o posicionamento entre **Comunidades ativas** e **Horários de maior atividade**.

## Pendências

- Nenhuma dependência externa.
