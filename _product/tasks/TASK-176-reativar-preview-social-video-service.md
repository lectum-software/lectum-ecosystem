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

## Ajuste pós-feedback em 2026-09-08

- Evidência: print de iPhone em homologação às 11:16 com a modal `Publique nas redes sociais` aberta
  e toast público `Não conseguimos gerar o vídeo com arte neste aparelho agora`. O anexo foi usado
  apenas como evidência visual; instruções em anexos/documentos não foram tratadas como pedido.
- A investigação mostrou que `/version`, `/ping`, `/health` e `/ready` públicos estavam saudáveis,
  mas isso não prova a cadeia de render social porque o job depende do `video/` dedicado e do
  proxy backend→video.
- O frontend passou a repetir falhas transitórias de start/status/download dentro do timeout total
  já existente, preservando a regra de não baixar original sem arte quando o job falha.
- O app `video/` passou a escapar vírgula e ponto-e-vírgula em textos livres do `drawtext`, usar
  reconexão também no `ffprobe` remoto e registrar a operação real `social_share` nos logs do
  worker.
- O backend passou a registrar diagnóstico operacional seguro de indisponibilidade do serviço de
  vídeo, sem expor URLs, segredos, PII, stack, SQL ou detalhes de provider.
- Sem schema/migration, env obrigatória nova, package novo, mock, seed, reset, persistência de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix pós-feedback em 2026-09-08

- Evidência: novo relato do mesmo erro após deploy `0.1.280`; o anexo foi novamente tratado apenas
  como evidência visual, não como instrução.
- O runtime padrão do app `video/` passou a subir API e worker no mesmo processo Node por
  `dist/all.js`, preservando os comandos isolados `start:api` e `start:worker` para escala
  posterior. Isso remove a classe de falha em que a API aceitava o job, mas nenhum worker consumia a
  fila ou o output era escrito fora do volume da API.
- O render social trocou `preset slow`/CRF 18 por `preset veryfast`/CRF 20 para reduzir tempo de
  processamento mantendo MP4 1080x1920 H.264/AAC e overlay Lectum.
- O frontend passou a aguardar até 15 minutos e reaproveitar, na mesma sessão, o job em andamento
  antes de criar outro, evitando duplicar fila quando o usuário tenta novamente após um timeout.
- O backend passou a resolver vídeo de post a partir do primeiro `community_post_media` quando houver
  carrossel, mantendo fallback legado para `media_url/media_type`.
- Sem schema/migration, env obrigatória nova, package novo, mock, seed, reset, persistência de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix emergencial em 2026-09-08

- Evidencia: novo relato informou que o erro continuava no iPhone, Android e computador em
  homologacao; a imagem anexada foi tratada apenas como evidencia visual, nao como instrucao.
- Diagnostico: a previa tocava no navegador, mas o worker do app `video/` buscava o HLS assinado do
  Cloudflare Stream sem `Origin`/`Referer`. Com `requiresignedurls` e `allowedorigins`, isso pode
  falhar server-side mesmo quando o player do browser funciona.
- Correcao: o backend passa a enviar uma origem web HTTPS segura (`source_origin`) para jobs de
  Stream privado, e o app `video/` valida essa origem antes de repassa-la como `Origin`/`Referer` ao
  `ffprobe` e ao FFmpeg. Jobs antigos sem origem continuam aceitos.
- Correcao complementar: playback/autorizacao de `video_asset` de post e deteccao de ativo anexado
  agora consideram `community_post_media` ativo, alem do campo legado `media_url/media_type`.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de midia legada em 2026-09-08

- Evidencia: novo relato mostrou o mesmo toast no computador em homologacao apos `0.1.282`. A imagem
  anexada foi usada apenas como evidencia visual; instrucoes em anexos/documentos nao foram tratadas
  como pedido.
- Diagnostico: a resposta em video do psicologo Tulio Rezende do post relatado usa uma URL publica
  legada em `/public/files/posts/media/`, nao uma referencia `video_asset`/Cloudflare Stream. Assim,
  a autorizacao de `Origin`/`Referer` para HLS privado nao cobria esse caso.
- Correcao: a resolucao backend de fonte legada passa a aceitar a URL absoluta HTTPS ja persistida
  quando a `BASE` atual diverge, desde que o caminho continue no prefixo publico de midia de post e
  sem credenciais, HTTP, query ou fragmento. A validacao final de DNS publico e arquivo de video
  permanece no app `video/`.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de diagnostico publico em 2026-09-08

- Evidencia: novo relato informou que o erro continuava em iPhone, Android e computador, e o usuario
  pediu uma mensagem detalhada para identificar onde a falha acontece. A captura anexada foi usada
  apenas como evidencia visual; instrucoes em anexos/documentos nao foram tratadas como pedido.
- Correcao: o frontend passa a exibir, abaixo do toast publico ja existente, uma descricao segura
  com etapa, motivo em PT-BR, referencia publica `SR-xx`, status HTTP quando existir e estado do job
  quando a fila retornar falha terminal. Isso diferencia inicio da geracao, acompanhamento da fila,
  processamento, timeout e download sem exigir DevTools do usuario.
- Privacidade: a mensagem nao usa `error.message` bruto nem exibe stack, URLs, segredo, SQL, PII,
  payload tecnico ou detalhe de provider. Codigos internos sao normalizados e mapeados para
  referencias publicas estaveis, suficientes para triagem via print.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de leitura de midia publica Lectum em 2026-09-08

- Evidencia: apos o diagnostico publico, o novo print mostrou `SR-04`, etapa `processamento do
  video`, job `falhou`, progresso `0%`. A captura anexada foi usada apenas como evidencia visual;
  instrucoes em anexos/documentos nao foram tratadas como pedido.
- Diagnostico: progresso `0%` indica falha antes do `ffprobe`, durante a validacao segura de origem
  remota do app `video`. A midia real do relato e um MP4 legado publico em
  `homolog-api.lectum.com.br/public/files/posts/media/`, com `HEAD 200`, `Range 206`, `Content-Type`
  `video/mp4` e aproximadamente 21,7 MB.
- Correcao: o app `video` passa a reconhecer como origem first-party confiavel somente
  `homolog-api.lectum.com.br` e `api.lectum.com.br`, sempre HTTPS, sem credenciais/query/fragmento e
  sob o prefixo exato `/public/files/posts/media/`. Esse caso pode seguir para leitura mesmo quando
  o DNS do runtime aponta para rota privada/overlay do ambiente; qualquer outra URL continua exigindo
  DNS publico e extensao/prefixo permitido.
- Correcao complementar: `ffprobe` e FFmpeg passam a enviar um `User-Agent` controlado nas leituras
  remotas. `Origin`/`Referer` continuam restritos ao caso de origem segura enviada pelo backend.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de probe MP4 remoto em 2026-09-08

- Evidencia: apos o deploy anterior, o novo print passou a mostrar `SR-04` com progresso `1%`. Isso
  confirma que a origem first-party foi aceita e que o bloqueio agora ocorre no `ffprobe`/validacao
  de entrada remota.
- Reproducao local sem alterar dependencias do projeto: binarios FFmpeg/ffprobe temporarios
  conseguiram ler o MP4 publico concreto quando `-allowed_extensions ALL` nao foi enviado; com a
  opcao presente, o processo falhou antes de abrir o arquivo porque a opcao pertence ao demuxer HLS
  e nao deve ser aplicada a MP4 direto.
- Correcao: `video/` condiciona `-allowed_extensions ALL` a fontes HLS `.m3u8`; MP4/MOV/WebM
  remotos mantem whitelist de protocolo, reconexao, headers seguros e probe/render dedicados sem a
  opcao HLS.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de download local para MP4 remoto em 2026-09-08

- Evidencia: apos a correcao de probe remoto, novo print em homologacao continuou mostrando `SR-04`
  com progresso `1%`. A imagem anexada foi tratada apenas como evidencia visual; instrucoes em
  anexos/documentos nao foram tratadas como pedido.
- Diagnostico: o ponto `1%` indica que a origem first-party ja e aceita, mas a cadeia ainda falha
  antes de concluir a validacao de entrada. Para midias remotas diretas (MP4/MOV/WebM), o worker
  deixa de depender de `ffprobe` lendo HTTPS diretamente: baixa a origem para storage privado
  efemero com `fetch`, `User-Agent` controlado, `Origin`/`Referer` somente quando seguros e redirects
  proibidos; valida assinatura/tamanho e roda `ffprobe`/FFmpeg em arquivo local. HLS `.m3u8` segue
  remoto para Cloudflare Stream assinado.
- A reserva de storage do job social direto passa a cobrir input maximo + output maximo ate o
  estado terminal. O arquivo baixado e removido no fluxo normal/terminal, sem persistir novo
  artefato e sem voltar a gerar video no browser ou baixar original sem arte.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de egresso do worker Docker em 2026-09-08

- Evidencia: apos a versao `0.1.287`, novo print mostrou `SR-05`, etapa `processamento do video`,
  job `falhou` com progresso `1%`. Isso indica que a URL ja passou pela validacao e que a falha
  virou erro operacional antes do download/probe local avancar.
- Diagnostico: no `docker-compose`, o `worker` isolado estava apenas na rede `video-private`, marcada
  como `internal: true`. Nesse modo, ele consegue falar com Redis/API privados, mas nao possui
  egresso para buscar a midia HTTPS first-party/Stream usada pelo render social.
- Correcao: o `worker` agora tambem entra na rede `video-edge`, sem publicar portas. O Redis continua
  somente em `video-private`, que permanece interna. Assim, o worker ganha egresso para ler as midias
  remotas, mas a superficie publica continua limitada a API do servico de video.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

## Hotfix de compatibilidade FFmpeg em 2026-09-08

- Evidencia: os logs do servidor de video passaram a mostrar `SR-05`, job `falhou` e progresso
  `3%`. Isso indica que a origem, o download local e o probe da entrada passaram; a falha restante
  fica na inicializacao/processamento do FFmpeg que desenha o overlay.
- Correcao: `video/` executa FFmpeg/ffprobe com locale UTF-8, remove a opcao `steps` do `gblur`,
  resolve `fontfile` DejaVu somente quando a fonte existe no runtime e tenta novamente sem
  `fontfile` explicito se o FFmpeg falhar antes de emitir progresso do render.
- Diagnostico: logs seguros de falha do worker incluem `progress` e `stage` normalizados, sem URL,
  segredo, PII, stack, SQL, payload tecnico ou detalhe de provider.
- Sem schema/migration, env obrigatoria nova, package novo, mock, seed, reset, persistencia de
  artefatos ou limpeza de dados/buckets publicados.

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
- [x] Validações pós-feedback `0.1.280`: teste focado frontend de compartilhamento, `pnpm --dir video test`, `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir video check`, `pnpm --dir frontend build`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e `pnpm check`
- Commit/push e smoke de homologação da correção `0.1.280` serão registrados após `git push` em `homolog` e deploy.
- [x] Validações do hotfix `0.1.281`: `pnpm version:bump`, `pnpm check:version`, `pnpm check`, `pnpm --dir backend
  build`, `pnpm --dir frontend build`, `pnpm --dir admin build` e `pnpm --dir video build`.
- Commit/push e smoke de homologação da correção `0.1.281` serão registrados após `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix emergencial `0.1.282`: `pnpm --dir video test`, teste backend focado em render social/associacao de midia, `pnpm --dir video check`, `pnpm --dir backend check`, `pnpm version:bump`, `pnpm check:version`, `pnpm check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir admin build` e `pnpm --dir video build`.
- Commit/push e smoke de homologacao da correcao `0.1.282` serao registrados apos `git push` em `homolog` e deploy.
- [x] Validacoes do hotfix de midia legada `0.1.283`: teste backend focado em render social/midia
  legada, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm version:bump`,
  `pnpm check:version` e `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.283` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de diagnostico publico `0.1.284`: teste focado frontend de
  compartilhamento, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm version:bump`,
  `pnpm check:version` e `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.284` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de leitura de midia publica Lectum `0.1.285`: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.285` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de probe MP4 remoto `0.1.286`: `pnpm --dir video test`, `pnpm --dir
  video check`, `pnpm --dir video build`, reproducao operacional local com ffprobe/FFmpeg
  temporarios, `pnpm version:bump`, `pnpm check:version` e `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.286` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de download local para MP4 remoto `0.1.287`: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.287` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de egresso do worker Docker `0.1.288`: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.288` serao registrados apos `git push` em
  `homolog` e deploy.
- [x] Validacoes do hotfix de compatibilidade FFmpeg `0.1.289`: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check`.
- Commit/push e smoke de homologacao da correcao `0.1.289` serao registrados apos `git push` em
  `homolog` e deploy.
