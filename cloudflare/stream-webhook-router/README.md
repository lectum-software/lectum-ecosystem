# Roteador único de webhooks do Cloudflare Stream

O Cloudflare Stream aceita apenas **um webhook por conta**. Este Worker recebe esse único evento,
valida a assinatura HMAC e encaminha o corpo bruto para os backends Lectum habilitados. Ele existe
porque homologação e produção compartilham a mesma conta Stream; não recebe vídeos, não participa do
upload, playback, R2, Redis, banco, FFmpeg ou servidor dedicado de vídeo.

Fluxos preservados:

```text
browser -> Cloudflare Stream (upload e playback direto)
Cloudflare Stream -> Worker -> backend homolog e/ou backend producao
```

Assim, a latência do Worker não entra no envio nem na reprodução do vídeo. O backend continua
validando a mesma assinatura e ignora com sucesso eventos de vídeos que não pertencem ao seu banco.

## Garantias de segurança

- aceita somente `POST`, payload pequeno e assinatura Stream válida por até cinco minutos;
- usa o corpo bruto para validar e encaminhar, sem serializar novamente o JSON;
- encaminha apenas para as duas URLs HTTPS imutáveis no código, nunca para URL livre de env;
- não encaminha cookies, autorização, host, query ou headers arbitrários;
- não registra payload, assinatura, UID ou segredo;
- retorna erro genérico quando um destino falhar, para que a origem possa tentar novamente.

O encaminhamento pode repetir um evento quando um alvo falha após outro já o receber. Os handlers do
backend devem permanecer idempotentes; não altere essa propriedade ao evoluir o webhook.

## Publicação por CI/CD e configuração no Cloudflare

O código deste Worker **não deve ser editado no painel Cloudflare**. A origem é este diretório e a
publicação ocorre pelo workflow GitHub Actions `Deploy Cloudflare Stream webhook router`.

### Uma vez por conta/repositório

1. No Cloudflare, crie um token exclusivo de deploy com escopo da conta atual e somente
   **Workers Scripts: Edit**. Não reutilize token do Stream, R2 ou backend. Armazene-o apenas como
   Secret do repositório GitHub `CLOUDFLARE_WORKER_DEPLOY_TOKEN`.
2. No GitHub, cadastre também o Secret `CLOUDFLARE_ACCOUNT_ID`. Embora não seja senha, mantê-lo
   fora do YAML evita acoplamento do repositório à conta do provider.
3. O primeiro push em `homolog` que tocar este diretório executa testes e publica o código com
   Wrangler. O arquivo `wrangler.toml` usa `keep_vars = true`: um deploy não apaga configurações
   sensíveis ou destinos criados no provider. `workers_dev = false` remove o endpoint genérico
   `*.workers.dev`; o tráfego só existirá na rota HTTPS definida abaixo.
4. Enquanto `PRODUCTION_WEBHOOK_URL` estiver vazio, o workflow de `homolog` pode atualizar o
   roteador compartilhado para validar a integração. Antes de habilitar produção, abra uma task de
   promoção para trocar a esteira do Worker para `main` revisada/protegida. Nunca deixe produção
   habilitada e continue publicando código do roteador automaticamente a partir de `homolog`.

### Provider: variáveis, rota e webhook

Depois de um deploy CI bem-sucedido, no painel Cloudflare do Worker:

1. Crie o Secret `STREAM_WEBHOOK_SECRET` com o segredo atual retornado pelo Cloudflare Stream.
   Não o cole em código, Git, log ou chat.
2. Cadastre a variável comum `HOMOLOG_WEBHOOK_URL` com
   `https://homolog-api.lectum.com.br/api/public/video-stream/webhook`.
3. Deixe `PRODUCTION_WEBHOOK_URL` ausente até que o backend produtivo esteja publicado e seu
   endpoint tenha sido validado. Depois cadastre exatamente
   `https://api.lectum.com.br/api/public/video-stream/webhook`.
4. Associe a rota pública
   `stream-webhook.lectum.com.br/cloudflare-stream` ao Worker. DNS/proxy deve permanecer
   gerenciado pela Cloudflare e HTTPS ativo.
5. Só então altere a inscrição única do Stream para
   `https://stream-webhook.lectum.com.br/cloudflare-stream`. Ao consultar/salvar a inscrição,
   confira se o segredo retornado continua igual; se mudar, atualize **o segredo do Worker e ambos
   os backends** de modo controlado antes de validar eventos.
6. Faça upload real primeiro em homologação e confira `ready` no backend. Com produção habilitada,
   repita o teste em produção antes de qualquer promoção adicional.

O token usado para configurar o Stream não é necessário no Worker. A chave RSA de playback tampouco
é necessária nele.

## Teste local sem provider

O teste abaixo usa apenas HMAC/WebCrypto local e destinos interceptados; não acessa Cloudflare nem
envs reais:

```bash
node --test cloudflare/stream-webhook-router/src/worker.test.mjs
```

`.dev.vars` é ignorado. Copie somente `.dev.vars.example` se precisar validar a forma da
configuração, mantendo valores fictícios.
