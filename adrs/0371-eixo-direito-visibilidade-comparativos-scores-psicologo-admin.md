# ADR-0371: Eixo direito de visibilidade e comparativos dos scores no psicologo Admin

## Status

Accepted

## Task relacionada

TASK-107

## Contexto

A TASK-106 converteu **Visibilidade** no detalhe administrativo do psicologo para duracao real em
segundos. No grafico principal da aba Estatisticas, essa serie temporal passou a conviver com contagens e
scores como WhatsApp, Engajamento, Atividade e Avaliacoes. Usar uma unica escala para essas unidades
mistura grandezas diferentes e torna a leitura da Visibilidade menos confiavel.

Além disso, **Engajamento (score)** e **Atividade (score)** sao contadores derivados no frontend a partir de
sinais reais retornados pela API. Por nao existirem como cards backend nativos, estavam sem comparativo,
enquanto os demais contadores do bloco ja exibiam a variacao contra o periodo anterior.

## Decisao

O grafico principal passa a tratar metricas `unit="seconds"` como serie de eixo direito. As demais metricas
permanecem no eixo esquerdo numerico. Cada path/ponto escolhe a escala por unidade, preservando a selecao
interativa existente e mantendo o overflow horizontal mobile-first.

Os comparativos de **Engajamento (score)** e **Atividade (score)** passam a ser derivados no frontend a
partir dos comparativos reais dos sinais de base ja retornados por
`GET /api/admin/private/psychologists/:id/statistics`:

- Engajamento: `upvotes * 2 + comments_received * 5 + shares * 8 + saves * 2 - downvotes * 3`, com piso `0`.
- Atividade: `posts + replies * 3`.

A variacao percentual segue a mesma regra do backend: se o periodo anterior e `0`, o resultado e `0%`
quando o atual tambem e `0`, e `sem base anterior` quando o atual e maior que `0`.

## Consequencias

- Visibilidade temporal deixa de competir visualmente com scores/contagens no eixo esquerdo.
- Quando Visibilidade e selecionada junto com outras metricas, a linha azul passa a ser interpretada pelo
  eixo direito com labels de duracao.
- Quando apenas Visibilidade esta selecionada, o grafico exibe somente o eixo direito temporal.
- Os cards **Engajamento (score)** e **Atividade (score)** ganham comparativo sem criar endpoint, mock,
  migration ou backfill.
- A decisao preserva os pesos vigentes dos scores e nao altera dashboards agregados.

## Validacao

- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 via `Invoke-WebRequest`; sem automacao autenticada para inspecionar o grafico renderizado, a
  validacao visual foi limitada ao build, ao screenshot enviado pelo usuario e a imagem local de proto.

## Pendencias

- Nenhuma pendencia externa.
