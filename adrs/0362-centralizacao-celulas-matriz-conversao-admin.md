# ADR-0362 - Centralizacao dos blocos da matriz de conversao no Admin

## Status

Accepted

## Contexto

As matrizes de Conversao x Engajamentos/Favoritos e Conversao x Visibilidade possuem 16 colunas e
celulas compactas. Com conteudo alinhado a esquerda, a leitura visual ficava menos equilibrada e os
valores pareciam deslocados dentro dos blocos.

## Decisao

- Centralizar horizontal e verticalmente o conteudo das celulas da matriz no componente existente
  `ProfileConversionMatrixQuadrantCard`.
- Manter cabecalhos, labels de linhas, seletor, rolagem horizontal, dados reais e contratos sem
  alteracao.
- Preservar a versao mobile-first usando o mesmo componente centralizado para os cards empilhados.

## Consequencias

- A matriz fica visualmente mais uniforme em desktop e mobile.
- Nao ha impacto em calculo, API, ranking, filtros, Prisma ou packages.
- O componente continua simples e evita criar variacao paralela apenas para alinhamento.

## Task relacionada

- TASK-101A - Centralizacao dos textos nos blocos da matriz de conversao Admin.

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir admin check` foi executado e ficou bloqueado por alteracoes locais nao relacionadas em `admin/src/app/(admin)/dashboard/client.tsx` (`WhatsAppDistributionCard` nao usado e formatacao Biome), que nao fazem parte desta task.
- Browser local em `/psicologos` validou a centralizacao nas duas opcoes do seletor da matriz.

