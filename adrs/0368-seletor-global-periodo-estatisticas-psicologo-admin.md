# ADR-0368: Seletor global de periodo nas estatisticas do psicologo Admin

## Status

Accepted

## Task relacionada

TASK-105

## Contexto

A aba Estatisticas do detalhe administrativo do psicologo acumulava filtros de periodo por bloco. Isso
permitia analises com janelas divergentes na mesma tela e deixava o filtro do bloco principal preso ao
card **Conversao, visibilidade, engajamento e atividade**, apesar de o usuario querer aplicar a mesma
janela a todos os blocos.

## Decisao

Adotar um seletor global de periodo no topo da aba Estatisticas, antes do bloco principal, com a copy
"Selecione o periodo de analise.", e usar essa janela como fonte unica para as
queries dos blocos estatisticos do psicologo.

A implementacao permanece frontend-only e reaproveita o contrato existente de estatisticas. O seletor
de comunidade continua local ao bloco **Atividade e engajamento**, mas combina sua dimensao com o
periodo global em vez de manter outro filtro de datas.

## Consequencias

- A tela passa a ter uma janela temporal consistente entre conversao, visibilidade, engajamento,
  atividade, video, trafego, plataforma, horarios e comunidades.
- A carga operacional cai porque o administrador altera o periodo uma unica vez.
- Menos observers/queries duplicadas sao criados para a mesma janela de periodo.
- O filtro local de comunidade continua existindo sem confundir o usuario com outro seletor de datas.

Complemento 2026-07-30: o card global mantem a mesma fonte unica de periodo, mas usa copy auxiliar mais
curta, largura desktop menor para os tres filtros e resumo textual com meses abreviados em PT-BR
("Todo o periodo · 16 de mai. a 30 de jul." quando essas sao as datas reais da janela). As datas
continuam derivadas do contrato de estatisticas, evitando valor fixo ou mockado.
- Se uma futura analise exigir periodos diferentes por bloco, ela deve ser introduzida como modo
  avancado explicito, nao como comportamento padrao.

## Validacao

- `pnpm --dir admin exec biome check --write --files-ignore-unknown=true "src/app/(admin)/psicologos/[id]/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` retornou HTTP 200.
- Complemento 2026-07-30: `pnpm --dir admin exec biome check --write --files-ignore-unknown=true "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` - OK.
- Builder/Quick Copy nao estava callable no ambiente; foi usada a imagem local
  `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.

## Pendencias

- Nenhuma pendencia externa nova.
