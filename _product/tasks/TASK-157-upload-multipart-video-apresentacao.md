# TASK-157: Upload multipart do vídeo de apresentação

## Metadata

| Campo | Valor |
| --- | --- |
| Status | Completed |
| Owner | Codex |
| Criada em | 2026-08-20 |
| Concluída em | 2026-08-20 |
| Dependências | TASK-03, TASK-18A, TASK-26, TASK-146 |
| ADR alvo | ADR-0463 |

## Contexto

O vídeo de apresentação do psicólogo era enviado em um único `POST multipart/form-data` para
`/api/private/psychologist/free-profile/video`. O endpoint declarava limite de 50 MB e o storage
carregava o arquivo inteiro antes de gravá-lo no R2. Em homologação, um vídeo real de cerca de
250 MB recebeu `413 Content Too Large` no domínio proxied da API.

O `413` pode ser emitido pela Cloudflare antes de a requisição chegar ao Express: em 2026-08-20, a
documentação oficial informa limite de request de 100 MB nos planos Free/Pro, 200 MB no Business e
500+ MB no Enterprise. A documentação do R2 recomenda multipart para vídeos/arquivos grandes, com
partes de 5 MiB a 5 GiB. A correção não deve depender de upgrade do plano Cloudflare, DNS sem proxy
ou aumento de memória do backend.

O projeto já possui o padrão de upload multipart server-side em chunks de 5 MiB para mídia de
respostas (TASK-26/ADR-0452). Esta task leva o mesmo padrão ao vídeo de apresentação sem quebrar o
endpoint simples existente.

No primeiro smoke autenticado após a publicação da versão `0.1.154`, a rota de parte respondeu
`400 upload_error` antes de alcançar o R2. A reprodução local com o mesmo middleware mostrou que o
Busboy/Multer dispara `partsLimit` quando o contador fica **igual** ao threshold: configurar `3`
rejeitava justamente as três partes válidas (`uploadSessionId`, `partNumber` e `chunk`). A mesma
semântica atingia um arquivo exatamente igual ao teto de `fileSize`. O ajuste pós-feedback mantém os
limites públicos inclusivos e configura os thresholds internos uma unidade acima, sem ampliar o
máximo efetivamente aceito.

No segundo smoke, já na versão `0.1.155`, o DevTools confirmou o contrato exato da request: somente
`uploadSessionId`, `partNumber=1` e o binário de um arquivo `.mov`. Isso eliminou nome de field e
quantidade de partes como causa. A validação binária restante considerava apenas `major_brand` na
posição fixa do primeiro `ftyp`; MOV/QuickTime válido também pode declarar compatibilidade em
`compatible_brands`, posicionar `ftyp` após átomos de preenchimento ou, em arquivos legados, não
possuir `ftyp`. O ajuste passa a interpretar as caixas ISO BMFF necessárias, mantém HEIC e estruturas
malformadas rejeitados e retorna códigos públicos distintos para sessão, tamanho de parte e conteúdo,
sem revelar token, key, ETag ou detalhe do R2.

Depois da publicação da versão `0.1.156`, foi solicitada observabilidade operacional para permitir
acompanhar novos uploads diretamente no terminal do container. O fluxo passa a emitir eventos
estruturados com um `traceId` aleatório persistido somente dentro da sessão criptografada. O mesmo
identificador correlaciona início, partes, conclusão, persistência e abort sem registrar usuário,
nome do arquivo, sessão, `UploadId`, key, ETag ou mensagem crua do provider. Rejeições do parser,
anteriores à leitura da sessão, registram apenas escopo, limite e motivo controlado.

## Objetivo

Permitir upload autenticado de vídeos de apresentação de até 300 MB por partes pequenas, com
validação de tipo e tamanho, retry transitório, abort best-effort, progresso visível e persistência
do `video_url` somente depois que o objeto multipart estiver completo no R2. Centralizar também os
limites de todos os endpoints Multer em envs opcionais independentes, sem exigir alteração de código
quando homologação e produção precisarem de políticas diferentes.

## Referência visual

- Builder Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
- O Builder não está exposto como ferramenta neste cliente; a validação usou o fallback auditável
  `_product/proto/Editar Perfil - Psicólogo.jpg`.
- A referência mostra a área **Vídeo de Apresentação** mobile-first. A task preserva sua hierarquia e
  acrescenta somente limite dinâmico, loading e progresso, necessários ao upload longo.

## Inventário Multer e configuração

Todos os valores abaixo são inteiros em MB, opcionais e lidos pelo backend no boot. Valor ausente,
vazio, fracionado ou fora do intervalo seguro usa o fallback, portanto nenhuma chave é pré-requisito
de deploy.

| Endpoint binário | Env | Fallback | Transporte |
| --- | --- | ---: | --- |
| `POST /api/admin/private/communities/:id/avatar` | `UPLOAD_LIMIT_ADMIN_COMMUNITY_AVATAR_MB` | 5 | simples |
| `POST /api/admin/private/settings/seo/:page_key/og-image` | `UPLOAD_LIMIT_ADMIN_SEO_OG_IMAGE_MB` | 5 | simples |
| `POST /api/private/community/:slug/posts/media` | `UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MB` | 200 | simples |
| `POST /api/private/patient/profile/avatar` | `UPLOAD_LIMIT_PATIENT_AVATAR_MB` | 5 | simples |
| `POST /api/private/posts/:id/replies/media` | `UPLOAD_LIMIT_POST_REPLY_MEDIA_SIMPLE_MB` | 200 | simples/legado |
| `POST /api/private/posts/:id/replies/media/multipart/part` | `UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_CHUNK_MB` | 10 | parte multipart |
| `POST /api/private/psychologist/free-profile/avatar` | `UPLOAD_LIMIT_PSYCHOLOGIST_AVATAR_MB` | 5 | simples |
| `POST /api/private/psychologist/free-profile/cover-image` | `UPLOAD_LIMIT_PSYCHOLOGIST_COVER_IMAGE_MB` | 5 | simples |
| `POST /api/private/psychologist/free-profile/video` | `UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB` | 50 | simples/legado |
| `POST /api/private/psychologist/free-profile/video/multipart/part` | `UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_CHUNK_MB` | 10 | parte multipart |
| `POST /api/private/psychologist/free-profile/video/cover` | `UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_COVER_MB` | 5 | simples |

Os limites totais declarados nas iniciações multipart usam
`UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB` (200 MB) e
`UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB` (300 MB). A env `*_CHUNK_MB` é o teto defensivo do
Multer para a request de parte; o tamanho operacional retornado ao cliente permanece fixo em 5 MiB
para ficar muito abaixo do proxy e cumprir o mínimo do R2. Upload simples continua sujeito também ao
menor limite existente no caminho (Cloudflare, reverse proxy ou ingress), mesmo se a env for maior.

## Escopo técnico

### Backend

1. Manter `POST /api/private/psychologist/free-profile/video` com limite legado de 50 MB para
   clientes antigos e arquivos pequenos.
2. Adicionar, de forma aditiva:
   - `POST /video/multipart/initiate`;
   - `POST /video/multipart/part`;
   - `POST /video/multipart/complete`;
   - `DELETE /video/multipart`.
3. Reutilizar as credenciais R2 e `JWT_SECRET_KEY` atuais; não criar env obrigatória nem package.
4. Centralizar as 13 envs opcionais de limite em `backend/src/config/multer/limits.ts`, com fallback
   seguro e tetos de 100 MB para imagens, 500 MB para requests simples, 50 MB por parte e 5 GiB no
   total multipart. Fluxos que alternam entre simples e multipart não aceitam configuração abaixo
   de 5 MB, preservando o limiar usado pelos clientes publicados.
5. Vincular sessão e partes criptografadas ao usuário, escopo e recurso do perfil, com expiração.
6. Aceitar apenas MP4, MOV/QuickTime e WebM, validar assinatura binária no primeiro chunk e limitar
   o arquivo declarado/efetivo a 300 MB.
7. Enviar chunks de 5 MiB ao R2, sem carregar o vídeo completo na memória do backend.
8. Revalidar role, perfil, verificação profissional e entitlement do Plano Profissional antes de
   iniciar e antes de concluir.
9. Atualizar o banco somente após `CompleteMultipartUpload`; em falha posterior, remover apenas o
   novo objeto recém-criado em best-effort, sem tocar em mídia anterior.
10. Tratar os thresholds exclusivos do Busboy/Multer sem rejeitar a quantidade exata de partes nem
    um arquivo exatamente no limite anunciado; continuar rejeitando uma parte/byte adicional.
11. Interpretar `major_brand` e `compatible_brands`, localizar `ftyp` após átomos de preenchimento e
    reconhecer somente átomos QuickTime legados plausíveis quando `ftyp` estiver ausente.
12. Diferenciar rejeição de sessão, tamanho de parte e assinatura em códigos/mensagens públicas
    acionáveis, sem expor a razão criptográfica ou detalhes do storage.
13. Registrar eventos `UPLOAD_MULTIPART_*` para parser, início, cada parte, conclusão, persistência e
    abort, com whitelist de campos operacionais e classificação controlada de falha.
14. Manter compatibilidade com sessões criadas antes da observabilidade: `traceId` é opcional na
    leitura e obrigatório apenas para sessões novas, sem invalidar uploads iniciados no rollout.

### Frontend

1. Usar upload simples apenas até 5 MiB e multipart acima desse limiar.
2. Normalizar MIME por `File.type` e extensão conhecida para arquivos mobile.
3. Fazer até três tentativas por chunk apenas para falhas transitórias.
4. Abortar a sessão multipart em falha conhecida.
5. Exibir validação imediata para formato e limite de 300 MB.
6. Exibir progresso percentual acessível durante envio, inclusive ao trocar um vídeo existente.
7. Em rollout com backend antigo, permitir fallback simples somente quando o arquivo couber no
   contrato legado de 50 MB; arquivos maiores devem falhar com mensagem pública segura.

## Compatibilidade e deploy

- Mudança aditiva; não remove nem altera o contrato do endpoint simples.
- Backend novo convive com frontend antigo.
- Frontend novo tolera temporariamente backend antigo para arquivos de até 50 MB.
- Sem migration, backfill, reset, seed, alteração de dados existentes ou package novo.
- As 13 envs de limite são novas, mas opcionais e compatíveis com os valores anteriores. Elas podem
  ser cadastradas de forma independente no Dokploy e passam a valer no próximo restart/redeploy;
  omiti-las preserva o comportamento documentado.
- Não é necessária mudança manual na conta Cloudflare de homologação: o novo vídeo usa partes de
  5 MiB. Se uma parte desse tamanho ainda receber `413`, será necessário inspecionar manualmente a
  zona/WAF/reverse proxy da conta de homologação, que não está conectada a este workspace.
- Sessões interrompidas são abortadas pelo cliente quando possível e continuam cobertas pelo
  lifecycle padrão de uploads multipart incompletos do R2.
- Rollback remove os endpoints/client multipart e volta ao limite funcional anterior de 50 MB;
  vídeos grandes voltam a ficar sujeitos a `413`.

## Fora do escopo

- Transcodificação, compressão ou alteração de resolução/duração do vídeo.
- Upload direto browser → R2 por URL assinada, pois exigiria novo package e configuração CORS do
  bucket durante este rollout corretivo.
- Alterar URLs de vídeos já publicados ou limpar objetos legados.
- Converter o upload simples da postagem raiz de comunidade para multipart. A env permite reduzir ou
  ajustar seu limite no backend, mas um arquivo acima do limite real da Cloudflare continuará sem
  alcançar o Express até esse fluxo ganhar chunks.

## Critérios de aceite

- [x] O plano de um vídeo de 250 MiB é dividido em 50 partes, sem uma request binária única à API.
- [x] Cada request binária do novo fluxo contém no máximo um chunk operacional de 5 MiB.
- [x] Backend rejeita tamanho maior que 300 MB, MIME inválido, assinatura incompatível, sessão de
  outro usuário/recurso e lista de partes incompleta.
- [x] Perfil só recebe o novo `video_url` depois da conclusão real do multipart no R2.
- [x] Frontend mostra progresso e mantém ações conflitantes desabilitadas durante o envio.
- [x] Endpoint simples legado continua disponível para compatibilidade.
- [x] Parser aceita exatamente duas fields e um chunk de 5 MiB, rejeita uma field adicional e
  rejeita chunk que ultrapassa o teto em um byte.
- [x] Validador aceita MOV com marca `qt  ` principal/compatível e QuickTime legado plausível, mas
  continua rejeitando HEIC, `ftyp` malformado e átomo genérico isolado.
- [x] Sessão inválida, tamanho incorreto da parte e conteúdo incompatível retornam códigos públicos
  distintos e seguros para orientar uma nova tentativa.
- [x] Terminal do backend permite correlacionar início, partes, storage e persistência final de um
  upload novo pelo mesmo `traceId`; falhas anteriores no parser são identificadas por escopo e motivo.
- [x] Sanitizador de observabilidade descarta campos adicionais, identificador fora do formato,
  MIME inválido e números inseguros antes de chamar `console`.
- [x] Logs não contêm usuário, filename, sessão, objeto/bucket, `UploadId`, key, ETag, credencial,
  conteúdo binário nem mensagem/stack do provider.
- [x] Todos os 11 endpoints binários baseados em Multer usam limite próprio centralizado e as 13
  envs (incluindo totais multipart) preservam fallback seguro quando não configuradas.
- [x] Nenhum detalhe técnico de Cloudflare/R2, segredo ou identificador interno aparece em UI/API.
- [x] Checks, testes e builds de backend/frontend passam sem warnings.
- [x] O plano de smoke pós-push cobre `/health`, `/ready`, `/ping`, `/version` e a presença das rotas
  multipart; o resultado do deploy é reportado ao usuário na própria execução.

## Referências

- Cloudflare 413: `https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/`.
- R2 uploads: `https://developers.cloudflare.com/r2/objects/upload-objects/`.
- Apple QuickTime `ftyp`:
  `https://developer.apple.com/documentation/quicktime-file-format/file_type_compatibility_atom`.
- Registro oficial de marcas ISO BMFF: `https://mp4ra.org/registered-types/brands`.
- W3C ISO BMFF: `https://www.w3.org/TR/mse-byte-stream-format-isobmff/`.
- Padrão interno: `adrs/0452-upload-multipart-midia-respostas.md`.

## Validação executada

- `pnpm --dir backend check`: aprovado, incluindo testes dos fallbacks/overrides das 13 envs e do
  particionamento de 250 MiB em 50 partes, além da regressão real do parser multipart para os
  thresholds de partes e bytes, das variantes ISO BMFF/QuickTime aceitas e rejeitadas e da whitelist
  de observabilidade multipart.
- `pnpm --dir backend build`: aprovado.
- `pnpm --dir frontend check`: aprovado sem warning de Biome/ESLint/TypeScript.
- `pnpm --dir frontend build`: aprovado, incluindo `/app/profissional/perfil/configurar`.
- `pnpm check`: aprovado após a validação final da task.
- `pnpm check:env`, `check:tasks`, `check:adrs`, `check:source-size` e `check:cycles`: aprovados.
- Schema/migrations Prisma não foram alterados; `db:migrate` não se aplica.
- Referência `_product/proto/Editar Perfil - Psicólogo.jpg` inspecionada. O browser local não estava
  disponível neste cliente, limitação registrada sem substituir a validação por mock.
- Upload real de 250 MB em homologação fica como smoke operacional do usuário após o deploy; caso um
  chunk de 5 MiB ainda retorne `413`, será necessária inspeção manual da conta Cloudflare de homolog.
- O payload real informado no segundo smoke continha somente as duas fields esperadas e um chunk
  `.mov`; o vídeo completo não foi copiado para o workspace e deve ser reenviado em sessão nova após
  o deploy, pois sessões publicadas em conversa não devem ser reutilizadas.
