# ADR 0103 — Player ampliado vertical 9:16 unificado

## Status

Aceito

## Contexto

A Lectum exibe vídeos em múltiplas áreas: feed de comunidade, páginas internas de comunidade, detalhe de post, respostas profissionais, cards de posts salvos/meus posts, perfil público do psicólogo e pré-visualização do vídeo no setup profissional. Cada área vinha tratando ampliação/fullscreen de forma local, com CSS específico ou comportamento nativo do navegador, causando inconsistência entre mobile e desktop.

## Decisão

Criar um componente reutilizável `VerticalVideoPlayer`/`VerticalVideoLightbox` em `frontend/src/components/ui/vertical-video-player.tsx` para padronizar a visualização ampliada de vídeos verticais.

O componente define como base:

- `aspect-ratio: 9 / 16`;
- modal global via portal com `position: fixed` e `z-index` alto;
- vídeo centralizado na viewport;
- largura calculada a partir da altura disponível;
- `object-fit: contain` na visualização ampliada para preservar conteúdo;
- botão próprio de ampliar, evitando dependência do fullscreen nativo de cada tela.

Os vídeos embutidos continuam respeitando o contexto visual do card/post, mas a ampliação passa a usar o mesmo componente em todas as áreas migradas.

## Consequências

- Feed, comunidade, detalhe do post, respostas com vídeo e cards reutilizáveis passam a ter experiência consistente de ampliação.
- CSS local de fullscreen foi removido das telas de comunidade e detalhe de post.
- O comportamento fica mais previsível no desktop e no mobile.
- O componente pode ser reutilizado em novos pontos da plataforma que exibam vídeo vertical.
