# ADR-0136: Barra de ações de posts e respostas

## Status

Accepted

## Task relacionada

Ajuste pós-task — comunidade, posts e comentários/respostas

## Contexto

As barras de ações de posts e respostas precisavam melhorar legibilidade e área de toque, principalmente no mobile, sem perder a separação visual entre ações de interação (`upvote`, `downvote`, `Responder`) e ações do conteúdo (`Salvar`, `Compartilhar`). No desktop, o espaçamento entre esses grupos estava amplo demais, fazendo a barra parecer espalhada em vez de um conjunto único.

A referência visual ativa segue sendo Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; como não há ferramenta Builder callable nesta sessão, foram consultadas as imagens locais `_product/proto/Feed Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`.

## Decisão

- Padronizar os ícones de interação e conteúdo nos componentes compartilhados da comunidade com tamanho visual entre 18px e 20px.
- Aumentar as áreas clicáveis dos botões de ação para 28px no tamanho `xs`, 36px no `sm` e 40px no `md`, preservando a aparência compacta.
- Manter no mobile o grupo `Salvar`/`Compartilhar` alinhado à direita com `ml-auto`, garantindo a separação visual solicitada.
- Aproximar no desktop o grupo `Salvar`/`Compartilhar` do grupo de interação removendo o afastamento automático a partir do breakpoint `sm`.
- Manter `Responder` como ação textual, elevando sua escala para 12px e `font-weight: 600` para equilibrar melhor com os ícones de 18px–20px.
- Preservar os componentes compartilhados (`CommunityActionBar`, `PostActionButton`, `VoteActionButton`) para que o ajuste alcance posts e todos os níveis da árvore de comentários/respostas.
- Manter ícones de menu de card em escala própria, ajustando o menu de respostas para 20px.
- Para comentários/respostas no detalhe do post, mover ações secundárias (`Salvar`, `Compartilhar`, `Denunciar`/`Excluir`) para um menu `...` na linha de ações, inspirado no padrão do Reddit.
- Manter `Responder` sempre visível na linha de ações e remover o truncamento em mobile, priorizando a ação principal até a última camada visual de respostas.
- Preservar a barra do post principal com `Salvar` e `Compartilhar` visíveis, pois há mais espaço e essas ações têm maior relevância no conteúdo principal.
- Permitir que slots finais secundários fiquem alinhados inline com o grupo principal quando necessário, sem `ml-auto`, mantendo o alinhamento à direita como comportamento padrão das barras de post.
- Simplificar os rótulos do menu de respostas para `Salvar`, `Compartilhar`, `Denunciar` e `Excluir`, removendo sufixos como `resposta` ou `comentário`.

## Consequências

- A barra fica mais tocável e consistente no mobile sem misturar as ações secundárias com as de interação.
- No desktop, as ações passam a formar um conjunto mais coeso e menos espalhado horizontalmente.
- Como o ajuste ocorre em componentes compartilhados, posts, comentários e respostas aninhadas herdam a mesma escala visual.
- Não há alteração de backend, Prisma, endpoints, packages ou persistência.

## Validação

- `pnpm --dir frontend exec biome check --write "src/components/community/community-action-bar.tsx" "src/components/community/post-action-button.tsx" "src/components/community/vote-action-button.tsx" "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `http://localhost:3000/app/community` retornou HTTP 200.
- Smoke local: `http://localhost:3000/app/posts/saved` retornou HTTP 200.
- Smoke local: `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` retornou HTTP 200.

## Pendências

- Push remoto depende de credenciais GitHub disponíveis no ambiente.
