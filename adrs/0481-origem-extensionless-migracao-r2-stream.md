# ADR-0481: Origem extensionless para importação R2 no Cloudflare Stream

## Status

Accepted

## Task relacionada

TASK-166 — Estabilizar origem pública da migração R2 para Stream

## Contexto

O primeiro dry-run publicado da TASK-165 confirmou um vídeo e recusou quatro no `HEAD` público. A
origem `/public/files/{key.ext}` atravessa Cloudflare Proxy. Para arquivos cacheáveis, a borda pode
converter `HEAD` em `GET` antes de consultar o Express; o header `Content-Range` que era produzido
somente no handler HEAD podia então desaparecer. O Stream exige uma origem publicamente roteável,
com HEAD e GET Range compatíveis, antes de copiar o arquivo.

O backend não deve transportar o vídeo pela operação Node, abrir acesso ao bucket privado, solicitar
uma nova env obrigatória nem enfraquecer o probe apenas para o dry-run passar.

## Decisão

- Criar endpoint público técnico `/public/video-stream-import/v1/{source}`.
- Codificar a object key como Base64URL canônico para o path terminar sem extensão.
- Limitar a decodificação aos prefixos de vídeo R2 já públicos e recusar query/traversal/UTF-8
  inválido.
- Confirmar no R2 que o objeto é vídeo antes de responder.
- Marcar a resposta como no-store para browser e CDN.
- Responder HEAD e GET Range com tamanho/range exatos; manter Content-Range também no fallback de
  GET integral dessa rota técnica.
- Manter `/public/files/*` e as referências persistidas inalteradas.
- Usar a rota somente como origem da operação de migração; playback novo permanece HLS assinado.
- Registrar apenas status, etapa, classe de cache e comparações booleanas quando o probe falhar.
- Fixar pnpm 10.33.0 no manifesto isolado do backend e desabilitar seleção automática de latest pelo
  Corepack. Compartilhar o cache preparado com o usuário `node`, bloquear rede do Corepack no
  runtime e provar a versão durante o build, evitando download ou mutação do container em execução.

## Alternativas consideradas

### Aceitar HEAD sem Content-Range

Rejeitada. Isso faria o dry-run passar sem provar o contrato que o próprio Stream espera e deslocaria
a falha para depois da criação do vídeo no provider.

### Adicionar Content-Range a todo GET legado

Rejeitada como caminho principal porque alteraria respostas usadas diretamente por browsers. O
fallback fica restrito ao endpoint técnico.

### URL pré-assinada direta do R2

Adiada. Exigiria package/contrato de assinatura adicional, colocaria uma credencial temporária na URL
registrada pelo provider e não é necessária enquanto o backend já serve esses objetos publicamente.

### DNS-only adicional para o backend

Rejeitada nesta correção por exigir nova configuração externa/env e ampliar a superfície de origem.
O path sem extensão resolve o comportamento padrão de cache sem alterar DNS.

## Consequências

- A importação não depende de o método recebido no origin permanecer HEAD.
- A URL técnica é reversível para quem já conhece o token, mas não concede acesso a objeto que não
  estivesse permitido em `/public/files/*`.
- O backend continua no caminho apenas enquanto o Stream busca o arquivo; reprodução não passa por
  ele depois da associação.
- Falhas futuras terão evidência sanitizada suficiente para orientar correção sem revelar mídia ou
  usuário.
- O comando `pnpm` no container usa a mesma versão da imagem sem baixar ferramenta ou propor
  reinstalação por drift.

## Rollout e rollback

1. Publicar em homologação sem executar apply.
2. Confirmar versão e saúde.
3. Repetir dry-run com cinco apresentações.
4. Se todos os itens esperados ficarem elegíveis, aplicar somente um e validar playback/autorização.
5. Ampliar lotes apenas após essa validação.

Rollback de código não remove dados nem objetos. A migration da TASK-165 permanece aplicada. Não há
env, schema ou package novo para desfazer.

## Validação

- Testes de codificação canônica e prefixos.
- Teste HTTP real local para HEAD, GET Range, no-store e query rejeitada.
- Teste do probe válido e do diagnóstico quando Content-Range some no CDN.
- Teste de alinhamento entre `packageManager` e Dockerfile.
- Checks/builds do backend e raiz antes do commit.
- Dry-run real após o deploy de homologação.

## Referências técnicas

- [Cloudflare Cache — interação de HEAD com a origem](https://developers.cloudflare.com/cache/concepts/cache-behavior/)
- [Cloudflare Cache — comportamento e extensões cacheáveis por padrão](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- [Cloudflare Stream — cópia/importação por URL](https://developers.cloudflare.com/api/resources/stream/subresources/copy/methods/create/)
