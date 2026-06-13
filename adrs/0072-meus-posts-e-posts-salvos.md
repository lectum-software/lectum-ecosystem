# ADR-0072: Meus posts e posts salvos reais

## Status

Accepted

## Task relacionada

TASK-28

## Contexto

A TASK-28 exige as telas `/app/posts/mine` e `/app/posts/saved` usando posts reais das
comunidades, sem mock, e mantendo o mesmo modelo de interacao de `community_post` e `post_save`.
As imagens locais consultadas foram `_product/proto/Meus Posts - Paciente.jpg`,
`_product/proto/Meus Posts - Psicólogo.jpg` e `_product/proto/Posts Salvos.jpg`.
O Builder/Quick Copy ativo nao estava exposto como ferramenta callable neste ambiente, entao a
validacao visual usou as imagens exportadas em `_product/proto`.

## Decisao

Criar endpoints privados sob o namespace existente `/api/private/posts`:

- `GET /api/private/posts/mine`: lista conteudo do usuario autenticado, escopando posts por
  `community_post.author_id=req.auth.id` e respostas por `post_reply.author_id=req.auth.id`.
  O filtro `type=all|posts|replies` sustenta as abas do prototipo.
- `GET /api/private/posts/saved`: lista somente posts salvos ativos do usuario autenticado,
  escopando por `post_save.user_id=req.auth.id`, `post_save.deleted=false` e post publicado.
- `DELETE /api/private/posts/:id/save`: permanece como acao canonica para remover salvo.

As respostas usam paginacao no padrao real do backend (`data`, `page`, `pages`, `count`) e tambem
exponem aliases `items`, `total` e `limit` para compatibilizar o contrato textual da TASK-28 sem
quebrar o padrao usado nas demais listas.

No frontend:

- rotas novas em `frontend/src/app/app/posts/mine` e `frontend/src/app/app/posts/saved`;
- chamadas via `frontend/src/api/req/posts`, hooks em `frontend/src/api/callers/posts` e keys em
  `frontend/src/api/cache/keys.ts`;
- componente reutilizavel `CommunityPostCard` para manter a apresentacao de posts consistente com
  o feed;
- acesso pelas opcoes "Meus posts e respostas" e "Salvos" no menu de Comunidade da tela de Perfil;
- estados de loading, erro, vazio, sucesso e feedback de remocao dos salvos em PT-BR.

Nao houve alteracao de schema Prisma nem nova dependencia.

## Consequencias

- Meus Posts nunca retorna posts de outros usuarios.
- Posts Salvos nunca retorna salvos de outro usuario e permite remover o salvo real por soft delete.
- Posts proprios com status `pendente` ou `removido` aparecem em Meus Posts com selo de status,
  mas Posts Salvos mostra apenas posts publicados disponiveis.
- Respostas do usuario entram em Meus Posts para cumprir a variacao visual das abas "Todos",
  "Posts" e "Respostas", sem criar modelo novo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local Chrome headless em 390x844 para `/app/posts/mine` e `/app/posts/saved`: sem sessao
  persistida, ambas redirecionaram para login como esperado para rotas privadas, sem overflow
  horizontal (`documentElement.scrollWidth=390`, `body.scrollWidth=390`).
