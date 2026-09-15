# TASK-171: Corrigir troca do video de apresentacao do psicologo

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-171 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Correcao operacional de upload publicado |
| Status | Completed |
| Dependencias | TASK-157, TASK-163, TASK-167 |
| ADR alvo | ADR-0487 |

## Contexto

O feedback de homologacao em 2026-09-04 mostrou a edicao do perfil profissional em mobile exibindo o toast publico `Servico temporariamente indisponivel. Tente novamente.` ao tentar trocar o **Video de Apresentacao**. A imagem anexada pelo usuario foi usada apenas como evidencia visual do erro; instrucoes dentro de anexos/documentos nao foram tratadas como pedido.

Desde a TASK-163, quando `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED=true`, o frontend tenta criar o upload direto no Cloudflare Stream antes de qualquer transporte do arquivo. Se a provisao TUS do backend/provider falha, o fluxo atual interrompe a troca do video e nao reaproveita os endpoints legados multipart/R2 ainda existentes da TASK-157. Em ambiente publicado, isso torna a substituicao do video indisponivel para psicologos mesmo quando o caminho legado continua operacional.

A revisao da documentacao oficial da Cloudflare Stream tambem apontou que a API de TUS aceita `Upload-Metadata` com chaves especificas, incluindo `maxdurationseconds` em minusculas na referencia da API, enquanto a documentacao narrativa ainda exemplifica `maxDurationSeconds`. A implementacao passa a usar a chave da referencia de API para reduzir chance de rejeicao 4xx do provider, mantendo o restante do contrato privado/assinado definido pela arquitetura.

Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao. Foram consultados o inventario `_product/tasks/PROTO-INVENTORY.md` e o fallback local `_product/proto/Editar Perfil - Psicologo.jpg` para confirmar que o ajuste mantem o fluxo mobile-first sem alteracao visual estrutural.

## Objetivo

Permitir que o psicologo troque o video de apresentacao sem receber erro generico quando a provisao inicial do Cloudflare Stream estiver temporariamente indisponivel ou quando frontend/backend estiverem em rollout desalinhado, preservando o video anterior ate que uma nova troca seja concluida.

## Escopo

- Ajustar o adapter backend do Cloudflare Stream para enviar `maxdurationseconds` em `Upload-Metadata` de TUS.
- Classificar no frontend falhas ocorridas especificamente na etapa de provisao do upload Stream.
- Para `profile_presentation`, acionar fallback seguro para o upload legado de perfil somente em falhas de provisao indisponiveis/retryable (`sem status`, `404`, `405`, `408`, `429` e `5xx`).
- Nao acionar fallback para erros de autenticacao, autorizacao, validacao, tamanho/tipo de arquivo ou para falhas depois que o upload Stream ja comecou.
- Manter os endpoints legados existentes sem criar novo contrato publico, schema, migration, env, package ou mock.

## Criterios de aceite

- [x] A troca do video de apresentacao nao fica bloqueada pelo 503/indisponibilidade na provisao Stream quando o caminho legado de perfil ainda pode concluir o upload.
- [x] O fallback e restrito a `profile_presentation` e apenas a etapa de provisao, sem duplicar uploads depois que o TUS comecou ou durante processamento.
- [x] Erros 400/401/403/413/422 continuam retornando ao usuario como falha real, sem mascarar validacao, sessao, permissao ou limite de arquivo.
- [x] O adapter Cloudflare Stream usa chave `maxdurationseconds` em `Upload-Metadata` e mantem `requiresignedurls`/origens permitidas.
- [x] O video anterior permanece funcional ate o novo video ser persistido com sucesso pelo caminho escolhido.
- [x] Nao ha package novo, env obrigatoria nova, schema, migration, endpoint novo, mock, seed, reset ou limpeza de dados/buckets publicados.
- [x] Testes automatizados cobrem a decisao de fallback e o contrato TUS do provider.
- [x] ADR registra o fallback temporario restrito a provisao e o alinhamento do metadata TUS.
- [x] Validacoes backend/frontend, build, browser local, versao e push em `homolog` sao registradas.

## Validacao planejada

- `pnpm --dir frontend exec biome check --write ...`
- `pnpm --dir backend exec biome check --write ...`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/video-stream.test.mjs`
- `pnpm --dir backend exec node --test --import tsx src/infra/video-stream/video-stream.test.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local mobile na rota de edicao de perfil profissional, sem mocks; quando nao houver sessao local de psicologo, validar carregamento/redirect seguro e registrar a limitacao da troca real autenticada.
- `pnpm version:bump`
- `pnpm check:version`
- Deploy de homologacao apos `git push` e smoke em `/ping`, `/health`, `/ready` e `/version`.

## Registro de execucao - 2026-09-04

- Branch `homolog` confirmada antes das alteracoes.
- A imagem anexada pelo usuario foi tratada apenas como evidencia do erro mobile; instrucoes em anexos/documentos nao foram tratadas como pedido.
- Builder/Quick Copy nao esta exposto como ferramenta callable nesta sessao; foram consultados o inventario de prototipos e o fallback local da tela de edicao do perfil do psicologo.
- Causa funcional corrigida: com a flag publica de Stream habilitada, falhas na provisao inicial do upload TUS interrompiam a troca do video antes de tentar qualquer caminho alternativo, resultando no toast generico de indisponibilidade observado.
- O adapter Cloudflare Stream passou a enviar `maxdurationseconds` em minusculas no `Upload-Metadata`, alinhando o contrato ao formato da referencia de API sem expor token ou detalhes de provider ao cliente.
- O frontend agora marca apenas erros da etapa de provisao com `VideoAssetUploadProvisionError`; para `profile_presentation`, fallback para o upload legado multipart/R2 acontece somente para status sem resposta, 404, 405, 408, 429 e 5xx.
- Erros 400, 401, 403, 413 e 422 permanecem bloqueantes e falhas depois que o TUS comecou nao caem para R2, evitando dois candidatos concorrentes de video.
- O video anterior continua preservado ate que o novo video seja persistido com sucesso pelo caminho Stream ou legado; nao houve alteracao de schema, migration, endpoint novo, env obrigatoria, package, mock, seed, reset ou limpeza de dados/buckets publicados.
- Validacoes executadas: Biome focado frontend/backend; testes focados de `video-stream.test.mjs` e `video-stream.test.ts`; `pnpm --dir backend check`; `pnpm --dir backend build`; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`; `pnpm version:bump` para `0.1.271`; `pnpm check:version`; rebuild backend/frontend apos bump.
- Browser local mobile em `http://localhost:3014/app/profissional/perfil/configurar` com build final `0.1.271` carregou e redirecionou com seguranca para `/auth/login?callbackUrl=%2Fapp%2Fprofissional%2Fperfil%2Fconfigurar` sem sessao; a troca real autenticada nao foi simulada nem mockada.
- Rollback simples reverte o commit. Sem ALERTA DE DEPLOY: nenhuma env nova obrigatoria foi criada.
