# TASK-164: Serviço isolado de processamento de vídeos

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-164 |
| Prioridade | P0 |
| Esforço | XL |
| Fase | Infraestrutura de mídia e operação |
| Status | Completed |
| Dependências | TASK-42, TASK-158, TASK-159, TASK-163 |
| ADR alvo | ADR-0479 |

## Contexto

A TASK-163 moveu novos uploads e playback privado para Cloudflare Stream. O provider já recebe o
arquivo original, transcodifica rendições e entrega HLS adaptativo; comprimir no celular antes desse
fluxo aumenta consumo de memória, CPU e bateria e introduz comportamento diferente entre iPhone,
Android e desktop. A implementação MediaBunny também passou a atender exportação social no browser
e uma POC Chromium dentro do backend, levando processamento pesado ao runtime que atende a API.

O produto precisa remover essa dependência do caminho crítico sem perder a capacidade futura de
processar mídia. A nova capacidade deve existir como uma quarta aplicação independente em
`video/`, implantável em servidor dedicado, com API Node, fila persistente e workers FFmpeg. A
primeira operação é compressão para MP4; marca d'água, thumbnails e outros pipelines poderão ser
adicionados como novos processadores sem voltar a acoplar CPU ao backend Lectum.

Esta task não cria tela nem altera layout. Builder/protótipos não são necessários. O compartilhamento
normal de vídeos permanece por link privado Lectum. A geração de vídeo social com arte fica
desativada de forma controlada até um processador específico ser implementado no serviço; não se
baixa original privado nem se reintroduz transformação client-side como fallback.

## Objetivos

1. Remover completamente MediaBunny, o encoder AAC auxiliar, Playwright/Chromium social e os
   workers/temporários OPFS associados dos runtimes frontend e backend.
2. Preservar upload e reprodução via Cloudflare Stream e os caminhos R2 legados durante rollout.
3. Criar uma aplicação Node independente `video/`, com API privada autenticada, BullMQ/Redis e
   worker FFmpeg idempotente.
4. Entregar compressão assíncrona real, consulta de estado, cancelamento/remoção e download com
   Range, sem guardar bytes no Redis e sem aceitar nomes/caminhos fornecidos pelo cliente.
5. Documentar implantação segura, volumes, Redis, envs, limites, rollback e operação em Dokploy.

## Decisões de packages

Antes da instalação, registrar em `PACKAGES.md` e ADR-0479:

| Package/binário | Papel | Restrição |
| --- | --- | --- |
| `express` | API HTTP privada | aplicação separada, sem importar backend Lectum |
| `bullmq` | fila persistente, retry e workers | sem payload binário no Redis |
| `ioredis` | conexão Redis exigida pelo BullMQ | Redis privado, persistência AOF |
| `multer` | ingestão multipart em disco | um arquivo, limite por env, nome aleatório |
| `zod` | validação de env e contratos internos | falha rápida em configuração inválida |
| `helmet` | headers defensivos | API não habilita CORS para browser |
| `@paralleldrive/cuid2` | IDs opacos de jobs/traces | nunca reutilizar nome do upload |
| `dotenv` | env local de API/worker | somente runtime; deploy injeta secrets sem arquivo `.env` |
| FFmpeg/ffprobe CLI | probe e transcodificação | `spawn`, argumentos fixos, `shell: false` |

Não adotar `fluent-ffmpeg` (projeto descontinuado), `ffmpeg.wasm`, MediaBunny, Chromium ou shell
interpolado. FFmpeg é dependência do sistema/imagem Docker, não package JavaScript.

## Arquitetura da aplicação `video/`

### Separação de processos

- `api`: recebe arquivo, valida autenticação/limites/assinatura inicial, grava em volume temporário,
  verifica capacidade e enfileira. Não executa FFmpeg.
- `worker`: consome BullMQ, valida com ffprobe, executa FFmpeg, valida a saída, publica o arquivo de
  forma atômica e atualiza progresso.
- `redis`: privado, sem porta pública, autenticação/TLS conforme infraestrutura e AOF habilitado.
- `storage`: volume persistente compartilhado entre API e worker. Inputs e outputs nunca vivem em
  diretório público do Express.

API e worker usam a mesma imagem, mas comandos diferentes. Escala horizontal do worker mantém
concorrência padrão `1` por processo para workload CPU-bound. A entrega inicial assume um servidor
dedicado com volume local compartilhado; mover artefatos para object storage é pré-requisito antes
de distribuir workers em hosts diferentes.

### Estrutura

```text
video/
  src/
    config/               # env tipada e fail-fast
    domain/jobs/          # contratos e estados públicos
    infra/ffmpeg/         # probe, argumentos, processo e validação
    infra/queue/          # BullMQ, Redis e cancelamento
    infra/storage/        # paths derivados, quota, cleanup e Range
    modules/jobs/         # middleware, controllers e serviço
    api.ts                # composição Express
    worker.ts             # composição do consumidor
  Dockerfile
  docker-compose.yml
  .env.example
```

Módulos não importam `backend/`, `frontend/` ou `admin/`. O repositório continua unificado apenas
para desenvolvimento; cada aplicação possui manifest, lockfile, build, env, imagem e deploy próprios.

## Contrato HTTP inicial

Todas as rotas de job exigem `Authorization: Bearer <VIDEO_SERVICE_API_KEY>`. A comparação é
constant-time; credencial inválida retorna erro genérico e nunca é logada.

### `POST /api/private/jobs/compress`

- `multipart/form-data`, campo único `video`;
- aceita MP4/MOV/WebM dentro de `VIDEO_MAX_INPUT_MB`;
- nome original, caminho local, metadata descritiva e erro bruto não entram em Redis/resposta/log;
- reserva espaço antes da ingestão, usa diretório/ID opaco e remove parcial em toda rejeição;
- responde `202` com `job_id`, `status`, timestamps e URL relativa de status;
- recusa quando fila/capacidade de disco ultrapassar limites configurados.

### `GET /api/private/jobs/:id`

Retorna somente estados públicos `queued`, `processing`, `completed`, `failed`, `cancel_requested`,
`canceled` ou `not_found`, progresso inteiro 0–100, timestamps, tamanho de saída quando concluído e
URL relativa de download. Nunca retorna paths, comando, stderr, stack ou detalhes Redis/FFmpeg.

### `GET /api/private/jobs/:id/output`

Disponível somente para job concluído e autenticado. Entrega `video/mp4`, suporta um Range válido,
`Accept-Ranges: bytes`, `Content-Disposition: attachment`, `nosniff`, `private, no-store` e recusa
ranges múltiplos/malformados. Não usa `express.static`.

### `DELETE /api/private/jobs/:id`

- waiting/delayed: remove job e arquivos;
- active: registra cancelamento no Redis, worker encerra FFmpeg de forma cooperativa e não faz retry;
- completed/failed: remove job e artefatos;
- operação repetida é idempotente e não revela existência para credencial inválida.

### Operação

- `GET /health`: liveness do processo;
- `GET /ready`: Redis, volume e binários necessários ao processo;
- `GET /version`: versão do manifest, pública, `no-store` e `noindex`.

## Pipeline de compressão

1. ffprobe confirma exatamente ao menos uma trilha de vídeo, duração finita e limites configurados.
2. FFmpeg lê o input por path derivado internamente e produz temporário no mesmo filesystem.
3. Saída padrão: MP4, H.264/libx264, `yuv420p`, AAC 48 kHz estéreo quando houver áudio, `faststart`,
   metadata/chapter removidos, FPS máximo e dimensões máximas configuráveis sem upscale.
4. Qualidade usa CRF e preset tipados por allowlist; nenhum valor vira trecho de shell.
5. Protocolos FFmpeg/ffprobe ficam limitados a `file,pipe`; o worker não possui rota de saída
   pública e `-progress pipe:1` atualiza BullMQ sem registrar saída bruta.
6. Timeout, cancelamento ou shutdown enviam término e, se necessário, kill após grace period.
7. ffprobe valida MP4 final, duração/trilha e tamanho não vazio. Só então `rename` atômico publica.
8. Input e temporário são removidos em `finally`; retry usa o mesmo output determinístico e é
   idempotente. Falha definitiva guarda apenas código público controlado.

## Segurança e estabilidade

- serviço não é chamado diretamente pelo browser e não habilita CORS;
- API key com no mínimo 32 caracteres, rotacionada por ambiente;
- Redis em rede privada, sem bind público; URL/credenciais apenas em runtime secret;
- diretórios e nomes são derivados de IDs validados, nunca de campos multipart;
- MIME/extensão declarados não bastam: assinatura inicial e ffprobe validam conteúdo;
- apenas um arquivo/campo, limites de arquivo/campos/partes, fila e espaço livre;
- FFmpeg usa `spawn` com array fixo, `shell: false`, stdin fechado e protocol allowlist;
- logs estruturados permitem apenas trace/job ID opaco, operação, estado, elapsed e classe de erro;
- graceful shutdown fecha HTTP, worker, Queue/Redis e processo FFmpeg;
- retry exponencial apenas para falha transitória; arquivo inválido/cancelado usa erro irrecuperável;
- cleanup periódico remove diretórios expirados somente sob o storage root canônico;
- `/ready` falha fechado quando Redis/volume/binário necessário está indisponível.

## Remoção MediaBunny sem breaking rollout

- vídeo em `media-preparation` vira passthrough validado; Cloudflare Stream é responsável pela
  normalização. Imagens continuam usando o preparador atual;
- remover workers de vídeo, OPFS, flags, packages, testes e mensagens exclusivas da otimização;
- remover renderer Chromium, packages e dependência Debian Chromium; manter temporariamente o
  cleanup de artefatos R2 expirados criados por versões anteriores, pois ele não processa vídeo;
- manter temporariamente os endpoints backend de render social respondendo erro público controlado
  para frontend antigo durante deploy independente. Uma task posterior pode removê-los após não
  haver consumidores;
- frontend novo não chama render social nem transforma vídeo; compartilhamento de vídeo usa link.
  A ação de download com arte não é exibida até existir processador server-side próprio;
- imagens continuam usando o preparador atual sem transcodificação de vídeo; o compartilhamento de
  posts mantém o comportamento já publicado por link e não reintroduz módulos sociais sem chamador;
- referências R2 antigas e referências Cloudflare Stream continuam reproduzíveis; nenhum objeto é
  apagado ou migrado por esta task.

## Impacto de deploy

- **Banco Lectum:** nenhuma alteração, migration, backfill ou reset.
- **Cloudflare Stream:** nenhuma credencial adicional; TASK-163 continua com rollout por flags.
- **Frontend/backend:** remoção tolerante a versões divergentes. Backend preserva endpoints antigos
  com indisponibilidade controlada; frontend deixa de chamá-los.
- **Nova aplicação:** não recebe tráfego até API, worker, Redis e volume serem provisionados. Ela não
  entra no caminho crítico de upload/playback Stream nesta task.
- **Rollback:** reverter frontend/backend não altera mídia persistida. Reverter `video/` para imagem
  anterior preserva Redis/volume; não limpar filas/artefatos automaticamente.

## ALERTA DE DEPLOY — nova aplicação de vídeo

Antes do primeiro deploy de `video/`, cadastrar sem expor valores:

- obrigatórias: `VIDEO_SERVICE_API_KEY`, `REDIS_URL`, `VIDEO_STORAGE_ROOT`;
- rede: `HOST`, `PORT`;
- limites: `VIDEO_MAX_INPUT_MB`, `VIDEO_MAX_OUTPUT_MB`, `VIDEO_MAX_DURATION_SECONDS`,
  `VIDEO_MAX_QUEUED_JOBS`, `VIDEO_MIN_FREE_SPACE_MB`, `VIDEO_UPLOAD_REQUEST_TIMEOUT_MS`,
  `VIDEO_STORAGE_RESERVATION_TTL_SECONDS`, `VIDEO_REQUIRE_WORKER_READY`;
- worker: `VIDEO_WORKER_CONCURRENCY`, `VIDEO_JOB_ATTEMPTS`, `VIDEO_JOB_TIMEOUT_MS`,
  `VIDEO_FFMPEG_PATH`, `VIDEO_FFPROBE_PATH`, `VIDEO_FFMPEG_PRESET`, `VIDEO_FFMPEG_CRF`,
  `VIDEO_MAX_WIDTH`, `VIDEO_MAX_HEIGHT`, `VIDEO_MAX_FPS`, `VIDEO_AUDIO_BITRATE_KBPS`;
- retenção: `VIDEO_OUTPUT_TTL_SECONDS`, `VIDEO_STALE_INPUT_TTL_SECONDS`,
  `VIDEO_CLEANUP_INTERVAL_SECONDS`.

`VIDEO_SERVICE_API_KEY` e `REDIS_URL` são secrets de runtime, nunca build args. O storage root é um
mount persistente igual na API e no worker. Se obrigatórias faltarem em produção, somente a nova
aplicação falha no boot/readiness; backend/frontend/admin continuam independentes.

## Fora do escopo

- usar o serviço como etapa obrigatória antes do Cloudflare Stream;
- copiar/migrar/recomprimir vídeos R2 ou Stream existentes;
- marca d'água, arte social em vídeo, HLS próprio, DRM ou CDN de saída;
- distribuir workers em hosts sem storage compartilhado;
- painel de jobs no Admin;
- expor Redis, output directory ou API key ao navegador.

## Critérios de aceite

- [x] MediaBunny/AAC encoder/Playwright/Chromium social foram removidos de source, manifests,
  lockfiles, Docker e envs ativos.
- [x] Vídeos novos seguem upload/reprodução Cloudflare Stream sem otimização client-side; fallback
  R2 legado continua compatível.
- [x] Compartilhamento de vídeo usa link e nenhuma UI chama transformação/download social removido.
- [x] `video/` é aplicação independente, com manifest/lockfile/build/check/version/env/Docker próprios.
- [x] API privada autentica em tempo constante, limita multipart/disco/fila e não expõe internals.
- [x] Compressão assíncrona real usa BullMQ/Redis e FFmpeg/ffprobe sem shell.
- [x] Worker é idempotente, tem progress, retry classificado, timeout, cancelamento e shutdown.
- [x] Saída MP4 H.264/AAC fast-start é validada antes de conclusão e suporta download Range privado.
- [x] Cleanup remove somente temporários/outputs expirados sob storage root e preserva jobs ativos.
- [x] `/health`, `/ready` e `/version` possuem contratos seguros e testes.
- [x] Docker separa API/worker, usa usuário não-root, Redis privado/AOF e volume compartilhado.
- [x] Packages, arquitetura, instruções multiagente, versionamento e guardrails incluem a quarta app.
- [x] Envs, alerta de deploy, ordem Dokploy, rollback e smoke estão documentados.
- [x] Testes automatizados e E2E real com Redis + FFmpeg cobrem upload, fila, compressão, status,
  Range, remoção e recusas sem mocks de conclusão.
- [x] Checks/builds/audits de raiz, backend, frontend, admin e video passam sem warnings.
- [x] Nenhum reset, seed destrutivo, `db push`, limpeza de R2/Stream ou migration foi executado.
- [x] ADR-0464/0466/0467 e TASK-160 indicam claramente a substituição; ADR-0479 está indexado.
- [x] Versão dos cinco manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit e push ocorrem em `homolog`; deploy e smoke são registrados ou o bloqueio de acesso é
  reportado sem alegar publicação.

## Validação mínima

- `pnpm --dir video install --frozen-lockfile`
- `pnpm --dir video check && pnpm --dir video build && pnpm --dir video audit --prod`
- E2E Docker com Redis real, vídeo gerado por FFmpeg, upload, polling, Range, ffprobe e remoção.
- `pnpm --dir backend check && pnpm --dir backend build`
- `pnpm --dir frontend check && pnpm --dir frontend build`
- `pnpm --dir admin check && pnpm --dir admin build`
- `pnpm check`
- `rg -n -i "mediabunny|@mediabunny/aac-encoder|playwright-core|LECTUM_SHARE_CHROMIUM"` restrito a
  código/configuração ativa sem ocorrências; histórico permanece preservado e marcado superseded.

## Registro de execução — 2026-09-03

- MediaBunny, encoder AAC auxiliar, Playwright e Chromium social foram removidos dos manifests,
  lockfiles, Docker, envs e código ativo. A busca residual ficou vazia fora do histórico de
  tasks/ADRs; imagens mantêm seu preparador e compartilhamento de vídeo permanece por link.
- O scheduler que apaga artefatos sociais R2 expirados de clientes anteriores foi preservado. Não
  houve exclusão em massa, limpeza de bucket, alteração de schema, migration, seed ou reset.
- `video/` foi validado com Biome, TypeScript, 10 testes e build. O E2E Docker construiu a imagem
  final, subiu Redis 8.2 com AOF e API/worker separados, gerou mídia real, executou FFmpeg/ffprobe e
  aprovou autenticação, recusas, compressão H.264/AAC, progresso, Range, cancelamento, remoção,
  liberação das reservas e `/version` em `0.1.261`.
- Backend passou Biome, verificação de dependências runtime, TypeScript, 232 testes e build;
  frontend passou Biome, ESLint sem warnings, TypeScript, 96 testes e build; Admin passou Biome,
  ESLint sem warnings, TypeScript, 33 testes e build.
- `pnpm audit --prod` terminou sem vulnerabilidades conhecidas em raiz/backend/frontend/admin/video
  (houve retry automático por timeout transitório do registry). `pnpm check`, checks de env,
  secrets, ciclos, tamanho, encoding, tasks e ADRs foram aprovados.
- Builder/Quick Copy não foi necessário: não foi criada nova tela e as superfícies existentes foram
  simplificadas sem alteração de direção visual. O serviço novo permanece fora do caminho crítico
  do Cloudflare Stream até receber uma integração server-to-server futura.

## Referências oficiais

- BullMQ: `https://docs.bullmq.io/`
- Concorrência de workers BullMQ: `https://docs.bullmq.io/guide/workers/concurrency`
- Retry BullMQ: `https://docs.bullmq.io/guide/retrying-failing-jobs`
- Operação BullMQ: `https://docs.bullmq.io/guide/going-to-production`
- FFmpeg CLI: `https://ffmpeg.org/ffmpeg.html`
