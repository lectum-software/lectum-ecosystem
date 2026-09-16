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

## Configuração no Cloudflare

Não use este arquivo como substituto de revisão operacional. Antes de trocar o webhook Stream,
publique o Worker e confirme que sua rota pública HTTPS responde.

1. Crie o Worker `lectum-stream-webhook-router` no painel Cloudflare e publique este diretório sem
   criar package, token Stream ou binding adicional.
2. Crie o segredo Worker `STREAM_WEBHOOK_SECRET` com o segredo atual retornado pelo Cloudflare
   Stream. Não o cole em código, Git ou log.
3. Cadastre `HOMOLOG_WEBHOOK_URL` com
   `https://homolog-api.lectum.com.br/api/public/video-stream/webhook`.
4. Deixe `PRODUCTION_WEBHOOK_URL` vazio até que o backend de produção esteja publicado e seu
   endpoint tenha sido validado. Depois cadastre exatamente
   `https://api.lectum.com.br/api/public/video-stream/webhook`.
5. Associe o domínio/rota pública `stream-webhook.lectum.com.br/cloudflare-stream` ao Worker.
   DNS/proxy deve permanecer gerenciado pela Cloudflare e HTTPS ativo.
6. Só então altere a inscrição única do Stream para
   `https://stream-webhook.lectum.com.br/cloudflare-stream`. Ao consultar/salvar a inscrição,
   confira se o segredo retornado continua igual; se mudar, atualize **o segredo do Worker e ambos
   os backends** de modo controlado antes de validar eventos.
7. Faça upload real primeiro em homologação e confira `ready` no backend. Com produção habilitada,
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
