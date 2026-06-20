# ADR-0133: Navegação contextual de respostas salvas

## Status

Accepted

## Task relacionada

TASK-28 — ajuste pós-task em Salvos

## Contexto

A tela Salvos já mantinha a navegação correta para posts salvos, mas respostas salvas dependiam principalmente da ação de comentários e não transformavam o card em uma entrada contextual para o post original. Isso dificultava localizar a resposta dentro da árvore de comentários, especialmente quando a conversa estava recolhida.

A referência visual ativa continua sendo Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; como o MCP/Builder não está disponível como ferramenta direta nesta sessão, a validação visual usou a imagem local `_product/proto/Posts Salvos.jpg` e os componentes existentes.

## Decisão

- Respostas salvas passam a navegar para o post original com `focusReplyId` e hash `#reply-{id}`.
- O detalhe do post mantém o contrato de `focusReplyId`, sincroniza mudanças de URL na mesma rota e tenta localizar o comentário após a árvore renderizar.
- Árvores recolhidas com o comentário salvo como descendente deixam de esconder o alvo enquanto o foco está ativo, permitindo o scroll automático e o destaque temporário.
- O destaque visual usa a paleta azul suave existente (`primary-soft` e sombra azul sutil), sem criar novo token.
- Na tela Salvos, os textos clicáveis dos cards em desktop preservam a cor tipográfica padrão e removem aparência de link tradicional; a interatividade fica no cursor e nos hovers discretos já alinhados ao design system.

## Consequências

- A navegação de posts salvos permanece inalterada.
- Respostas salvas ganham reconhecimento contextual imediato no post original.
- A solução reaproveita o endpoint real de respostas com foco já existente, sem mocks, endpoint paralelo ou alteração de banco.
- Se uma resposta estiver em profundidade não hidratada pelo limite atual de árvore inline, a tela ainda dependerá da profundidade carregada pelo backend; não foi ampliado o limite de paginação nesta correção.

## Validação

- `pnpm --dir frontend exec biome check --write "src/app/app/posts/saved/logic.tsx" "src/app/app/community/[slug]/post/[id]/logic.tsx" "src/components/community/community-post-card.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `Invoke-WebRequest http://localhost:3000/app/posts/saved` retornou HTTP 200.

## Pendências

- Push remoto depende de credenciais GitHub disponíveis no ambiente.
