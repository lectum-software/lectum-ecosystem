# ADR-0166: Header premium compacto no feed de comunidades

## Status

Accepted

## Task relacionada

Ajuste complementar em `TASK-23 - Feed de comunidade`, solicitado em 2026-06-25.

## Contexto

O feed agregado de comunidades precisava deixar de exibir busca em input permanente, seletor por chips em segunda linha e filtros como controles separados em uma hierarquia mais pesada. O pedido de produto foi transformar o header em uma única linha mobile-first no formato `[buscar] [selecionar comunidade] [configurações]`, mantendo os dados reais, o catálogo vigente e a navegação existente.

A referência visual auditável da task continua `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy não está exposto como ferramenta callable nesta sessão.

## Decisão

- Substituir os chips horizontais do header do feed por um seletor compacto de comunidade em dropdown.
- Manter a primeira opção do dropdown como `Todas as comunidades`, com ícone `Compass`, seta ao final do texto e navegação para `/app/community`.
- Manter as demais opções vindas de `COMMUNITY_FEED_CHIPS`, preservando slugs e rotas reais do catálogo ativo.
- Transformar busca e configurações em botões quadrados arredondados, com popovers leves, estados ativos e o mesmo tratamento visual de borda, superfície, sombra e foco.
- Manter o filtro de escopo (`Todas as comunidades` / `Comunidades que sigo`) no botão de configurações, sem alterar contrato de API nem ranking do feed.

## Consequências

- O header passa a ocupar uma única linha em mobile, reduzindo altura fixa e mantendo navegação por comunidades em um padrão mais premium da Lectum.
- A tela de exploração continua sendo o destino canônico para ver todas as comunidades, enquanto o feed agregado permanece em `/app/community/feed` e os filtros por comunidade continuam em `/app/community/[slug]`.
- Não houve mudança de backend, schema Prisma, migrations, packages, mocks ou dados persistidos.

## Validação

- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local com dev server existente:
  - `GET http://127.0.0.1:3000/app/community/feed` retornou `200`;
  - `GET http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio` retornou `200`.

## Pendências

- `git push` depende de credenciais GitHub/interatividade do ambiente, como já observado nas execuções anteriores.

## Atualizacao em 2026-06-25: header sem fundo proprio

O refinamento posterior removeu a superficie visual do wrapper do header do feed, conforme pedido de produto para que a linha `[buscar] [selecionar comunidade] [configuracoes]` se integre ao fundo da pagina como nas demais telas. A decisao foi:

- manter o comportamento `sticky`/auto-hide do header, padding e transicao;
- remover `bg-background` e borda inferior do container sticky para que ele seja transparente;
- remover fundo, borda, raio e sombra do wrapper que agrupava os tres controles;
- preservar sombras, bordas, superficies e estados dos controles internos, pois esses sao os elementos visiveis do header.

Nao houve mudanca de rotas, dados, backend, Prisma, packages ou contrato de API.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/logic.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/feed`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio`

## Atualizacao em 2026-06-26: seletor com copy curta e avatar

O placeholder do seletor central do header deixa de ser `Selecione uma comunidade` e passa a ser `Escolher comunidade`, evitando conflito semantico com a opcao `Todas as comunidades`, que continua sendo uma acao de navegacao para explorar comunidades.

Para reforcar identidade visual e reduzir a sensacao de campo generico, o catalogo local `COMMUNITY_FEED_CHIPS` agora inclui `iconUrl` dos assets publicos oficiais de cada comunidade. O seletor exibe o avatar da comunidade ativa; quando o feed esta no estado geral, usa um icone neutro de explorar. O dropdown preserva `Todas as comunidades ->` como primeira opcao e adiciona os avatares nas demais opcoes.

A tipografia do texto do seletor foi suavizada para `font-semibold` com tracking negativo discreto, mantendo a fonte global da Lectum e sem criar nova familia tipografica.

Nao houve mudanca de backend, schema Prisma, migrations, endpoints, ranking, rotas ou packages.

### Validacao desta atualizacao

- `pnpm --dir frontend exec biome check --write -- "src/app/app/community/[slug]/logic.tsx" "src/utils/community.ts"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/feed`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio`
