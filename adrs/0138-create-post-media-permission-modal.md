# ADR 0138 - Permissão de mídia na modal de novo post

Status: Accepted

## Contexto

A modal de criação de post exibia apenas o botão "Mídia" para psicólogos, mas psicólogos no plano gratuito não tinham a mesma mensagem explicativa já usada no composer de comentários/respostas: "Mídia disponível apenas para psicólogos verificados com Plano Profissional ativo." Além disso, o backdrop da modal estava claro demais e se misturava com o card branco.

O Builder/Quick Copy não está acessível como ferramenta executável neste ambiente; a decisão visual foi baseada no screenshot fornecido pelo usuário, no inventário `_product/tasks/PROTO-INVENTORY.md` e nos componentes existentes de comunidade/post.

## Decisão

- Centralizar a regra visual de permissão de mídia em `frontend/src/utils/community-media-permission.ts` para evitar divergência entre comentários/respostas e criação de post.
- Reutilizar o mesmo texto de bloqueio para psicólogos sem Plano Profissional ativo.
- Manter o upload real de mídia em posts sem implementação nova, porque não há endpoint/storage final de post media nesta alteração; o botão permanece bloqueado quando a permissão de produto não existe.
- Trocar o ícone do botão de mídia da modal para `Paperclip`, alinhando-o ao padrão do composer de comentários/respostas.
- Escurecer o backdrop da modal interceptada para `bg-slate-950/35` com blur maior, criando separação visual mais clara entre fundo e card.

## Consequências

- A comunicação de entitlement de mídia fica consistente nos dois fluxos de comunidade.
- O botão de mídia para psicólogos gratuitos informa a restrição sem parecer uma ação disponível.
- A modal fica mais legível sobre telas claras.
- Quando o upload real de mídia para posts for implementado, o fluxo poderá reaproveitar a permissão compartilhada.

## Validação

- `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/new/logic.tsx" "src/app/app/community/[slug]/post/[id]/logic.tsx" "src/utils/community-media-permission.ts"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou 200.

## Atualização 2026-06-20 - Altura útil do editor

A área de conteúdo da modal de criação de post passou a preencher toda a coluna flexível disponível entre o título e o footer de ações. O wrapper do campo de conteúdo agora também é um flex container, permitindo que o textarea com `flex-1` ocupe a altura restante até a linha superior da barra de mídia/postar, em vez de ficar limitado pela altura intrínseca do campo.

Validação adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community/feed/post/new` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/new` retornou 200.
