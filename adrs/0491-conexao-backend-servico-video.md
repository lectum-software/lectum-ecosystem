# ADR-0491: Conexão privada e autenticada do backend ao serviço de vídeo

## Status

Accepted

## Task relacionada

TASK-175 — Conexão autenticada do backend ao serviço de vídeo

## Contexto

O serviço `video/` está isolado em host dedicado e acessível ao servidor principal por WireGuard.
Um `GET /ready` executado manualmente dentro do container do backend provou a rota de rede, mas não
provou que o código do backend reconhece o contrato ou possui a mesma chave Bearer do serviço.

O processamento ainda não participa de nenhum fluxo de produto. Torná-lo dependência de readiness
ou disparar um job apenas para testar ampliaria o risco sem benefício.

## Decisão

- Criar cliente HTTP backend-only para a API `video/`, sem imports cruzados entre aplicações.
- Configurar por `VIDEO_PROCESSING_SERVICE_URL`, `VIDEO_SERVICE_API_KEY` e timeout opcional.
- Em runtime publicado, aceitar apenas origem com IP privado literal RFC1918/ULA. A comunicação
  atual usa HTTP dentro do túnel WireGuard; IP público, DNS e loopback são recusados.
- Recusar redirects para impedir que o Bearer seja encaminhado a outro destino.
- Limitar respostas JSON a 16 KiB e validar o envelope mínimo de readiness, versão e erro privado.
- Provar autenticação com GET sobre um ID inválido fixo. O `404 job_not_found` confirma que o Bearer
  ultrapassou o middleware sem criar, consultar ou remover job real.
- Entregar a verificação como operação compilada executada sob demanda. Não acoplar o serviço ao
  boot, `/health` ou `/ready` do backend enquanto nenhum fluxo de produto depender dele.
- Manter configuração opcional no primeiro rollout. Ausência/inconsistência falha somente no check.

## Alternativas consideradas

### Considerar apenas ping ou `/ready` público

Rejeitada porque confirma transporte e Redis/worker, mas não detecta chave divergente.

### Criar um job sintético em cada deploy

Rejeitada porque consome CPU/disco/fila, produz estado e transforma smoke em mutação desnecessária.

### Tornar o serviço dependência do `/ready` do backend

Rejeitada neste estágio: uma pane de processamento offline não deve retirar login, feed, pagamentos
ou playback Cloudflare Stream do ar.

### Usar domínio público/Cloudflare Proxy

Rejeitada porque a comunicação entre os dois hosts já possui WireGuard e não precisa ampliar a
superfície pública da API nem transportar a chave pela internet aberta.

## Segurança e estabilidade

- A chave existe apenas como secret de runtime nas duas aplicações e nunca vai ao browser.
- URL, chave, body remoto e mensagens cruas não aparecem nos logs do comando.
- Paths são constantes; usuário/API pública não controla o destino da requisição.
- Timeout curto e body limitado impedem espera/memória sem limite.
- O comando usa apenas GET e diferencia rede, readiness, contrato e autenticação por códigos
  internos controlados.

## Compatibilidade e rollout

1. No backend de homologação, cadastrar a URL WireGuard privada e a mesma API key da app `video/`;
   como o código anterior não lê essas envs, não é necessário um redeploy isolado.
2. Publicar o backend com configuração opcional; comportamento atual permanece idêntico.
3. Aguardar o deploy automático e executar `pnpm --dir backend video:check-processing-service` no
   container, ou chamar diretamente o artefato compilado da operação.
4. Validar também `/health`, `/ready` e `/ping` antes de considerar homologação concluída.
5. Repetir provisionamento/smoke em produção somente durante promoção revisada futura.

Rollback remove as envs ou reverte o cliente. Não há schema, migration, Redis/job, volume, R2 ou
Cloudflare Stream alterado.

## Packages

Nenhum package novo. O cliente usa `fetch`, `AbortSignal`, Web Streams e runner de testes do Node 22.
