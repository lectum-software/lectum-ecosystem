# ADR-0358 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos

## Status

Accepted

## Contexto

Depois da introducao de categorias combinadas nos donuts de Visibilidade e Engajamento/Favoritos, o
dashboard Admin de psicologos mostrou regressao visual no browser local: donuts muito grandes e
matriz **Conversao x Engajamento** renderizada como blocos largos empilhados. A causa pratica era a
dependencia de utilitarios Tailwind arbitrarios para dimensoes e `grid-template-columns` em pontos
criticos da tela.

Como esses blocos sao analiticos e precisam permitir comparacao rapida, a UI nao pode ficar
dependente de uma classe arbitraria que, se nao for gerada ou interpretada, degrada a leitura da tela
inteira.

## Decisao

- Os donuts executivos compartilhados passam a usar atributos SVG explicitos (`width`/`height`),
  sem depender de `w-full` combinado com `max-w` arbitrario.
- A matriz desktop **Conversao x Engajamento** passa a declarar `gridTemplateColumns` via `style`
  inline React para garantir `132px repeat(4, minmax(0, 1fr))` mesmo quando utilitarios arbitrarios
  do Tailwind nao forem emitidos.
- Os cards, cabecalhos e labels da matriz foram compactados com alturas, paddings e textos menores,
  preservando legibilidade e clique para a lista filtrada.
- Nenhum dado, regra de classificacao, benchmark, contrato backend ou schema Prisma foi alterado.

## Consequencias

- O bloco superior volta a comportar os donuts dentro dos cards, mantendo a legenda expansivel das
  categorias combinadas.
- A matriz volta a apresentar uma grade 4x4 no desktop, com altura adequada para leitura executiva.
- O mobile-first permanece preservado porque a versao mobile continua usando secoes empilhadas por
  faixa de conversao.
- A correcao e apenas visual e nao afeta ranking publico, conversao, engajamento ou favoritos.
- Nao ha package novo, mock, endpoint paralelo, migration ou alteracao de banco.

## Task relacionada

- TASK-98 - Ajuste de tamanho dos graficos e matriz no dashboard Admin de psicologos.

## Validacoes

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a imagem local exportada do dashboard Admin e os screenshots
  fornecidos pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado em `/psicologos` validou os donuts contidos e a matriz desktop compacta
  por CDP, com screenshots em `.tmp/task98-auth-donuts.png` e `.tmp/task98-auth-matrix.png`.
- Admin temporario real `codex-task98-validation-1785377453@lectum.local` foi criado com
  `admin:bootstrap` apenas para validacao local e removido do banco ao final junto com seus tokens.
