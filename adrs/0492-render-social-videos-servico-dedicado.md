# ADR-0492: Render social de vídeos no serviço dedicado

## Status

Accepted

## Task relacionada

TASK-176 - Reativar prévia social de vídeos pelo serviço dedicado

## Contexto

A experiência da TASK-42 dependia de geração client-side para montar um vídeo vertical com arte Lectum. A TASK-164 removeu MediaBunny, encoder AAC, Playwright e Chromium para evitar custo/peso no frontend e para mover processamento pesado para uma aplicação `video/` isolada. Com isso, a geração social foi desativada e o botão de Instagram deixou de aparecer sobre vídeos próprios de psicólogos.

Agora existe um servidor dedicado para processamento de vídeo, com BullMQ/Redis, FFmpeg/ffprobe, volume próprio e workers separados do backend principal. A feature precisa voltar sem reintroduzir processamento pesado no browser nem persistir novos artefatos R2.

## Decisão

- Reativar o botão social somente para psicólogo autenticado dono do post/resposta com `media_type="video"`.
- Manter a modal de prévia no frontend, mas delegar o arquivo final para render server-side.
- Transformar as rotas `share-artifact/render-jobs` do backend em proxy privado para o app `video/`.
- O backend resolve a origem de vídeo a partir de `video_asset`/Cloudflare Stream assinado ou mídia legada pública do prefixo `posts/media/`, sem expor segredo ao frontend.
- O app `video/` passa a aceitar operação `social_share`, validando URL HTTPS, DNS público, container/duração e saída MP4.
- O worker renderiza 1080x1920 H.264/AAC com preset `veryfast`, CRF 20, áudio mínimo 192 kbps, `+faststart`, overlay Lectum e arquivo efêmero do job.
- O runtime do app `video/` empacota fonte DejaVu e o filtro `drawtext` usa `fontfile` explícito
  para evitar falhas em imagens slim sem fonte padrão.
- `post_share_artifacts` permanece legado: o fluxo novo não cria registro, não renova TTL e não envia arquivo do browser para storage.

## Alternativas consideradas

### Reinstalar MediaBunny no frontend

Rejeitada. Contraria a remoção da TASK-164, aumenta peso do bundle e volta a depender da capacidade do dispositivo/navegador para transcodificação e AAC.

### Renderizar dentro do backend principal

Rejeitada. O backend é plano de controle e não deve executar CPU-bound FFmpeg nem disputar recursos com autenticação, posts, pagamentos e notificações.

### Persistir o arquivo final em R2 para cache remoto

Rejeitada nesta etapa. O requisito é download owner-only sob demanda; persistência em `post_share_artifacts` adicionaria ciclo de TTL/limpeza e risco operacional sem necessidade imediata.

## Consequências

- A qualidade do vídeo social pode ser maior e estável por usar worker dedicado em vez de browser.
- O frontend passa a depender de `VIDEO_PROCESSING_SERVICE_URL` e `VIDEO_SERVICE_API_KEY` no backend para habilitar o download; sem essas envs, a UI recebe indisponibilidade pública e o app principal segue funcionando.
- O serviço `video/` precisa de worker/Redis saudáveis para concluir jobs; `/ready` continua sendo o smoke operacional.
- O download social não contabiliza `post_share` porque não há confirmação confiável de publicação em app externo; os compartilhamentos de link continuam usando a contagem existente.
- Rollback simples reverte o commit e remove a chamada backend→video; nenhum dado novo precisa ser contraído.

## Atualização em 2026-09-05

Após feedback de homologação com erro público na modal de download, a validação da URL
backend→`video/` foi ampliada: HTTP continua restrito a IP/DNS internos, mas HTTPS dedicado
server-to-server passa a ser aceito para deployments fora da rede privada. Redirects seguem
recusados e a URL permanece backend-only. O worker também passou a fixar a fonte DejaVu no
`drawtext`, tornando a geração do overlay determinística no container.

## Atualização em 2026-09-08

Novo feedback de homologação mostrou a modal social funcionando no iPhone, mas o CTA de download
seguindo para indisponibilidade pública. A decisão foi manter a arquitetura server-side dedicada e
endurecer os pontos frágeis, sem fallback para render/browser nem download do original sem arte:

- o frontend pode repetir, com backoff curto e dentro do prazo total já existente, chamadas
  transitórias de criação, consulta e download do job;
- `ffprobe` remoto usa as mesmas opções de reconexão do render FFmpeg;
- metadados livres usados no overlay escapam vírgula e ponto-e-vírgula, além dos caracteres já
  tratados, antes de entrar em `drawtext`;
- logs seguros distinguem indisponibilidade backend→`video/` e jobs `social_share`, sem registrar
  URL, segredo, PII, stack, SQL ou detalhe de provider.

Se o problema restante for operacional — por exemplo `VIDEO_PROCESSING_SERVICE_URL`/Bearer ausente,
`video/` não atualizado, worker/Redis indisponível ou falha específica de mídia — a UI continuará
mostrando mensagem pública genérica, mas os logs passam a indicar a classe segura do bloqueio.

## Atualização complementar em 2026-09-08

Novo relato indicou que a falha ainda ocorria depois da versão `0.1.280`. A decisão foi remover
duas dependências operacionais frágeis sem voltar processamento pesado para backend/frontend:

- `video/` agora tem runtime padrão `dist/all.js`, usado pelo Dockerfile e por `pnpm start`, que
  inicia API e worker no mesmo processo Node. Os comandos `start:api` e `start:worker` continuam
  existindo para escala separada, desde que o storage persistente seja compartilhado.
- O preset do render social passa a ser `veryfast` com CRF 20 para diminuir timeouts em aparelhos
  móveis e servidores pequenos, mantendo saída 1080x1920 H.264/AAC.
- O frontend amplia a janela de espera para 15 minutos e reaproveita o job em andamento em memória,
  evitando que cliques repetidos recriem a fila enquanto o primeiro render ainda está processando.
- Posts com mídia em `community_post_media` usam o primeiro item ordenado por `position` quando ele é
  vídeo; posts legados seguem usando `media_url/media_type`.

Essa mudança continua sem schema/migration, env nova, pacote novo ou persistência de artefato R2.

## Atualizacao emergencial em 2026-09-08

Novo feedback confirmou a mesma indisponibilidade no iPhone, Android e computador, indicando falha
server-side no caminho backend->`video/`->Cloudflare Stream, nao uma limitacao de aparelho. A decisao
foi preservar o fluxo privado e adicionar somente dados operacionais seguros:

- o backend envia ao app `video/` uma `source_origin` HTTPS derivada de `WEB_URL`/origens permitidas
  do Cloudflare Stream quando a midia e Stream assinada;
- o app `video/` valida essa origem, nunca aceita headers arbitrarios do cliente e injeta apenas
  `Origin` e `Referer` no `ffprobe`/FFmpeg para que manifestos/segmentos HLS privados respeitem
  `allowedorigins`;
- a autorizacao e a deteccao de associacao de `video_asset` de post passam a considerar
  `community_post_media`, alem do campo legado `community_post.media_url`.

A mudanca e aditiva e tolera rollout em versoes diferentes: backend novo conversa com `video/` antigo
porque o campo extra e ignorado, e `video/` novo aceita jobs antigos sem `sourceOrigin`.

## Atualizacao de midia legada em 2026-09-08

Novo relato em homologacao mostrou que o caso concreto restante era uma resposta em video com URL
publica legada em `/public/files/posts/media/`, nao uma referencia `video_asset`/HLS privado. A
decisao foi manter o render social no app `video/` e corrigir apenas a resolucao backend da fonte:

- quando `publicFileKeyFromUrl` nao reconhece a URL absoluta por divergencia entre o hostname
  persistido e a `BASE` atual, o backend ainda pode repassar a propria URL HTTPS persistida;
- a URL continua restrita ao prefixo publico de midia de post e sem credenciais, HTTP, query ou
  fragmento;
- o app `video/` permanece responsavel por validar DNS publico, caminho de video e probe antes de
  chamar FFmpeg.

Isso evita quebrar respostas reais publicadas antes de trocas de hostname/base, sem criar nova env,
schema, persistencia, mock ou fallback para baixar o original sem arte.

## Validação

- `pnpm --dir video check`
- `pnpm --dir video build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm version:bump`
- `pnpm check:version`
- Smoke local HTTP do frontend em `/version` e `/comunidades`.
- Atualização 2026-09-08: teste focado frontend de compartilhamento, `pnpm --dir video test`,
  `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir video check`,
  `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm --dir admin build`,
  `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e `pnpm check` em
  `0.1.280`.
- Atualização complementar 2026-09-08: `pnpm version:bump`, `pnpm check:version`, `pnpm check`,
  `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir admin build` e
  `pnpm --dir video build` em `0.1.281`.
- Smoke de homologação pendente após push/deploy.
- Atualizacao emergencial 2026-09-08: `pnpm --dir video test`, teste backend focado em render social/associacao de midia, `pnpm --dir video check`, `pnpm --dir backend check`, `pnpm version:bump`, `pnpm check:version`, `pnpm check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir admin build` e `pnpm --dir video build` em `0.1.282`.
- Atualizacao de midia legada 2026-09-08: teste backend focado em render social/midia legada,
  `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm version:bump`,
  `pnpm check:version` e `pnpm check` em `0.1.283`.
