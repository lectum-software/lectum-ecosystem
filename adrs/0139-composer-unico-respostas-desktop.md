# ADR 0139 - Composer único de respostas no desktop

Status: Accepted

## Contexto

A árvore de comentários permitia abrir múltiplos editores inline de resposta ao mesmo tempo no desktop. Em conversas longas, isso aumentava a poluição visual e tornava a experiência imprevisível: abrir uma nova resposta não fechava a anterior e clicar fora do editor não encerrava o contexto ativo.

O Builder/Quick Copy não está acessível como ferramenta executável neste ambiente; a decisão foi baseada no comportamento solicitado pelo usuário e nos componentes atuais de comunidade.

## Decisão

- Manter apenas um editor inline de resposta aberto por vez no desktop.
- Ao acionar "Responder" em outro comentário, fechar o editor inline anterior antes de abrir o novo.
- Fechar o editor inline ao clicar fora da área do composer no desktop, preservando cliques dentro do próprio editor e no gatilho "Responder".
- Rastrear se o composer inline contém rascunho de texto ou mídia selecionada.
- Antes de descartar um rascunho, solicitar confirmação via mensagem nativa do navegador.
- Manter o comportamento mobile baseado no composer principal inferior, sem alterar a separação atual de resposta móvel.

## Consequências

- A discussão fica visualmente mais limpa no desktop.
- O usuário não consegue manter dois editores inline abertos simultaneamente.
- Rascunhos não são perdidos silenciosamente ao trocar de comentário, clicar fora ou cancelar.
- A solução duplica uma pequena coordenação de estado entre post completo e thread de respostas; se novos contextos de comentários surgirem, vale extrair o padrão para um hook compartilhado.

## Validação

- `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx" "src/components/community/community-action-bar.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video/thread/demo-post-reply-1` retornou 200.

## Pendências

- Push remoto pendente caso o ambiente continue sem credenciais GitHub.
