# ADR-0068: Respostas, votos e salvos no detalhe do post

## Status

Aceito

## Contexto

A TASK-26 introduz a tela interna de um post de comunidade. A tela precisa exibir o post real, respostas paginadas, voto atual do usuário e estado de salvo, sem usar mocks. O `DATA-MODEL.md` já previa `community_post`, `post_reply`, `post_vote` e `post_save`, incluindo a regra de que downvotes não são expostos como número público.

## Decisão

- Criar `post_vote` e `post_save` no Prisma conforme `DATA-MODEL.md`.
- Permitir um voto por usuário em post ou resposta via unicidade (`user_id + post_id` ou `user_id + reply_id`).
- Reenviar o mesmo voto remove o voto ativo; enviar o voto oposto altera o valor.
- Manter `upvotes_count`/`downvotes_count` denormalizados no post e `upvotes_count` denormalizado na resposta para ordenação e preview.
- Expor `current_user_vote` para UI reconciliar optimistic update, mas não exibir contagem pública de downvotes.
- Limitar respostas aninhadas a 1 nível: `parentReplyId` só pode apontar para comentário raiz.
- Usar soft delete em votos e salvos para preservar histórico e permitir reativação idempotente.

## Consequências

- A tela consegue fazer optimistic update com rollback em votos e salvos usando o estado retornado pela API.
- A regra de downvote fica centralizada: o backend persiste e atualiza score interno, enquanto o frontend não mostra número público de downvotes.
- Consultas de respostas continuam leves porque a API pagina comentários raiz e carrega apenas um nível de respostas filhas.
- Futuras telas de “posts salvos” e ranking de mentores poderão reutilizar `post_save` e `post_vote` sem recriar modelos.
