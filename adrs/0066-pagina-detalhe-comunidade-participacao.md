# ADR-0066: Página de detalhe de comunidade com participação persistida

## Status

Accepted

## Task relacionada

TASK-25

## Contexto

A TASK-25 cria a rota canônica `/app/community/[slug]` para a página de detalhe de uma comunidade. Até a TASK-24, a rota dinâmica era usada como compatibilidade/filtro do feed global; o vínculo de comunidades seguidas ainda não existia, então o filtro `scope=following` devolvia um vazio honesto. O DATA-MODEL já previa `community_member` com `@@unique([community_id, user_id])` para seguir/participar de comunidades.

A referência visual obrigatória consultada foi `_product/proto/Dentro da Comunidade.jpg`. O Builder Quick Copy não esteve disponível como ferramenta MCP no ambiente desta execução; por isso a imagem local registrada em `PROTO-INVENTORY.md` foi usada como fonte visual auditável.

## Decisão

- Criar o modelo Prisma `community_member` com soft delete, relação com `community` e `user`, `@@unique([community_id, user_id])`, `@@index([user_id])` e índice por comunidade/deleted.
- Implementar `GET /api/private/community/:slug` para detalhe da comunidade com dados persistidos, `posts_count` real de posts publicados e participação do usuário autenticado.
- Implementar `POST /api/private/community/:slug/members` e `DELETE /api/private/community/:slug/members` para seguir/parar de seguir, reativando registros soft-deleted e atualizando `community.members_count` denormalizado.
- Atualizar o feed global para que `scope=following` use `community_member` real, sem inventar vínculo.
- Manter `GET /api/private/community/:slug/posts` como contrato único para posts por comunidade, filtrando `status="publicado"`.
- Separar a experiência de `/app/community/feed` (feed global) de `/app/community/[slug]` (detalhe da comunidade) no frontend, reutilizando o card de post já existente com variação sem cabeçalho de comunidade no contexto de detalhe.
- Como `DATA-MODEL.md` ainda não define campos persistidos de capa ou regras por comunidade, a tela usa uma capa visual derivada do nome/tema e uma seção de regras gerais da Lectum, sem criar schema não previsto.
- Manter as regras gerais da comunidade em um accordion recolhido por padrão no detalhe, com persistência visual apenas na sessão (`sessionStorage`) por `slug`, para reduzir a altura inicial sem alterar conteúdo nem criar persistência de domínio.

## Consequências

- O usuário passa a seguir comunidades de forma persistida, e o recorte “Comunidades que sigo” do feed deixa de ser um placeholder.
- A rota dinâmica de comunidade deixa de ser filtro do feed e passa a ser página de detalhe real; o feed global permanece em `/app/community/feed`.
- `members_count` continua denormalizado e pode exigir rotina futura de reconciliação caso dados sejam alterados fora dos endpoints.
- Capa e regras específicas por comunidade ficam como follow-up de modelagem, caso o produto exija conteúdo curado por comunidade.
- O bloco de regras deixa de consumir espaço vertical no primeiro carregamento da página, mas mantém acesso imediato por clique no cabeçalho e preserva a última preferência de expansão/retração durante a sessão do usuário.

## Validação

- `pnpm --dir backend db:migrate --name add_community_membership`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local HTTP: `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou 200.
- Validação local HTTP: `GET http://localhost:3000/app/community/feed` retornou 200.
- Atualização 2026-06-14: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `GET http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio` e `GET http://127.0.0.1:3000/app/community/feed`.

## Pendências

- Campos persistidos de capa/regras por comunidade não existem em `DATA-MODEL.md`; não foram inventados nesta task.
- Ranking Top Mentores permanece no escopo da TASK-27.

## Atualização 2026-06-14: topo limpo, ordenação de posts e auto-hide mobile

### Contexto

O detalhe de comunidade precisava reduzir atrito visual no topo e aproximar os posts do usuário. O `PageShell` aplicava padding superior padrão, criando respiro antes da faixa azul do cabeçalho. A área de posts também repetia título/subtítulo e botão de publicação, apesar de já existir CTA flutuante. Produto pediu ainda quatro modos de ordenação, com período apenas para rankings por comentários e votos, além de ocultar a bottom nav no mobile durante rolagem para baixo.

### Decisão

- Aplicar `!pt-0` no conteúdo do `PrivateTemplate` usado por `/app/community/[slug]`, removendo o espaço superior herdado do shell sem alterar outras telas.
- Remover o cabeçalho textual da lista de posts e o botão inline `+ Publicar`, mantendo o botão flutuante como ação principal.
- Substituir o menu de ordenação por `Em destaque`, `Novos`, `Mais comentados` e `Mais votados`, com `Novos` usando ícone de relógio.
- Adicionar dropdowns independentes de período somente nos estados ativos de `Mais comentados` e `Mais votados`: `Esta semana`, `Este mês`, `Este ano` e `Desde sempre`.
- Com os dados disponíveis atualmente (`created_at`, `replies_count` e `upvotes_count` agregados), o período prioriza posts criados dentro da janela escolhida e depois ordena pela métrica. Posts fora da janela continuam na lista para não quebrar paginação nem esconder dados persistidos.
- Ajustar `PrivateTemplate` para que `autoHideNavigation` controle apenas a bottom nav mobile; a navegação desktop continua visível mesmo quando a página registra scroll para baixo.

### Consequências

- A faixa azul do cabeçalho inicia no topo da área de conteúdo, sem margem/padding superior.
- A lista de posts fica mais direta e a publicação permanece centralizada no CTA flutuante.
- A ordenação ganha períodos por tipo sem criar novos endpoints ou alterar schema.
- A bottom nav mobile ganha animação de saída/entrada por scroll, enquanto desktop permanece estável.
- Nenhum backend, Prisma, migration, package ou contrato de API foi alterado.

### Validação

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/community/ansiedade-em-equilibrio` com cookie de sessão de desenvolvimento.
- HTTP 200 em `http://localhost:3000/app/community/feed` com cookie de sessão de desenvolvimento.
