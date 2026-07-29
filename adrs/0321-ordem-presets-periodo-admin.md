# ADR-0321: Ordem canônica dos presets de período do Admin

## Status

Accepted

## Task relacionada

TASK-76

## Contexto

Após a adição dos presets relativos de 7, 30 e 90 dias, os selects de período do Admin ficaram funcionais, mas alguns dropdowns exibiam as janelas móveis intercaladas entre presets de calendário. O pedido de 2026-07-25 exige uma ordem única para reduzir atrito visual e tornar previsível a navegação por teclado em todos os filtros de período do painel administrativo.

Alguns filtros especializados de denúncias/atividades já possuíam o recorte `Últimos 180 dias`, que não fez parte da nova lista solicitada, mas é uma opção real existente para auditoria operacional.

## Decisão

Adotar como ordem canônica dos presets de período do Admin:

1. `Hoje`
2. `Esta semana`
3. `Este mês`
4. `Este ano`
5. `Últimos 7 dias`
6. `Últimos 30 dias`
7. `Últimos 90 dias`
8. `Todo o período`

Nos filtros que já tinham `Últimos 180 dias`, manter essa opção como extensão especializada após `Últimos 90 dias` e antes de `Todo o período`. O valor `custom` permanece oculto e reservado a intervalos manuais.

## Consequências

- A experiência dos filtros fica consistente entre dashboards, detalhes, notificações, financeiro e moderação.
- Nenhum contrato backend, schema Prisma, query key ou package foi alterado.
- O recorte operacional de 180 dias continua disponível sem conflitar com a ordem padrão solicitada.
- Novos filtros de período do Admin devem reutilizar essa ordem visual.

## Validação

- `pnpm --dir admin exec biome check --write ...` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm --dir backend check` - OK após isolar alterações paralelas não relacionadas.
- Smoke HTTP local no Admin: `/psicologos`, `/pacientes`, `/comunidades`, `/financeiro`, `/notificacoes` e `/moderacao` retornaram 200 em `http://localhost:3002`.
- Chrome headless local abriu `http://localhost:3002/psicologos` e gerou screenshot de redirecionamento para login por ausência de sessão.

## Pendências

- Nenhuma pendência externa deste ajuste.
- `pnpm check` de raiz foi tentado, mas não concluiu de forma limpa no workspace porque alterações paralelas não relacionadas da TASK-84 reapareceram em arquivos backend de conversão do dashboard de psicólogos.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual ficou limitada a `_product/tasks/PROTO-INVENTORY.md`, protótipos locais e browser local.
