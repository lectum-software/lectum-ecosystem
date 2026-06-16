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

## Complemento 2026-06-16 — fullscreen nativo consistente

### Contexto

A expansao de video ainda ficava inconsistente porque alguns `<video>` usavam `controlsList="nodownload nofullscreen"`, bloqueando o botao nativo de tela cheia, enquanto outros players customizados (`/app/psychologists` e cards de psicologos) renderizavam `controls={false}` sem uma chamada explicita para a Fullscreen API. O video de apresentacao do psicologo no perfil publico era um caso critico por herdar o bloqueio do player vertical compartilhado.

### Decisao

Centralizar a abertura em tela cheia no helper `requestVideoFullscreen` em `frontend/src/lib/video-fullscreen.ts`:

- tentar `webkitEnterFullscreen()` primeiro para compatibilidade com iOS/Safari;
- usar `HTMLVideoElement.requestFullscreen()` como caminho padrao em Chrome/Android/Desktop;
- habilitar controles temporariamente quando o player embutido usa controles customizados;
- aplicar temporariamente `object-fit: contain`, `object-position: center`, dimensoes de viewport e fundo preto durante a tela cheia;
- restaurar estilos e controles ao sair do fullscreen;
- remover `nofullscreen` de `controlsList`, mantendo apenas `nodownload`;
- manter o lightbox existente como fallback apenas quando a Fullscreen API nao abrir.

Os players customizados do feed principal de psicologos e do card de psicologo passam a chamar o mesmo helper para nao depender de controles nativos visiveis no layout embutido.

### Consequencias

- Videos do feed principal, feed de comunidades, comunidade interna, detalhe do post, respostas com midia e video de perfil do psicologo podem abrir em tela cheia.
- Videos verticais continuam verticais no fullscreen, sem conversao para horizontal, esticamento ou corte por `object-cover`.
- A solucao nao adiciona package, nao altera contratos de API e nao muda a estrutura visual dos cards/perfis fora dos controles de expansao.

## Complemento 2026-06-16 — player nativo sem expandir duplicado

### Contexto

A experiencia anterior ainda exibia um botao customizado de ampliar no canto superior direito dos videos renderizados pelo `VerticalVideoPlayer`. Isso duplicava a acao de fullscreen ja oferecida pelos controles nativos do player e adicionava poluicao visual em feed, comunidade, detalhe de post e perfil publico. Alem disso, cliques no elemento `<video controls>` podiam conflitar com o comportamento padrao do navegador, gerando duplo toggle entre play/pause.

### Decisao

Remover do `VerticalVideoPlayer` o lightbox proprio e o botao superior de ampliar. O componente passa a renderizar:

- o `<video>` com controles nativos quando `controls=true`, mantendo `controlsList="nodownload"`;
- uma camada transparente de clique apenas sobre a area de conteudo do video;
- a faixa inferior do player descoberta para que volume, timeline, velocidade, menu e fullscreen nativos tenham prioridade;
- toggle compartilhado `toggleVideoElementPlayback` para play/pause em cliques de conteudo;
- regras globais `video:fullscreen` e `video:-webkit-full-screen` com `object-fit: contain`, fundo preto e dimensoes de viewport.

No feed principal de psicologos, o clique/tap na area de video passa a decidir play/pause pelo estado real do `HTMLVideoElement` (`paused`/`ended`), nao por estado React potencialmente defasado apos autoplay. O botao de fullscreen do controle imersivo inferior permanece porque nao e o duplicado superior e usa o helper `requestVideoFullscreen` com `forceContain`.

### Consequencias

- Os pontos que usam `VerticalVideoPlayer` ficam sem botao de expandir duplicado no canto superior direito.
- Fullscreen nativo preserva videos verticais centralizados, com fundo preto, sem corte nem esticamento.
- Cliques no conteudo do video alternam play/pause, enquanto a barra inferior nativa continua dona das interacoes de controle.
- A mudanca e apenas frontend; nao adiciona package, nao altera Prisma, endpoints ou contratos.
