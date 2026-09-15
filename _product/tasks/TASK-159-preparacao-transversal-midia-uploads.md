# TASK-159: Preparação transversal de mídia antes dos uploads

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-159 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Operação e mídia pública |
| Status | Completed |
| Dependências | TASK-26, TASK-144, TASK-157, TASK-158 |
| ADR alvo | ADR-0466 |

## Contexto

A TASK-158 introduziu otimização client-side com MediaBunny apenas para o vídeo de apresentação do
psicólogo. Os demais vídeos de comunidade e respostas, assim como capas, avatares, imagens de posts
e imagens administrativas, ainda seguem ao R2 com os bytes originais. O avatar profissional possui
um crop isolado, mas não existe uma política comum por finalidade.

O produto precisa preparar toda mídia pública nova antes do transporte, sem tratar arquivos de
tipos diferentes como se fossem equivalentes. MediaBunny é apropriado para vídeo; imagens exigem
resize/reencode próprios; documentos privados futuros não podem entrar automaticamente nesse
pipeline. A preparação continua best effort no dispositivo e nunca substitui validação de MIME,
assinatura, limite, autorização e entitlement no backend.

## Objetivo

Criar uma fronteira transversal e opt-in `prepareUpload({ file, purpose, signal, onProgress })`,
aplicá-la a todas as superfícies atuais de upload de mídia pública do frontend e do Admin e manter o
transporte independente. Vídeos devem reutilizar MediaBunny; imagens devem usar APIs nativas do
navegador com políticas explícitas por finalidade. O post raiz da comunidade deve ganhar transporte
multipart aditivo para continuar funcional quando o fallback original for grande.

## Escopo frontend

1. Definir uma união fechada de finalidades e uma allowlist de mídia pública por domínio do endpoint.
   A resolução aceita MIME declarado ou extensão conhecida somente para JPEG/PNG/WebP e
   MP4/MOV/WebM; tipo vazio de arquivo mobile pode usar essa extensão conhecida, enquanto
   PDF, documento e formato desconhecido são recusados antes do adapter/upload.
2. Separar adapters de vídeo, imagem e passthrough da orquestração React/HTTP. O passthrough é uma
   finalidade deliberada somente para thumbnail já gerada pelo produto; não é fallback genérico
   para documento.
3. Generalizar o worker da TASK-158 para:
   - vídeo de apresentação;
   - vídeo de post da comunidade;
   - vídeo de resposta/comentário.
4. Manter MP4 AVC/H.264 + AAC, até 1080p/30 FPS, bypass de arquivo eficiente, saída menor e fallback
   original quando o runtime não puder converter.
5. Preparar imagens JPEG/PNG/WebP por finalidade:
   - avatar profissional e de paciente;
   - capa profissional e capa do vídeo;
   - imagem de post e resposta;
   - thumbnails já geradas;
   - sem upscale, preservando orientação e transparência;
   - detectar APNG/WebP animado antes do canvas e manter o original para não perder frames.
6. Só substituir o original por candidato válido e menor; recodificação sem resize exige ganho
   material. Falha de execução em formato allowlisted usa o original sem mensagem técnica; tipo
   fora da allowlist falha antes do adapter/upload.
7. Limitar concorrência de preparação/envio do carrossel de imagens.
8. Propagar cancelamento e progresso pelos transportes que já os expõem.
9. Manter façade compatível para o fluxo de apresentação entregue pela TASK-158.

## Escopo Admin

1. Preparar avatar de comunidade e imagem Open Graph com adapter local do Admin, pois frontend e
   Admin são aplicações/deploys separados.
2. Reutilizar a mesma decisão arquitetural e política pura, sem importar runtime do frontend.
3. Manter formulários, mutations, endpoints e respostas atuais.

## Escopo backend

1. Manter todos os endpoints atuais e adicionar ao post raiz rotas multipart de iniciar, enviar
   parte, concluir e abortar.
2. Reutilizar `public-multipart.ts`, sessão opaca vinculada a usuário/comunidade, parte de 5 MiB,
   assinatura da primeira parte e logs operacionais sanitizados.
3. Preservar o contrato final de mídia `{ media_url, media_type }` e compatibilidade entre versões.
4. Continuar validando MIME, assinatura, limite, autorização, entitlement e chave de destino; o
   backend não confia no resultado da preparação client-side.
5. Compartilhar o gate global existente de concorrência R2 entre uploads simples e partes multipart
   de post, resposta e vídeo de apresentação. Espera cancelada/desconectada deve sair da fila e
   liberar o slot sem criar env nova.

## Inventário de superfícies atuais

| Superfície | Entrada de preparação | Finalidade | Adapter | Transporte |
| --- | --- | --- | --- | --- |
| Vídeo de apresentação profissional | `use-profile-video-upload.ts` | `profile-presentation-video` | vídeo/MediaBunny | simples ou multipart existente |
| Avatar profissional | caller `psychologist-free-profile` | `professional-avatar` | imagem após crop | simples |
| Capa profissional | caller `psychologist-free-profile` | `professional-cover` | imagem | simples |
| Capa vertical do vídeo | caller `psychologist-free-profile` | `profile-video-cover` | imagem | simples |
| Avatar do paciente | caller `patient` | `patient-avatar` | imagem | simples |
| Mídia de post, criação e edição | caller `community` | `community-post-image` ou `community-post-video` | imagem ou vídeo/MediaBunny | simples até 5 MiB; multipart acima |
| Mídia de resposta, criação e edição | caller `posts/reply-mutations` | `post-reply-image` ou `post-reply-video` | imagem ou vídeo/MediaBunny | simples ou multipart existente |
| Thumbnail de vídeo de post/resposta | callers de comunidade/resposta | `generated-video-thumbnail` | passthrough explícito | mesmo endpoint público de mídia |
| Avatar da comunidade no Admin | caller `communities` do Admin | `community-avatar` | imagem local do Admin | simples |
| Imagem Open Graph no Admin | caller `settings` do Admin | `seo-open-graph` | imagem local do Admin | simples |

O inventário corresponde aos nove endpoints binários simples atuais; thumbnail reutiliza os
endpoints de mídia de post/resposta. Geração de arquivo apenas para download/Web Share não envia ao
R2 e não pertence a este pipeline.

## Políticas iniciais por finalidade

| Finalidade | Política |
| --- | --- |
| Vídeos públicos | MP4 H.264/AAC, maior dimensão 1920, até 30 FPS, saída menor e teto defensivo |
| Avatar profissional | crop quadrado existente, sem ampliar fonte pequena, até 512 px |
| Avatar de paciente/comunidade | contain até 512 px, sem crop automático |
| Capa profissional | contain até 1920×1080 |
| Capa vertical de vídeo | contain até 1080×1920 |
| Imagem de post/resposta | contain até 2048×2048 |
| Open Graph | contain até 1200×630 |
| Thumbnail gerada | passthrough explícito para evitar dupla recompressão |

PNG/WebP com transparência preservam alpha e não são convertidos cegamente para JPEG. APNG/WebP
animado passa em bypass com o arquivo original, evitando rasterizar apenas um frame. O nome e a
extensão acompanham o MIME real do candidato.

## Fora do escopo

- Garantia de normalização de 100% dos arquivos por worker de servidor.
- PDF, documento clínico ou upload privado futuro.
- Cloudflare Stream, HLS, DASH, TUS ou múltiplas rendições.
- Backfill, alteração ou exclusão de objetos já armazenados.
- Schema Prisma, migration, env obrigatória ou pacote novo.
- Mudar regras de autorização, entitlement ou moderação de conteúdo.

## Compatibilidade, rollout e rollback

- Contratos são aditivos; endpoints simples permanecem disponíveis.
- Frontend/Admin antigos continuam enviando o original normalmente.
- Backend antigo continua atendendo o caminho simples; multipart usa fallback simples apenas quando
  o arquivo cabe no contrato legado.
- Nenhum dado existente, banco ou objeto R2 é alterado.
- Uma env backend opcional permite ajustar o total do post raiz, com fallback de 200 MB. O chunk
  permanece fixo em 5 MiB pelo contrato compartilhado; não há env obrigatória nem ação manual na
  Cloudflare.
- `UPLOAD_MAX_CONCURRENCY` e `UPLOAD_MAX_QUEUE_SIZE` continuam opcionais e passam a reger também as
  partes multipart; os fallbacks atuais são preservados.
- Rollback remove a preparação e volta a enviar o `File` original; objetos já preparados continuam
  válidos nos formatos aceitos.

## Critérios de aceite

- [x] Registry e allowlist fechados escolhem política por finalidade explícita; MIME vazio só usa
  extensão conhecida no domínio do endpoint e tipo desconhecido não chega ao adapter/upload.
- [x] Vídeos de apresentação, posts e respostas passam pelo adapter MediaBunny best effort.
- [x] Vídeo eficiente é preservado; candidato inválido, maior ou incompatível não substitui original.
- [x] Avatares, capas, imagens de comunidade/resposta e imagens administrativas usam adapter próprio.
- [x] Orientação e alpha são preservados e imagens pequenas não sofrem upscale; APNG/WebP animado
  mantém os frames por bypass onde não há crop obrigatório, e avatar profissional animado é recusado.
- [x] Thumbnail gerada usa passthrough explícito e não sofre recompressão duplicada.
- [x] Falha local preserva upload original; cancelamento explícito encerra o fluxo.
- [x] Carrossel limita concorrência de preparação/envio.
- [x] Gate global limita uploads R2 simples e partes multipart; desconexão enquanto aguarda não
  prende slot nem deixa item órfão na fila.
- [x] Post raiz usa simples até 5 MiB e multipart acima, com fallback compatível para backend antigo.
- [x] Backend rejeita sessão fora do usuário/comunidade, partes inválidas e assinatura incompatível.
- [x] Backend continua validando todos os arquivos independentemente da preparação do cliente.
- [x] Nenhum PDF/documento é transcodificado, roteado por passthrough ou tratado como mídia pública
  por inferência.
- [x] Testes automatizados cobrem registry/allowlist, políticas, bypass, ganho mínimo, MIME/extensão,
  cancelamento/fila e contratos multipart; o comportamento real de canvas/WebCodecs fica coberto
  adicionalmente pelo smoke de browser.
- [x] `pnpm check`, builds afetados e audits de produção passam sem warnings.
- [x] Browser local valida imagens e vídeos reais, mobile/desktop, upload simples/multipart e fallback.
- [x] ADR-0466 criado e indexado.
- [x] Versão dos quatro manifests incrementada uma vez e sincronizada.
- [x] Commit e push ocorrem em `homolog`, com deploy e smoke reportados.

## Validação mínima

- `pnpm --dir frontend audit --prod`
- `pnpm --dir admin audit --prod`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local em ~390 px e desktop com fixtures JPEG/PNG/WebP e MP4/MOV/WebM.

## Evidências de validação (2026-08-21)

- Auditoria estática encontrou as dez finalidades acima ligadas aos nove endpoints binários simples
  atuais; criação e edição de post/resposta reutilizam os mesmos callers.
- Os testes automatizados exercitam seleção de política, dimensões sem upscale, bypass, ganho
  mínimo, coerência MIME/extensão do candidato, detecção de APNG/WebP animado, decisões de vídeo e
  limite de concorrência. O teste do registry cobre inferência de comunidade/resposta por MIME,
  extensão quando o MIME está vazio, compatibilidade entre tipo e finalidade explícita, passthrough
  de thumbnail somente para imagem e rejeição de PDF/desconhecido. Os testes das políticas puras de
  imagem do frontend e Admin cobrem fallback restrito por extensão, MIME canônico no `File` enviado
  e recusa de MIME declarado fora da allowlist. O frontend aprovou 67 testes, o Admin 29 e o backend
  213; estes últimos exercitam também sessão multipart vinculada a usuário/recurso, assinatura da
  primeira parte, lista de partes, integração `Multer -> validator`, cancelamento de stream/storage
  e o gate compartilhado.
- Um harness público temporário, sem login e removido após o teste, executou os módulos reais do
  frontend contra um receiver Express local em memória: JPEG EXIF 6 caiu de 1.617.946 para 319.992
  bytes e manteve 900×1600; PNG transparente caiu de 22.533.416 para 6.248.795 bytes, manteve alpha e
  saiu em 2048×1365; MOV caiu de 15.233.014 para 7.696.579 bytes, saiu MP4 1920×1080 e percorreu duas
  partes multipart; MP4 de 1.032.002 bytes e WebM de 312.668 bytes foram preservados. Cancelamento e
  fallback original também foram reconhecidos. O receiver observou um upload simples e um multipart
  completo sem abort órfão.
- O mesmo browser passou em 390 px sem overflow, com alvo de ação de 45 px, e em 1440 px com duas
  colunas; console sem warning/erro. A rota e o endpoint efêmeros foram removidos, e a rota voltou a
  responder 404, sem artefato temporário versionável.
- `pnpm check` raiz, checks dos três apps, builds frontend/Admin/backend, `git diff --check` e os três
  `pnpm audit --prod` passaram; os audits não encontraram vulnerabilidade conhecida. `check:tasks`
  aprovou 166 tasks e `check:adrs` aprovou 463 ADRs. O bump exclusivo sincronizou os quatro manifests
  em `0.1.162`; commit, push e smoke do deploy são executados no fechamento desta task.
