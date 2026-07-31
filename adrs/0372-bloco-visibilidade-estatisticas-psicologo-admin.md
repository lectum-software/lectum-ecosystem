# ADR-0372: Bloco Visibilidade nas estatisticas do psicologo Admin

## Status

Accepted

## Task relacionada

TASK-108

## Contexto

A aba Estatisticas do detalhe administrativo do psicologo ja exibia um bloco **Conversao** com sinais de
contato, visibilidade, engajamento, atividade e avaliacoes. Depois da TASK-106/TASK-107, a visibilidade
passou a ser temporal, mas ainda estava resumida dentro do grafico principal.

O produto solicitou um bloco dedicado de **Visibilidade**, imediatamente abaixo de **Conversao**, com tres
superficies temporais (**Perfil**, **Video de apresentacao** e **Conteudo na comunidade**), grafico de
barras empilhadas e curva da soma, alem de contadores de visualizacoes/aberturas abaixo do grafico.

## Decisao

Estender o contrato existente de `GET /api/admin/private/psychologists/:id/statistics` com
`business.visibility`, em vez de criar novo endpoint. O contrato passa a retornar:

- `cards`: totais temporais por superficie, em segundos, com comparativo contra periodo anterior;
- `series`: pontos diarios/agregados por calendario com `profile_seconds`, `presentation_video_seconds`,
  `community_content_seconds` e `total_seconds`;
- `counters`: contadores reais para video de apresentacao, resultados de busca, aberturas do perfil e
  visualizacoes de conteudo;
- `source`: string tecnica com as tabelas/campos usados.

No Admin, o bloco **Visibilidade** reutiliza os tokens e padroes visuais existentes. As tres superficies
sao cards/toggles, o grafico empilha as barras por tempo e desenha a curva da soma com `buildSmoothSvgPath`.
Os contadores ficam abaixo do grafico em grid responsivo.

## Consequencias

- A leitura temporal de Visibilidade deixa de depender exclusivamente do grafico principal de Conversao.
- O backend continua centralizando o contrato da aba Estatisticas e evita endpoint paralelo.
- Nenhum package, schema Prisma, migration, seed ou mock foi introduzido.
- Os contadores usam apenas sinais persistidos existentes.
- Como a origem granular historica do video de apresentacao por superficie ainda nao e persistida, o contador
  **Video de apresentacao no explorar** usa as sessoes reais de `profile_video_watch_session` filtradas para
  o video atual do perfil. Uma separacao futura por origem exata exigira persistir essa origem no evento de
  watch antes de recalcular historico.

## Validacao

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 via `Invoke-WebRequest`; sem automacao autenticada para inspecionar o grafico renderizado, a
  validacao visual foi limitada ao build, ao screenshot enviado pelo usuario e a imagem local de proto.

## Pendencias

- Nenhuma pendencia externa bloqueante.
