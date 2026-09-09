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

## Atualizacao de diagnostico publico em 2026-09-08

Com novo relato de falha em iPhone, Android e computador, a decisao foi tornar o toast acionavel sem
abrir detalhes tecnicos ao publico. O frontend agora encapsula falhas do render server-side em um
diagnostico controlado e exibe somente:

- etapa da cadeia (`start`, `status`, `processing`, `timeout` ou `download`) traduzida em PT-BR;
- motivo mapeado em linguagem de produto;
- referencia publica `SR-xx` para triagem por print;
- status HTTP e estado/progresso do job quando esses campos ja existem no contrato.

Mensagens cruas, stack, URLs, secrets, SQL, PII, payloads tecnicos e nomes/detalhes de provider
continuam proibidos na UI. O mapeamento evita que a triagem dependa do DevTools do usuario e nao muda
o contrato backend/video, nao cria env, schema, pacote ou persistencia de artefato.

## Atualizacao de leitura de midia publica Lectum em 2026-09-08

O diagnostico publico do usuario retornou `SR-04`, etapa de processamento e progresso `0%`, o que
isolou a falha antes do `ffprobe`, na validacao segura de URL remota do app `video`. A midia concreta
era um MP4 legado publico em `homolog-api.lectum.com.br/public/files/posts/media/`, respondendo
`HEAD 200` e `Range 206`.

A decisao foi manter o render no app `video`, sem fallback para browser/original, e ajustar a
fronteira anti-SSRF:

- URLs remotas externas continuam exigindo HTTPS, caminho/extensao permitidos, ausencia de
  credenciais/query/fragmento e DNS publico.
- A unica excecao de DNS e first-party: `homolog-api.lectum.com.br` e `api.lectum.com.br` sob o
  prefixo exato `/public/files/posts/media/`. Esses hostnames sao controlados pela Lectum e podem
  resolver por rota privada/overlay no runtime publicado sem representar uma URL arbitraria interna.
- Query string passa a ser recusada para fontes remotas.
- `ffprobe` e FFmpeg passam a enviar `User-Agent` controlado em leituras remotas; `Origin` e
  `Referer` continuam condicionados a origem web segura enviada pelo backend.

## Atualizacao de probe MP4 remoto em 2026-09-08

Novo feedback trouxe `SR-04` com progresso `1%`, indicando que a URL first-party ja passou pela
fronteira anti-SSRF e que a falha restante ocorre no `ffprobe`/validacao da entrada remota. A
reproducao operacional local com binarios temporarios FFmpeg/ffprobe mostrou que o MP4 publico e
lido corretamente sem `-allowed_extensions ALL`, mas falha antes de abrir o arquivo quando essa
opcao de HLS e aplicada a um MP4 direto.

A decisao e condicionar `-allowed_extensions ALL` somente a URLs HLS `.m3u8`. MP4/MOV/WebM remotos
continuam sob whitelist de protocolo, URL segura, reconexao e headers controlados, mas sem a opcao
especifica do demuxer HLS. Isso preserva Stream privado assinado e destrava midias legadas publicas,
sem nova env, schema, pacote, persistencia ou fallback para baixar original sem arte.

Essa decisao preserva seguranca de SSRF para destinos externos, evita invalidar midias reais legadas
por topologia interna de deploy e nao cria env, schema, pacote, persistencia ou limpeza de dados.

## Atualizacao de download local para MP4 remoto em 2026-09-08

Depois da versao `0.1.286`, o feedback ainda mostrou `SR-04` com progresso `1%`. Como esse ponto
fica apos a validacao de URL e antes da entrada validada, a decisao foi retirar MP4/MOV/WebM direto
do caminho em que `ffprobe` precisa abrir HTTPS remoto. O app `video/` agora baixa midias remotas
diretas para storage privado efemero com `fetch`, `User-Agent` controlado, `Origin`/`Referer`
somente quando a origem segura ja foi validada e `redirect: "error"`. Depois valida tamanho,
assinatura de container e sonda/processa o arquivo local. HLS `.m3u8` permanece remoto para manter
Cloudflare Stream assinado e `-allowed_extensions ALL` restrito ao demuxer correto.

Para nao subestimar disco, jobs sociais com midia direta reservam input maximo + output maximo ate
o estado terminal; HLS continua reservando apenas output. O arquivo de input efemero e removido ao
concluir ou ao falhar sem retry. A mudanca nao cria env, schema, pacote, provider, persistencia de
artefato, mock, seed, reset ou limpeza de dados publicados.

## Atualizacao de egresso do worker Docker em 2026-09-08

Depois da versao `0.1.287`, o feedback mostrou `SR-05` com progresso `1%`. Isso confirma que o
worker deixou de classificar a origem como invalida, mas ainda falha operacionalmente antes de
baixar/provar a entrada.

A causa compativel com a topologia documentada era o `worker` isolado do `docker-compose` conectado
somente a `video-private`, rede marcada como `internal: true`. Essa rede e adequada para Redis, mas
impede egresso HTTPS necessario para buscar midias first-party/Stream no `social_share`.

A decisao e conectar o `worker` tambem a `video-edge`, sem publicar portas no servico. Redis
permanece exclusivamente em `video-private` e a superficie publica segue limitada a API do servico
de video. A mudanca nao cria env, schema, pacote, provider, persistencia de artefato, mock, seed,
reset ou limpeza de dados publicados.

## Atualizacao de compatibilidade FFmpeg em 2026-09-08

Novo feedback do servidor de video mostrou `SR-05` com progresso `3%`. Esse progresso ocorre depois
da validacao de URL, download local e `ffprobe` da entrada, portanto a decisao foi tratar o render
do overlay como ponto fraco de compatibilidade entre runtimes FFmpeg sem mudar a arquitetura:

- processos FFmpeg/ffprobe passam a usar locale `C.UTF-8`, preservando metadados de overlay com
  acentos e simbolos sem depender do locale `C` puro;
- o filtro de fundo remove `steps` de `gblur`, mantendo blur mas evitando opcao menos portavel em
  builds FFmpeg diferentes;
- o worker resolve caminhos DejaVu conhecidos no runtime e so envia `fontfile` quando a fonte
  existe; se uma tentativa com `fontfile` falhar antes de qualquer progresso do render, repete sem
  `fontfile` explicito para permitir fallback do FFmpeg/fontconfig;
- logs seguros de falha do worker passam a incluir `progress` e `stage` normalizados, sem stack,
  URL, segredo, PII, SQL, payload tecnico ou detalhe de provider.

A mudanca permanece video-only, sem env nova, schema, pacote, provider, persistencia de artefato,
mock, seed, reset ou limpeza de dados publicados.

## Atualizacao de diagnostico FFmpeg em 2026-09-08

Depois da versao `0.1.289`, os logs do worker confirmaram `stage=render_initialization` e
`progress=3` em todas as tentativas. A decisao foi preservar mensagens publicas seguras e ampliar a
observabilidade backend-only com codigos controlados:

- `runManagedProcess` mantem somente a cauda do stderr em memoria e nunca grava stderr bruto em log;
- falhas conhecidas sao classificadas em `diagnostic_code` como
  `ffmpeg_filter_drawtext_unavailable`, `ffmpeg_encoder_h264_unavailable`,
  `ffmpeg_encoder_aac_unavailable`, `ffmpeg_font_unavailable`, `process_output_no_space`,
  `process_permission_denied` ou `process_failed`;
- o worker registra um evento `video_job_processing_diagnostic` por tentativa, contendo somente
  job opaco, operacao, etapa, progresso, tentativa, decisao de retry e codigo diagnostico;
- `/ready` do app `video/` passa a validar capacidades minimas do render social (`drawtext`,
  `scale`, `overlay`, `drawbox`, `libx264` e `aac`) alem de Redis, storage, worker e existencia dos
  binarios;
- o render social remove a dependencia de `gblur`, pois blur de fundo e detalhe visual secundario e
  nao deve impedir o download com overlay Lectum quando o build FFmpeg nao empacota esse filtro.

Essa decisao nao altera contrato publico, nao cria env, schema, pacote, provider, persistencia de
artefato, mock, seed, reset ou limpeza de dados publicados. Logs continuam proibidos de conter URL,
segredo, PII, stack, SQL, stderr bruto, payload tecnico ou detalhe de provider.

## Atualizacao de filtergraph portatil em 2026-09-08

Depois do deploy `0.1.290`, os logs seguros do worker passaram a mostrar
`diagnostic_code="ffmpeg_filter_unavailable"`, `stage="render_initialization"` e `progress=3` em
jobs `social_share`. Como a cadeia ja havia passado por validacao de URL, download local e
`ffprobe`, a decisao foi corrigir o proprio `filter_complex` e diminuir a dependencia de filtros
secundarios do runtime FFmpeg:

- a cadeia do overlay nao cria mais um filtro vazio entre o label `[v0]` e o primeiro `drawbox`;
- `eq`, `fps`, `format` e `setsar` deixam de fazer parte do filtergraph social; FPS agora e opcao
  de saida `-r`, e o pixel format continua controlado por `-pix_fmt yuv420p`;
- quando o grafo padrao falha antes de emitir progresso, o worker tenta uma variante portatil
  `scale+pad+drawbox+drawtext`, sem `crop`, `overlay`, `eq`, `fps`, `format`, `setsar` ou `gblur`;
- `No such filter` passa a ser normalizado para codigos allowlist de filtro especifico quando o
  stderr informa o nome, e `No such filter: ''` vira `ffmpeg_filtergraph_invalid`.

A decisao continua video-only e nao cria env, schema, pacote, provider, persistencia de artefato,
mock, seed, reset ou limpeza de dados publicados. Logs e UI permanecem sem stderr bruto, URL,
segredo, PII, stack, SQL ou payload tecnico.

## Atualizacao de UX/download e arte Reels em 2026-09-09

Novo feedback do usuario trouxe duas evidencias distintas: a tela intermediaria de arquivo MP4 no
Quick Look do iPhone apos o download e uma referencia visual Reels para a arte. A decisao foi
preservar a geracao server-side dedicada, mas separar preparo e salvamento/compartilhamento:

- ao abrir a modal social, o MP4 social começa a ser preparado no backend/video e a modal permanece aberta;
- enquanto o job esta em preparo, o frontend solicita Wake Lock `screen` de forma best-effort para
  reduzir a chance de o celular apagar;
- quando o arquivo fica pronto, a modal troca a simulacao pelo proprio `File` gerado por
  `URL.createObjectURL`; assim, a previa exibida e exatamente o artefato que sera baixado;
- em mobile/iPad com Web Share de arquivo, o segundo toque usa a folha nativa sob ativacao de usuario
  e evita o fallback de navegar para o blob/MP4, que abria a tela intermediaria do sistema;
- desktop sem Web Share continua usando download por objeto local, sem upload para storage nem
  persistencia nova.

A arte do worker tambem foi alinhada ao contrato visual solicitado: video 9:16 em tela cheia,
cartao superior azul/branco, pergunta centralizada, nome/cargo centralizados e selo verificado. O
rotulo e `Postado na Lectum` para posts e `Respondido na Lectum` para respostas; o valor legado
`Perguntaram na Lectum` e normalizado no worker para tolerar rollout entre apps. O grafo padrao
remove moldura de celular, watermark textual e filtros secundarios (`overlay`, `eq`, `fps`,
`format`, `setsar`, `gblur`), ficando em `scale+crop+drawbox+drawtext`; a variante portatil
`scale+pad+drawbox+drawtext` permanece como fallback.

A mudanca nao adiciona env, schema, pacote, provider, persistencia de artefato, mock, seed, reset ou
limpeza de dados publicados. As mensagens publicas seguem sem stderr bruto, URL, segredo, PII,
stack, SQL, payload tecnico ou detalhe de provider.

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
- Atualizacao de diagnostico publico 2026-09-08: teste focado frontend de compartilhamento,
  `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm version:bump`,
  `pnpm check:version` e `pnpm check` em `0.1.284`.
- Atualizacao de leitura de midia publica Lectum 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.285`.
- Atualizacao de probe MP4 remoto 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.286`.
- Atualizacao de download local para MP4 remoto 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.287`.
- Atualizacao de egresso do worker Docker 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.288`.
- Atualizacao de compatibilidade FFmpeg 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.289`.
- Atualizacao de diagnostico FFmpeg 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.290`.
- Atualizacao de filtergraph portatil 2026-09-08: `pnpm --dir video test`,
  `pnpm --dir video check`, `pnpm --dir video build`, `pnpm version:bump`, `pnpm check:version` e
  `pnpm check` em `0.1.291`.
- Atualizacao de UX/download e arte Reels 2026-09-09: teste focado frontend de compartilhamento,
  `pnpm --dir video test`, teste backend focado em render social, `pnpm --dir frontend check`,
  `pnpm --dir backend check`, `pnpm --dir video check`, `pnpm --dir frontend build`,
  `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm --dir video build`, smoke local HTTP
  do frontend, `pnpm check`, `pnpm version:bump` e `pnpm check:version` em `0.1.292`.

## Atualizacao de previa instantanea em 2026-09-09

Depois do deploy `0.1.292`, o usuario validou que a modal ficava com placeholder enquanto aguardava
render server-side e pediu que a previa carregasse imediatamente. A decisao de UX foi separar bytes e
layout:

- a previa volta a usar o video original (`target.mediaUrl`) e o poster real, carregados pelo player
  existente assim que a modal abre;
- a arte social e desenhada por CSS sobre a previa com as mesmas coordenadas relativas do render
  FFmpeg: cartao superior, label `Postado na Lectum`/`Respondido na Lectum`, texto, nome/cargo e
  selo verificado;
- o MP4 final continua sendo gerado exclusivamente pelo app `video/`; a garantia da modal passa a ser
  layout equivalente, nao o mesmo arquivo binario;
- o toast de preparo adota a frase curta `Mantenha esta tela aberta enquanto o vídeo é preparado.`,
  sem prometer diretamente a disponibilidade de Wake Lock; o lock segue tentativa best-effort.

A mudanca e frontend-only e nao cria env, schema, pacote, provider, persistencia de artefato, mock,
seed, reset ou limpeza de dados publicados. As mensagens publicas seguem sem URL, segredo, PII,
stack, SQL, payload tecnico ou detalhe de provider.

## Validacao da atualizacao de previa instantanea

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.292.
- pnpm --dir frontend check em 0.1.292 antes do bump.
- pnpm check:encoding, pnpm check:tasks e pnpm check:adrs em 0.1.292 antes do bump.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.293.
- pnpm check em 0.1.293.
- pnpm --dir frontend build em 0.1.293.
- Smoke local HTTP do frontend: /version 200 em 0.1.293 e rota publica do post 200.

## Atualizacao de preparo sob demanda e audio overlay em 2026-09-09

Depois do deploy `0.1.293`, o usuario validou que o preparo do MP4 ainda era iniciado na abertura da
modal. A decisao de UX foi tornar a abertura da modal puramente visual e adiar trabalho pesado ate a
intencao explicita de download:

- abrir a modal carrega apenas o video original e o overlay CSS da arte social;
- nenhum start/status/download de job social e disparado antes do clique/toque em `Baixar video`;
- o Wake Lock best-effort fica restrito ao periodo de preparo iniciado pelo clique;
- o CTA inicial permanece `Baixar video` e muda para `Preparando...` somente durante a execucao;
- o controle de audio sai da area inferior textual e passa a ser um icone sobreposto ao video, no
  canto inferior direito, preservando `aria-label`.

A mudanca e frontend-only e nao cria env, schema, pacote, provider, persistencia de artefato, mock,
seed, reset ou limpeza de dados publicados. O rollback operacional segue por reverter o commit.
Mensagens publicas continuam sem URL, segredo, PII, stack, SQL, payload tecnico ou detalhe de
provider.

## Validacao da atualizacao de preparo sob demanda e audio overlay

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.293 antes do bump.
- pnpm --dir frontend check em 0.1.293 antes do bump.
- pnpm --dir frontend build em 0.1.293 antes do bump.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.294.
- pnpm check em 0.1.294.
- Smoke local HTTP do frontend: /version 200 em 0.1.294 e rota publica do post 200.

## Atualizacao visual do volume transparente em 2026-09-09

Depois do deploy `0.1.294`, o usuario validou que o controle de audio sobreposto ainda parecia um
botao destacado por causa do fundo preenchido. A decisao de UI foi preservar o controle sobre o video
sem competir visualmente com a arte social:

- reduzir o alvo visual do botao para um icone menor no canto inferior direito;
- remover borda, superficie preenchida e blur do controle;
- manter `bg-transparent`, icone claro e sombra discreta para legibilidade sobre frames escuros;
- preservar `aria-label`, estado `aria-pressed` e comportamento de mutar/ativar audio.

A mudanca e frontend-only e nao cria env, schema, pacote, provider, persistencia de artefato, mock,
seed, reset ou limpeza de dados publicados. O rollback operacional segue por reverter o commit.

## Validacao da atualizacao visual do volume transparente

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.294 antes do bump.
- pnpm --dir frontend check em 0.1.294 antes do bump.
- pnpm --dir frontend build em 0.1.294 antes do bump.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.295.
- pnpm check em 0.1.295.
- Smoke local HTTP do frontend: /version 200 em 0.1.295 e rota publica do post 200.

## Atualizacao de download automatico apos preparo em 2026-09-09

Depois do deploy `0.1.295`, o usuario validou que o fluxo ainda pedia um segundo clique quando o arquivo ficava pronto. A decisao de UX foi preservar o preparo sob demanda, mas remover o estado intermediario `prepared` do download social:

- o clique/toque em `Baixar video` continua sendo a unica acao que inicia start/status/download do job social;
- quando o `File` final retorna, o frontend tenta entregar o arquivo imediatamente;
- se Web Share nao puder abrir por ativacao expirada ou restricao do navegador, o fallback passa a ser o download por objeto local em vez de pedir novo clique;
- o toast de sucesso volta a ser `Video baixado`; falhas continuam com diagnostico publico controlado e cancelamento nativo segue silencioso.

A mudanca e frontend-only e nao cria env, schema, pacote, provider, persistencia de artefato, mock, seed, reset ou limpeza de dados publicados. O rollback operacional segue por reverter o commit.

## Validacao da atualizacao de download automatico apos preparo

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.295 antes do bump.
- pnpm --dir frontend check em 0.1.295 antes do bump.
- pnpm --dir frontend build em 0.1.295 antes do bump.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.296.
- pnpm check em 0.1.296.
- pnpm --dir frontend build em 0.1.296.
- Smoke local HTTP do frontend: /version 200 em 0.1.296 e rota publica do post 200.

## Atualizacao de refinamento visual Reels em 2026-09-09

Novo print de referencia foi usado apenas como evidencia visual, nao como instrucoes externas. A
decisao foi fixar os detalhes da arte social em proporcoes mensuraveis e manter a mesma composicao
na previa CSS e no MP4 gerado:

- cartao superior com 79,7% da largura, margem lateral aproximada de 10,2%, y visual de 13%, raio
  equivalente a 24px em 1080x1920, sombra curta e superficie sem borda;
- cabecalho azul `#308ce8`, altura equivalente a 88px, label branco bold e simbolo Lectum branco a
  esquerda do texto;
- corpo branco semitranslucido, altura equivalente a 266px, padding horizontal de ~6,8% da largura
  e pergunta centralizada em ate 3 linhas de 31 caracteres, com fonte bold;
- credenciais mais baixas no video, com grupo centralizado: nome branco bold, profissao menor
  alinhada ao inicio do nome e selo azul preenchido com check branco.

No frontend, a previa continua instantanea sobre o video original e aplica essas proporcoes com
unidades de container (`cqw/cqh`) e o componente real `LectumSymbolIcon`. No app `video/`, a mesma
grade foi traduzida para constantes 1080x1920 e renderizada somente com `drawbox`/`drawtext`, sem
reintroduzir `overlay`, `eq`, `fps`, `format`, `setsar`, `gblur`, pacote novo, env nova, schema,
persistencia, mock, seed, reset ou limpeza de dados publicados.

## Validacao da atualizacao de refinamento visual Reels

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.297.
- pnpm --dir video test em 0.1.297.
- pnpm --dir frontend check em 0.1.297.
- pnpm --dir video check em 0.1.297.
- pnpm --dir frontend build em 0.1.297.
- pnpm --dir video build em 0.1.297.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.297.
- pnpm check em 0.1.297.
- git diff --check.
- Smoke local HTTP do frontend: /version 200 em 0.1.297 e /comunidades 200.

## Atualizacao de paridade fina da arte social em 2026-09-09

Depois do deploy `0.1.297`, a captura do MP4 gerado evidenciou dois desvios contra o print de
referencia: texto de pergunta com 3 linhas ainda podia ultrapassar visualmente o cartao, e as
credenciais estavam alguns pontos acima da posicao esperada. A decisao foi manter a geometria do
cartao ja medida e refinar apenas comportamento tipografico/posicional:

- perguntas de 1 ou 2 linhas continuam em 56px no render 1080x1920;
- perguntas com 3 linhas usam 48px no MP4 e escala compacta equivalente na previa CSS, mantendo o
  limite de 31 caracteres por linha sem vazar para fora da superficie branca;
- nome e selo descem para `y=1400`; profissao desce para `y=1445`, alinhados a area util do video
  de referencia;
- a previa passa a posicionar o bloco de credenciais em `top: 73%`, preservando paridade visual com
  o artefato baixado.

A mudanca continua sem env, schema, pacote, provider, persistencia, mock, seed, reset ou limpeza de
dados publicados. O rollback operacional segue por reverter o commit.

## Validacao da atualizacao de paridade fina da arte social

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.297 antes do bump.
- pnpm --dir video test em 0.1.297 antes do bump.
- pnpm --dir frontend check em 0.1.298.
- pnpm --dir video check em 0.1.298.
- pnpm --dir frontend build em 0.1.298.
- pnpm --dir video build em 0.1.298.
- pnpm version:bump e pnpm check:version, sincronizando os cinco manifests em 0.1.298.
- pnpm check em 0.1.298.
- git diff --check.
- Smoke local HTTP do frontend: /version 200 em 0.1.298 e /comunidades 200.

## Atualizacao de fidelidade tipografica e assets da arte social em 2026-09-09

Novo feedback visual comparou o print de referencia com o MP4 atual e apontou diferencas na logo,
fonte do label, tipografia/margens da pergunta e credenciais/selo. A decisao foi substituir as
aproximacoes desenhadas por assets reais e alinhar a fonte do worker com a UI:

- a logo branca do cabecalho passa a ser um PNG recortado do asset oficial `frontend/public/logo-light.png`, usado tanto na previa quanto no `video/`;
- o selo verificado do MP4 passa a usar asset PNG derivado do mesmo path do componente `VerifiedBadgeIcon`, e a previa volta a usar o componente real;
- o container `video/` instala `fonts-manrope` do Debian bookworm para que `drawtext` use Manrope Bold/Medium, com fallback para DejaVu se a fonte nao existir;
- o label do cabecalho diminui para 38px e continua centralizado como grupo com a logo; na previa, a escala equivalente usa `3.45cqw`;
- no MP4, o texto da pergunta passa para `#151922`; na previa, usa tokens semanticos equivalentes para respeitar source-safety. Ambos usam limite de 28 caracteres por linha, Manrope bold 50px equivalente para 1-2 linhas e 44px equivalente para 3 linhas, com entrelinha proporcional a 60px;
- as credenciais reduzem densidade para nome 34px, profissao 21px e selo 26x24px, mantendo grupo centralizado em `y=1400/1440`.
- a resolucao de fontes e assets fica em `video/src/infra/ffmpeg/social-share-assets.ts`, mantendo o render principal abaixo do limite de 700 linhas.

A mudanca toca frontend e video, nao altera contrato publico, schema, env obrigatoria, storage,
provider, persistencia, seed, mock, reset ou limpeza de dados publicados. O novo pacote instalado no
container e um pacote Debian de fonte, nao dependencia npm; rollback operacional segue por reverter o
commit.

## Validacao da atualizacao de fidelidade tipografica e assets

- Medicao local do print de referencia: cartao x=60..528, y=252..445, cabecalho y=252..298, texto do cabecalho x=175..415 e credenciais/selo x=223..366 no JPEG 590x1280.
- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.298 antes do bump.
- pnpm --dir video exec node --enable-source-maps --import tsx --test src/infra/ffmpeg/social-share.test.ts em 0.1.298 antes do bump.
- pnpm --dir video check em 0.1.298 antes do bump.
- pnpm --dir video build em 0.1.298 antes do bump.
- pnpm --dir frontend check em 0.1.298 antes do bump.
- pnpm --dir frontend build em 0.1.298 antes do bump.
- pnpm check:source-size apos extrair o helper de assets/fontes.
- pnpm check em 0.1.298 antes do bump.
- git diff --check.
- pnpm version:bump para 0.1.299.
- pnpm check:version em 0.1.299.

## Atualizacao de alinhamento vertical da logo social em 2026-09-09

Novo feedback visual no MP4 gerado apontou que a logo da Lectum e o texto `Respondido na Lectum` ainda nao estavam na mesma altura. A decisao foi nao mexer na tipografia nem no label, apenas aplicar um deslocamento optico pequeno na logo:

- previa frontend: `-translate-y-[0.35cqw]` no asset branco da logo;
- render FFmpeg: `logoOffsetY=-4` no calculo de `labelLogoY`, fazendo o overlay da logo iniciar em `y=274`, alinhado ao topo calculado do drawtext do label.

A mudanca e visual, compativel com jobs existentes e sem alteracao de schema, contrato publico, env, provider, storage, package npm, seed ou dados publicados. Rollback: reverter o commit.

## Validacao da atualizacao de alinhamento vertical da logo social

- pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/lectum-share-media.test.mjs em 0.1.299 antes do bump.
- pnpm --dir video exec node --enable-source-maps --import tsx --test src/infra/ffmpeg/social-share.test.ts em 0.1.299 antes do bump.
- pnpm --dir frontend check em 0.1.299 antes do bump.
- pnpm --dir frontend build em 0.1.299 antes do bump.
- pnpm --dir video check em 0.1.299 antes do bump.
- pnpm --dir video build em 0.1.299 antes do bump.
- pnpm check em 0.1.299 antes do bump.
- git diff --check em 0.1.299 antes do bump.
- pnpm version:bump para 0.1.300.
- pnpm check:version em 0.1.300.
