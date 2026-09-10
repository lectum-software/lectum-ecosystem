# TASK-177: Backend como fonte única dos limites de vídeo

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-177 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Estabilidade operacional de uploads |
| Status | Completed |
| Dependências | TASK-157, TASK-159, TASK-163, TASK-171, TASK-173 |
| ADR alvo | ADR-0495 |

## Contexto

Os novos vídeos usam Cloudflare Stream por TUS, mas o frontend ainda recusava arquivos com limites
numéricos próprios: 200 MB para posts/respostas e 300 MB como fallback da apresentação. Isso fazia
uma alteração válida nas envs do backend continuar bloqueada pelo bundle antigo e criava duas fontes
de verdade.

O backend já recebe finalidade, MIME e tamanho antes de emitir a URL TUS. Portanto, ele consegue
recusar um arquivo excedente antes de qualquer byte do vídeo ser enviado ao provider. Os caminhos
legados multipart também validam o total na iniciação, antes das partes.

## Objetivo

Manter os limites máximos de vídeos exclusivamente nas envs do backend, sem validação numérica no
frontend, e devolver ao usuário o limite efetivo da finalidade em uma mensagem pública segura.

## Escopo

- Remover guards numéricos de vídeo na seleção, preparação e fallback de transporte do frontend.
- Preservar validação client-side de formato e os limites locais de imagens.
- Fazer a provisão Stream diferenciar arquivo excedente de MIME/metadado inválido.
- Responder arquivo excedente com código semântico e limite efetivo derivado da env do backend.
- Preservar upload TUS direto e validação antes do transporte dos bytes.
- Documentar quais envs controlam o total por finalidade e quais existem somente para transporte
  legado simples/chunk.

## Fora de escopo

- Alterar os valores atuais das envs ou seus fallbacks.
- Remover os endpoints legados R2, mudar Cloudflare Stream ou alterar duração máxima.
- Remover limites defensivos absolutos do backend.
- Alterar limites de imagem, thumbnail, avatar, capa, documento ou Admin.
- Criar schema, migration, seed, reset, backfill ou limpeza de R2/Stream.
- Adicionar package ou mock.

## Critérios de aceite

- [x] Vídeos de apresentação, posts e respostas não são recusados no frontend por tamanho.
- [x] Imagens continuam com a proteção client-side existente.
- [x] O backend recusa vídeo acima da env da finalidade antes de emitir a URL TUS.
- [x] A resposta de limite usa código semântico e mensagem PT-BR com o valor efetivo do backend.
- [x] O frontend preserva a mensagem segura do backend sem substituir o valor por 200/300 MB.
- [x] Fallbacks legados não enviam vídeo grande por endpoint simples por causa de número hardcoded.
- [x] Não há package, schema, migration, seed, reset, backfill ou limpeza de dados/buckets.
- [x] Arquitetura, env example, README de tasks e ADR registram a decisão e o rollout.
- [x] Testes, checks, builds, versão, commit, push e smoke de homologação são registrados.

## Referência visual

- `_product/tasks/PROTO-INVENTORY.md` foi consultado para os fluxos de perfil, criação de post e
  detalhe/resposta.
- A mudança preserva layout; apenas a origem da validação e a mensagem de erro são alteradas.
- Builder/Quick Copy não está disponível como ferramenta callable nesta sessão; os fallbacks locais
  permanecem `_product/proto/Editar Perfil - Psicólogo.jpg`,
  `_product/proto/Criar Nova Postagem - Psicólogo.jpg` e `_product/proto/Dentro do Post.jpg`.

## Deploy

- Sem env nova obrigatória. As chaves já existentes continuam opcionais e com fallback seguro.
- Os limites totais de vídeo são:
  - `UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB` para apresentação;
  - `UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MULTIPART_MB` para post;
  - `UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB` para resposta/comentário.
- `*_SIMPLE_MB` e `*_MULTIPART_CHUNK_MB` protegem apenas transportes legados; não devem ser usados
  como total do upload Stream.
- Para alterar um limite em homologação, configurar a env total no backend antes ou junto do deploy.
  Ausência mantém o fallback atual, sem impedir o boot.
- Backend novo + frontend antigo é seguro, mas o bundle antigo ainda pode bloquear no cliente até
  atualizar. Frontend novo + backend antigo continua submetendo metadados ao backend e respeitando a
  resposta publicada, ainda que o erro Stream antigo seja mais genérico.
- Rollback simples restaura os guards locais; não altera ativos, objetos, banco ou provider.

## Validação planejada

- Testes unitários de fronteira no backend para tamanho exato, primeiro byte excedente e MIME.
- Testes unitários no frontend para confirmar que vídeo não cria erro local e imagem continua
  protegida.
- Teste da mensagem dinâmica de limite recebida da API.
- `pnpm --dir backend check` e `pnpm --dir backend build`.
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check`, `pnpm version:bump`, `pnpm check:version` e `git diff --check`.
- Smoke local das rotas públicas; upload real maior que 200 MB fica para homologação, sem mock.

## Notas de execução

- Branch `homolog` confirmada antes da edição.
- A causa do teto de 200 MB em posts foi confirmada: a env total
  `UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MULTIPART_MB` não estava na lista operacional apresentada e,
  quando ausente, o backend usa o fallback seguro de 200 MB.
- A política compartilhada do backend passou a validar finalidade, MIME e tamanho antes de consultar
  ou provisionar o Cloudflare Stream. Excesso retorna `413/exceeded_file_limit` com o valor da env;
  metadado inválido retorna `422/video_upload_invalid`.
- O frontend deixou de aplicar teto numérico em vídeo nos fluxos de apresentação, post e resposta,
  inclusive durante preparação e fallback legado. Imagens continuam com o guard local existente.
- Testes completos passaram com 283 casos no backend e 117 no frontend; os testes focados cobrem as
  três envs, fronteira exata, primeiro byte excedente, imagens e mensagem pública dinâmica.
- `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check` e
  `pnpm --dir frontend build` passaram antes do gate final.
- Os cinco manifests foram incrementados uma única vez de `0.1.308` para `0.1.309`, e
  `pnpm check:version` confirmou sincronização.
- `pnpm check` passou em `0.1.309`; backend e frontend foram compilados novamente após o bump.
- Smoke local do frontend buildado: `/version` respondeu HTTP 200, `no-store`, `noindex` e
  `0.1.309`; Chrome headless em viewport 390x844 renderizou a mesma versão. A rota privada de
  configuração de perfil redirecionou para autenticação sem expor conteúdo.
- Sem alteração de banco, migration, seed, reset, backfill, bucket, ativo Stream, package ou env
  obrigatória nova.
- Commit/push e smoke de homologação são concluídos no fechamento operacional da task.
