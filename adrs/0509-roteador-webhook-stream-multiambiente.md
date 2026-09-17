# ADR-0509 — Roteador único de webhook Stream multiambiente

Data: 2026-09-16

## Status

Aceita; publicação por CI, rota, inscrição Stream e callback real de homologação validados.

## Contexto

Homologação e produção usam a mesma conta Cloudflare Stream por decisão de cobrança. A Cloudflare
aceita uma única inscrição de webhook por conta, enquanto cada backend Lectum precisa receber apenas
os eventos de seus próprios vídeos. Trocar a inscrição diretamente entre ambientes quebraria o outro
ambiente. Criar outro backend, transportar vídeo por ele ou usar R2 não resolve o limite e aumenta
superfície operacional.

## Decisão

Usar um Cloudflare Worker dedicado como roteador de eventos pequenos exposto por **Custom Domain**
`stream-webhook.lectum.com.br`, não por rota com origem de aplicação. Ele atende exclusivamente
`POST /cloudflare-stream`, valida `Webhook-Signature`
contra o corpo bruto e o segredo Stream, então encaminha os mesmos bytes e cabeçalho apenas para os
endpoints HTTPS canônicos de homologação e produção. O alvo de produção é opcional até sua API estar
pronta. Cada backend valida novamente a assinatura e ignora com sucesso um UID ausente no seu banco.

O Worker não recebe token Stream, chave de assinatura RSA, credencial R2, Redis, banco, FFmpeg ou
bytes de upload/playback. Browser continua enviando e assistindo direto pelo Stream; o Worker só
fica na notificação assíncrona de estado, portanto não acrescenta latência ao vídeo.

## Consequências e rollback

Há custo/limite próprio de Workers a acompanhar, mas o caminho executa apenas callbacks pequenos;
não usa tráfego de vídeo. Entregas podem ser repetidas quando um destino falha depois que outro foi
confirmado, por isso o handler backend permanece idempotente. Falhas retornam status genérico e não
logam corpo/segredo/UID.

Rollback operacional: apontar a inscrição única para o endpoint direto de homolog já validado e
desabilitar o destino de produção no Worker. Não apagar dados ou assets. A troca exige confirmar o
segredo retornado pelo provider e manter Worker/backends sincronizados.

## Evidência de operação

Em 2026-09-16, o workflow de CI publicou o roteador, o Custom Domain passou a servir o endpoint
restrito e a inscrição VOD foi atualizada para ele. Um upload real de 250.743.537 bytes via perfil
profissional de auditoria em homologação concluiu o processamento; o backend recebeu o evento
roteado e devolveu playback HLS assinado reproduzível. O destino de produção continua ausente do
Worker: habilitá-lo requer API produtiva validada e promoção revisada para `main`.

Fonte: [Cloudflare Stream webhooks — limitation](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#limitations), [assinatura](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#validate-webhook-signatures) e [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), consultadas em 2026-09-16.

## Evolução operacional

O source do roteador é publicado exclusivamente por GitHub Actions usando token Cloudflare
dedicado e de privilégio mínimo. O HMAC do Stream é um Secret GitHub distinto, gravado no Worker
pela própria esteira antes de publicar o source; ele não aparece em código ou logs. O painel do
provider não é fonte de código e mantém apenas URLs de destino e o Custom Domain. Enquanto somente homologação
é destino, a esteira controlada parte de `homolog`; antes de habilitar produção ela deve ser
promovida para uma esteira revisada de `main`.
