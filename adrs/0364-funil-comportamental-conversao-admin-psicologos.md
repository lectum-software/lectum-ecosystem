# ADR-0364 - Funil comportamental por conversao no Admin de psicologos

## Status

Accepted

## Contexto

As matrizes **Conversao x Engajamentos e Favoritos** e **Conversao x Visibilidade** do dashboard
Admin de psicologos ja cruzam dados reais em 16 colunas por quatro categorias de conversao. Elas sao
uteis para investigacao, mas a leitura executiva exige comparar duas matrizes largas para entender o
perfil predominante de uma categoria, como **Psicologos de alta conversao**.

O usuario solicitou uma ilustracao de funil que traduza esses cruzamentos em uma narrativa simples:
visibilidade no topo, engajamento/favoritos no meio e categoria de conversao na saida.

## Decisao

- Criar um bloco frontend-only **Funil comportamental por conversao** em `/psicologos`, logo abaixo
  dos donuts executivos e antes das matrizes.
- Reutilizar exclusivamente os contratos reais ja disponiveis no dashboard:
  - `profile_conversion_visibility` para o topo do funil;
  - `profile_conversion_engagement_favorites` para o meio;
  - `profile_conversion`/linhas das matrizes para a saida.
- Para cada categoria selecionada, escolher como padrao predominante a celula com maior `count` na
  linha correspondente; em empate, usar o maior percentual dentro da linha.
- Manter a leitura como observacional e explicitar no texto que o padrao nao prova causalidade.
- Reutilizar o filtro por plano local do dashboard sem criar endpoint, query key, package ou
  contrato backend novo.
- Tratar categorias vazias, base pequena e Dados Insuficientes com mensagem honesta.

## Consequencias

- O Admin passa a ter uma camada de insight mais rapida antes das matrizes detalhadas.
- As matrizes permanecem como fonte de auditoria e detalhe; o funil e apenas uma sintese visual das
  mesmas fontes.
- Nao ha mudanca de schema, migration, tracking, ranking publico, API ou algoritmo de classificacao.
- A escolha por predominancia simples pode esconder distribuicoes muito pulverizadas; por isso a UI
  mostra base e percentual dentro da categoria e alerta amostra pequena.

## Task relacionada

- TASK-103 - Funil comportamental por conversao no Admin de psicologos.

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`: OK.
- `pnpm --dir admin typecheck`: OK.
- `pnpm --dir admin check`: OK.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`: OK.
- Browser local autenticado validou `/psicologos` em desktop e mobile 390px com o dropdown do funil
  e as camadas **Topo do funil**, **Meio do funil** e **Saida observada**. Screenshots locais:
  `.tmp/task103-funnel-desktop.png` e `.tmp/task103-funnel-mobile.png`.

## Pendencias

- Nenhuma para esta versao. Drill-down por celula ou filtro composto na lista Admin fica fora do
  escopo.
