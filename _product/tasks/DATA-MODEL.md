# Modelo de Dados Lectum

Fonte única de verdade para os modelos Prisma e contratos de API ainda não implementados.

Este documento existe porque a auditoria de 2026-06-03 identificou que as tasks nomeavam modelos e endpoints sem definir campos, enums, relações ou DTOs — forçando cada agente a inventar o schema, com risco de definições divergentes entre tasks que compartilham o mesmo modelo (`community_post`, `professional_review`, `psychologist_profile`, etc.).

Regra de uso:

- Quando uma task citar um modelo/endpoint, ela deve **referenciar a seção correspondente deste arquivo**, não redefinir o schema.
- Se a task precisar de um campo que não existe aqui, primeiro adicione o campo aqui (com ADR quando for decisão relevante), depois implemente.
- Este documento descreve o destino. O schema real ainda é só `user`, `user_token`, `user_background`, `notification_subscription`, `log__user`. Tudo abaixo, exceto a seção "Identidade (já existe)", é a criar.

## Estado real do backend (verificado 2026-06-03)

`backend/prisma/schema.prisma` contém apenas 5 modelos:

- `user`, `user_token`, `user_background`, `notification_subscription`, `log__user`.

Não existe nenhum modelo de perfil, comunidade, post, avaliação, favorito, assinatura ou notificação in-app. Todos os módulos de API existentes são de autenticação/usuário (`auth`, `google`, `user`). Ver `ARCHITECTURE.md` para os padrões de módulo/rotas/resposta.

## Convenções obrigatórias

Todo modelo novo segue o padrão dos modelos atuais:

- `id String @id @default(cuid())`.
- `deleted Boolean @default(false)` + `deletedAt DateTime? @map("deleted_at")` (soft delete; nunca apagar fisicamente registros de produto).
- `createdAt DateTime @default(now()) @map("created_at")` + `updatedAt DateTime @default(now()) @updatedAt @map("updated_at")`.
- Nome do modelo em `snake_case`, tabela plural via `@@map("...")`.
- Foreign keys em `snake_case` com sufixo `_id` e `@relation(..., onDelete: Cascade)` quando o filho não fizer sentido sem o pai.
- `@@index` para toda coluna usada em filtro de listagem, ordenação ou join.
- **Enums como `String` com valores documentados** (seguindo o padrão atual `user.provider String @default("manual")`). Não introduzir `enum` Prisma sem ADR — manter consistência com o schema existente e simplificar migrações.
- Valores monetários em centavos (`Int`), nunca `Float`.
- Datas sempre `DateTime`; flags de estado preferem timestamp anulável (`verifiedAt`) a boolean quando a data importa.

## Decisão estrutural: papel do usuário (paciente vs psicólogo)

O `user` atual **não tem** campo de papel. O fluxo de produto (PRD §5, fluxograma 19.1) escolhe o perfil já na "Seleção de Perfil", antes do cadastro.

Decisão adotada (ver `adrs/0002-arquitetura-auth-roles.md`):

- Adicionar `user.role String @default("paciente")` com valores **apenas** `"paciente" | "psicologo"`. Um usuário tem exatamente um papel. **`role` nunca recebe `"admin"`** — admin é audiência separada (ver "Admin" e "Camadas de autenticação e autorização").
- Dados específicos de papel vivem em `patient_profile` (1:1) e `psychologist_profile` (1:1), criados sob demanda.
- O redirecionamento pós-login e a navegação privada (TASK-04, TASK-12) ramificam por `user.role` — mas isso é UX; a fronteira de segurança é imposta no servidor (ver "Camadas de autenticação e autorização").

Campos a adicionar ao `user` existente (migração aditiva, sem quebrar auth):

| Campo | Tipo | Notas |
|---|---|---|
| `role` | `String @default("paciente")` | `"paciente" \| "psicologo"`. `@@index([role, deleted])`. |
| `patient_profile` | relação 1:1 opcional | `patient_profile?` |
| `psychologist_profile` | relação 1:1 opcional | `psychologist_profile?` |

Verificação de e-mail **reaproveita os campos já existentes** `user.confirmed`, `user.confirmed_date`, `user.confirm_code`, `user.confirm_date` (ver TASK-06). Não criar `emailVerifiedAt`.

---

## Identidade (já existe — não recriar)

Resumo dos campos relevantes do `user` atual (fonte: `schema.prisma`):

- `name`, `email @unique`, `avatar?`, `provider @default("manual")`, `password?`, `password_confirm?`.
- `active @default(true)`, `need_reset @default(false)`.
- `confirmed @default(false)`, `confirmed_date?`, `confirm_code?`, `confirm_date?` → verificação de e-mail.
- `recovery_code?`, `recovery_date?` → recuperação de senha.

`user_token` (token JWT por device): `user_id`, `token?`, `device_id?`. **Não tem coluna `type`.** Não tente armazenar tokens tipados (`password_reset`/`email_verification`) aqui — recuperação usa `user.recovery_code`, verificação usa `user.confirm_code`.

`user_background` (`user_id`, `type`, `data Json?`, `device_id?`): bucket genérico chave/valor por usuário; pode hospedar preferências (ex.: `type:"preference"`).

---

## Camadas de autenticação e autorização

A separação de papéis tem **duas camadas independentes**, espelhando o padrão do `sample/backend` (audiência `api` com `_auth` + `level`, e audiência `manager` com estratégia/identidade próprias). Ver `adrs/0002-arquitetura-auth-roles.md`.

### Camada 1 — Isolamento por audiência (fronteira dura)

- **Usuário final (paciente + psicólogo)**: tabela `user` + `user_token`, estratégia JWT `jwt-user-api`, middleware `_auth` (já existe). Login/recovery/confirm já prontos.
- **Admin**: tabela `admin` + `admin_token` separadas, estratégia JWT própria (`jwt-admin-manager`), módulo/middleware próprios. **Reservado, fora do MVP** (ver seção "Admin"). Um token de usuário final é verificado por outra estratégia, contra outra tabela — nunca alcança rota de admin.

A estratégia `jwt-user-api` **recarrega o usuário do banco a cada request** (`LoginRepository.findByEmail`), então `req.auth.role` é a verdade atual do DB, não um claim embutido/forjável/obsoleto.

### Camada 2 — Guarda de papel dentro da audiência `api` (paciente vs psicólogo)

Convenção `requireRole(...)` — middleware fino aplicado **depois** do `_auth`, **fail-closed** (papel divergente → `403`, sem `next()`). Princípios obrigatórios:

1. **Imposição no servidor, nunca na UI.** A navegação por `user.role` (TASK-12) é só UX; a fronteira real é o middleware. Esconder botão não é controle de acesso.
2. **Imposição por namespace no mount, não por handler.** O guard é aplicado no registro do router em `backend/src/main/server/imports/write.ts`, por prefixo, para que toda rota nascida sob o prefixo herde o guard por construção (impossível "esquecer"):
   - `/api/private/psychologist/*` → `[ _auth, requireRole("psicologo") ]`
   - `/api/private/patient/*` → `[ _auth, requireRole("paciente") ]`
   - `/api/private/*` compartilhado (comunidade, notificações, conta) → `[ _auth ]`
   - `/api/private/directory/*` (descoberta de psicólogos por pacientes — leitura neutra) → `[ _auth ]`
3. **Ownership scoping no handler.** Toda query é escopada por `req.auth.id`; um psicólogo só lê/edita o próprio `psychologist_profile`, as próprias avaliações/analytics.
4. **Trava por existência de perfil (redundante de propósito).** Rotas de psicólogo exigem `psychologist_profile` de `req.auth.id`; um paciente não tem esse registro → operação falha mesmo na hipótese de o guard de papel falhar.
5. **Verificação automatizada.** Check no boot que falha se rota sob `/psychologist/*` ou `/patient/*` subir sem o `requireRole` correspondente; smoke test garantindo que token de paciente recebe `403` em rota psicólogo-only e vice-versa (critério de aceite em TASK-12 e TASK-34).

### Mapa de guardas por rota

| Namespace backend | Guard | Audiência/papel | Tasks |
|---|---|---|---|
| `/api/private/psychologist/*` | `requireRole("psicologo")` | psicólogo autogestão (perfil, CRP/CFP, analytics, assinatura) | 10, 11, 18, 19, 20, 31, 32, 33 |
| `/api/private/patient/*` | `requireRole("paciente")` | paciente autogestão (onboarding, avaliar, favoritar/seguir) | 08, 14, 17, 21 |
| `/api/private/directory/*` | só `_auth` | qualquer autenticado (descoberta/leitura de psicólogos) | 13, 15, 16 |
| `/api/private/community/*`, `/api/private/posts/*` | só `_auth` | qualquer autenticado | 22-28 |
| `/api/private/notification/*`, conta | só `_auth` | qualquer autenticado | 29, 30 |
| `POST /api/public/user/store`, auth/recovery/confirm | público / `_auth` privado | cadastro/login (papel definido na criação) | 04-09 |

---

## Admin (audiência separada — reservado, pós-MVP)

Não construir no MVP. Reservado aqui para que nenhuma task trate admin como `user.role` e para fixar a estrutura quando entrar no escopo (moderação de comunidade, aprovação de CRP/CFP, curadoria de comunidades, moderação de avaliações).

`admin` (espelha os campos de auth do `user`; identidade totalmente separada):

| Campo | Tipo | Notas |
|---|---|---|
| `name`, `email`, `password?`, `password_confirm?` | | mesma forma de auth do `user` |
| `active @default(true)`, `confirmed`, `confirmed_date?`, `confirm_code?`, `confirm_date?`, `recovery_code?`, `recovery_date?`, `need_reset` | | fluxo de login/recovery/confirm próprio |
| `admin_tokens` | `admin_token[]` | |
| `@@index([email, deleted])`, `@@map("admins")` | | |

`admin_token` (espelha `user_token`): `admin_id`, `token?`, `device_id?`, relação cascade, `@@map("admin_tokens")`.

Quando construído: módulo de audiência próprio (ex.: `backend/src/modules/manager/...` ou `api/admin`) com `public/auth` (login/recovery/confirm), `private/*` e middleware com estratégia `jwt-admin-manager`. Logs de auditoria (`log__user` e futuros) podem referenciar qual `admin` agiu, como no sample.

---

## Perfil do paciente

### `patient_profile` (1:1 com `user`, `role="paciente"`)

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String @unique` | FK `user`, cascade |
| `goal` | `String?` | objetivo escolhido no onboarding: `"encontrar_psicologo" \| "conhecer_comunidade"` (fluxograma 19.2) |
| `birthdate` | `DateTime?` | "Informações Pessoais" |
| `phone` | `String?` | E.164; opcional |
| `bio` | `String?` | curto |
| `onboarding_completed_at` | `DateTime?` | null = onboarding pendente (TASK-08) |
| `@@index([user_id])` | | |

---

## Perfil do psicólogo

### `psychologist_profile` (1:1 com `user`, `role="psicologo"`)

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String @unique` | FK `user`, cascade |
| `headline` | `String?` | chamada curta exibida no card/perfil |
| `bio` | `String?` | "Sobre"/experiência (texto longo) |
| `video_url` | `String?` | apenas Plano Profissional (PRD §13); manter null no gratuito |
| `cpf` | `String?` | usado na consulta CFP; dado sensível (LGPD) |
| `crp` | `String?` | registro profissional exibido no cabeçalho |
| `crp_status` | `String @default("pendente")` | `"pendente" \| "em_analise" \| "aprovado" \| "rejeitado"` (TASK-10/11) |
| `cfp_verified_at` | `DateTime?` | preenchido só com consulta CFP real; consulta automática segue bloqueada até fonte/API autorizada (ADR-0006) |
| `whatsapp` | `String?` | E.164; validado em TASK-16 |
| `whatsapp_verified_at` | `DateTime?` | só com verificação real por Twilio SMS/OTP (ADR-0006) |
| `languages` | `Json?` | lista de idiomas `string[]` (ex.: `["pt","en"]`); baixo volume, não precisa catálogo |
| `modality` | `String?` | `"online" \| "presencial" \| "hibrido"` |
| `rating_avg` | `Int @default(0)` | nota média *×100* (ex.: 4.75 → 475); recalculado em TASK-19 |
| `rating_count` | `Int @default(0)` | total de avaliações aprovadas |
| `published` | `Boolean @default(false)` | só `true` aparece na busca (PRD §7: apenas ativos/verificados) |
| `@@index([user_id])`, `@@index([published, deleted])` | | |

### Taxonomias filtráveis (catálogo + join)

Especialidade, serviço e abordagem são filtros da busca (TASK-13) e seções do perfil (TASK-15/18). Modelados como catálogo + tabela de junção para permitir filtro indexado.

`specialty` / `service` / `approach` (mesma forma, três tabelas):

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `String` | rótulo exibido |
| `slug` | `String @unique` | filtro estável por URL |
| `active` | `Boolean @default(true)` | catálogo curado; **categorias iniciais decididas em TASK-03/seed real, não inventar** |
| `@@index([slug, active])` | | |

`psychologist_specialty` / `psychologist_service` / `psychologist_approach` (joins):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | FK = `user.id` (o psicólogo é identificado pelo `user.id`, já que `psychologist_profile` é 1:1 com `user`). Mesma convenção em todas as relações e nas rotas `:id`/`[id]` |
| `specialty_id` / `service_id` / `approach_id` | `String` | FK catálogo |
| `@@unique([psychologist_id, <catalog>_id])`, `@@index([<catalog>_id])` | | Plano Gratuito limita a 3 especialidades (PRD §13) — validar no service |

### Verificação profissional (depende de integrações externas)

`professional_document` (upload de CRP, TASK-11; **bloqueio storage TASK-03**):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | FK |
| `type` | `String` | `"crp"` (extensível) |
| `file_key` | `String` | chave no bucket Cloudflare R2 (API S3-compatible via `@aws-sdk/client-s3`); nunca URL temporária persistida |
| `status` | `String @default("enviado")` | `"enviado" \| "em_analise" \| "aprovado" \| "rejeitado"` |
| `@@index([psychologist_id, type])` | | |

`professional_registry_check` (log de consulta CFP, TASK-10; **consulta automática bloqueada até fonte/API autorizada — ver ADR-0006**):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | FK |
| `cpf` | `String` | consultado |
| `found` | `Boolean` | resultado |
| `raw` | `Json?` | resposta do provedor real (sem mock) |
| `checked_at` | `DateTime @default(now())` | |
| `@@index([psychologist_id])` | | |

---

## Descoberta e relacionamento

`psychologist_favorite` (TASK-14):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | quem favoritou (paciente) |
| `psychologist_id` | `String` | alvo |
| `@@unique([user_id, psychologist_id])`, `@@index([psychologist_id])` | | |

`psychologist_follow` (TASK-14): mesma forma de `psychologist_favorite` (seguir é distinto de favoritar; PRD/proto separam "Favoritos" e "Seguindo").

`contact_request` (clique/contato WhatsApp, TASK-16/20; KPI "Cliques em WhatsApp"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String?` | paciente (pode ser anônimo logado) |
| `psychologist_id` | `String` | alvo |
| `channel` | `String @default("whatsapp")` | |
| `@@index([psychologist_id, createdAt])` | | métrica de conversão |

`profile_view_event` (opcional, analytics TASK-20):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | |
| `viewer_id` | `String?` | |
| `@@index([psychologist_id, createdAt])` | | só criar se a métrica de visualizações entrar no escopo; senão, omitir métrica honestamente |

---

## Avaliações

`professional_review` (TASK-17/19; PRD §11, fluxograma 19.2/19.4):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | alvo |
| `author_id` | `String` | paciente autor |
| `rating` | `Int` | 1..5 (validar faixa) |
| `comment` | `String?` | |
| `response` | `String?` | resposta do psicólogo (PRD: "Resposta do profissional") |
| `responded_at` | `DateTime?` | |
| `status` | `String @default("publicada")` | `"publicada" \| "oculta"` (moderação/fraude — PRD §18 risco) |
| `@@unique([psychologist_id, author_id])` | | 1 avaliação por par; elegibilidade (ex.: exigir contato prévio) decidida em ADR da TASK-17 |
| `@@index([psychologist_id, status])` | | agregação alimenta `psychologist_profile.rating_avg/count` (TASK-19) |

---

## Comunidade

`community` (TASK-22/25):

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `String` | |
| `slug` | `String @unique` | namespace canônico (ver "Convenção de rotas") |
| `description` | `String?` | |
| `category` | `String?` | **categorias iniciais decididas em TASK-03/curadoria, não inventar** |
| `members_count` | `Int @default(0)` | denormalizado para o card |
| `@@index([slug])`, `@@index([category, deleted])` | | |

`community_suggestion` (TASK-22, "Sugerir Comunidade"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | autor |
| `theme` | `String` | tema sugerido |
| `status` | `String @default("pendente")` | `"pendente" \| "aprovada" \| "rejeitada"` |
| `@@index([status])` | | |

`community_member` (seguir/participar, TASK-25; PRD "Comunidades seguidas"):

| Campo | Tipo | Notas |
|---|---|---|
| `community_id` | `String` | |
| `user_id` | `String` | |
| `@@unique([community_id, user_id])`, `@@index([user_id])` | | |

`community_post` (TASK-23/24/26/28; PRD §9, fluxograma 19.5):

| Campo | Tipo | Notas |
|---|---|---|
| `community_id` | `String` | |
| `author_id` | `String` | paciente ou psicólogo (ambos postam, proto separa só o layout) |
| `title` | `String` | |
| `content` | `String` | texto |
| `status` | `String @default("publicado")` | `"publicado" \| "pendente" \| "removido"`. Regra de auto-publicar vs moderar: **decisão de TASK-24** (registrar em ADR; default sugerido `publicado` com moderação reativa, pois PRD §16 lista moderação por IA só em V3) |
| `upvotes_count` / `downvotes_count` / `replies_count` / `saves_count` | `Int @default(0)` | denormalizados para o feed |
| `@@index([community_id, status, createdAt])`, `@@index([author_id])` | | feed por comunidade ordenado por data |

`post_reply` (comentários e respostas, TASK-26; PRD distingue comentário/resposta → árvore de 1 nível):

| Campo | Tipo | Notas |
|---|---|---|
| `post_id` | `String` | |
| `author_id` | `String` | |
| `parent_reply_id` | `String?` | null = comentário; preenchido = resposta a um comentário |
| `content` | `String` | |
| `upvotes_count` | `Int @default(0)` | |
| `@@index([post_id, parent_reply_id, createdAt])` | | paginação por âncora (TASK-26) |

`post_vote` (PRD §9 regras: 1 voto/usuário, alteração permitida, downvote não público):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String?` | alvo post… |
| `reply_id` | `String?` | …ou reply (exatamente um preenchido) |
| `value` | `Int` | `1` (upvote) ou `-1` (downvote) |
| `@@unique([user_id, post_id])`, `@@unique([user_id, reply_id])`, `@@index([post_id])` | | upsert para alterar voto; downvotes nunca expostos individualmente |

`post_save` (TASK-28, "Posts Salvos"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String` | |
| `@@unique([user_id, post_id])`, `@@index([user_id, createdAt])` | | |

### Ranking de mentores (TASK-27 — derivado, **bloqueado**)

Não há modelo persistido obrigatório. O ranking é **derivado** de `post_vote` (upvotes recebidos), participação e `professional_subscription` ativa (PRD §10: só Plano Profissional). A **fórmula de pontuação é decisão externa**: TASK-27 fica bloqueada até ADR aprovar o cálculo. Se for necessário materializar para performance, criar `mentor_score_snapshot` (`psychologist_id`, `score Int`, `period String`, `position Int`) — só após a fórmula existir.

---

## Notificações

`notification` (in-app, TASK-29; PRD §12, fluxograma 19.9). Distinto de `notification_subscription` (que já existe e guarda a inscrição web-push):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | destinatário |
| `type` | `String` | eventos do PRD §12: `"nova_avaliacao" \| "novo_favorito" \| "visualizacao_perfil" \| "clique_whatsapp" \| "novo_post" \| "nova_resposta" \| "upvote" \| "downvote" \| "compartilhamento" \| "salvamento"` |
| `data` | `Json?` | payload para "Abrir Conteúdo Relacionado" (ids de post/perfil/etc.) |
| `read_at` | `DateTime?` | null = não lida |
| `@@index([user_id, read_at, createdAt])` | | |

`notification_preference` (TASK-29, "Configurações de Notificações"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String @unique` | |
| `prefs` | `Json` | mapa `tipo → boolean` (push/in-app por categoria) |
| `@@index([user_id])` | | |

Push real foi decidido na TASK-03 (ver ADR-0006), usando `web-push`/VAPID e `notification_subscription`. Sem chaves VAPID reais no ambiente, persistir preferência mas não prometer entrega push.

---

## Assinatura e cobrança (gateway = **Mercado Pago**; pendência = credenciais)

O provedor foi decidido: **Mercado Pago** (ver `adrs/0003-gateway-pagamento-mercado-pago.md`). A pendência da TASK-03 deixa de ser "qual provedor" e passa a ser "credenciais reais" (access token + public key). Sem credenciais, TASK-32/33 constroem o fluxo/adapter mas não transacionam ao vivo; TASK-31 entrega só listagem read-only. A implementação é **obrigatoriamente agnóstica** via porta de domínio (abaixo).

### Abstração de gateway (porta `PaymentGateway`)

O app nunca importa o SDK do provedor direto; depende da porta. `MercadoPagoAdapter` é a única parte que conhece o MP. Operações mínimas:

- `createSubscription({ plan, card_token, payer_email, external_reference }) -> { gateway_subscription_id, status }`
- `updateSubscriptionCard({ gateway_subscription_id, card_token })`
- `cancelSubscription(gateway_subscription_id)`
- `getSubscription(gateway_subscription_id) -> status normalizado`
- `parseWebhook(req) -> { type, external_id, gateway_subscription_id, status }`

Trocar de provedor = novo adapter. **Limite real:** card tokens são específicos do gateway e **não portáveis** — uma troca exige re-tokenização (re-coletar cartão ou migração gerenciada). Projetar a troca prevendo re-tokenização; nunca tentar "copiar o token".

### Modo de integração Mercado Pago

- **Cartão (transparente):** tokenização **client-side** via Checkout Bricks (Card Payment Brick) / SDK MP → `card_token`. PAN/CVV nunca tocam o backend (escopo PCI reduzido). O token vira a referência em `payment_method.gateway_token`.
- **Recorrência:** API de Assinaturas (**Preapproval**) — `POST /preapproval` com `card_token_id`, `auto_recurring { frequency: 1, frequency_type: "months", transaction_amount, currency_id: "BRL" }`, `payer_email`, `external_reference` = nosso `professional_subscription.id`, `status: "authorized"`. O `id` do preapproval → `professional_subscription.gateway_subscription_id`. (Confirmar nomes de campos na doc vigente do MP no momento da TASK-32.)
- **Webhook:** tópicos `subscription_preapproval`, `subscription_authorized_payment`, `payment`. Validar `x-signature` (HMAC-SHA256 sobre o manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` com o secret da aplicação) **antes** de processar; persistir o payload bruto em `payment_event` com idempotência `@@unique([gateway, external_id])`.

### Mapa de status (MP preapproval → `professional_subscription.status`)

| MP | nosso |
|---|---|
| `authorized` | `ativa` |
| `pending` | `inativa` |
| `paused` | `inadimplente` |
| `cancelled` | `cancelada` |
| pagamento recorrente rejeitado / chargeback | `inadimplente` |

**Soberania de dados:** o entitlement ("é Pro?") é respondido pelo nosso banco (`professional_subscription.status`, atualizado via webhook) — nunca por chamada síncrona ao MP. `gateway` (= `"mercadopago"`), `gateway_subscription_id`, `gateway_token` e `payment_event` bruto sustentam auditoria, replay e reconciliação.

`subscription_plan` (TASK-31; PRD §13):

| Campo | Tipo | Notas |
|---|---|---|
| `slug` | `String @unique` | `"gratuito" \| "profissional"` |
| `name` | `String` | |
| `price_cents` | `Int @default(0)` | profissional = `990` (R$ 9,90/mês, sem trial; confirmado em TASK-03) |
| `interval` | `String @default("month")` | |
| `features` | `Json?` | flags (selo, analytics, vídeo, ranking) |
| `active` | `Boolean @default(true)` | |

`professional_subscription` (TASK-31/32/33):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | |
| `plan_id` | `String` | FK `subscription_plan` |
| `status` | `String @default("inativa")` | `"inativa" \| "ativa" \| "inadimplente" \| "cancelada"` |
| `gateway` | `String?` | nome do provedor (TASK-03) |
| `gateway_subscription_id` | `String?` | id externo; nunca dados de cartão |
| `current_period_end` | `DateTime?` | |
| `@@index([psychologist_id, status])` | | habilita selo/destaque/ranking quando `ativa` |

`billing_address` (TASK-32, "Endereço de Faturamento"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `zip`, `street`, `number`, `complement?`, `district`, `city`, `state` | `String` | CEP via controller `cep` da TASK-02 |
| `@@index([user_id])` | | |

`payment_method` (TASK-33, "Alterar Cartão"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `gateway` | `String` | |
| `gateway_token` | `String` | **token do provedor**; nunca PAN/CVV. Cartão é delegado ao gateway |
| `brand?`, `last4?`, `exp_month?`, `exp_year?` | display only | |
| `@@index([user_id])` | | |

`payment_event` (webhook do gateway, TASK-32/33):

| Campo | Tipo | Notas |
|---|---|---|
| `gateway` | `String` | |
| `external_id` | `String` | id do evento (idempotência) |
| `type` | `String` | evento do provedor |
| `payload` | `Json` | bruto, para auditoria |
| `@@unique([gateway, external_id])` | | webhook verifica assinatura do provedor antes de processar |

---

## Convenção de rotas (frontend e backend)

A auditoria achou namespaces conflitantes nas tasks de comunidade (`/communities` vs `/community` vs `/posts`). Padrão canônico:

- Frontend privado sob `/app` ou shell privado da TASK-12 (a TASK-12 define o prefixo real; as tasks seguintes o reaproveitam).
- Psicólogos (visão do paciente): detalhe do perfil em `/app/psychologist/[id]` (`[id]` = `user.id`), contato em `/app/psychologist/[id]/contact`.
- Comunidades: lista em `/app/community`, detalhe em `/app/community/[slug]`, post em `/app/community/[slug]/post/[id]`.

Backend privado — **o prefixo determina o guard** (ver "Camadas de autenticação e autorização"):

- **Descoberta/leitura de psicólogos** (chamada por pacientes): `/api/private/directory/psychologists`, `/api/private/directory/psychologists/:id` → só `_auth`. **Não** usar `/api/private/psychologists` para descoberta — esse namespace é confundível com autogestão.
- **Autogestão do psicólogo**: `/api/private/psychologist/*` (perfil, CRP, CFP, analytics, assinatura) → `requireRole("psicologo")`.
- **Autogestão do paciente**: `/api/private/patient/*` (onboarding, avaliar, favoritar/seguir) → `requireRole("paciente")`.
- **Comunidade/posts** (qualquer autenticado): `/api/private/community`, `/api/private/community/:slug/posts`, `/api/private/posts/:id`, `/api/private/posts/:id/replies`, `/api/private/posts/:id/vote`, `/api/private/posts/:id/save`. Singular `community`/`posts`.
- Cada task deve usar exatamente esses prefixos; divergência exige atualizar este documento.

## Contrato padrão de API

Reutilizar a infraestrutura existente (ver `ARCHITECTURE.md` e o módulo `auth` como referência viva).

- **Resposta de sucesso** (helper `send`): `{ success: true, status?, message?, code?, data }`. O frontend (`handleReq`) desembrulha `data`.
- **Resposta de erro** (`send`/`error`/`error500`): `{ success: false, status, error, code, ... }`. Status default 400; 401 dispara signout no frontend.
- **Paginação padrão** para toda listagem (TASK-13/19/23/26/28): query `page` (1-based) e `limit` (default 20, máx 50); resposta `data: { items: T[], total: number, page: number, limit: number }`. Para feeds/listas muito longas, avaliar cursor por `createdAt`+`id` e `@tanstack/react-virtual` (ver `PACKAGES.md`), registrando em ADR.
- **Validação**: `validator/index.ts` com o pacote local (`method:"email"`, `"password"` = mín. 12 com maiúscula/minúscula/dígito/especial, `"string"`, etc.). Mensagens de erro traduzidas em `backend/locales/pt/translation.json`.
- **Privado**: exige headers `Authorization: Bearer <jwt>` + `x-device`; `req.auth` traz o `user`. Nunca recriar autenticação.
- **Query keys** (frontend): adicionar famílias em `frontend/src/api/cache/keys.ts` ao lado de `auth.hydrate`; invalidar após mutations que alteram listas/detalhes.

## Ordem de criação sugerida

Para evitar referência a tabela inexistente, criar nesta ordem (cada uma com sua migração):

1. `user.role` + `patient_profile` + `psychologist_profile` (TASK-04/07/09).
2. catálogos `specialty`/`service`/`approach` + joins (TASK-09/13).
3. `psychologist_favorite`/`psychologist_follow`/`contact_request`/`professional_review` (TASK-14/16/17).
4. comunidade: `community` → `community_member`/`community_suggestion` → `community_post` → `post_reply`/`post_vote`/`post_save` (TASK-22..28).
5. `notification`/`notification_preference` (TASK-29).
6. `subscription_plan`/`professional_subscription`/`billing_address`/`payment_method`/`payment_event` (TASK-31..33) — após TASK-03.
