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

## Atualizacao 2026-06-22 - foco no comentario publicado

O fluxo de criacao de comentario/resposta passa a usar o proprio `id` retornado pelo backend como alvo de foco imediatamente apos a publicacao. Essa decisao evita depender de texto, posicao de pagina ou heuristica local, e mantem a experiencia alinhada aos links profundos ja usados para comentarios vindos de Salvos, Meus posts e notificacoes.

Decisao complementar:

- Extrair a rotina de foco/destaque de `focusReplyId` para um hook reutilizavel no detalhe do post e na tela de thread.
- Ao concluir `createPostReply`, definir o `reply.id` retornado como foco ativo e deixar a consulta paginada/de thread carregar a arvore necessaria.
- Preservar o destaque visual e acessivel atual: `tabindex` temporario, foco programatico, scroll centralizado e animacao `.lectum-reply-focus-pulse`.
- Aumentar a janela de tentativas para acomodar refetches apos criacao sem bloquear a UI.
- Nao alterar contratos HTTP, schema, regras de autoria, votos, salvos, moderacao, midia ou ordenacao.

Validacao adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile autenticado criou um comentario real via UI, confirmou o `article#reply-*` recem-criado como `document.activeElement`, com `lectum-reply-focus-pulse` ativo e visivel na viewport apos o scroll, e removeu o comentario pela API ao final da validacao.
