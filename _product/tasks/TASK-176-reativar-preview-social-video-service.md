# TASK-176 - Reativar prévia social de vídeos pelo serviço dedicado

## Status

Completed

## Contexto

A TASK-42 criou a experiência de compartilhamento social de vídeo-respostas com botão sobre o vídeo, modal de prévia e arquivo vertical para Instagram/TikTok. A TASK-164 removeu MediaBunny/Chromium do frontend e isolou processamento pesado no app `video/`, deixando a geração social temporariamente indisponível. Depois da remoção, o botão de Instagram deixou de aparecer sobre vídeos próprios do psicólogo.

## Objetivo

Reativar o botão de Instagram, a modal de prévia e o download do vídeo social 9:16 sem voltar a usar MediaBunny no browser, delegando toda geração pesada ao serviço dedicado `video/` com fila BullMQ/Redis e FFmpeg/ffprobe.

## Escopo

- Frontend:
  - Reexibir o botão de prévia social somente sobre vídeos próprios de psicólogos.
  - Abrir modal mobile-first com prévia vertical e ação de download.
  - Solicitar render server-side, acompanhar job e baixar o MP4 pronto.
  - Manter compartilhamento de link existente quando a ação não for download social.
- Backend:
  - Autorizar apenas psicólogo dono do post/resposta.
  - Resolver a origem real do vídeo em Cloudflare Stream assinado ou mídia legada pública permitida.
  - Fazer proxy privado para criação, status e download dos jobs no app `video/`.
  - Não criar nem renovar `post_share_artifacts`.
- Video:
  - Adicionar operação `social_share` ao contrato de jobs.
  - Validar URLs remotas HTTPS e DNS público antes do FFmpeg.
  - Renderizar MP4 1080x1920 H.264/AAC com overlay Lectum em alta qualidade.

## Fora de escopo

- Reinstalar MediaBunny, encoder AAC, Playwright, Chromium, WASM ou nova dependência.
- Alterar schema/migrations ou persistir novos artefatos R2.
- Fazer reset, seed, limpeza de bucket ou backfill de dados publicados.
- Rastrear app específico escolhido na folha nativa de compartilhamento.

## Critérios de aceite

- [x] O botão/ícone de Instagram aparece sobre vídeos de posts e respostas apenas para o psicólogo dono autenticado.
- [x] A modal de prévia social usa a referência visual da TASK-42 e permite baixar o vídeo personalizado.
- [x] O frontend não importa MediaBunny, Playwright, Chromium ou geração de vídeo no browser.
- [x] O backend valida owner-only e falha com mensagem pública quando o serviço de vídeo não está configurado ou a mídia é inválida.
- [x] O app `video/` processa `social_share` por fila dedicada, FFmpeg/ffprobe e arquivo efêmero com Range/download autenticado.
- [x] Nenhum schema/migration, seed ou reset é necessário.
- [x] Arquitetura, packages, modelo, README de tasks e ADR registram a decisão.
- [x] Validações obrigatórias de frontend, backend e video foram executadas.

## Dependências

- TASK-42 - Layout de compartilhamento social para vídeo-resposta.
- TASK-164 - Serviço isolado de processamento de vídeos.
- TASK-167 - Playback público seguro no Cloudflare Stream.
- TASK-173 - Upload de vídeos em posts e respostas.

## Referência visual

- Builder Quick Copy não estava disponível como ferramenta callable nesta sessão.
- Fallback usado: `_product/proto/Compartilhamento Lectum - video-resposta stories referencia.png`.

## Deploy

**ALERTA DE DEPLOY**: para habilitar a feature, configurar no backend:

1. `VIDEO_PROCESSING_SERVICE_URL` — URL privada ou HTTPS dedicado da API do app `video/`.
2. `VIDEO_SERVICE_API_KEY` — mesmo segredo configurado no app `video/`.
3. `VIDEO_PROCESSING_SERVICE_REQUEST_TIMEOUT_MS` — opcional; fallback seguro `5000`.

Ordem: configurar app `video/` e Redis/worker, depois backend em homologação, validar smoke e só então promover por PR revisado para produção. Se as envs do backend faltarem, o download social retorna indisponibilidade pública sem derrubar o app principal. Não usar HTTP público; quando o serviço de vídeo estiver em outro provedor, usar HTTPS server-to-server protegido pelo Bearer.

## Ajuste pós-feedback em 2026-09-05

- Evidência: em homologação, a modal social aparecia sobre o vídeo do psicólogo, mas o download
  falhava com indisponibilidade pública. A imagem anexada foi usada somente como evidência visual;
  instruções em anexos/documentos não foram tratadas como pedido.
- O backend deixou de exigir que `VIDEO_PROCESSING_SERVICE_URL` em runtime publicado seja apenas IP
  privado literal. Agora aceita DNS interno para HTTP privado e origem HTTPS dedicada para deployments
  em servidor/fila de vídeo isolados, mantendo rejeição de HTTP público, loopback, paths, query,
  credenciais, wildcards, caracteres de controle e redirects.
- O container do app `video/` passa a instalar fonte DejaVu e o filtro `drawtext` usa `fontfile`
  explícito, evitando falha de render em imagens slim sem fonte padrão.
- MediaBunny continua removido; a correção preserva o render 1080x1920 H.264/AAC de alta qualidade
  no worker dedicado, sem novo schema, migration, package npm, mock, seed, reset ou limpeza de dados.

## Validações

- [x] `pnpm --dir video check`
- [x] `pnpm --dir video build`
- [x] `pnpm --dir backend check`
- [x] `pnpm --dir backend build`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- [x] Smoke local HTTP do frontend (`/version` 200 em `0.1.277` e `/comunidades` 200)
- [x] Commit e push em `homolog`
- [x] Smoke de homologação após deploy da versão `0.1.277` (`/health`, `/ready`, `/ping` backend e `/version` frontend/admin)
- [x] Validações pós-feedback `0.1.279`: testes focados backend/video, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir video check`, `pnpm --dir video build`, `pnpm check`, `pnpm version:bump` e `pnpm check:version`
- Smoke de homologação da correção `0.1.279` será registrado após `git push` em `homolog`.
