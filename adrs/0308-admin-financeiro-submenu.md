# ADR-0308: Submenu de Financeiro no Admin

## Status

Accepted

## Task relacionada

Ajuste pós-feedback do Admin Financeiro, relacionado à TASK-46 e TASK-62.

## Contexto

O menu lateral do Admin já usa grupos expansíveis para áreas com mais de uma rota operacional, como Comunidades, Psicólogos e Pacientes. Depois dos ajustes da TASK-62, a área Financeiro passou a ter três rotas reais: visão geral, relação completa de cobranças e relação completa de assinaturas.

Manter **Financeiro** como item simples escondia as rotas `/financeiro/cobrancas` e `/financeiro/assinaturas`, obrigando o Admin a acessá-las apenas por links internos das tabelas.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual auditável usada foi `_product/proto/admin/Financeiro.png`, além da captura autenticada enviada pelo usuário em 2026-07-22.

## Decisão

Transformar **Financeiro** no menu lateral em um grupo expansível, reutilizando o padrão existente de `adminNavItems.children`, com as opções:

- **Visão geral** → `/financeiro`;
- **Cobranças** → `/financeiro/cobrancas`;
- **Assinaturas** → `/financeiro/assinaturas`.

A navegação permanece apenas no app `admin/`, sem alterar contratos HTTP, autenticação, backend, banco ou cálculos financeiros.

## Consequências

- O Admin passa a acessar diretamente as três telas financeiras reais pelo menu lateral.
- Rotas sob `/financeiro` continuam abrindo e destacando o grupo Financeiro como ativo.
- O comportamento mobile-first do drawer lateral é preservado porque o submenu usa o mesmo componente compartilhado do shell.
- Não há novo endpoint, schema Prisma, migration, package, mock, seed ou dado artificial.

## Validação

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/nav.ts"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/financeiro`, `/financeiro/cobrancas` e `/financeiro/assinaturas` retornaram `200`.
- Validação visual autenticada limitada à captura fornecida pelo usuário, ao protótipo local `_product/proto/admin/Financeiro.png` e ao build Admin; Builder/Quick Copy não está disponível como ferramenta callable neste ambiente.

## Pendências

- Nenhuma pendência externa para este ajuste.

