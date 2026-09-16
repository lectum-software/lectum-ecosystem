# ADR-0509 — Roteador único de webhook Stream multiambiente

Data: 2026-09-16

## Status

Aceita; publicação no provider pendente.

## Contexto

Homologação e produção usam a mesma conta Cloudflare Stream por decisão de cobrança. A Cloudflare
aceita uma única inscrição de webhook por conta, enquanto cada backend Lectum precisa receber apenas
os eventos de seus próprios vídeos. Trocar a inscrição diretamente entre ambientes quebraria o outro
ambiente. Criar outro backend, transportar vídeo por ele ou usar R2 não resolve o limite e aumenta
superfície operacional.

## Decisão

Usar um Cloudflare Worker dedicado como roteador de eventos pequenos. Ele valida `Webhook-Signature`
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

Fonte: [Cloudflare Stream webhooks — limitation](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#limitations), [assinatura](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#validate-webhook-signatures) e [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), consultadas em 2026-09-16.

## Evolução operacional

O source do roteador é publicado exclusivamente por GitHub Actions usando token Cloudflare
dedicado e de privilégio mínimo. O painel do provider não é fonte de código: apenas mantém
segredo, destinos e rota. Enquanto somente homologação é destino, a esteira controlada parte de
`homolog`; antes de habilitar produção ela deve ser promovida para uma esteira revisada de `main`.
