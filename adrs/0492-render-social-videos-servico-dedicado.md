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
- O worker renderiza 1080x1920 H.264/AAC com preset `slow`, CRF 18, áudio mínimo 192 kbps, `+faststart`, overlay Lectum e arquivo efêmero do job.
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
- Smoke de homologação pendente após push/deploy.
