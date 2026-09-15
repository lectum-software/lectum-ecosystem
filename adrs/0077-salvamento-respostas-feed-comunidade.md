# ADR-0077: Salvamento de respostas e navegação contextual no feed da comunidade

## Status

Accepted

## Task relacionada

Ajuste pós-TASK-28 / feed da comunidade

## Contexto

O feed da comunidade já permitia votar e salvar posts, mas a resposta destacada do psicólogo ainda não tinha estado persistido de salvamento. Também havia ambiguidade de navegação: o usuário precisava conseguir abrir o post pelo conteúdo e pela resposta, sem quebrar ações internas como WhatsApp, salvar, votar ou abrir o perfil público do psicólogo.

## Decisão

- Criar a tabela `post_reply_saves` para persistir salvamentos de comentários/respostas independentemente de `post_saves`.
- Expor endpoints privados específicos para salvar/remover resposta: `POST /api/private/posts/:id/replies/:replyId/save` e `DELETE /api/private/posts/:id/replies/:replyId/save`.
- Incluir `saved` nos DTOs de `PostReply`, `PostProfessionalReply` e `CommunityProfessionalReply`.
- Atualizar `/api/private/posts/saved` para mesclar posts e respostas salvas em uma lista paginada, ordenada por data de salvamento.
- No feed, manter o nome do psicólogo como link isolado para `/app/psychologist/[id]`; a área textual da resposta abre o detalhe do post via link de overlay, evitando conflitos com controles internos.
- No detalhe do post, permitir salvar/remover qualquer resposta renderizada na árvore de comentários.

## Consequências

- O usuário passa a recuperar posts e respostas salvas após recarregar o feed ou a tela de salvos.
- A lista de salvos agora precisa tratar dois tipos de item (`post` e `reply`).
- Salvamentos de resposta não incrementam `saves_count` do post, mantendo o contador atual reservado a salvamentos do post original.
- A navegação do feed fica mais clara, mas elementos interativos internos precisam manter isolamento de eventos para não abrir o post por engano.

## Validação

- `pnpm --dir backend db:migrate -- --name add-post-reply-saves`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `GET http://localhost:3000/app/community/feed` retornou 200.
- Smoke local: `GET http://localhost:3000/app/posts/saved` retornou 200.

## Pendências

- Sem pendências técnicas para esta entrega.
