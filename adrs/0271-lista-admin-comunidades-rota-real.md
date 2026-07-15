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
  - denúncias de `post_report` em posts/respostas da comunidade;
  - atividade como posts + comentários e última atividade por criação de comunidade/post/comentário.
- Manter busca, categoria, ordenação e paginação em URL/search params, seguindo o padrão da lista administrativa de psicólogos.
- Não alterar Prisma schema/migrations nem instalar pacotes.

## Consequências

- O submenu **Lista de Comunidades** agora navega para uma listagem real e paginada, em vez de uma âncora do dashboard.
- A lista é read-only e direciona a operação para o detalhe existente da comunidade; criação, edição em massa e exportação continuam fora do escopo.
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
