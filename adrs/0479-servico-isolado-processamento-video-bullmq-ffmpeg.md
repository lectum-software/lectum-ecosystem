# ADR-0479: Serviço isolado de processamento de vídeo com BullMQ e FFmpeg

## Status

Accepted

## Task relacionada

TASK-164 — Serviço isolado de processamento de vídeos

## Contexto

Cloudflare Stream passou a ser o plano de dados dos novos vídeos. Continuar comprimindo no browser
com MediaBunny duplica transcodificação e deixa estabilidade dependente de codecs, memória e energia
do aparelho. A POC de vídeo social também executa Chromium/MediaBunny no backend Express, misturando
workload CPU-bound ao processo de API e ampliando imagem, fila em memória e superfície operacional.

A Lectum ainda precisa de uma base para transformações que o Stream não representa como regra de
produto, como compressões offline específicas e futuras marcas d'água. Essa base deve ser isolada,
assíncrona, retomável e implantável em host dedicado.

## Decisão

- Remover MediaBunny e o encoder AAC dos clientes, além de Playwright/Chromium/MediaBunny do backend.
- Não substituir a compressão client-side por outra biblioteca no navegador. Cloudflare Stream
  recebe o original aceito e produz rendições adaptativas.
- Criar `video/` como aplicação Node independente, sem imports cruzados com as outras aplicações.
- Usar Express para API service-to-service, BullMQ sobre Redis persistente para orquestração e
  FFmpeg/ffprobe CLI para processamento/validação.
- Manter API e worker em processos separados, construídos pela mesma imagem. Concorrência padrão do
  worker é um por processo por se tratar de CPU; escalar por processos/hosts somente com capacidade.
- Persistir bytes em volume privado compartilhado, nunca no Redis. BullMQ guarda apenas IDs,
  operação, parâmetros fechados e estado mínimo.
- Reservar atomicamente no Redis apenas a estimativa de capacidade (nunca os bytes) antes da
  ingestão. A reserva diminui após o upload, acompanha o job e é liberada no estado terminal para
  impedir overcommit de disco entre réplicas da API.
- Processar de forma idempotente: paths derivam de job ID opaco, saída nasce temporária, é validada
  e recebe rename atômico; retry nunca concatena nem publica arquivo parcial.
- Invocar FFmpeg com `spawn`, lista de argumentos e `shell: false`. Não usar `fluent-ffmpeg`, shell,
  MediaBunny, Chromium ou WASM.
- Proteger todas as rotas de job com Bearer secret em comparação constant-time. Não habilitar CORS,
  não servir diretórios estáticos e não expor paths, stderr, stack ou configurações.
- Entregar output somente após estado concluído, autenticação e Range único validado.
- Usar cancelamento cooperativo por chave curta no Redis para job ativo; cancelado e arquivo
  inválido são irrecuperáveis, falha transitória usa backoff exponencial limitado.
- Manter a nova aplicação fora do caminho crítico Cloudflare Stream nesta task. Integração com o
  backend e processadores adicionais exigem contrato/task próprios.

## Alternativas consideradas

### Continuar MediaBunny no browser

Rejeitada porque varia entre Android/iPhone, consome recursos do usuário e duplica trabalho que o
Stream já executa.

### Executar FFmpeg dentro do backend Lectum

Rejeitada por competir com autenticação/API por CPU, memória e lifecycle de deploy, além de aumentar
o impacto de arquivo malformado ou job lento.

### Fila em memória

Rejeitada porque perde jobs em restart, não coordena processos e não permite worker dedicado.

### RabbitMQ/Kafka

Não adotados no estágio inicial: BullMQ/Redis oferece persistência, retry, concorrência e operação
suficientes com menor custo operacional. Reavaliar se garantias/volume excederem esse modelo.

### Biblioteca wrapper `fluent-ffmpeg`

Rejeitada por estar descontinuada e por esconder argumentos/process lifecycle. O CLI oficial com
adapter próprio tem superfície menor e auditável.

## Segurança

- API key e Redis URL são secrets de runtime por ambiente.
- Redis fica em rede privada, sem exposição pública e com AOF; API é o único ingress.
- File name original não é usado em paths, respostas ou logs.
- Multer limita bytes/campos/arquivos; assinatura básica e ffprobe validam o conteúdo.
- FFmpeg/ffprobe aceitam somente os protocolos `file,pipe`; o worker permanece em rede interna,
  sem egress público, reduzindo SSRF por mídia especialmente construída.
- Params CRF/preset/dimensões pertencem à configuração tipada/allowlist, não ao payload do cliente.
- Cleanup resolve e confirma todo path sob `VIDEO_STORAGE_ROOT` antes de remover.
- Logs estruturados contêm apenas trace/job opaco, fase, elapsed e código controlado.
- Graceful shutdown impede aceitar trabalho novo e espera o job ativo dentro do prazo. Saída forçada
  deixa input/job recuperáveis pelo mecanismo stalled do BullMQ; restart não vira cancelamento.

## Compatibilidade e rollout

- Nenhum schema/migration/dado Lectum é alterado.
- Endpoints sociais antigos do backend permanecem temporariamente, mas respondem indisponibilidade
  pública controlada. Isso tolera frontend antigo enquanto o frontend novo deixa de chamá-los.
- Uploads de imagem continuam no preparador atual. O compartilhamento mantém o comportamento já
  publicado por link; download de vídeo com arte volta somente com processador server-side próprio.
- O scheduler de retenção dos artefatos R2 antigos permanece ativo até uma contração posterior;
  ele não executa MediaBunny/Chromium e evita abandonar objetos já criados por clientes anteriores.
- Nova app pode ser publicada depois das demais, sem tráfego. Seu boot inválido não afeta backend,
  frontend ou admin.
- Rollback de código não remove Redis, volume, R2 ou Stream. Não executar cleanup manual destrutivo.

## Packages e binários

- `bullmq@6.3.4`, `ioredis@6.0.0`, `express@5.2.1`, `multer@2.3.0`, `zod@4.5.4`,
  `helmet@8.3.0`, `@paralleldrive/cuid2@3.3.0`, `dotenv@17.4.2`.
- FFmpeg/ffprobe são instalados na imagem Debian e verificados em readiness.
- Biome/TypeScript/tsx permanecem dependências de desenvolvimento exclusivas de `video/`.

## Consequências

- O app mobile deixa de transcodificar antes do Stream, melhorando previsibilidade e tempo até upload.
- Processamento offline passa a exigir Redis, volume e capacidade CPU dedicados.
- BullMQ possui semântica at-least-once em cenários de falha; idempotência do processor é obrigatória.
- Volume local limita workers ao mesmo host. Object storage será necessário para workers distribuídos.
- Não há artefato social em vídeo nesta entrega; o produto mantém compartilhamento seguro por link.

## ALERTA DE DEPLOY

Antes do primeiro deploy de `video/`, configurar `VIDEO_SERVICE_API_KEY`, `REDIS_URL` e
`VIDEO_STORAGE_ROOT` em runtime. API e worker precisam do mesmo Redis/volume; só API recebe domínio.
Demais limites e parâmetros ficam documentados em `video/.env.example`. Ausência de obrigatória
impede somente a nova aplicação de iniciar; nenhum valor é armazenado neste ADR.

## Validação

- Checks, build e audit independentes do app.
- E2E real em Docker com Redis, FFmpeg, ingestão multipart, polling, output MP4 validado, Range,
  cancelamento/remoção e cleanup.
- Checks/builds regressivos das três aplicações existentes e guardrails da raiz.
- Busca de dependências/código ativo confirma ausência de MediaBunny/Playwright/Chromium social.
