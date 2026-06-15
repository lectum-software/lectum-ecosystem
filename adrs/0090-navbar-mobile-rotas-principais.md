# ADR-0090: Navegação mobile restrita às telas principais

## Status

Aceita em 2026-06-14.

## Contexto

A Nav Bar mobile vinha usando seleção baseada em prefixos de rota, o que fazia telas internas herdarem estado ativo e continuarem exibindo a navegação principal. Isso deixava rotas como detalhe de post, criação de post e edição de perfil com aparência de tela principal.

Também havia um CTA central de criação no feed geral de comunidade ocupando a posição do item "Comunidade", impedindo que `/app/community/feed` exibisse o item ativo solicitado pela regra atual de navegação.

## Decisão

A Nav Bar mobile passa a usar correspondência explícita de rotas:

- `/app/psychologists` ativa Psicólogos;
- `/app/favorites` ativa Favoritos;
- `/app/community/feed` ativa Comunidade;
- `/app/notifications` ativa Notificações;
- `/app/profile` ativa Perfil.

Páginas principais de comunidade seguem visíveis na Nav Bar por padrão de forma controlada (`/app/community/[slug]` com apenas um segmento de slug e sem slugs reservados), mas não marcam nenhum item como ativo.

Rotas internas como `/app/community/[slug]/post/...`, `/app/community/feed/post/new`, `/app/profile/edit`, `/app/reviews` e demais subpáginas não renderizam a Nav Bar mobile pelo template.

O ícone mobile de Comunidade passa a usar o SVG fornecido pelo produto como asset em `frontend/public/svg`, aplicado via mask CSS para preservar os estados ativo/inativo por `currentColor` sem usar `<img>`.

Para liberar o item "Comunidade" no centro da Nav Bar do feed geral, o CTA de publicação do feed foi mantido como botão flutuante responsivo, alinhado ao padrão já usado nas páginas de comunidade.

## Consequências

- A seleção da Nav Bar mobile deixa de depender de prefixos amplos.
- Telas internas ficam mais focadas e sem navegação principal indevida.
- O feed geral passa a exibir o item Comunidade ativo na Nav Bar mobile.
- O botão de publicar continua disponível no feed geral fora da Nav Bar.
