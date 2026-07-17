# ADR-0275: Opção Hoje nos filtros de período do Admin

## Status

Accepted

## Task relacionada

TASK-72

## Contexto

Os painéis administrativos de psicólogos e comunidades já usavam seletores de período com presets de semana, mês, ano, todo o período e período personalizado. O usuário pediu que esses seletores passassem a oferecer também a opção **Hoje**, sem alterar o default operacional para **Esta semana**.

## Decisão

- Adicionar o preset `today` nos contratos Admin de dashboard/estatísticas/publicações de psicólogos e nas estatísticas/conteúdo de comunidades.
- Renderizar **Hoje** como primeira opção dos seletores que já exibem `Esta semana`, `Este mês`, `Este ano` e `Todo o período`.
- Resolver `today` como intervalo de um dia, do início ao fim do dia local do servidor/frontend.
- Manter **Esta semana** como período inicial aplicado nos seletores afetados no Admin.
- Não criar endpoint novo, pacote novo, mock, seed ou alteração de schema.

## Consequências

- Admins podem consultar métricas do dia corrente sem usar período personalizado.
- O período anterior comparativo de `today` passa a ser o dia imediatamente anterior.
- A mudança preserva as fontes reais existentes e não altera persistência.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP local:
  - `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornou `200`.
  - `GET http://localhost:3002/psicologos` retornou `200`.
  - `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.

## Pendências

- Nenhuma.
