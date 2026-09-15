# ADR 0155 - Midia nas respostas em Meus posts e respostas

Status: Accepted
Data: 2026-06-23

## Contexto

A tela `/app/posts/mine` lista posts e respostas/comentarios criados pelo usuario. As respostas ja podiam conter midia real no dominio e no endpoint `GET /api/private/posts/mine`, mas a aba de respostas renderizava apenas o texto. Isso fazia respostas com somente midia parecerem vazias ou incompletas.

## Decisao

Renderizar a midia de `reply.media_url`/`reply.media_type` diretamente no `ReplyItemCard`, reutilizando `CommunityMediaBlock` com variante `reply` para manter as mesmas regras de proporcao, video/imagem e acabamento visual da comunidade.

A midia exibida nessa tela nao recebe CTA de WhatsApp porque o conteudo pertence ao proprio usuario, mantendo a decisao anterior de ocultar WhatsApp em `Meus posts e respostas`.

## Consequencias

- Respostas com texto e midia, somente texto ou somente midia aparecem corretamente na aba de respostas/comentarios.
- Nao foi criado endpoint paralelo nem novo DTO; a tela usa os campos reais ja entregues pela API.
- Cliques em controles de midia nao disparam a navegacao do card, mas o restante do card continua abrindo o post original com foco na resposta.
- Sem alteracao de schema Prisma, migration, package ou storage.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
