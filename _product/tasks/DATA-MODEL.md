# Modelo de Dados Lectum

Fonte única de verdade para os modelos Prisma e contratos de API ainda não implementados.

Este documento existe porque a auditoria de 2026-06-03 identificou que as tasks nomeavam modelos e endpoints sem definir campos, enums, relações ou DTOs — forçando cada agente a inventar o schema, com risco de definições divergentes entre tasks que compartilham o mesmo modelo (`community_post`, `professional_review`, `psychologist_profile`, etc.).

Regra de uso:

- Quando uma task citar um modelo/endpoint, ela deve **referenciar a seção correspondente deste arquivo**, não redefinir o schema.
- Se a task precisar de um campo que não existe aqui, primeiro adicione o campo aqui (com ADR quando for decisão relevante), depois implemente.
- Este documento descreve o destino. O schema real ainda é só `user`, `user_token`, `user_background`, `notification_subscription`, `log__user`. Tudo abaixo, exceto a seção "Identidade (já existe)", é a criar.

## Estado real do backend (verificado 2026-06-04)

`backend/prisma/schema.prisma` contém 7 modelos:

- `user` (com `role` desde a TASK-04);
- `user_token`;
- `user_background`;
- `patient_profile` (criado na TASK-07);
- `notification_subscription`;
- `notification`;
- `notification_preference`;
- `log__user`.

Não existe nenhum modelo de perfil, comunidade, post, avaliação, favorito ou assinatura. Os módulos de API existentes são de autenticação/usuário (`auth`, `google`, `user`) e notificações. Ver `ARCHITECTURE.md` para os padrões de módulo/rotas/resposta.

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

O `user` atual possui campo de papel desde a TASK-04. O fluxo de produto (PRD §5, fluxograma 19.1) escolhe o perfil já na "Seleção de Perfil", antes do cadastro.

Decisão adotada (ver `adrs/0002-arquitetura-auth-roles.md`):

- Adicionar `user.role String @default("paciente")` com valores **apenas** `"paciente" | "psicologo"`. Um usuário tem exatamente um papel. **`role` nunca recebe `"admin"`** — admin é audiência separada (ver "Admin" e "Camadas de autenticação e autorização").
- Dados específicos de papel vivem em `patient_profile` (1:1) e `psychologist_profile` (1:1), criados sob demanda.
- O redirecionamento pós-login e a navegação privada (TASK-04, TASK-12) ramificam por `user.role` — mas isso é UX; a fronteira de segurança é imposta no servidor (ver "Camadas de autenticação e autorização").

Campos relacionados ao `user` existente:

| Campo | Tipo | Notas |
|---|---|---|
| `role` | `String @default("paciente")` | **Já adicionado na TASK-04**. `"paciente" \| "psicologo"`. `@@index([role, deleted])`. |
| `has_seen_discover_psychologists_tip` | `Boolean @default(false)` | Preferência persistida por usuário para exibir a dica "Descubra novos psicólogos" apenas uma vez. |
| `has_seen_community_post_tip` | `Boolean @default(false)` | Preferência persistida por usuário para exibir a dica "Publique sua dúvida ou relato" apenas uma vez. |
| `patient_profile` | relação 1:1 opcional | A criar na TASK-07. |
| `psychologist_profile` | relação 1:1 opcional | A criar na TASK-09. |

Verificação de e-mail **reaproveita os campos já existentes** `user.confirmed`, `user.confirmed_date`, `user.confirm_code`, `user.confirm_date` (ver TASK-06). Não criar `emailVerifiedAt`.

---

## Identidade (já existe — não recriar)

Resumo dos campos relevantes do `user` atual (fonte: `schema.prisma`):

- `name`, `email @unique`, `avatar?`, `provider @default("manual")`, `password?`, `password_confirm?`.
- `active @default(true)`, `need_reset @default(false)`.
- `confirmed @default(false)`, `confirmed_date?`, `confirm_code?`, `confirm_date?` → verificação de e-mail.
- `has_seen_discover_psychologists_tip @default(false)`, `has_seen_community_post_tip @default(false)` → dicas/onboarding one-shot por usuário.
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
| `/api/private/patient/*` | `requireRole("paciente")` | paciente autogestão (onboarding, avaliar) e rotas legadas de favoritos/follows quando mantidas | 08, 14, 17, 21 |
| `/api/private/user/favorites/*` | só `_auth` | favoritos de psicólogos de qualquer usuário autenticado | 14 |
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
| `gender` | `String?` | preferência informada no onboarding: `"feminino" \| "masculino" \| "nao_binario" \| "prefiro_nao_dizer"` |
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
| `headline` | `String?` | bio curta exibida no card/perfil; opcional para publicação pública |
| `bio` | `String?` | texto de apresentação/"Sobre"/experiência; opcional para publicação pública |
| `cover_image_url` | `String?` | imagem pública independente de capa do perfil; não reutiliza thumbnail/frame de vídeo |
| `video_url` | `String?` | vídeo de apresentação público permitido para todos os psicólogos, inclusive Plano Gratuito; obrigatório para publicação/exibição pública do perfil e elegibilidade na listagem `/app/psychologists` |
| `video_cover_url` | `String?` | imagem pública opcional de capa do vídeo de apresentação; deve ser limpa junto ao vídeo |
| `cpf` | `String?` | usado na consulta CFP; dado sensível (LGPD) |
| `crp` | `String?` | registro profissional exibido no cabeçalho |
| `crp_registration_date` | `DateTime?` | data interna de inscrição no CRP, preenchida pela consulta CFP real ou pela operação na concessão `admin_grant`; não é editável pelo psicólogo e é usada para calcular tempo de experiência no card |
| `show_experience_tag` | `Boolean @default(true)` | controla se o tempo de experiência calculado por `crp_registration_date` aparece como tag pública |
| `gender`, `race_color`, `religion` | `String?` | campos declaratórios editáveis no recorte gratuito sem CRP; não entram em validação profissional |
| `crp_status` | `String @default("pendente")` | `"pendente" \| "em_analise" \| "aprovado" \| "rejeitado"` (TASK-10/11) |
| `cfp_verified_at` | `DateTime?` | preenchido so com consulta CFP real; fonte autorizada para TASK-10: InfoSimples `cfp-cadastro` via `DOCUMENT_TOKEN` (ADR-0026) |
| `whatsapp` | `String?` | E.164; validado em TASK-16 |
| `whatsapp_verified_at` | `DateTime?` | só com verificação real por Twilio SMS/OTP (ADR-0006) |
| `languages` | `Json?` | lista de idiomas `string[]` (ex.: `["pt","en"]`); baixo volume, não precisa catálogo |
| `academic_formations` | `Json?` | lista curta de formações acadêmicas `{ title, institution, graduation_year }[]`; mantém `academic_*` legados como primeira formação |
| `modality` | `String?` | `"online" \| "presencial" \| "hibrido"` |
| `rating_avg` | `Int @default(0)` | nota média *×100* (ex.: 4.75 → 475); recalculado em TASK-19 |
| `rating_count` | `Int @default(0)` | total de avaliações aprovadas |
| `published` | `Boolean @default(false)` | só `true` aparece na busca (PRD §7: apenas ativos/verificados) |
| `@@index([user_id])`, `@@index([published, deleted])` | | |

`phone_verification` (OTP por SMS/Twilio para WhatsApp do psicólogo, TASK-16):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | FK `user`; ownership por `req.auth.id` |
| `phone` | `String` | E.164 normalizado; telefone alvo da verificação |
| `purpose` | `String @default("psychologist_whatsapp")` | escopo inicial da verificação |
| `provider` | `String @default("twilio")` | provedor SMS usado |
| `provider_message_id` | `String?` | reservado para auditoria do provedor quando disponível |
| `code_hash` | `String` | hash do OTP; nunca persistir o código puro |
| `expires_at` | `DateTime` | expiração do OTP |
| `attempts` | `Int @default(0)` | tentativas de confirmação |
| `sent_at` | `DateTime @default(now())` | instante do envio |
| `verified_at` | `DateTime?` | preenchido após código correto |
| `@@index([user_id, purpose, createdAt])`, `@@index([phone, purpose])` | | |

Ao confirmar `phone_verification` real, atualizar `psychologist_profile.whatsapp` e
`psychologist_profile.whatsapp_verified_at`. Sem envio/confirmação Twilio real, manter
`whatsapp_verified_at=null`.

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

`professional_registry_check` (log de consulta CFP, TASK-10; **fonte autorizada: InfoSimples `cfp-cadastro` - ver ADR-0026**):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | FK `psychologist_profile`; ownership por `req.auth.id` via perfil do psicologo |
| `provider` | `String @default("infosimples")` | provedor da consulta |
| `cpf` | `String?` | CPF consultado, normalizado apenas com digitos |
| `registro` | `String?` | registro informado/consultado quando aplicavel |
| `uf` | `String?` | UF informada quando aplicavel |
| `found` | `Boolean @default(false)` | se a consulta retornou ao menos um resultado |
| `raw` | `Json?` | resposta do provedor real e resultados normalizados; nunca incluir `DOCUMENT_TOKEN` |
| `checked_at` | `DateTime @default(now())` | instante da consulta |
| `@@index([psychologist_id, checked_at])` | | |
| `@@index([cpf])` | | |

---

## Descoberta e relacionamento

`psychologist_favorite` (TASK-14):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | quem favoritou (qualquer usuário autenticado) |
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

`profile_video_watch_session` (analytics do vídeo de apresentação, extensão da TASK-20):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | FK `user.id` do psicólogo dono do perfil; ownership no analytics por `req.auth.id` |
| `viewer_id` | `String?` | usuário autenticado que assistiu, quando existir; anônimos ficam nulos |
| `session_key` | `String` | identificador efêmero por sessão do navegador; `@@unique([psychologist_id, session_key])` consolida heartbeats sem duplicar visualização |
| `video_url` | `String?` | URL do vídeo vigente no momento do evento para auditoria básica; não substitui `psychologist_profile.video_url` |
| `duration_seconds` | `Int @default(0)` | duração arredondada informada pelo player |
| `watched_seconds` | `Int @default(0)` | segundos únicos assistidos na sessão, sem simular tempo não reproduzido |
| `max_position_seconds` | `Int @default(0)` | maior posição alcançada no vídeo |
| `replay_count` | `Int @default(0)` | quantidade de retornos/replays detectados na mesma sessão |
| `completed` | `Boolean @default(false)` | verdadeiro quando o usuário chega ao fim ou ao marco equivalente de 100% |
| `milestone_25`, `milestone_50`, `milestone_75`, `milestone_100` | `Boolean @default(false)` | retenção por marcos, suficiente para gráfico agregado sem capturar cada segundo |
| `retention_buckets` | `Json?` | lista de buckets internos de 5% alcançados (`[5,10,...,100]`), calculada pelo backend a partir da maior posição/duração para gerar curva estimada sem registrar evento por segundo |
| `last_event_at` | `DateTime @default(now())` | última atualização recebida para exibir recência dos dados |
| `@@index([psychologist_id, createdAt])`, `@@index([psychologist_id, last_event_at])`, `@@index([viewer_id, createdAt])` | | consultas de analytics por período e auditoria |

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

Regra vigente revalidada em 2026-06-09: somente psicólogos com entitlement profissional ativo
(`professional_subscription.status="ativa"` em plano não gratuito, incluindo cortesia manual `admin_grant`)
podem receber novas avaliações. A criação pelo paciente deve barrar perfis sem Plano Profissional; a
autogestão do psicólogo em `/api/private/psychologist/reviews` também exige esse entitlement.

---

## Comunidade

`community` (TASK-22/25):

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `String` | |
| `slug` | `String @unique` | namespace canônico (ver "Convenção de rotas") |
| `description` | `String?` | |
| `category` | `String?` | categorias de curadoria; catálogo ativo revalidado pela alteração de 2026-06-25: `Ansiedade em Equilíbrio`, `Relacionamentos com Propósito`, `Autocuidado em Prática`, `Depressão`, `TDAH`. `Mulheres em Foco` e `Luto e Ressignificação` foram removidas das listas públicas por soft delete. |
| `members_count` | `Int @default(0)` | denormalizado para o card |
| `avatar_url` | `String?` | imagem/avatar público da comunidade usado para identidade visual; quando ausente, a UI usa iniciais e fallback azul |
| `visual_primary_color` | `String?` | cor principal cacheável da comunidade em HEX, derivada do avatar quando disponível |
| `visual_primary_dark_color` | `String?` | variação escura da cor principal para gradiente e contraste |
| `visual_soft_color` | `String?` | variação clara da cor principal para fundo do avatar/chips |
| `visual_text_color` | `String?` | cor de texto/initials com contraste sobre `visual_soft_color` |
| `visual_gradient_color` | `String?` | variação clara usada como apoio radial próximo ao avatar |
| `@@index([slug])`, `@@index([category, deleted])` | | |

Governança: comunidades são criadas/curadas apenas por administradores da plataforma em fluxo administrativo futuro; usuários finais não têm endpoint de criação direta. Usuários podem apenas registrar `community_suggestion`, que fica pendente para análise da equipe. Moderadores de comunidades também serão administradores da plataforma, não usuários comuns ou mentores.

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
| `media_url` / `media_type` | `String?` | midia opcional em posts de psicologos aptos; `media_type` inicialmente `"video"` ou `"image"` e a URL deve vir do upload R2 em `/public/files/posts/media/` |
| `media_items` | `community_post_media[]` | itens ativos do carrossel de imagens, ordenados por `position`; manter `media_url`/`media_type` como compatibilidade para a primeira midia ativa |
| `anonymous` | `Boolean @default(true)` | aplicável a posts de pacientes; `true` preserva o comportamento seguro legado de mascarar o autor como `Membro Anônimo #1234` com sufixo determinístico por post, `false` permite mostrar nome/avatar do paciente |
| `status` | `String @default("publicado")` | `"publicado" \| "pendente" \| "removido"`. Regra de auto-publicar vs moderar: **decisão de TASK-24** (registrar em ADR; default sugerido `publicado` com moderação reativa, pois PRD §16 lista moderação por IA só em V3) |
| `edited_at` | `DateTime?` | preenchido quando o autor edita título, conteúdo ou mídia após publicação; usado apenas como metadado público `editado`, sem histórico completo no MVP |
| `upvotes_count` / `downvotes_count` / `replies_count` / `saves_count` | `Int @default(0)` | denormalizados para o feed |
| `@@index([community_id, status, createdAt])`, `@@index([author_id])` | | feed por comunidade ordenado por data |

DTOs do feed: `GET /api/private/community/feed/posts` é o contrato canônico do Feed da Comunidade agregado (posts de destaque de todas as comunidades), com filtros opcionais `search`, `community` e `scope="all"|"following"`; `scope="following"` depende de `community_member` (TASK-25), não deve inventar vínculo sem persistência e pode retornar `following_count` para diferenciar usuário sem comunidades seguidas de usuário com comunidades seguidas sem posts no filtro. `GET /api/private/community/:slug` retorna o detalhe da comunidade, contagem real de posts publicados e participação do usuário autenticado via `community_member`. `POST /api/private/community/:slug/members` e `DELETE /api/private/community/:slug/members` persistem seguir/parar de seguir a comunidade e atualizam `community.members_count`. `GET /api/private/community/:slug/posts` permanece como contrato de posts por comunidade para detalhe. `POST /api/private/community/:slug/posts/media` recebe multipart `media`, grava em `posts/media/` no storage R2 publico e retorna `{ media_url, media_type }`; `POST /api/private/community/:slug/posts` aceita `{ title, content, anonymous?, mediaUrl?, mediaType? }` e so persiste midia quando a URL veio desse prefixo publico permitido. Além dos campos persistidos, ambos podem retornar metadados derivados para apresentação (`author.type_label`, `author.verified`, `author.featured_badge`, `author.whatsapp_url`, `featured_badge`, `media_url`, `media_type`, `highlighted_professional_reply`). O backend deve mascarar autores não psicólogos como `Membro Anônimo #1234` apenas quando `community_post.anonymous=true`, usando sufixo numérico determinístico por post para evitar que todos os anônimos pareçam o mesmo autor; quando `anonymous=false`, deve exibir nome/avatar públicos do paciente. A busca por nome de autor deve respeitar anonimato: pacientes anônimos não entram nesse recorte por nome real. `media_url`/`media_type` do post devem refletir os campos persistidos em `community_post`; quando ausentes, retornam `null`. Quando existir carrossel de imagens, os DTOs tambem retornam `media_items` ordenado por `position`, mantendo fallback para a midia unica legada. O backend deve preencher `highlighted_professional_reply` somente com a resposta de psicologo com `cfp_verified_at` e maior score de votos (`upvotes_count - downvotes_count * 0,6`). Comentários de usuários comuns e psicólogos não verificados não entram nessa prévia.

Complemento 2026-06-22: posts de comunidade passam a suportar carrossel de imagens em `community_post_media`.

- `community_post_media` guarda `post_id`, `media_url`, `media_type`, `position`, `deleted`, `deleted_at`, `created_at` e `updated_at`, com `@@index([post_id, position])` e relacao cascade com `community_post`.
- O carrossel aceita ate 10 imagens enviadas pelo upload real `POST /api/private/community/:slug/posts/media`; videos continuam como midia unica.
- `POST /api/private/community/:slug/posts` e `PUT /api/private/posts/:id` aceitam `mediaItems` com itens `{ mediaUrl, mediaType: "image", position? }` e validam que as URLs venham do prefixo publico permitido do storage.
- `community_post.media_url`/`media_type` permanecem como compatibilidade e refletem a primeira midia ativa; os DTOs passam a retornar tambem `media_items` ordenado por `position`.
- Edicao de post substitui o conjunto anterior do carrossel com soft delete dos itens antigos; remocao usa `mediaItems:null` e/ou `mediaUrl:null`/`mediaType:null`.

Complemento 2026-06-21: na comunidade, `author.verified` para psicologos considera `cfp_verified_at` preenchido **ou** cortesia administrativa ativa (`professional_subscription.source="admin_grant"` com entitlement profissional ativo). A URL derivada `author.whatsapp_url` deve ser exposta para posts e respostas de qualquer psicologo com WhatsApp publico cadastrado, inclusive no plano gratuito, sem depender de selo ou assinatura profissional. `highlighted_professional_reply` e flags como `has_verified_professional_reply` passam a tratar cortesia administrativa ativa como equivalencia publica de psicologo verificado.

`post_reply` (comentários e respostas, TASK-26; PRD distingue comentário/resposta → árvore de 1 nível):

| Campo | Tipo | Notas |
|---|---|---|
| `post_id` | `String` | |
| `author_id` | `String` | |
| `parent_reply_id` | `String?` | null = comentário; preenchido = resposta a um comentário |
| `title` | `String?` | título opcional para resposta profissional em destaque |
| `content` | `String` | texto opcional quando ha midia valida; persistir string vazia para comentarios somente com midia |
| `media_url` / `media_type` | `String?` | mídia opcional em respostas; `media_type` inicialmente `"video"` ou `"image"` |
| `edited_at` | `DateTime?` | preenchido quando o autor edita texto ou midia do comentario/resposta; usado como metadado publico `editado`, sem historico completo no MVP |
| `upvotes_count` / `downvotes_count` | `Int @default(0)` | denormalizados para ranking de respostas e prévia profissional; downvote usa penalidade leve no score, sem exibir contagem pública |
| `@@index([post_id, parent_reply_id, createdAt])`, `@@index([author_id])` | | paginação por âncora (TASK-26) e seleção por autor |

Contratos da tela interna do post (TASK-26):

- `GET /api/private/posts/:id` retorna `post`, comunidade, autor mascarado quando `anonymous=true`, voto atual do usuário (`current_user_vote`), estado salvo (`saved`) e metadado `edited_at` quando houver edição posterior.
- `PUT /api/private/posts/:id` recebe `{ title, content, mediaUrl?, mediaType?, mediaItems? }`, exige autor autenticado do post, atualiza somente titulo/conteudo/midia e preenche `edited_at`; comunidade, autoria, anonimato e status sao imutaveis pelo fluxo de edicao. Midia nova so e aceita quando a URL vem do upload R2 permitido; carrossel usa `mediaItems` com ate 10 imagens, videos continuam como midia unica, e remocao usa `mediaItems:null` e/ou `mediaUrl:null`/`mediaType:null`.
- `GET /api/private/posts/:id/replies?page&limit` retorna comentarios de primeiro nivel paginados e descendentes hidratados ate a profundidade visual vigente, com `current_user_vote` por resposta. A ordenacao de irmaos dentro de cada arvore segue: maior score de votos (`upvotes_count - downvotes_count * 0,6`), melhor posicao de mentor/psicologo na comunidade quando houver ranking aplicavel, e comentario mais recente.
- `POST /api/private/posts/:id/replies/media` recebe multipart `media` e retorna `{ media_url, media_type }`; permitido apenas para psicologos com CFP verificado e Plano Profissional ativo, ou psicologos com cortesia administrativa ativa (`professional_subscription.source="admin_grant"`).
- `POST /api/private/posts/:id/replies` recebe `{ content?, parentReplyId?, mediaUrl?, mediaType? }` e exige pelo menos texto ou midia valida; `parentReplyId` pode apontar para comentario/resposta ativa do mesmo post, preservando a arvore hierarquica, e midia so e aceita quando originada do upload permitido.
- `PUT /api/private/posts/:id/replies/:replyId` recebe `{ content?, mediaUrl?, mediaType? }`, exige autor autenticado da resposta/comentario e atualiza texto e/ou midia; deve permanecer pelo menos texto ou midia valida apos a edicao; autoria, post e hierarquia permanecem imutaveis. Quando `mediaUrl` e `mediaType` sao enviados com URL publica originada do upload permitido (`/public/files/posts/media/`), substitui a midia da resposta; quando ambos sao `null`, remove a midia atual.
- `DELETE /api/private/posts/:id/replies/:replyId` exige autor autenticado e remove a resposta/comentario e sua subarvore. Se o autor for psicologo, pode excluir a qualquer momento; se o autor nao for psicologo, a exclusao e bloqueada quando a subarvore ativa ja contem contribuicao de psicologo, preservando a mesma regra de protecao usada em posts de pacientes com respostas profissionais.
- `POST /api/private/posts/:id/vote` recebe `{ value: 1|-1, replyId? }`; repetir o mesmo voto remove o voto. Downvotes atualizam contadores denormalizados de posts e comentarios para ranking interno, mas não devem ser exibidos como número público.
- `POST /api/private/posts/:id/save` e `DELETE /api/private/posts/:id/save` persistem salvos via `post_save` e mantêm `saves_count`.
- `POST /api/private/posts/:id/report` registra denúncia reativa com motivo e descrição opcional, sem remoção automática do post.

Acompanhamento de comentarios do usuario em `GET /api/private/posts/mine?type=replies`: cada item de comentario retorna metadados derivados `replies_received_count`, `saves_count` e `has_verified_professional_reply`; a flag profissional deve ser calculada apenas por respostas diretas ativas daquele comentario especifico feitas por outro psicologo verificado, sem considerar respostas do proprio autor, respostas ao post principal nem respostas de outras arvores. `current_user_vote` e `saved` seguem derivados de `post_vote`/`post_reply_save` para alimentar a barra padrao de interacao. Comentarios diretos ao post usam `community_post.title` como contexto; respostas a comentarios usam `parent_reply.content`.

`post_vote` (PRD §9 regras: 1 voto/usuário, alteração permitida, downvote não público):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String?` | alvo post… |
| `reply_id` | `String?` | …ou reply (exatamente um preenchido) |
| `value` | `Int` | `1` (upvote) ou `-1` (downvote) |
| `@@unique([user_id, post_id])`, `@@unique([user_id, reply_id])`, `@@index([post_id])` | | upsert para alterar voto; downvotes nunca expostos individualmente |

`post_report` (denúncias reativas de posts comunitários):

| Campo | Tipo | Notas |
|---|---|---|
| `post_id` | `String` | post denunciado |
| `reporter_id` | `String` | usuário autenticado que denunciou |
| `reason` | `String` | motivo informado pelo fluxo de denúncia |
| `description` | `String?` | detalhe opcional, limitado pelo backend |
| `status` | `String @default("pendente")` | reservado para triagem/moderação futura |
| `@@unique([post_id, reporter_id])`, `@@index([status, createdAt])`, `@@index([reporter_id, createdAt])` | | uma denúncia ativa por usuário/post; reenvio atualiza motivo e descrição |

`post_save` (TASK-28, "Posts Salvos"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String` | |
| `@@unique([user_id, post_id])`, `@@index([user_id, createdAt])` | | |

### Ranking de mentores (TASK-27 - derivado)

Nao ha modelo persistido obrigatorio nesta etapa. O ranking e **derivado** de eventos persistidos por comunidade e do entitlement profissional ativo (`professional_subscription`, PRD secao 10: so Plano Profissional). A formula foi aprovada e depois ajustada pelo PDF local `Sistema de Ranking de Mentores.pdf` em ADR-0070:

```text
score = (upvotes * 5) - (downvotes * 3) + (comentarios recebidos * 2) + (compartilhamentos * 4) + (salvamentos * 3) + (cliques WhatsApp da comunidade * 6) + (posts publicados * 1) + (respostas publicadas * 1) + (dias ativos * 1) - penalidade progressiva por posts removidos
```

A penalidade de posts removidos e progressiva por comunidade: `30 * removed_posts * (removed_posts + 1) / 2`. No schema atual, `shares_received` e `community_whatsapp_clicks` permanecem zerados ate existir fonte persistida com origem de comunidade; nao usar mocks para preencher esses componentes. Se for necessario materializar para performance, criar `mentor_score_snapshot` (`psychologist_id`, `community_id`, `score Int`, `period String`, `position Int`) ou modelo equivalente apos ADR especifica de snapshot.

---

## Notificações

`notification` (in-app, TASK-29A; PRD §12, fluxograma 19.9). **Já migrado** (`@@map("notifications")`). Distinto de `notification_subscription` (que guarda a inscrição web-push). A forma abaixo é o schema real (derivado do sample), reconciliado com o PRD §12 — não usar `type/data/read_at`:

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | destinatário; `@@index([user_id])` |
| `read` | `Boolean @default(false)` | flag de leitura (não há `read_at`) |
| `message_key` | `String` | **tipo/chave do evento (PRD §12)** e chave de i18n: `"nova_avaliacao" \| "novo_favorito" \| "visualizacao_perfil" \| "clique_whatsapp" \| "novo_post" \| "nova_resposta" \| "upvote" \| "downvote" \| "compartilhamento" \| "salvamento"` |
| `message_props` | `Json?` | payload (ids de post/perfil/etc.) para render e "Abrir Conteúdo Relacionado" |
| `redirect` | `String?` | rota/deep-link do conteúdo relacionado |

`notification_preference` (TASK-29A, "Configurações de Notificações"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String @unique` | |
| `prefs` | `Json` | mapa `message_key → { enabled: boolean }` por categoria do PRD §12 no MVP web; compatível com registros legados `{ in_app, push }`. Para `novo_post`, usar `post_author_scope: "patients_only" \| "professionals_only" \| "all" \| "favorites"` para segmentar alertas por tipo de autor. O padrão de pacientes é `"all"` (curadoria de psicólogos relevantes da plataforma, com favoritos priorizados); pacientes também podem escolher `"favorites"`. `enabled: false` representa a opção visual `Desativado`. |
| `@@map("notification_preferences")` | | |

`user_background` com `type="notification_digest_state"` guarda, sem novo modelo Prisma, o controle anti-duplicidade dos digests push de conteúdo para pacientes e do digest profissional dos psicólogos:

- `favorites_lunch_digest`: janela do almoço para atividade de psicólogos, priorizando favoritos, depois comunidades seguidas, Top Mentors e relevância geral.
- `community_evening_digest`: janela noturna para resumo de comunidades, priorizando comunidades seguidas, depois categorias relacionadas e conteúdo geral relevante.
- `professional_daily_digest`: janela de fim de tarde/noite para resumo diário do psicólogo, consolidando eventos reais de conversão e reputação (`clique_whatsapp`, `nova_avaliacao`, `novo_favorito`, `nova_resposta`, `upvote`, `salvamento`) quando o canal push estiver habilitado.
- Cada chave armazena `last_checked_at`, `last_sent_at` e `last_sent_date` para evitar reenvio no mesmo dia e calcular a próxima janela temporal.

Endpoints de notificação (módulos separados, padrão do projeto): `notification/{index,update/:id,clean}`; `notification_preference/{show,update}`; `notification_subscription/{key,store}`. Cada caso é um módulo próprio sob `/api/private/...`.

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

**Soberania de dados:** o entitlement ("é Pro?") é respondido pelo nosso banco (`professional_subscription.status` + `current_period_end`, atualizado via webhook ou concessão administrativa auditada) — nunca por chamada síncrona ao MP. `gateway` (= `"mercadopago"`), `gateway_subscription_id`, `gateway_token` e `payment_event` bruto sustentam auditoria, replay e reconciliação.

`subscription_plan` (TASK-31; PRD §13):

| Campo | Tipo | Notas |
|---|---|---|
| `slug` | `String @unique` | `"gratuito" \| "profissional"` |
| `name` | `String` | |
| `price_cents` | `Int @default(0)` | profissional = `990` (R$ 9,90/mês, sem trial; confirmado em TASK-03) |
| `interval` | `String @default("month")` | |
| `features` | `Json?` | flags (selo, analytics, ranking; `profile_video` permanece verdadeiro em todos os planos atuais) |
| `active` | `Boolean @default(true)` | |

`professional_subscription` (TASK-31/32/33):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | |
| `plan_id` | `String` | FK `subscription_plan` |
| `status` | `String @default("inativa")` | `"inativa" \| "ativa" \| "inadimplente" \| "cancelada"` |
| `source` | `String @default("legacy")` | `"free_signup" \| "mercadopago" \| "admin_grant" \| "legacy"`; origem operacional da assinatura |
| `gateway` | `String?` | nome do provedor (TASK-03) |
| `gateway_subscription_id` | `String?` | id externo; nunca dados de cartão |
| `current_period_end` | `DateTime?` | obrigatório para concessões administrativas com prazo; `null` em plano gratuito/legado sem expiração |
| `grant_reason` | `String?` | motivo da concessão administrativa gratuita |
| `grant_notes` | `String?` | observações internas opcionais da concessão |
| `granted_by` | `String?` | responsável operacional pela concessão; texto livre enquanto `admin` segue fora do MVP |
| `grant_started_at` | `DateTime?` | data/hora da concessão administrativa |
| `@@index([psychologist_id, status])` | | habilita selo/destaque/ranking quando `ativa` |
| `@@index([source, status])`, `@@index([status, current_period_end])` | | auditoria e filtro de entitlement ativo não expirado |

`source="admin_grant"` com plano `profissional`, `status="ativa"` e `current_period_end` futuro concede a mesma experiência de perfil do Plano Profissional até expirar: selo, até 10 especialidades e seleção de todos os serviços/abordagens ativos. Vídeo de apresentação é permitido a todos os planos.

Quando uma concessão `admin_grant` substitui a validação automática do CFP, a operação deve informar a data de inscrição no CRP do profissional para atualizar `psychologist_profile.crp_registration_date`. Essa data permanece interna, não é editável na tela de perfil e alimenta o cálculo de anos de experiência exibido apenas para assinantes/cortesias ativos.

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
- Comunidades: explorar/lista em `/app/community`, feed agregado canônico em `/app/community/feed`, detalhe futuro em `/app/community/[slug]`, post em `/app/community/[slug]/post/[id]`. Enquanto o detalhe não existir, chips podem filtrar o feed por query `community` sem tratar `/app/community/[slug]` como página de detalhe.

Backend privado — **o prefixo determina o guard** (ver "Camadas de autenticação e autorização"):

- **Descoberta/leitura de psicólogos** (chamada por pacientes): `/api/private/directory/psychologists`, `/api/private/directory/psychologists/:id` → só `_auth`. **Não** usar `/api/private/psychologists` para descoberta — esse namespace é confundível com autogestão.
- **Autogestão do psicólogo**: `/api/private/psychologist/*` (perfil, CRP, CFP, analytics, assinatura) → `requireRole("psicologo")`.
- **Favoritos de psicólogos**: `/api/private/user/favorites` e `/api/private/user/favorites/:id` → só `_auth`, porque o produto permite favorito para qualquer usuário autenticado.
- **Autogestão do paciente**: `/api/private/patient/*` (onboarding, avaliar; favoritos/follows legados se mantidos) → `requireRole("paciente")`.
- **Comunidade/posts** (qualquer autenticado): `/api/private/community`, `/api/private/community/feed/posts`, `/api/private/community/:slug`, `/api/private/community/:slug/members`, `/api/private/community/:slug/posts`, `/api/private/posts/:id` (`GET`, `PUT`, `DELETE` conforme permissão), `/api/private/posts/:id/replies`, `/api/private/posts/:id/vote`, `/api/private/posts/:id/save`. Singular `community`/`posts`.
- **Conta/preferências compartilhadas** (qualquer autenticado): `/api/private/account/*`, incluindo `GET/PUT /api/private/account/tips` para dicas de onboarding por usuário.
- Cada task deve usar exatamente esses prefixos; divergência exige atualizar este documento.

## Contrato padrão de API

Reutilizar a infraestrutura existente (ver `ARCHITECTURE.md` e o módulo `auth` como referência viva).

- **Resposta de sucesso** (helper `send`): `{ success: true, status?, message?, code?, data }`. O frontend (`handleReq`) desembrulha `data`.
- **Resposta de erro** (`send`/`error`/`error500`): `{ success: false, status, error, code, ... }`. Status default 400; 401 dispara signout no frontend.
- **Paginação padrão** para toda listagem (TASK-13/19/23/26/28): query `page` (1-based) e `limit` (default 20, máx 50); resposta `data: { data: T[], page: number, pages: number, count: number }` (forma do `PaginationResponse` real do backend). Para feeds/listas muito longas, avaliar cursor por `createdAt`+`id` e `@tanstack/react-virtual` (ver `PACKAGES.md`), registrando em ADR.
- **Sem `select`/`include` vindos do frontend**: o frontend NÃO define o shape dos dados (nada de seleção de campos estilo GraphQL). O backend retorna o conjunto de campos que a tela precisa, definido no service/repository. Não reintroduzir `select`/`include` nos validators/DTOs/repos das rotas de produto.
- **Filtro `deleted`**: toda query de listagem/leitura filtra `deleted: false` diretamente no `where` (soft delete; nunca retornar registros deletados).
- **GET sem corpo**: endpoints GET sem entrada não precisam de validator de body; se usarem o validator, ele já trata `body/query/params` ausentes como `{}` (evita erro `invalid_structure`).
- **Validação**: `validator/index.ts` com o pacote local (`method:"email"`, `"password"` = mín. 12 com maiúscula/minúscula/dígito/especial, `"string"`, etc.). Mensagens de erro traduzidas em `backend/locales/pt/translation.json` (incl. `invalid_structure`).
- **Privado**: exige headers `Authorization: Bearer <jwt>` + `x-device`; `req.auth` traz o `user`. Nunca recriar autenticação.
- **Query keys** (frontend): adicionar famílias em `frontend/src/api/cache/keys.ts` ao lado de `auth.hydrate`; invalidar após mutations que alteram listas/detalhes.

## Ordem de criação sugerida

Para evitar referência a tabela inexistente, criar nesta ordem (cada uma com sua migração):

1. `user.role` + `patient_profile` + `psychologist_profile` (TASK-04/07/09).
2. catálogos `specialty`/`service`/`approach` + joins (TASK-09/13).
3. `psychologist_favorite`/`psychologist_follow`/`contact_request`/`professional_review` (TASK-14/16/17).
4. comunidade: `community` → `community_member`/`community_suggestion` → `community_post` → `post_reply`/`post_vote`/`post_save` (TASK-22..28).
5. `notification`/`notification_preference` (TASK-29A).
6. `subscription_plan`/`professional_subscription`/`billing_address`/`payment_method`/`payment_event` (TASK-31..33) — após TASK-03.
