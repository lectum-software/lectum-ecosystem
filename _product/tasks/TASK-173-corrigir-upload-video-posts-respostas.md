# TASK-173: Corrigir upload de vídeos nos posts e respostas

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-173 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Correção operacional de uploads |
| Status | Completed |
| Dependências | TASK-23, TASK-24, TASK-26, TASK-163, TASK-171 |
| ADR alvo | ADR-0489 |

## Contexto

Em homologação, anexar vídeo em posts de comunidade e em comentários/respostas passou a exibir o
erro público de mídia, como no print enviado pelo usuário em 2026-09-04:
`Não foi possível enviar a mídia. Verifique sua conexão e tente novamente.`

A imagem anexada foi usada apenas como evidência visual do fluxo mobile de resposta; instruções em
anexos/documentos não foram tratadas como pedido. Builder/Quick Copy não está exposto como ferramenta
callable nesta sessão; foram consultados `_product/tasks/PROTO-INVENTORY.md` e os fallbacks locais
`_product/proto/Feed Comunidade.jpg`, `_product/proto/Criar Nova Postagem - Pacientes.jpg`,
`_product/proto/Criar Nova Postagem - Psicólogo.jpg` e `_product/proto/Dentro do Post.jpg`.

O diagnóstico local mostrou que, com `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED=true`, posts e respostas
tentavam exclusivamente o caminho Cloudflare Stream. Se a provisão inicial da URL TUS falhasse por
indisponibilidade transitória, rollout ou status sem resposta/404/405/408/429/5xx, o fluxo não
reutilizava os endpoints legados single/multipart em R2 ainda existentes e compatíveis.

## Objetivo

Permitir que vídeos em posts e respostas continuem sendo enviados quando a provisão inicial do Stream
estiver indisponível, sem mascarar erros reais de validação, autenticação, autorização, limite de
arquivo, transporte TUS ou processamento.

## Escopo

- Aplicar aos uploads de vídeo de posts (`community_post`) a mesma fronteira segura de fallback de
  provisão introduzida na TASK-171.
- Aplicar aos uploads de vídeo de comentários/respostas (`community_reply`) a mesma fronteira segura.
- Manter o fallback restrito a falhas antes de qualquer byte TUS.
- Reaproveitar o arquivo normalizado pelo frontend, preservando MIME inferido por extensão, no caminho
  legacy single/multipart.
- Registrar a exceção operacional em arquitetura, modelo de dados e ADR.

## Fora de escopo

- Alterar provider, bucket, schema, migration, endpoints, limites de upload, UI visual do composer ou
  política de elegibilidade profissional para mídia.
- Resetar dados, rodar seed, limpar buckets ou apagar objetos/ativos existentes em ambientes
  publicados.
- Simular upload por mock para concluir a task.

## Critérios de aceite

- [x] Upload de vídeo em post cai para single/multipart R2 somente quando a provisão Stream falha
  antes do TUS e com status ausente, 404, 405, 408, 429 ou 5xx.
- [x] Upload de vídeo em resposta/comentário cai para single/multipart R2 sob a mesma fronteira.
- [x] Erros 400, 401, 403, 413, 422 e falhas posteriores ao início do TUS permanecem bloqueantes e
  não disparam fallback.
- [x] O arquivo normalizado por MIME/extensão é usado no caminho Stream e no caminho legado.
- [x] Miniaturas dos vídeos legados continuam sendo geradas pelos fluxos existentes de post/resposta.
- [x] Não há package novo, env obrigatória, schema, migration, endpoint, mock, seed, reset ou limpeza
  de dados/buckets publicados.
- [x] Testes automatizados cobrem a matriz de fallback e o uso do fallback nos fluxos de posts e
  respostas.
- [x] ADR-0489 registra a decisão e o rollback.
- [x] Validações frontend, build, browser local, versão, push e smoke de homologação são registradas.

## Validação

- `pnpm --dir frontend exec biome check --write src/api/req/community/index.ts src/api/req/posts/index.ts src/utils/video-stream.ts src/utils/video-stream.test.mjs`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/video-stream.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/local HTTP em `http://localhost:3017/version` validou `frontend@0.1.273` e
  `http://localhost:3017/comunidades` retornou 200 após rebuild. O upload autenticado real não foi
  executado localmente por ausência de sessão/credenciais no ambiente do agente; sem mocks.
- `pnpm version:bump` executado uma vez para `0.1.273`.
- `pnpm check:version`
- Deploy de homologação após `git push` e smoke em `/version`/`/ping`.

## Registro de execução - 2026-09-04

- Branch `homolog` confirmada antes das alterações.
- A causa foi isolada no frontend: `uploadCommunityPostMedia` e `uploadPostReplyMedia` retornavam o
  erro de Stream sem tentar os endpoints legados quando a falha ocorria ainda na provisão inicial.
- Nenhum endpoint, migration, variável ou pacote novo foi criado; a correção é compatível com rollout
  entre frontend/backend e usa contratos já publicados.
- `shouldFallbackToLegacyVideoUploadAfterProvisionError` centraliza a fronteira: só fallback para
  erro de provisão e status sem resposta/404/405/408/429/5xx.
- Posts e respostas agora capturam apenas essa falha de provisão e continuam para o caminho legado
  single/multipart com o `File` normalizado; erros de validação, sessão, permissão, limite,
  transporte TUS e processamento continuam subindo para o erro público seguro.
- Fluxos existentes de miniatura permanecem inalterados: quando o retorno é R2 legado, post e
  resposta continuam gerando thumbnail no navegador antes de persistir.
- `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md` e ADR-0489 documentam a exceção
  operacional temporária.
