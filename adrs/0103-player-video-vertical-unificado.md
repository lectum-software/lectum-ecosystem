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

## Complemento 2026-06-16 - fullscreen mobile maximo para videos de conteudo

### Contexto

O fullscreen desktop dos videos verticais ja estava correto, mas no mobile os videos de conteudo em feed, comunidade e detalhe do post mantinham a proporcao 9:16 sem aproveitar toda a area util disponivel. O ajuste precisava ser exclusivamente mobile para nao regredir o comportamento desktop, controles nativos, timeline, volume, fullscreen nativo e clique de play/pause.

### Decisao

Adicionar ao `VerticalVideoPlayer` a variante `fullscreenVariant="content"`, usada somente nos videos de conteudo de comunidade/post. Quando essa variante esta ativa:

- o video recebe `data-lectum-content-video="true"` para escopo visual/auditoria;
- em telas ate `1023px`, eventos nativos de fullscreen (`fullscreenchange`, `webkitbeginfullscreen` e `webkitendfullscreen`) aplicam estilos temporarios inline ao proprio `<video>`;
- o tamanho expandido passa a ser calculado por viewport: largura `min(100vw, 100dvh * 9 / 16)` e altura `min(100dvh, 100vw * 16 / 9)`, com fallback para `100vh`;
- `object-fit: contain`, `object-position: center`, `aspect-ratio: 9 / 16`, fundo preto e centralizacao sao reforcados somente durante o fullscreen mobile;
- ao sair do fullscreen, todos os estilos anteriores sao restaurados.

A regra global de fullscreen desktop permanece intocada e continua responsavel pelo comportamento ja aprovado em telas maiores.

### Consequencias

- Feed, pagina interna de comunidade e detalhe do post passam a ocupar o maximo de area util no fullscreen mobile sem cortar, distorcer ou transformar videos verticais em horizontais.
- Desktop nao recebe novos handlers de tamanho porque a variante so aplica estilos quando `matchMedia("(max-width: 1023px)")` e verdadeira.
- Controles nativos permanecem prioritarios; a mudanca nao intercepta volume, timeline, fullscreen, menu nativo nem clique de play/pause.
- A solucao nao adiciona package, nao altera backend, Prisma, endpoints, dados ou contratos.

### Validacao

- `pnpm --dir frontend check`.
- Chrome/CDP mobile 390x844 em:
  - `/app/community/feed`;
  - `/app/community/ansiedade-em-equilibrio`;
  - `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`.
- Nas tres rotas, a simulacao do evento nativo de fullscreen mobile expandiu o video para 390x693px, proporcao 9:16, `object-fit: contain`, posicao centralizada, e restaurou o tamanho embutido ao sair.

## Complemento 2026-08-10 - proporção fixa em vídeos de respostas

### Contexto

No feed público da comunidade, vídeos exibidos dentro da resposta profissional em destaque podiam herdar a proporção real detectada no arquivo e aparecer em formato intermediário, como 3:4, em vez do frame vertical esperado para respostas. A referência visual ativa de comunidade mantém a resposta profissional com vídeo em frame vertical 9:16 e metadados discretos, sem contador textual de upvotes no cabeçalho do destaque.

### Decisão

Forçar `CommunityMediaBlock` a tratar vídeos com `variant="reply"` como mídia vertical canônica:

- orientação visual inicial e final `portrait`;
- frame e player sempre em `aspect-ratio: 9 / 16`;
- `object-fit: contain` para preservar vídeos horizontais ou arquivos com metadados divergentes sem corte agressivo;
- remoção do `aspectRatio` inline derivado do arquivo apenas para vídeos de resposta.

Os vídeos de posts continuam podendo usar a proporção real detectada, preservando o comportamento já aprovado para publicações originais. A metadata da resposta profissional destacada mantém apenas função e horário, deixando votos para a barra de ações da entidade correta.

### Consequências

- Respostas profissionais com vídeo permanecem no formato 9:16 em feed, comunidade, detalhe, salvos, minhas publicações e perfil público quando reutilizam `CommunityMediaBlock` com `variant="reply"`.
- Vídeos não verticais dentro de respostas aparecem com letterbox/fundo do player, sem distorção ou crop agressivo.
- A remoção do texto de upvotes reduz ruído visual e evita misturar métrica da resposta no cabeçalho do destaque.
- Não há alteração de backend, Prisma, endpoints, dados, envs ou dependências.

## Complemento 2026-08-12 - controles inline de video em cards de comunidade

### Contexto

A comparacao entre screenshots de iPhone e Android mostrou que os controles nativos do video ficam inconsistentes: no Android, minutagem, volume e fullscreen aparecem agrupados na parte inferior; no iPhone/Safari, volume e fullscreen sao reposicionados no topo do video quando o player usa controles nativos. Essa UI nativa nao e estilizada de forma confiavel por CSS.

### Decisao

Adicionar ao `VerticalVideoPlayer` um layout persistente `media` para videos de conteudo de comunidade. Esse layout desativa os controles nativos no card e renderiza controles proprios:

- botao central de play/pause;
- linha inferior com minutagem, volume e ampliar video;
- barra de progresso logo abaixo;
- acionamento de fullscreen pelo helper `requestVideoFullscreen`, com controles nativos temporarios somente durante a tela cheia.

O `CommunityMediaBlock` passa a usar `controlsVariant="persistent"` e `persistentControlsLayout="media"` para videos. O layout persistente anterior `stacked` permanece como padrao para nao alterar automaticamente os demais usos do componente.

### Consequencias

- iPhone e Android passam a ter a mesma hierarquia visual de controles no card de video de comunidade.
- A decisao evita depender da composicao nativa do Safari para a UI embutida.
- Fullscreen continua usando o caminho nativo/compatibilidade ja existente, minimizando regressao em iOS.
- Nao ha mudanca de backend, Prisma, endpoints, contratos, dados, envs, packages ou armazenamento.

### Validacao

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Validacao estatica via Node para confirmar o layout persistente `media`, a linha de controles com minutagem/volume/fullscreen e o helper de fullscreen.
- Browser local/headless mobile em 390x844 na rota do detalhe de post com video.
