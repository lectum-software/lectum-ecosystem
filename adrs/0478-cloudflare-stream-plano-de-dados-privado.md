# ADR-0478: Cloudflare Stream como plano de dados privado de vídeo

## Status

Accepted

## Task relacionada

TASK-163 — Streaming privado de vídeos com Cloudflare Stream

## Contexto

Vídeos de apresentação, posts e respostas eram enviados ao R2 por meio do backend e reproduzidos
como arquivo único. Esse caminho preservava a autorização do domínio, porém transferia arquivos
grandes pelo Express, não oferecia bitrate adaptativo e produzia uma experiência instável em redes
móveis e em combinações diferentes de codec/container no Android e iPhone.

O produto já está publicado. A evolução precisa manter vídeos R2 existentes legíveis, tolerar
frontend e backend em versões diferentes e não exigir credenciais novas para o boot antes de elas
serem provisionadas.

## Decisão

Separar controle e transporte:

- o backend Lectum é o plano de controle: valida dono, papel, finalidade, contexto e limites;
  persiste `video_asset`; recebe webhook autenticado; decide quem pode assistir; e emite playback
  curto;
- Cloudflare Stream é o plano de dados dos novos vídeos: recebe upload TUS direto do navegador,
  processa variantes e entrega HLS diretamente ao player;
- campos legados de perfil/post/resposta armazenam apenas
  `/api/private/video-assets/:id/playback`; URLs R2 antigas continuam aceitas;
- cada ativo nasce com `requiresignedurls`, duração máxima, expiração do upload e `allowedorigins`
  definidos pelo servidor;
- reprodução de usuário exige sessão Lectum e ownership ou associação a conteúdo publicável;
  moderação usa endpoint e sessão Admin separados;
- o token de reprodução é JWT RS256 curto, mantido apenas em memória/cache do TanStack Query. O
  payload é assinado, não criptografado: o UID técnico pode ser lido no cliente, mas não constitui
  credencial nem decisão de autorização;
- Safari/iPhone usa HLS nativo; navegadores com MSE, inclusive Chrome/Android, usam `hls.js`;
- `tus-js-client` envia blocos de 5 MiB diretamente para a capability temporária do Stream;
- a cota por proprietário é reservada em transação serializável antes do provisionamento externo,
  evitando corrida de requisições paralelas; ativos preparados que não forem associados recebem
  cleanup best effort sem apagar conteúdo que o backend já reconheça como anexado;
- `fetch` e `node:crypto` implementam o adapter, assinatura e webhook; nenhum SDK Cloudflare é
  adicionado ao backend.

## Segurança

- Token de API, private key de signing e segredo de webhook são backend-only e nunca entram em
  respostas, logs, analytics ou banco.
- A URL TUS é devolvida apenas ao dono autenticado, validada contra
  `upload.videodelivery.net`, não é persistida e expira.
- O webhook valida `Webhook-Signature` sobre os bytes crus, com HMAC-SHA256, janela de cinco
  minutos e comparação constante.
- Eventos atrasados não podem regredir um ativo `ready` para `processing/error`; cancelamentos são
  soft delete e exclusão no provider é best effort.
- A associação pronta verifica finalidade, dono e contexto. No perfil, somente o ativo mais recente
  substitui o vídeo atual; ativos Stream anteriores são aposentados na transação e a remoção física
  no provider ocorre depois do commit, sem tornar a troca dependente da disponibilidade externa.
- O backend não faz proxy de manifesto/segmentos. URLs assinadas só atravessam o sanitizador nos
  campos estritos `hls_url` e `thumbnail_url` e no hostname esperado.
- Allowed Origins é defesa adicional, não substitui autenticação, expiração nem assinatura.

## Persistência e compatibilidade

- A migration cria `video_assets` de forma aditiva e a relação reversa em `user`; não altera nem
  preenche registros existentes.
- Colunas de vínculo existentes continuam nullable. Nenhum vídeo R2 é movido ou apagado.
- As duas flags desativadas preservam integralmente o caminho anterior antes da primeira associação
  Stream. Depois disso, a flag pública pode impedir novos uploads, mas o backend Stream precisa
  continuar ativo para reproduzir referências já persistidas.
- A API nova é aditiva. Backend novo aceita frontend antigo; frontend novo mantém fallback legado
  enquanto a flag pública estiver desligada.

## Packages

- `tus-js-client@4.3.1` no frontend para o protocolo TUS e cancelamento/retry.
- `hls.js@1.7.2` no frontend e Admin para reprodução adaptativa quando HLS nativo não existe.

As versões e finalidades ficam registradas em `_product/tasks/PACKAGES.md`.

## Consequências

- Uploads e segmentos deixam de consumir banda/CPU do backend Lectum.
- Cloudflare passa a processar e cobrar minutos armazenados/entregues.
- A reprodução depende da disponibilidade do provider, mas falha de configuração não derruba o
  boot enquanto a flag estiver desativada.
- Conteúdo anônimo não recebe playback nesta versão; perfil/post/resposta Stream exige login,
  conforme a política privada solicitada.
- Um serviço independente de transformação (compressão, marca d'água etc.) pode existir depois,
  sem entrar no caminho crítico do Stream.

## Produção e rollout

1. Aplicar migration e publicar backend com a flag desligada.
2. Provisionar credenciais, signing key, webhook e origens permitidas no ambiente alvo.
3. Ativar `CLOUDFLARE_STREAM_ENABLED=true` e validar `/ready`.
4. Publicar/ativar `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED=true` no frontend.
5. Validar perfil, post, resposta, moderação, cancelamento e browsers móveis.
6. Repetir em produção somente após homologação aprovada.

Rollback: desligar a flag pública para impedir novos uploads e manter backend/configuração Stream
ativos para leitura dos vídeos já associados. A flag backend só pode ser desligada antes do
primeiro vínculo Stream ou depois de uma migração explícita de referências. Não excluir tabela,
ativos Stream ou objetos R2 durante rollback.

## ALERTA DE DEPLOY

As envs abaixo são novas, sem valores neste documento:

- backend: `CLOUDFLARE_STREAM_ENABLED`, `CLOUDFLARE_STREAM_ACCOUNT_ID`,
  `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_STREAM_CUSTOMER_CODE`,
  `CLOUDFLARE_STREAM_SIGNING_KEY_ID`, `CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY_BASE64`,
  `CLOUDFLARE_STREAM_WEBHOOK_SECRET`, `CLOUDFLARE_STREAM_ALLOWED_ORIGINS`;
- backend opcionais: `CLOUDFLARE_STREAM_PLAYBACK_TTL_SECONDS`,
  `CLOUDFLARE_STREAM_REQUEST_TIMEOUT_MS`, `CLOUDFLARE_STREAM_UPLOAD_EXPIRY_SECONDS`,
  `CLOUDFLARE_STREAM_MAX_DURATION_SECONDS`;
- frontend pública/build-time: `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED`.

Elas devem ser configuradas na ordem descrita acima. Se a flag backend for ativada sem configuração
completa, `/ready` retorna 503 e somente os endpoints Stream falham fechados. Se a flag frontend for
ativada antes do backend, novos uploads de vídeo falham com mensagem pública controlada.

## Validação

- Migration em PostgreSQL local descartável, sem reset de ambiente publicado.
- Testes de configuração fail-closed, contrato TUS, domínio da capability, estados do provider,
  JWT RS256, HMAC do webhook, referência estável, autorização e seleção HLS.
- Checks/builds de backend, frontend e Admin; auditoria de dependências; validação mobile-first e
  smoke de homologação com flags inicialmente desligadas.
