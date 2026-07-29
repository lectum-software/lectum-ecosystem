# ADR-0342: Quadrantes de Intencao x Engajamento navegam para lista filtrada

## Status

Accepted

## Tasks relacionadas

TASK-60

## Contexto

O dashboard Admin de pacientes ja cruza **Intencao x Engajamento** em 16 celulas agregadas. O bloco equivalente de psicologos, **Demanda x Engajamento**, ja permite clicar em um quadrante e abrir a lista administrativa com o filtro composto aplicado.

O produto pediu o mesmo comportamento para pacientes: cada quadrante deve levar a `/pacientes/lista` mostrando apenas pacientes daquele cruzamento. A solucao precisava manter dados reais, evitar mocks/endpoints paralelos e preservar o layout mobile-first da matriz.

Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente. A execucao usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`, o comportamento existente de **Demanda x Engajamento** em `/psicologos` e a captura enviada pelo usuario.

## Decisao

- Tornar cada celula da matriz **Intencao x Engajamento** um link para `/pacientes/lista?intent_engagement=<quadrante>`.
- Usar como id canonico do filtro composto o mesmo formato de celula do dashboard: `<intent_id>_<engagement_id>`, por exemplo `objective_low_engagement`.
- Aceitar no backend somente os 16 cruzamentos canonicos entre:
  - `cold`, `curious`, `objective`, `very_qualified`;
  - `very_engaged`, `engaged`, `low_engagement`, `no_engagement`.
- Aplicar o filtro composto em `GET /api/admin/private/patients` depois de enriquecer os itens com as classificacoes reais de intencao e engajamento comunitario, evitando recalculo no cliente.
- Incluir `intent_engagement` no parser de URL, na chamada HTTP e na query key da lista Admin para impedir reutilizacao de cache entre filtros distintos.

## Consequencias

- O Admin pode sair de uma leitura agregada do dashboard para uma lista operacional filtrada por quadrante, com o mesmo padrao usado em psicologos.
- O filtro composto fica invisivel como controle de formulario por enquanto, mas permanece refletido na URL e na contagem de filtros ativos.
- A lista segue usando as fontes reais ja definidas: sinais de busca/contato para **Intencao** e acoes comunitarias para **Engajamento**.
- Nao houve alteracao de schema Prisma, migration, package novo, endpoint simulado, seed, mock ou backfill.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de servico local `listAdminPatients({ limit: 5, intent_engagement: "objective_low_engagement" })` retornou apenas itens do quadrante filtrado.
- Browser local/headless em 390px validou links `intent_engagement` na matriz e a lista filtrada com `1 filtro(s) ativo(s)` sem overflow horizontal.

## Pendencias

- Nenhuma pendencia externa.
