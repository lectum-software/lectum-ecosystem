# ADR-0393 - Eixos independentes na matriz de cruzamento de dados Admin

## Status

Accepted

## Contexto

A matriz expansivel do bloco **Funil comportamental por conversao** tinha apenas um seletor de matriz pronta. Esse modelo atendia Conversao x Engajamentos/Favoritos e Conversao x Visibilidade, mas nao permitia cruzamentos independentes pedidos pelo usuario, como Engajamento x Atividade ou Conversao x Posts com video.

Como algumas combinacoes nao poderiam ser derivadas corretamente no frontend a partir dos agregados fechados existentes, qualquer solucao apenas visual esconderia falta de dados reais.

## Decisao

1. Criar no backend Admin o contrato agregado `profile_cross_matrix` para o dashboard de psicologos.
2. Tratar a matriz como par ordenado de eixos independentes (`row_axis_id` e `column_axis_id`), com categorias, quadrantes e percentuais calculados no backend.
3. Suportar inicialmente os eixos: Conversao, Atividade, Engajamento, Favoritados, Visibilidade comunidade, Visibilidade video de apresentacao, Retencao video de apresentacao e Posts com video.
4. Calcular todas as categorias apenas com fontes reais existentes: `contact_request`, `community_post`, `post_reply`, eventos de engajamento/favoritos, sessoes de atencao e sessoes reais de video.
5. Fazer o frontend Admin consumir o contrato agregado e expor dois selects nativos rotulados **Linha** e **Coluna**, impedindo que o mesmo eixo seja selecionado nos dois lados.

## Consequencias

- Novos cruzamentos podem ser adicionados ampliando a lista de eixos/categorias do contrato, sem criar uma matriz manual nova para cada UI.
- A leitura permanece observacional e agregada; nao cria ranking, punicao ou relacao causal.
- O frontend deixa de reconstruir cruzamentos a partir de matrizes fechadas e passa a renderizar o agregado retornado pela API.
- A resposta do dashboard fica maior: 8 eixos geram 56 matrizes ordenadas para os pares distintos.
- Nao houve mudanca de schema Prisma, migration, package ou tracking novo.

## Task relacionada

- `_product/tasks/TASK-129-eixos-independentes-matriz-cruzamento-dados-admin-psicologos.md`

## Validacoes

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px, validando API `profile_cross_matrix`, selects **Linha**/**Coluna**, combinacoes solicitadas e ausencia de overflow global.

## Pendencias

- Nenhuma pendencia externa.
