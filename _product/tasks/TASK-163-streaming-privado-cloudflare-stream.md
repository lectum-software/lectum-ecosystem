# TASK-163: Streaming privado de vídeos com Cloudflare Stream

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-163 |
| Prioridade | P0 |
| Esforço | XL |
| Fase | Infraestrutura de mídia e segurança |
| Status | Completed |
| Dependências | TASK-03, TASK-13, TASK-15, TASK-23, TASK-24, TASK-26, TASK-29B, TASK-157, TASK-159 |
| ADR alvo | ADR-0478 |

## Contexto

Os vídeos de apresentação profissional, posts e respostas são hoje objetos R2 servidos por
`/public/files/*`. Mesmo que a aplicação controle quem cria ou associa a mídia, conhecer a URL é
suficiente para buscar o arquivo completo. O backend também participa do transporte multipart e da
reprodução, o que amplia latência, carga do servidor e instabilidade em Android/iPhone.

Cloudflare Stream deve se tornar o plano de dados de vídeo: upload TUS direto do navegador,
transcodificação gerenciada e reprodução adaptativa HLS. O backend Lectum continua como plano de
controle: autoriza criação, persiste a identidade interna do ativo, decide quem pode assistir e
emite tokens curtos. O token de API, chave privada, segredo de webhook e URL TUS jamais entram em
campos públicos permanentes, logs, analytics ou toasts. O UID técnico não é usado como autorização
nem é persistido em contratos de domínio; como ele integra o payload de um JWT assinado (não
criptografado), pode ser inspecionado pelo cliente durante a reprodução sem conceder acesso.

Esta task não usa código do Builder como arquitetura e não cria tela nova. As superfícies visuais
existentes são preservadas e validadas mobile-first. A referência ativa continua
`PROTO-INVENTORY.md`; não há alteração de layout que exija reinterpretação dos protótipos.

## Objetivo

Entregar upload e reprodução assinada de ponta a ponta para as três finalidades de vídeo, com
progresso/cancelamento, processamento assíncrono, webhook autenticado, fallback de rollout e player
HLS compatível com Safari, Chrome e Android. O ativo permanece privado no provider; a visibilidade
de produto segue a associação com perfil/post/resposta. A TASK-167 corrige a exigência histórica de
sessão para permitir leitura anônima quando essa associação é pública.

## Pré-requisitos e bloqueios

- Conta Cloudflare com Stream habilitado, token de API `Stream Write`, customer code, signing key e
  webhook serão provisionados pelo usuário após o primeiro deploy seguro.
- A ausência dessas credenciais não impede boot/build: `CLOUDFLARE_STREAM_ENABLED=false` mantém o
  caminho legado durante o rollout.
- Consultar `ARCHITECTURE.md` (evolução segura, módulos backend, API frontend, uploads) e
  `DATA-MODEL.md` (perfil, `community_post` e `post_reply`).
- `tus-js-client` e `hls.js` são dependências novas condicionadas a esta task e devem ser registradas
  em `PACKAGES.md` e ADR-0478.
- Não resetar banco, apagar R2 ou remover vídeos existentes. A migration é exclusivamente aditiva.

## Escopo backend

### Persistência aditiva

Criar `video_asset`/`video_assets` com campos nullable/default-safe: proprietário, provider, UID
privado único, finalidade fechada, estado, MIME/tamanho declarados, duração/dimensões derivadas,
expiração do upload, último sync, erro público classificado, timestamps e soft delete. Adicionar a
relação reversa em `user`; não alterar nem tornar obrigatórios `video_url`, `media_url` ou
`thumbnail_url` existentes.

Uma referência Lectum derivada (`/api/private/video-assets/:id/playback`) continua sendo a string
armazenada nos campos legados, mantendo os contratos de presença de mídia. Ela contém apenas o ID
interno, nunca o UID Cloudflare. Registros R2 antigos permanecem legíveis durante o rollout.

### Adapter Cloudflare Stream

- Isolar configuração, HTTP do provider, parsing e assinatura em `backend/src/infra/video-stream`.
- Provisionar TUS por `POST /accounts/{account}/stream?direct_user=true`, com limite de bytes,
  `maxDurationSeconds`, expiração, `requiresignedurls` e `allowedorigins` definidos no servidor.
- Nunca encaminhar API token ao navegador. Retornar apenas a URL TUS descartável ao dono.
- Consultar estado de processamento e excluir upload cancelado em best effort.
- Assinar JWT RS256 localmente com signing key Cloudflare; token padrão de 30 minutos, sem permissão
  de download/original e sem vínculo rígido a IP móvel.
- Verificar `Webhook-Signature` sobre bytes crus com HMAC-SHA256, tolerância temporal e comparação
  constante. Webhook desconhecido é idempotente e não revela estado interno.

### Endpoints

- `POST /api/private/video-assets/uploads`: autenticação de usuário, finalidade, contexto, MIME e
  tamanho; cria ativo e devolve URL TUS descartável.
- `GET /api/private/video-assets/:id/status`: owner-only; reconcilia processamento de forma
  limitada e devolve referência somente quando pronta.
- `DELETE /api/private/video-assets/:id`: owner-only; cancela/aposenta em best effort.
- `GET /api/public/video-assets/:id/playback` (TASK-167): autenticação opcional; autoriza associação
  pública ou o dono autenticado e devolve HLS/thumbnail assinados e expiração.
- `GET /api/private/video-assets/:id/playback`: alias de rollout da TASK-167, restrito ao mesmo GET e
  à mesma autorização; upload/status/exclusão continuam autenticados.
- `GET /api/admin/private/video-assets/:id/playback`: sessão admin para moderação.
- `POST /api/public/video-stream/webhook`: corpo cru, assinatura obrigatória e processamento
  idempotente.

Perfil profissional pronto é associado somente quando o ativo mais recente do mesmo dono chega a
`ready`, evitando substituir um vídeo funcional por upload incompleto. Posts/respostas aceitam
referência Stream pronta e pertencente ao autor/finalidade, além do contrato R2 legado durante o
rollout. O provisionamento reserva a cota do dono em transação serializável antes de chamar o
provider, limitando três uploads abertos e vinte criações por hora mesmo sob concorrência. Quando o
novo vídeo de perfil fica pronto, ativos de perfil anteriores são aposentados na mesma transação e
suas cópias Stream/R2 são excluídas em best effort depois do commit; falha de cleanup não desfaz o
vídeo funcional recém-associado.

## Escopo frontend

- Uploads de vídeo usam `tus-js-client` com URL provisionada pelo backend, partes mínimas de 5 MiB,
  retry limitado, cancelamento real e polling até `ready`; imagens continuam no R2.
- A configuração pública `NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED=false` permite ativação depois que
  o backend/Cloudflare estiverem prontos. Quando desativada, o upload legado continua operacional.
- O player compartilhado reconhece referências Lectum, solicita playback público com sessão
  opcional, mantém token apenas em memória/cache curto e usa HLS nativo quando confiável ou
  `hls.js` em navegadores MSE.
- Estado indisponível mostra orientação controlada sem exigir login para conteúdo público.
  Processamento, indisponibilidade e retry não exibem mensagem técnica do provider.
- URLs assinadas não são persistidas em Redux, storage, campos de banco, analytics ou artefatos de
  compartilhamento.
- Prévia local antes do upload e capas/imagens existentes continuam funcionais.

## Escopo admin

Adicionar contrato e caller privado para token de playback quando uma superfície administrativa
precisar reproduzir referência Stream. Nenhuma URL assinada é persistida ou incluída em export.

## Segurança e autorização

- Todo ativo nasce com `requireSignedURLs` e allowlist explícita de origens.
- Playback exige autorização de domínio, não necessariamente sessão. Dono autenticado pode
  inspecionar seu ativo; qualquer visitante recebe token somente se a referência estiver ligada a
  perfil publicado/ativo ou post/resposta publicado em comunidade ativa. Admin usa namespace e
  cookie administrativos separados.
- A URL assinada curta aparece na aba Network enquanto válida. Seu JWT pode revelar o UID técnico ao
  ser decodificado, mas não a chave privada; assinatura, expiração e allowed origins reduzem reuso.
- Não usar URL assinada como prova de autorização, não cachear manifesto no backend e não fazer
  proxy de segmentos pela API Lectum.
- Logs usam `traceId`, finalidade, classe de estado/tamanho e elapsed; sem nome de arquivo, usuário,
  UID, URL, token ou erro cru do provider.

## Fora do escopo

- Migrar ou copiar vídeos R2 existentes para Stream.
- Remover MediaBunny ou o renderer social; isso pertence à TASK-164.
- Download do original, DRM, geoblocking/IP binding, live streaming ou armazenamento de token.
- Reset/seed/limpeza em homologação ou produção.

> Complementos posteriores: a cópia operacional dos vídeos legados foi especificada na TASK-165,
> sem limpeza do R2. A TASK-167 substitui apenas a regra equivocada de login obrigatório: o ativo
> continua assinado/privado no provider, mas conteúdo publicamente associado pode ser visto sem
> conta.

## Impacto em produção e plano de rollout

- **Banco:** expansão aditiva sem backfill. `video_assets` começa vazia; campos existentes seguem
  nullable. Rollback de código deixa a tabela inerte e não remove dados.
- **Configuração:** todas as envs novas são opcionais enquanto o feature flag estiver `false`. A
  aplicação falha fechada somente nos endpoints Stream quando flag `true` e configuração inválida.
- **Contratos:** respostas antigas continuam válidas; referências R2 continuam aceitas. Frontend
  novo tolera ambos. Backend novo não depende do frontend novo.
- **Ordem:** migration/backend → configuração Cloudflare/backend → webhook → ativar backend →
  frontend com flag → smoke. Produção repete somente após homologação validada.
- **Rollback:** antes de existir vínculo Stream, ambas as flags podem ser desligadas. Depois do
  primeiro vínculo, desligar apenas a flag pública interrompe novos uploads; backend/configuração
  Stream permanecem ativos para reproduzir referências já persistidas. Registros R2 não mudam.
- **Provider:** upload cancelado/excedido e vídeo de perfil substituído são excluídos em best
  effort. Formulários comunitários também tentam excluir o ativo preparado quando a associação
  falha, e o backend recusa a exclusão se ele já estiver anexado. Varredura periódica de órfãos não
  nasce habilitada nesta task.

## Critérios de aceite

- [x] Migration aditiva cria `video_assets` sem editar migration aplicada, sem backfill e sem reset.
- [x] `pnpm --dir backend db:migrate` executa com sucesso no banco local.
- [x] Backend provisiona TUS sem expor token da conta e todo vídeo nasce privado, com duração,
  expiração e allowed origins definidos pelo servidor.
- [x] Webhook usa corpo cru, janela temporal, HMAC-SHA256 e comparação constante; replay/assinatura
  inválida não altera ativo.
- [x] Status e cancelamento são owner-only, idempotentes e não retornam UID/erro cru.
- [x] Playback exige autorização de conteúdo e retorna token curto não persistido; após a TASK-167,
  associação pública permite visitante anônimo e conteúdo removido/privado continua negado.
- [x] Perfil, post e resposta usam Stream quando ativado e continuam aceitando R2 legado durante o
  rollout.
- [x] Upload do browser vai direto ao Cloudflare via TUS, com progresso, retries e cancelamento, sem
  transportar partes pelo Express.
- [x] Player usa HLS adaptativo em Safari/iPhone e HLS.js em Chrome/Android, sem proxy dos segmentos
  pela API Lectum.
- [x] UI mobile-first preservada, sem `<img>` cru, cores hardcoded ou mensagem técnica.
- [x] Envs, alerta de deploy, ordem de configuração, rollback e smoke de homologação documentados.
- [x] `PACKAGES.md`, `DATA-MODEL.md`, `ARCHITECTURE.md` e ADR-0478 refletem a decisão.
- [x] Testes cobrem configuração, referência, assinatura JWT/webhook, autorização, upload TUS e
  seleção do player sem credenciais reais/mocks de conclusão.
- [x] Backend/frontend/admin checks e builds relevantes, audits e `pnpm check` passam sem warnings.
- [x] Nenhum reset, seed destrutivo, `db push` ou limpeza de bucket/Stream foi executado.
- [x] Versão dos manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit e push ocorreram em `homolog`; deploy e smoke foram registrados.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check && pnpm --dir backend build`
- `pnpm --dir frontend check && pnpm --dir frontend build`
- `pnpm --dir admin check && pnpm --dir admin build` se o contrato admin for alterado
- `pnpm --dir backend audit --prod && pnpm --dir frontend audit --prod`
- `pnpm check`
- Browser local: fallback legado, estado anônimo público e player HLS com contrato controlado.
- Homologação após provisionamento: vídeo real em perfil, post e resposta; Safari/iPhone e
  Chrome/Android; cancelamento; `/health`, `/ready`, `/ping`, `/version`.

## Notas de execução

As APIs oficiais Cloudflare Stream são a fonte do protocolo: Direct Creator Upload TUS, signed
URLs/signing keys, Allowed Origins, HLS e webhook assinado. Não adicionar SDK Cloudflare ao backend:
`fetch` e `node:crypto` cobrem o contrato com superfície menor. Não persistir a URL TUS nem a chave
privada no banco.

## Registro de execução — 2026-09-03

- Migration validada com `prisma migrate dev` e `prisma migrate status` em PostgreSQL 16 local
  descartável; 95 migrations aplicadas em ordem e schema íntegro. Nenhum banco publicado foi
  resetado ou alterado pela validação local.
- `backend`: Biome, dependências runtime, TypeScript, 240 testes e build aprovados.
- `frontend`: Biome, ESLint sem warnings, TypeScript, 124 testes e build aprovados.
- `admin`: Biome, ESLint sem warnings, TypeScript, 33 testes e build aprovados.
- `pnpm audit --prod` aprovado em raiz/backend/frontend/admin após atualizar overrides transitivos
  corrigidos; `pnpm check` aprovado sem warning, ciclo ou crescimento de arquivo legado.
- Smoke HTTP local com feature flag desligada: `/version` e `/auth/login` responderam 200; a CSP
  contém somente os hosts Stream/TUS necessários. O cliente Browser não estava disponível nesta
  sessão, portanto não houve inspeção visual automatizada; não foi alterado layout.
- O primeiro deploy permanece seguro com as duas flags desligadas. Upload/reprodução reais no
  Stream são um gate operacional posterior ao provisionamento das credenciais de homologação,
  seguindo o checklist entregue ao usuário; isso não foi simulado nem marcado como teste real.
- Builder/Quick Copy não foi necessário porque a task preserva as superfícies e o layout existentes.
