# ADR-0320: Presets relativos nos filtros de período do Admin

## Status

Accepted

## Task relacionada

TASK-76

## Contexto

O painel Admin já padronizava filtros de período com presets de calendário (`Hoje`, `Esta semana`, `Este mês`, `Este ano`, `Todo o período`) e intervalo manual via `custom`. O pedido complementar de 2026-07-25 exige que todos os filtros desse padrão também ofereçam janelas móveis de **Últimos 7 dias**, **Últimos 30 dias** e **Últimos 90 dias**.

A alteração afeta dashboards, detalhes, notificações, financeiro e gráficos operacionais do Admin. Não há requisito externo, pacote novo, alteração de banco, mock ou mudança de semântica de dados.

## Decisão

Adicionar os presets HTTP/estado `7d`, `30d` e `90d` aos contratos administrativos que já aceitam `today`, `week`, `month`, `year`, `all` e `custom`.

No backend, cada preset relativo resolve uma janela móvel inclusiva encerrada no dia atual:

- `7d`: hoje + 6 dias anteriores;
- `30d`: hoje + 29 dias anteriores;
- `90d`: hoje + 89 dias anteriores.

No frontend Admin, os selects que exibem `Esta semana`/`Este mês` passam a renderizar também os três novos labels. O estado `custom` continua reservado para digitação manual dos campos `De`/`Até`, sem voltar a aparecer como opção selecionável.

## Consequências

- Admins podem alternar entre período de calendário e janela móvel sem digitar datas.
- Contratos existentes permanecem compatíveis: presets antigos continuam válidos e `custom` mantém a mesma regra.
- As listas financeiras que recebem `period` por URL também passam a aceitar os novos valores para preservar navegação a partir do dashboard.
- O filtro local dos gráficos de moderação calcula as janelas no cliente porque a série já vem agregada no payload de resumo.

## Validação

- `pnpm --dir admin exec biome check --write ...` - OK.
- `pnpm --dir backend exec biome check --write ...` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- Smoke HTTP local no Admin: `/psicologos`, `/pacientes`, `/comunidades`, `/financeiro`, `/notificacoes`, `/moderacao` retornaram 200 em `http://localhost:3002`.
- Chrome headless local abriu `http://localhost:3002/psicologos` com DOM carregado.
- `pnpm check` - OK.

## Pendências

- Nenhuma pendência externa.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual ficou limitada a `_product/tasks/PROTO-INVENTORY.md` e aos protótipos locais em `_product/proto/admin`.
