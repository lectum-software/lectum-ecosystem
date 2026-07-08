# ADR-0223: Destaque profissional apenas para resposta direta ao post

## Status

Accepted

## Task relacionada

Complemento da TASK-42 por pedido direto de produto em 2026-07-07.

## Contexto

O card de post pode exibir `highlighted_professional_reply` para sinalizar que a pergunta principal recebeu uma resposta profissional. A regra anterior selecionava a melhor resposta profissional verificada do post inteiro, inclusive respostas aninhadas a comentários.

Isso criava ambiguidade: uma vídeo-resposta feita para um comentário de terceiro podia aparecer como se estivesse respondendo o post original e, por consequência, o autor do post.

## Decisão

A prévia automática `highlighted_professional_reply` em cards/listagens passa a considerar somente respostas diretas ao post (`post_reply.parent_reply_id = null`).

A regra foi aplicada nos seletores de destaque do feed/comunidade, listas de posts e publicações do perfil profissional. Respostas aninhadas continuam existindo no detalhe/thread e podem ser exibidas quando o card representa explicitamente uma contribuição do tipo resposta.

## Consequências

- Vídeo-respostas a comentários de terceiros deixam de aparecer como destaque do post.
- O destaque do card volta a significar "resposta profissional à pergunta/post original".
- Respostas diretas continuam ranqueadas por score de votos, posição de mentor quando aplicável, preferência de vídeo em empate e recência.
- Não há alteração de schema, migration, endpoint, payload ou upload.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- `git diff --check`
