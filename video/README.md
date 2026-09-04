# Lectum Video Service

Aplicação Node independente para transformações assíncronas de vídeo. A primeira operação comprime
MP4/MOV/WebM para MP4 H.264/AAC. Ela **não** substitui Cloudflare Stream e não deve ser chamada pelo
browser: backend/jobs internos autorizados usam Bearer secret.

## Processos

- API: `pnpm start:api` (`dist/api.js`)
- Worker: `pnpm start:worker` (`dist/worker.js`)
- Redis privado com AOF
- Volume privado igual na API e no worker

## Desenvolvimento local

```bash
cp .env.example .env
# Troque os dois placeholders; não versione .env.
pnpm install --frozen-lockfile
pnpm check
pnpm build
docker compose up --build
```

Verifique:

```bash
curl -fsS http://localhost:3003/health
curl -fsS http://localhost:3003/ready
curl -fsS http://localhost:3003/version
```

O E2E usa Redis e FFmpeg reais. Gere dois arquivos técnicos locais, informe
`VIDEO_E2E_FILE` e, para também provar cancelamento ativo, `VIDEO_E2E_CANCEL_FILE`; então execute:

```bash
pnpm test:e2e
```

Essas três envs `VIDEO_E2E_*` são exclusivas do teste local e não pertencem ao deploy.

Envie um vídeo sem imprimir o segredo no histórico:

```bash
read -s VIDEO_SERVICE_API_KEY
curl --fail-with-body \
  -H "Authorization: Bearer ${VIDEO_SERVICE_API_KEY}" \
  -F "video=@/caminho/video.mov" \
  http://localhost:3003/api/private/jobs/compress
unset VIDEO_SERVICE_API_KEY
```

Consulte `job_id` no endpoint retornado. O download exige o mesmo header e aceita somente um Range.

## Contrato operacional

- input/output nunca entram no Redis;
- paths não usam nome original;
- FFmpeg roda sem shell, aceita somente protocolos `file,pipe` e não herda segredos da aplicação;
- arquivo inválido/cancelado não recebe retry;
- falha transitória recebe retry exponencial limitado;
- outputs expiram conforme `VIDEO_OUTPUT_TTL_SECONDS`;
- reserva atômica no Redis evita que uploads simultâneos prometam mais disco do que o disponível;
- worker padrão processa um job por vez;
- nenhum diretório é publicado com `express.static`.

## Deploy em servidor dedicado

Use a mesma imagem em dois serviços:

1. `api`: comando `node --enable-source-maps dist/api.js`, domínio/ingress e porta `PORT`;
2. `worker`: comando `node --enable-source-maps dist/worker.js`, sem domínio nem porta pública;
3. Redis privado com senha/TLS quando suportado e AOF persistente;
4. volume persistente montado em `VIDEO_STORAGE_ROOT` nos dois serviços.

Cadastre `VIDEO_SERVICE_API_KEY` e `REDIS_URL` como secrets de runtime. Nenhuma variável desta app é
build-time. Em produção, a URL Redis precisa incluir autenticação e `VIDEO_STORAGE_ROOT` precisa ser
um caminho absoluto dedicado ao volume (nunca `/`). Não publique a porta do Redis. O Compose injeta
as envs de runtime diretamente e não depende da criação de um arquivo `.env` no servidor. `/ready`
da API fica 503 enquanto não houver worker vivo quando `VIDEO_REQUIRE_WORKER_READY=true`.
Ela também exige espaço para um input máximo, um output máximo e a reserva livre configurada;
readiness concorrente usa probes de escrita isolados e não disputa um arquivo global.

No encerramento, o worker deixa o job ativo terminar durante o prazo configurado. Se o container for
forçado a sair, o BullMQ recupera o job como stalled e o input persistido permite nova tentativa; um
restart de deploy não é tratado como cancelamento do usuário.

## Limite de escala inicial

O volume local funciona para API e worker no mesmo host. Antes de colocar workers em hosts distintos,
substitua input/output por object storage privado com URLs curtas; não use NFS improvisado nem Redis
para bytes de vídeo.
