# ADR-0489: Fallback restrito na provisão de vídeos de posts e respostas

## Status

Accepted

## Task relacionada

TASK-173 - Corrigir upload de vídeos nos posts e respostas

## Contexto

A TASK-163 definiu Cloudflare Stream como plano de dados para novos vídeos de comunidade. Quando a
flag pública de Stream está ativa, o frontend tenta provisionar um `video_asset` e enviar o arquivo
por TUS direto ao provider antes de criar o post ou a resposta.

Após a estabilização do vídeo de apresentação na TASK-171, os fluxos de posts e respostas ainda
seguiam exclusivamente o caminho Stream. Se a provisão inicial ficasse indisponível por rollout,
timeout, ausência temporária de rota ou erro 5xx, a UI mostrava o erro público genérico de mídia e
bloqueava a publicação, mesmo com os endpoints legados single/multipart em R2 ainda existentes e
compatíveis com os contratos `community_post.media_url` e `post_reply.media_url`.

## Decisão

- Reutilizar a fronteira operacional da TASK-171 também para os propósitos `community_post` e
  `community_reply`.
- Marcar como elegível a fallback apenas a falha de provisão inicial do Stream, antes de qualquer
  byte TUS ser enviado.
- Permitir fallback legado single/multipart em R2 somente quando a falha de provisão tiver status
  ausente, `404`, `405`, `408`, `429` ou `5xx`.
- Manter bloqueantes os erros `400`, `401`, `403`, `413`, `422` e qualquer erro de transporte,
  upload TUS concluído ou processamento, para não mascarar validação, sessão, permissão, limite,
  arquivo inválido ou duplicidade de vídeo.
- Reusar o arquivo já normalizado pelo frontend para preservar MIME inferido por extensão antes de
  chamar os endpoints legados.

## Alternativas consideradas

### Desativar `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED`

Rejeitada como correção principal. A flag pode ser útil como contenção operacional, mas deixaria toda
a escrita nova fora da arquitetura alvo e dependeria de ação manual de deploy.

### Fallback em qualquer erro de Stream

Rejeitada. Depois que uma URL TUS foi emitida ou o upload começou, o ativo Stream pode ficar pronto
mais tarde; cair para R2 nesse estágio criaria dois candidatos concorrentes para o mesmo conteúdo.

### Expor erro técnico ao usuário

Rejeitada. O erro público deve continuar seguro, sem provider, rota interna, stack, token, URL TUS ou
detalhes de infraestrutura.

## Consequências

- Posts e respostas com vídeo continuam publicáveis durante indisponibilidade transitória da provisão
  Stream, usando o caminho R2 já existente.
- Durante a janela de fallback, `community_post.media_url` e `post_reply.media_url` podem voltar a
  armazenar URLs públicas R2, que já são suportadas por leitura, thumbnails, OG e migração segura.
- A exceção é compatível com rollout independente entre frontend/backend e não adiciona schema,
  endpoint, env, package, provider, bucket, mock, seed, reset ou limpeza de dados publicados.
- Rollback simples reverte o commit; se a provisão Stream falhar novamente após rollback, o usuário
  volta a ver o erro público de mídia nesses fluxos.

## Validação

- Teste frontend cobre a matriz de status e a restrição de fallback a erro de provisão.
- Teste estático garante que posts e respostas usam o arquivo normalizado e caem para os endpoints
  legados quando a provisão Stream falha dentro da fronteira permitida.
- `frontend check`, `frontend build`, `pnpm check`, browser local e smoke de homologação.
