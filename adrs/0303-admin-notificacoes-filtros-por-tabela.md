# ADR-0303: Filtros vinculados às tabelas de Notificações Admin

## Status

Accepted

## Task relacionada

TASK-64, complemento de UX em 2026-07-21.

## Contexto

A tela Admin **Notificações** tinha filtros globais próximos ao topo da página. O usuário solicitou filtros separados para a tabela de **Campanhas manuais** e para os **Logs de notificações automáticas** com busca, público, canal, período e data.

Após a primeira interpretação, o usuário esclareceu que os filtros de **Período** e **Data** também devem estar vinculados ao mesmo bloco visual das tabelas, e não em um card/bloco separado.

## Decisão

- Cada tabela de Notificações passa a receber seu próprio bloco interno de filtros, renderizado dentro do card da tabela e antes da tabela/estado vazio.
- `CampaignsList` e `AutomaticLogs` recebem um `filtersSlot`, mantendo os cards responsáveis por agrupar cabeçalho, filtros, dados e paginação.
- Campanhas manuais e logs automáticos mantêm estado independente de filtros, período/data e paginação.
- Os filtros de período por tabela seguem o padrão Lectum de ADR-0302: `Hoje`, `Esta semana`, `Este mês`, `Este ano` e `Todo o período`, com `Personalizado` apenas como estado interno ao editar `De`/`Até`.
- O backend de logs automáticos passou a filtrar dados reais por `audience` e `q`; busca textual considera disparo, motivo de falha, chave da notificação e dados básicos do usuário.

## Consequências

- A tabela de campanhas pode ser filtrada sem alterar a paginação ou critérios dos logs automáticos, e vice-versa.
- A UI deixa claro que **Período** e **Data** pertencem ao contexto de cada tabela.
- Não foram adicionados mocks, packages, migrations ou novas estruturas paralelas de UI/API.
- A busca de logs automáticos deixa de depender apenas de período/canal e passa a usar filtros persistidos reais no banco.

## Validação

- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm --dir backend check` — OK.
- `pnpm --dir backend build` — OK.
- Smoke HTTP local em `/notificacoes` — OK.
