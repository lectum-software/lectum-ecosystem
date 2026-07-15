# ADR-0271: Lista administrativa real de comunidades

## Status

Accepted — 2026-07-15

## Contexto

O menu Admin de Comunidades passou a ter os submenus **Visão geral** e **Lista de Comunidades**, mas a lista ainda apontava para uma âncora do dashboard. A operação precisava de uma página própria, análoga à lista de psicólogos, para encontrar todas as comunidades cadastradas e abrir o detalhe administrativo real.

## Decisão

- Criar a rota estática do Admin `/comunidades/lista`, evitando colisão com o detalhe dinâmico `/comunidades/[slug]`.
- Reaproveitar o módulo existente `api/admin/private/communities/manage` e adicionar `GET /api/admin/private/communities`, protegido por auth Admin.
- Retornar dados reais de `community`, `community_member`, `community_post`, `post_reply` e `post_report`, sem mocks, seeds ou endpoint paralelo.
- Derivar métricas operacionais por comunidade no service:
  - membros ativos a partir de `community_member` real, com fallback seguro para `community.members_count`;
  - posts publicados de `community_post.status="publicado"`;
  - comentários de `post_reply` em posts publicados;
  - denúncias pendentes (`post_report.status="pendente"`) em posts/respostas da comunidade;
  - atividade como posts + comentários e última atividade por criação da comunidade, entrada de seguidores, posts publicados, comentários e denúncias.
- Manter busca, ordenação e paginação em URL/search params, seguindo o padrão da lista administrativa de psicólogos; o filtro visual de categoria foi removido em 2026-07-15.
- Não alterar Prisma schema/migrations nem instalar pacotes.

## Consequências

- O submenu **Lista de Comunidades** agora navega para uma listagem real e paginada, em vez de uma âncora do dashboard.
- A lista direciona a operação para o detalhe existente da comunidade e, a partir do ajuste de 2026-07-15, oferece criação individual real; edição em massa e exportação continuam fora do escopo.
- A agregação no service é suficiente para a V1 operacional; se o volume crescer, pode ser otimizada em task futura com agregações SQL/groupBy específicas.
- Builder/Quick Copy não esteve disponível como ferramenta callable no ambiente; a UI usou a referência local `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e o modelo já implementado de `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke service real: `listCommunities({ page: 1, limit: 2, sort: "name" })` retornou `status=200`, `count=7`, `items=2`.
- Smoke local: `GET http://localhost:3002/comunidades/lista` retornou `200`.
- Smoke de proteção: `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` sem token retornou `401`.

## Atualizacao 2026-07-15: refinamento visual da lista

A lista `/comunidades/lista` foi ajustada para priorizar leitura operacional direta: sem filtro/coluna de categoria, sem badges de legenda no cabecalho e com primeira coluna contendo apenas avatar e nome. O rótulo **Membros** passou a **Seguidores** somente na apresentacao, mantendo a fonte real `community_member`/`community.members_count`.

`last_activity_at` passou a representar a ultima atividade real conhecida da comunidade considerando criacao da comunidade, entrada de seguidores, posts publicados, comentarios e denuncias. Caminhos publicos de avatar retornados como `/public/files/...` sao resolvidos no Admin contra `NEXT_PUBLIC_API_URL`, mantendo `next/image` e evitando imagens quebradas quando o backend local roda em porta separada.

Validacoes adicionais do ajuste: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3102/comunidades/lista` = 200 e smoke sem token em `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` = 401.

## Atualizacao 2026-07-15: acoes e denuncias pendentes

A coluna **Ultima atividade** foi removida da lista; o contrato pode continuar retornando `last_activity_at`, mas a tabela/card nao exibem essa metrica. A coluna de denuncias passou a representar somente denuncias pendentes reais, com filtro `status="pendente"` no backend. A coluna **Acoes** adotou o mesmo padrao da lista de psicologos: link para detalhe administrativo e link externo para a comunidade publica em `/community/[slug]`.

Validacoes adicionais do ajuste de acoes/denuncias pendentes: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir admin build`, `pnpm --dir backend build`, `pnpm check`, smoke local `GET http://localhost:3102/comunidades/lista` = 200 e smoke sem token em `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` = 401.

## Atualizacao 2026-07-15: botao e fluxo real de criacao

O header de `/comunidades/lista` recebeu o botao **Criar nova comunidade**, apontando para a rota Admin real `/comunidades/nova`. Para evitar uma acao visual quebrada ou mockada, a rota cria comunidades via `POST /api/admin/private/communities`, protegido por auth Admin, usando o modelo `community` existente sem alterar Prisma schema/migrations.

A criacao aceita nome, slug opcional, categoria, descricao e cores visuais. Quando o slug nao e informado, o service gera um slug deterministico a partir do nome e rejeita conflito real com `community.slug`. Como o schema atual nao possui status/draft para comunidades, a comunidade criada fica disponivel no catalogo publico imediatamente; avatar e regras seguem editaveis no detalhe administrativo existente.

Validacoes adicionais do ajuste de criacao: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3102/comunidades/lista` = 200, `GET http://localhost:3102/comunidades/nova` = 200 e smoke sem token em `POST http://localhost:3001/api/admin/private/communities` = 401.
