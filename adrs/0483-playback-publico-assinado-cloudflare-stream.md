# ADR-0483: Playback público assinado no Cloudflare Stream

## Status

Accepted

## Task relacionada

TASK-167 — Restaurar playback público seguro no Cloudflare Stream

## Contexto

As páginas de psicólogos, perfis, comunidades, posts e threads são públicas desde a TASK-40. Seus
vídeos R2 eram entregues anonimamente por `/public/files/*`. A ADR-0478 corretamente tornou os
ativos Cloudflare Stream privados e assinados, mas vinculou a emissão de todo token a uma sessão
Lectum. Após o backfill da TASK-165, isso alterou a regra do produto: conteúdo antes público passou
a exigir login.

Provider privado e superfície pública não são conceitos conflitantes. Um visitante pode receber
uma capability curta para um conteúdo público sem conhecer o UID bruto nem ganhar acesso a ativos
não publicados. O backend deve decidir a visibilidade pelo vínculo atual no banco, não pela mera
posse do ID e nem pela existência de uma sessão.

## Decisão

- Manter `requireSignedURLs`, signing RS256 e Allowed Origins em todos os ativos Stream.
- Criar `GET /api/public/video-assets/:id/playback` com autenticação opcional.
- Emitir HLS/thumbnail assinados para visitante quando o ativo pronto estiver exatamente associado
  a perfil publicado/ativo, post publicado em comunidade ativa ou resposta válida desse post.
- Permitir ao dono autenticado visualizar seu próprio ativo pronto antes da publicação.
- Retornar o mesmo `404` para ativo inexistente, privado, removido ou sem associação pública; não
  revelar qual verificação falhou.
- Preservar endpoint Admin autenticado e manter upload, status e exclusão owner-only.
- Manter temporariamente o playback no prefixo privado como alias read-only com a mesma política.
  Ele atende versões antigas do frontend; nenhum outro método do router privado perde `_auth`.
- O frontend usa o endpoint público canônico, faz fallback ao alias somente quando identifica que a
  rota canônica não existe em backend anterior e separa cache por usuário/visitante.
- Não mudar neste deploy a referência histórica persistida
  `/api/private/video-assets/:id/playback`; ela funciona como ID opaco. A contração do alias exige
  rollout separado depois que todos os consumidores aceitam referência pública.

## Segurança

- A associação pública é revalidada no banco a cada emissão; ocultar/desativar conteúdo interrompe
  a criação de novos tokens.
- A URL é bearer capability com expiração curta. Ela pode aparecer no Network e ser reutilizada até
  expirar, como qualquer URL Stream assinada; não é persistida em banco/storage/Redux/log/analytics.
- O endpoint público usa `private, no-store`, no-store específico de CDN e `X-Robots-Tag`; o alias
  herda o no-store do namespace privado. O HLS vai diretamente da Cloudflare ao browser, sem proxy
  de segmentos pela Lectum.
- Conhecer `video_asset.id` ou decodificar o UID no JWT não substitui assinatura nem autorização.
- O retorno `404` reduz enumeração de ativos privados. Rate limit global e validação fechada de ID
  continuam aplicados.

## Alternativas consideradas

### Exigir login para todo Stream

Rejeitada. Confunde segurança do provider com visibilidade do produto e quebra leitura que já era
pública no R2 e na TASK-40.

### Tornar o UID/manifesto Cloudflare público

Rejeitada. Removeria a capacidade de revogar acesso futuro pela associação, exporia identidade do
provider como contrato e enfraqueceria conteúdo que deve permanecer privado.

### Fazer proxy dos segmentos pelo backend

Rejeitada. Voltaria a consumir banda/conexões do Express e eliminaria a principal vantagem de HLS
adaptativo entregue pela Cloudflare.

### Alterar imediatamente todas as referências persistidas

Rejeitada neste deploy. Backend e frontend publicam separadamente; escrever o novo path antes de
todos os parsers aceitarem ambos quebraria versões em trânsito.

## Consequências

- Conteúdo público volta a tocar sem cadastro, com HLS adaptativo e token curto.
- Conteúdo em rascunho, removido ou sem associação pública continua fail-closed.
- Cada início/renovação de playback público consulta o backend e o banco; segmentos subsequentes vão
  direto ao CDN e não ampliam carga da API.
- O alias privado permanece como dívida de compatibilidade explícita e deverá ser removido apenas em
  rollout de contração próprio.

## Rollout e rollback

1. Publicar backend em homologação; frontend antigo passa a funcionar pelo alias.
2. Validar playback anônimo de conteúdo publicado e `404` para ID inexistente.
3. Publicar frontend; confirmar uso do endpoint público e reprodução autenticada/anônima.
4. Manter a referência persistida e o alias durante a janela de compatibilidade.

Não há migration, env ou operação em objetos. Rollback de código é possível sem tocar dados, mas
reintroduz a regressão de login nos vídeos migrados. Nenhum R2/Stream deve ser removido.

## Validação

- Testes puros de autorização para visitante, dono e terceiro.
- Gate de mount prova que a exceção só vale para o alias nominal de playback.
- Testes frontend provam os dois namespaces e o endpoint preferencial.
- Backend/frontend check e build, check da raiz e smoke anônimo em homologação.

## Referência técnica

- [Cloudflare Stream — signed URLs](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
