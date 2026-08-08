# ADR-0419: Divisão modular de features complexas

## Status

Accepted

## Data

2026-08-08

## Contexto

A auditoria de produção identificou três arquivos que concentravam composição, estado, interface e
regra de negócio: o detalhe administrativo do psicólogo, o dashboard administrativo no backend e
a busca de psicólogos no frontend. Juntos, eles tinham mais de 25 mil linhas e elevavam o risco de
regressão em mudanças pequenas.

O usuário indicou expressamente `sample/backend` e `sample/frontend` como referência técnica de
qualidade, principalmente pela divisão e pelo uso dos módulos. Essa referência é histórica e não
autoriza copiar versões, mocks, contratos ou regras antigas para o produto atual.

## Decisão

1. `page.tsx`, `logic.tsx` e `client.tsx` são raízes de composição. Eles conectam hooks, dados e
   view, mas não acumulam toda a implementação da tela.
2. Telas complexas usam pastas locais `components`, `hooks`, `modules`, contexto e tipos conforme
   a responsabilidade. Hooks não importam a view e módulos puros não dependem de React.
3. No backend, `index.ts`, `controller.ts` e `services.ts` preservam a fachada pública. Cálculos,
   builders e agregações extensas ficam em módulos de domínio abaixo do caso de uso.
4. Os exports públicos dos três arquivos refatorados permanecem iguais. Não há mudança de rota,
   payload, schema Prisma, migration, env ou package.
5. O setup compartilhado da busca de psicólogos usa um contexto tipado. Dependências vindas desse
   contexto permanecem explícitas nos efeitos e callbacks para que Biome e ESLint continuem ativos,
   sem exceções locais.
6. O estado global do Socket.IO fica em `main/socket/state.ts`; ações da fila persistida ficam em
   `main/socket/db/actions.ts`. Assim, autenticação e socket deixam de importar um ao outro em ciclo.
7. `pnpm check:cycles` usa o parser TypeScript já instalado para falhar diante de novos ciclos de
   imports locais em backend, frontend e admin.
8. Raízes de composição novas têm teto de 600 linhas; demais fontes, 700. O baseline foi reduzido
   a zero, portanto nenhuma fonte pode voltar a ultrapassar esses limites.

## Consequências

- Alterações futuras podem atingir uma aba, hook ou cálculo sem reabrir arquivos de milhares de
  linhas.
- A divisão adiciona arquivos e imports, mas cada módulo passa a ter responsabilidade nomeável e
  dependência em uma única direção.
- A extração incremental eliminou o baseline legado sem trocar fachadas, rotas ou contratos.
- O check de ciclos considera imports de runtime; imports exclusivamente de tipos não criam falha.

## Compatibilidade, rollout e rollback

- Publicar primeiro na branch `homolog`, que dispara o ambiente de homologação.
- Não há ação manual, migration, backfill, credencial ou variável nova.
- Validar detalhe do psicólogo no admin, diretório de psicólogos no frontend e dashboard do admin.
- Em regressão, reverter este commit; banco e dados não precisam de rollback.
- Promover para `main` somente após builds e smoke de homologação.

## Validação

- Biome, ESLint e TypeScript dos três aplicativos.
- Testes automatizados do backend.
- Builds separados de backend, frontend e admin.
- `pnpm check:source-size` e `pnpm check:cycles`.
- Smoke local das rotas afetadas e smoke remoto após o deploy em homologação.
