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

### Escopo V1 e expansão multiprofissional futura

Ver `adrs/0187-escopo-v1-psicologia-expansao-multiprofissional.md`.

A V1 permanece **somente para psicólogos**. Por isso, os valores de `user.role` continuam restritos a `"paciente" | "psicologo"` e o perfil profissional implementado segue como `psychologist_profile`.

Não criar, em tasks da V1, valores genéricos como `"profissional"` nem tabelas paralelas incompletas para outras categorias de saúde. A abertura para nutricionistas, médicos, cardiologistas e demais áreas deve ser tratada como migração futura com task/ADR próprios, provavelmente introduzindo camada profissional genérica, categoria profissional, registros por conselho e providers de validação documental específicos.

Enquanto essa migração não existir, contratos e tabelas `psychologist_*` seguem canônicos para descoberta, perfil, favoritos, avaliações, analytics, assinatura e validação CFP/CRP. Novos conceitos realmente transversais podem usar nomenclatura `professional` em documentação/código novo, desde que não alterem contratos existentes sem plano de migração.

Decisão adotada (ver `adrs/0002-arquitetura-auth-roles.md`):

- Adicionar `user.role String @default("paciente")` com valores **apenas** `"paciente" | "psicologo"`. Um usuário tem exatamente um papel. **`role` nunca recebe `"admin"`** — admin é audiência separada (ver "Admin" e "Camadas de autenticação e autorização").
- Dados específicos de papel vivem em `patient_profile` (1:1) e `psychologist_profile` (1:1), criados sob demanda.
- O redirecionamento pós-login e a navegação privada (TASK-04, TASK-12) ramificam por `user.role` — mas isso é UX; a fronteira de segurança é imposta no servidor (ver "Camadas de autenticação e autorização").

Campos relacionados ao `user` existente:

| Campo | Tipo | Notas |
|---|---|---|
| `role` | `String @default("paciente")` | **Já adicionado na TASK-04**. `"paciente" \| "psicologo"`. `@@index([role, deleted])`. |
| `has_seen_discover_psychologists_tip` | `Boolean @default(false)` | Preferência persistida por usuário para exibir a dica "Descubra novos psicólogos" apenas uma vez. |
| `has_seen_psychologists_my_search_tip` | `Boolean @default(false)` | Preferência persistida por usuário para exibir a dica acionável "Minha Busca" da descoberta de psicólogos apenas uma vez. |
| `has_seen_psychologist_whatsapp_tip` | `Boolean @default(false)` | Preferência persistida por usuário para exibir a dica acionável do botão WhatsApp na descoberta de psicólogos apenas uma vez. |
| `has_seen_psychologist_profile_video_tip` | `Boolean @default(false)` | Preferência persistida para psicólogos: dica acionável do vídeo de apresentação no perfil profissional. |
| `has_seen_psychologist_reply_tip` | `Boolean @default(false)` | Preferência persistida para psicólogos: dica acionável de resposta a pacientes na comunidade. |
| `has_seen_psychologist_original_post_tip` | `Boolean @default(false)` | Preferência persistida para psicólogos: dica acionável de criação de conteúdo original após ver a dica de resposta. |
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
- `has_seen_discover_psychologists_tip @default(false)`, `has_seen_psychologists_my_search_tip @default(false)`, `has_seen_psychologist_whatsapp_tip @default(false)`, `has_seen_psychologist_profile_video_tip @default(false)`, `has_seen_psychologist_reply_tip @default(false)`, `has_seen_psychologist_original_post_tip @default(false)`, `has_seen_community_post_tip @default(false)` → dicas/onboarding one-shot por usuário.
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
   - `/api/private/*` compartilhado sensivel (notificacoes, conta e comandos) -> `[ _auth ]`
   - `/api/private/directory/*`, `/api/private/community/*` e `/api/private/posts/*` usam leitura publica/`optionalAuth` quando o metodo e conteudo forem publicos; comandos exigem usuario autenticado no handler.
3. **Ownership scoping no handler.** Toda query é escopada por `req.auth.id`; um psicólogo só lê/edita o próprio `psychologist_profile`, as próprias avaliações/analytics.
4. **Trava por existência de perfil (redundante de propósito).** Rotas de psicólogo exigem `psychologist_profile` de `req.auth.id`; um paciente não tem esse registro → operação falha mesmo na hipótese de o guard de papel falhar.
5. **Verificação automatizada.** Check no boot que falha se rota sob `/psychologist/*` ou `/patient/*` subir sem o `requireRole` correspondente; smoke test garantindo que token de paciente recebe `403` em rota psicólogo-only e vice-versa (critério de aceite em TASK-12 e TASK-34).

### Mapa de guardas por rota

| Namespace backend | Guard | Audiência/papel | Tasks |
|---|---|---|---|
| `/api/private/psychologist/*` | `requireRole("psicologo")` | psicólogo autogestão (perfil, CRP/CFP, analytics, assinatura) | 10, 11, 18, 19, 20, 31, 32, 33 |
| `/api/private/patient/*` | `requireRole("paciente")` | paciente autogestão (onboarding) e rotas legadas de favoritos/follows/avaliações quando mantidas | 08, 14, 17, 21 |
| `/api/private/user/favorites/*`, `/api/private/user/reviews*` | só `_auth` | favoritos e avaliações de psicólogos por qualquer usuário autenticado | 14, 17 |
| `/api/private/directory/*` | publico/sem `_auth` para leitura; `_auth` no handler para comandos | publico para descoberta/leitura de psicologos; autenticado para interacoes | 13, 15, 16, 40 |
| `/api/private/community/*`, `/api/private/posts/*` | `optionalAuth` no mount; comandos validam `req.auth` | leitura publica de comunidades/posts; interacoes exigem autenticacao | 22-28, 40 |
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

`admin_activity_log` / `admin_activity_logs` (TASK-67, auditoria administrativa genérica):

| Campo | Tipo | Notas |
|---|---|---|
| `admin_id` | `String` | FK para `admin`; identifica o responsável operacional sem usar `user.role` |
| `target_type`, `target_id` | `String` | alvo auditado; para edição de psicólogo usar `target_type="psychologist"` e `target_id=user.id` |
| `domain`, `action`, `source`, `area` | `String` | domínio `psychologist_profile`, ações `psychologist_personal_data_updated`/`psychologist_professional_data_updated`, origem `admin_panel`, área `perfil_e_cadastro` |
| `changed_fields` | `Json?` | lista segura de labels de campos alterados para a aba Atividades |
| `safe_before`, `safe_after` | `Json?` | snapshots redigidos/mascarados; não armazenar CPF completo, endereço completo, e-mail, tokens ou payload bruto sensível |
| `reason` | `String?` | motivo/observação interna da alteração administrativa |
| `metadata` | `Json?` | metadados operacionais seguros, como `profile_id`, `changed_field_keys` e flags de confirmação |
| `@@index([admin_id, createdAt])`, `@@index([target_type, target_id, createdAt])`, `@@index([domain, action, createdAt])`, `@@index([source, createdAt])` | | consulta por responsável, alvo e feed de atividades |

Complemento TASK-67 (2026-07-11): edição administrativa de Dados pessoais e Dados profissionais do psicólogo usa endpoints Admin próprios, não impersona o psicólogo, não altera `user.email`, credenciais, plano, gateway, cortesia, `crp_status` ou `cfp_verified_at`. Alteração de CPF em psicólogo aprovado exige confirmação e motivo, mas não revalida nem invalida CRP automaticamente. Eventos novos entram em `/api/admin/private/psychologists/:id/activities` a partir de `admin_activity_log`; histórico anterior não é retroagido.

Complemento TASK-68 (2026-07-11): suporte administrativo de Conta e acesso do psicólogo usa somente campos existentes de `user`, `user_token` e `admin_activity_log`. Alteração administrativa de e-mail atualiza `user.email`, gera novo `user.confirm_code`/`confirm_date`, marca `confirmed=false`, limpa `confirmed_date` e remove sessões do psicólogo em `user_token`. Reenvio de confirmação e link de redefinição usam `user.confirm_code`/`confirm_date` e `user.recovery_code`/`recovery_date` sem expor códigos. Senha temporária salva somente hash em `user.password`/`password_confirm`, limpa recovery, define `need_reset=true` e exige troca no próximo login via `/api/private/auth/need_reset`. Eventos administrativos entram em `admin_activity_log` com `domain="psychologist_account"`, `area="conta_e_acesso"` e payload seguro sem senha, hash, códigos ou tokens.

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
| `professional_first_name` | `String?` | Nome profissional do psicólogo para controle do CTA `Fale com [nome]` e saudação da mensagem pronta de WhatsApp; nullable para compatibilidade com perfis legados |
| `professional_last_name` | `String?` | Sobrenome profissional do psicólogo; usado para montar `user.name`/nome completo profissional derivado nas APIs públicas e privadas |
| `headline` | `String?` | bio curta exibida no card/perfil; opcional para publicação pública |
| `bio` | `String?` | texto de apresentação/"Sobre"/experiência; opcional para publicação pública |
| `cover_image_url` | `String?` | imagem pública independente de capa do perfil; não reutiliza thumbnail/frame de vídeo |
| `video_url` | `String?` | vídeo de apresentação público permitido para todos os psicólogos, inclusive Plano Gratuito; obrigatório para publicação/exibição pública do perfil e elegibilidade na listagem `/psychologists` |
| `video_cover_url` | `String?` | imagem pública opcional de capa do vídeo de apresentação; deve ser limpa junto ao vídeo |
| `cpf` | `String?` | usado na consulta CFP; dado sensível (LGPD) |
| `birthdate` | `DateTime?` | data de nascimento informada na edição privada do perfil; obrigatória no contrato de atualização, mas nullable no banco para compatibilidade com perfis legados até próxima edição |
| `crp` | `String?` | registro profissional exibido no cabeçalho |
| `crp_registration_date` | `DateTime?` | data de inscrição no CRP, preenchida pela consulta CFP real, concessão `admin_grant` ou edição administrativa auditável do registro profissional; não é editável pelo psicólogo e pode ser exibida no perfil público como dado do conselho |
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

Regra complementar de identidade profissional (TASK-34, atualizada em 2026-07-11): CPF e CRP permanecem editáveis em perfis gratuitos ou sem validação profissional usada para entitlement. A API privada de perfil deve expor o campo derivado `profile.identity_fields_locked=true` quando houver assinatura profissional ativa não gratuita com `crp_status="aprovado"` ou `cfp_verified_at` preenchido por consulta real autorizada e CPF/CRP persistidos. Complemento de cortesia: uma cortesia administrativa ativa (`professional_subscription.source="admin_grant"`, plano não gratuito, status vigente) também bloqueia CPF, Regional do CRP e Nº de registro CRP na edição do psicólogo, mesmo sem preencher artificialmente `cfp_verified_at`, porque o Admin passa a ser a fonte operacional desses campos durante a cortesia. Quando essa flag estiver ativa, o backend ignora qualquer tentativa de alterar CPF/CRP pelo perfil e o frontend renderiza os campos bloqueados.

Complemento TASK-66 (2026-07-11): na etapa `/api/private/psychologist/cfp/search`, um CPF válido informado pelo psicólogo é persistido em `psychologist_profile.cpf` antes da chamada externa, mesmo quando a API automática falha, fica indisponível ou retorna erro operacional. Essa persistência não aprova o registro, não preenche `cfp_verified_at`, não altera CRP/data e não sobrescreve identidades já bloqueadas por aprovação profissional ou cortesia administrativa ativa; serve para a triagem do Admin na aba Perfil e cadastro. Tentativas históricas com CPF em `professional_registry_check` podem ser usadas como fallback de exibição no Admin sem copiar dados retroativamente.

Complemento TASK-69 (2026-07-12): psicólogos passam a ter `professional_first_name` e `professional_last_name` no `psychologist_profile`. O cadastro manual exige os dois campos e deriva `user.name` para compatibilidade. O cadastro/login Google preenche esses campos por `given_name`/`family_name` quando disponíveis, com fallback para `displayName`. Pacientes permanecem com campo único de nome de exibição em `user.name`/`patient_profile`, sem sobrenome de exibição.

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

Complemento TASK-66 (2026-07-11): a tabela também registra decisões manuais do Admin sem migration nova. Para aprovação/rejeição manual, usar `provider="manual_admin"`, `found=true|false`, `checked_at` da decisão e `raw` com `source="manual_admin"`, admin responsável, dados conferidos, motivo/observação e snapshot anterior/próximo. `psychologist_profile.cfp_verified_at` continua reservado exclusivamente para evidência da API automática real; a aprovação canônica de produto é `psychologist_profile.crp_status="aprovado"`.

---

## Descoberta e relacionamento

`psychologist_favorite` (TASK-14):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | quem favoritou (qualquer usuário autenticado) |
| `psychologist_id` | `String` | alvo |
| `@@unique([user_id, psychologist_id])`, `@@index([psychologist_id])` | | |

Regra de domínio complementar (2026-07-05): `user_id` não pode ser igual a
`psychologist_id` para criação de favorito. Psicólogos podem favoritar outros
psicólogos, mas o próprio perfil/vídeo deve aparecer com coração desabilitado e
`favorited=false` nas leituras contextuais.

`psychologist_follow` (TASK-14): mesma forma de `psychologist_favorite` (seguir é distinto de favoritar; PRD/proto separam "Favoritos" e "Seguindo").

`contact_request` (clique/contato WhatsApp, TASK-16/20; KPI "Cliques em WhatsApp"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String?` | paciente (pode ser anônimo logado) |
| `psychologist_id` | `String` | alvo |
| `channel` | `String @default("whatsapp")` | |
| `@@index([psychologist_id, createdAt])` | | métrica de conversão |

Regra: quando o usuário autenticado for o próprio psicólogo alvo (`user_id = psychologist_id`), o backend pode devolver
o `whatsapp_url` para permitir teste operacional do link, mas **não deve persistir `contact_request`**, emitir
`clique_whatsapp`, entrar no digest de conversões nem contabilizar em Analytics. Cliques anônimos ou de outros usuários
continuam sendo fonte real de conversão.

`profile_view_event` (analytics TASK-20 e notificacoes TASK-29B):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | perfil profissional visualizado; FK `user.id` |
| `viewer_id` | `String?` | usuario autenticado quando existir; nulo para visitante anonimo |
| `device_id` | `String?` | header `x-device` para deduplicar visitante anonimo sem identificar pessoa |
| `source` | `String @default("profile_page")` | origem operacional do evento; no MVP, perfil publico/canonico |
| `@@index([psychologist_id, createdAt])`, `@@index([viewer_id, createdAt])`, `@@index([device_id, createdAt])` | | analytics por periodo e anti-spam |

Regras: registrar apenas perfil publicado, nunca persistir/contabilizar/notificar visualizacao do proprio psicologo
autenticado (`viewer_id = psychologist_id`) e aplicar anti-spam de 6 horas por `viewer_id` ou `device_id`.
`visualizacao_perfil` gera notificacao apenas para psicologo com entitlement profissional ativo, sem expor identidade do
visitante.

Complemento 2026-07-11: impressoes reais em resultados de busca/listagem usam o mesmo modelo com
`source="search_result"` para alimentar o contador **Resultados de busca** no Admin. Aberturas reais do perfil continuam
usando `source="profile_page"` e todas as metricas de visualizacao de perfil devem filtrar essa origem para nao misturar
impressao de resultado com visita ao perfil. Impressoes de busca nao disparam notificacao `visualizacao_perfil` e tambem
nao contabilizam autoimpressao do proprio psicologo.

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

Regra: sessão de vídeo autenticada do próprio psicólogo no próprio perfil (`viewer_id = psychologist_id`) não deve ser
persistida nem entrar nas métricas de Analytics. Visitantes anônimos não podem ser associados com segurança ao dono do
perfil e seguem contabilizados como anônimos.

`visitor_session` (analytics admin, TASK-47):

| Campo | Tipo | Notas |
|---|---|---|
| `visitor_id` | `String` | identificador anonimo estavel do visitante, reutilizado da captura publica de analytics |
| `session_id` | `String` | identificador da sessao do navegador; `@@unique([visitor_id, session_id])` torna o upsert idempotente |
| `user_id` | `String?` | usuario autenticado quando houver token valido; anônimo fica nulo |
| `device_type` | `String @default("unknown")` | somente `"mobile" \| "tablet" \| "desktop" \| "unknown"` |
| `os` | `String?` | normalizado simples; nunca user-agent bruto |
| `browser` | `String?` | normalizado simples; nunca user-agent bruto |
| `viewport_width`, `viewport_height` | `Int?` | dimensoes normalizadas do viewport, quando disponiveis |
| `first_seen_at`, `last_seen_at` | `DateTime @default(now())` | janela de agregacao de sessoes e recencia |
| `@@index([device_type, createdAt])`, `@@index([user_id, createdAt])`, `@@index([last_seen_at])` | | agregacoes admin por periodo, dispositivo e usuario autenticado |

Regra: a rota publica de analytics pode receber dados normalizados de dispositivo, mas nao deve persistir IP bruto,
user-agent bruto ou payload sensivel novo. Payloads antigos de localizacao continuam validos; sem `session_id`, a rota
nao cria `visitor_session` e segue processando localizacao quando aplicavel.

---

## Avaliações

`professional_review` (TASK-17/19; PRD §11, fluxograma 19.2/19.4):

| Campo | Tipo | Notas |
|---|---|---|
| `psychologist_id` | `String` | alvo |
| `author_id` | `String` | usuário autor |
| `rating` | `Int` | 1..5 (validar faixa) |
| `comment` | `String?` | |
| `response` | `String?` | resposta do psicólogo (PRD: "Resposta do profissional") |
| `responded_at` | `DateTime?` | |
| `status` | `String @default("publicada")` | `"publicada" \| "oculta"` (moderação/fraude — PRD §18 risco) |
| `@@unique([psychologist_id, author_id])` | | 1 avaliação por par usuário/psicólogo; não exige contato prévio nem Plano Profissional |
| `@@index([psychologist_id, status])` | | agregação alimenta `psychologist_profile.rating_avg/count` (TASK-19) |

Regra vigente revalidada em 2026-06-26: qualquer usuário autenticado pode criar avaliação para um psicólogo público real pela rota canônica `/api/private/user/reviews*`, sem exigir contato WhatsApp/`contact_request` e sem exigir Plano Profissional ou cortesia manual do alvo. Mantêm-se: psicólogo alvo existente/publicado, bloqueio de autoavaliação, 1 avaliação por par usuário/psicólogo e validação de nota/depoimento. A autogestão do psicólogo em `/api/private/psychologist/reviews` continua própria do psicólogo e pode manter regras específicas de produto/entitlement quando documentadas na respectiva task.

---

## Comunidade

`community` (TASK-22/25):

| Campo | Tipo | Notas |
|---|---|---|
| `name` | `String` | |
| `slug` | `String @unique` | namespace canônico (ver "Convenção de rotas") |
| `description` | `String?` | |
| `category` | `String?` | categoria de curadoria; categorias persistidas do catálogo ativo: `Ansiedade`, `Relacionamentos`, `Autocuidado`, `Depressão`, `TDAH`. Nomes públicos revalidados em 2026-07-01: `Ansiedade em Equilíbrio`, `Relacionamentos com Propósito`, `Autocuidado em Pequenos Passos`, `Depressão: Redescobrindo a Vida`, `TDAH: Encontrando seu Ritmo`. `Mulheres em Foco` e `Luto e Ressignificação` foram removidas das listas públicas por soft delete. |
| `members_count` | `Int @default(0)` | denormalizado para o card |
| `avatar_url` | `String?` | imagem/avatar público da comunidade usado para identidade visual; quando ausente, a UI usa iniciais e fallback azul |
| `visual_primary_color` | `String?` | cor principal cacheável da comunidade em HEX, derivada do avatar quando disponível |
| `visual_primary_dark_color` | `String?` | variação escura da cor principal para gradiente e contraste |
| `visual_soft_color` | `String?` | variação clara da cor principal para fundo do avatar/chips |
| `visual_text_color` | `String?` | cor de texto/initials com contraste sobre `visual_soft_color` |
| `visual_gradient_color` | `String?` | variação clara usada como apoio radial próximo ao avatar |
| `@@index([slug])`, `@@index([category, deleted])` | | |

Governança: comunidades são criadas/curadas apenas por administradores da plataforma em fluxo administrativo futuro; usuários finais não têm endpoint de criação direta. Usuários podem apenas registrar `community_suggestion`, que fica pendente para análise da equipe. Moderadores de comunidades também serão administradores da plataforma, não usuários comuns ou mentores.

Complemento TASK-52 (2026-07-09): regras exibidas dentro da comunidade deixam de ser hardcoded e passam a ser persistidas em `community_rule`, editáveis somente pelo Admin.

`community_rule`:

| Campo | Tipo | Notas |
|---|---|---|
| `community_id` | `String` | relação obrigatória com `community`, cascade em exclusão física |
| `title` | `String` | título curto da regra |
| `description` | `String` | texto exibido na comunidade |
| `position` | `Int @default(0)` | ordenação controlada pelo Admin |
| `active` | `Boolean @default(true)` | regras inativas não aparecem no produto |
| `deleted` / `deleted_at` | `Boolean` / `DateTime?` | remoção no Admin é soft delete |
| `@@index([community_id, active, position])`, `@@index([community_id, deleted, position])` | | leitura pública e gestão admin |

Backfill canônico TASK-52 para comunidades existentes: `Respeito e empatia`, `Sem dados pessoais`, `Proibido conteúdo nocivo`, `Psicólogos não fazem atendimento` e `Para atendimento, use o WhatsApp`. O detalhe público/privado de comunidade (`GET /api/private/community/:slug`) deve retornar apenas regras `active=true` e `deleted=false`, ordenadas por `position`, para substituir a copy hardcoded na interface.

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

Complemento 2026-07-12: `community_member.createdAt` é o marco histórico fixo **Membro desde**. O vínculo nasce quando o usuário segue/entra na comunidade ou quando faz a primeira participação real nela por post/resposta sem vínculo anterior. Interações posteriores não recalculam essa data. Se uma base legada tiver post/resposta anterior ao vínculo, o backfill e a leitura administrativa devem preservar a menor data real de participação.

`community_post` (TASK-23/24/26/28; PRD §9, fluxograma 19.5):

| Campo | Tipo | Notas |
|---|---|---|
| `community_id` | `String` | |
| `author_id` | `String` | paciente ou psicólogo (ambos postam, proto separa só o layout) |
| `title` | `String` | título obrigatório; limite de produto/API: 100 caracteres |
| `content` | `String` | texto |
| `media_url` / `media_type` | `String?` | midia opcional em posts de psicologos aptos; `media_type` inicialmente `"video"` ou `"image"` e a URL deve vir do upload R2 em `/public/files/posts/media/` |
| `media_items` | `community_post_media[]` | itens ativos do carrossel de imagens, ordenados por `position`; manter `media_url`/`media_type` como compatibilidade para a primeira midia ativa |
| `anonymous` | `Boolean @default(true)` | aplicável a posts de pacientes; `true` preserva o comportamento seguro de mascarar o autor como `Membro Anônimo #1234` com sufixo determinístico por `author_id`, estável entre posts/comunidades sem revelar identidade real; `false` permite mostrar nome/avatar do paciente |
| `status` | `String @default("publicado")` | `"publicado" \| "pendente" \| "removido"`. Regra de auto-publicar vs moderar: **decisão de TASK-24** (registrar em ADR; default sugerido `publicado` com moderação reativa, pois PRD §16 lista moderação por IA só em V3) |
| `edited_at` | `DateTime?` | preenchido quando o autor edita título, conteúdo ou mídia após publicação; usado apenas como metadado público `editado`, sem histórico completo no MVP |
| `upvotes_count` / `downvotes_count` / `replies_count` / `saves_count` | `Int @default(0)` | denormalizados para o feed |
| `@@index([community_id, status, createdAt])`, `@@index([author_id])` | | feed por comunidade ordenado por data |

DTOs do feed: `GET /api/private/community/feed/posts` é o contrato canônico do Feed da Comunidade agregado (posts de destaque de todas as comunidades), com filtros opcionais `search`, `community` e `scope="all"|"following"`; `scope="following"` depende de `community_member` (TASK-25), não deve inventar vínculo sem persistência e pode retornar `following_count` para diferenciar usuário sem comunidades seguidas de usuário com comunidades seguidas sem posts no filtro. `GET /api/private/community/:slug` retorna o detalhe da comunidade, contagem real de posts publicados e participação do usuário autenticado via `community_member`. `POST /api/private/community/:slug/members` e `DELETE /api/private/community/:slug/members` persistem seguir/parar de seguir a comunidade e atualizam `community.members_count`. `GET /api/private/community/:slug/posts` permanece como contrato de posts por comunidade para detalhe. `POST /api/private/community/:slug/posts/media` recebe multipart `media`, grava em `posts/media/` no storage R2 publico e retorna `{ media_url, media_type }`; `POST /api/private/community/:slug/posts` aceita `{ title, content, anonymous?, mediaUrl?, mediaType? }` e so persiste midia quando a URL veio desse prefixo publico permitido. Além dos campos persistidos, ambos podem retornar metadados derivados para apresentação (`author.type_label`, `author.verified`, `author.featured_badge`, `author.whatsapp_url`, `featured_badge`, `media_url`, `media_type`, `highlighted_professional_reply`). O backend deve mascarar autores não psicólogos como `Membro Anônimo #1234` apenas quando `community_post.anonymous=true`, usando sufixo numérico determinístico por `author_id` para manter o mesmo alias público pseudônimo entre posts/comunidades sem expor nome, avatar ou perfil real; quando `anonymous=false`, deve exibir nome/avatar públicos do paciente. A busca por nome de autor deve respeitar anonimato: pacientes anônimos não entram nesse recorte por nome real. `media_url`/`media_type` do post devem refletir os campos persistidos em `community_post`; quando ausentes, retornam `null`. Quando existir carrossel de imagens, os DTOs tambem retornam `media_items` ordenado por `position`, mantendo fallback para a midia unica legada. O backend deve preencher `highlighted_professional_reply` somente com resposta direta ao post (`parent_reply_id=null`) feita por psicologo verificado e com maior score de votos (`upvotes_count - downvotes_count * 0,6`). Comentários de usuários comuns, psicólogos não verificados e respostas profissionais vinculadas a comentários de terceiros não entram nessa prévia automática de card. A partir da TASK-42, `highlighted_professional_reply` também expõe `parent_reply_id` e `parent_content` derivados de `post_reply.parent_reply`, sem migration, para manter compatibilidade com contextos em que a própria contribuição exibida é uma resposta profissional.

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
- Os DTOs de comentario/resposta da tela interna retornam `is_post_author`; quando o autor do post publicou anonimamente e ele mesmo comenta ou responde dentro da thread, o backend mascara essa autoria com o mesmo alias `Membro Anônimo #XXXX` derivado de `author_id`, sem expor nome/avatar reais em replies ou notificações. O frontend usa `is_post_author` para exibir o metadado `Autor · há...` antes do horario.
- `POST /api/private/posts/:id/replies/media` recebe multipart `media` e retorna `{ media_url, media_type }`; permitido apenas para psicologos com CFP verificado e Plano Profissional ativo, ou psicologos com cortesia administrativa ativa (`professional_subscription.source="admin_grant"`).
- `POST /api/private/posts/:id/replies` recebe `{ content?, parentReplyId?, mediaUrl?, mediaType? }` e exige pelo menos texto ou midia valida; `parentReplyId` pode apontar para comentario/resposta ativa do mesmo post, preservando a arvore hierarquica, e midia so e aceita quando originada do upload permitido.
- `PUT /api/private/posts/:id/replies/:replyId` recebe `{ content?, mediaUrl?, mediaType? }`, exige autor autenticado da resposta/comentario e atualiza texto e/ou midia; deve permanecer pelo menos texto ou midia valida apos a edicao; autoria, post e hierarquia permanecem imutaveis. Quando `mediaUrl` e `mediaType` sao enviados com URL publica originada do upload permitido (`/public/files/posts/media/`), substitui a midia da resposta; quando ambos sao `null`, remove a midia atual.
- `DELETE /api/private/posts/:id/replies/:replyId` exige autor autenticado e remove a resposta/comentario e sua subarvore. Se o autor for psicologo, pode excluir a qualquer momento; se o autor nao for psicologo, a exclusao e bloqueada quando a subarvore ativa ja contem contribuicao de psicologo, preservando a mesma regra de protecao usada em posts de pacientes com respostas profissionais.
- `POST /api/private/posts/:id/vote` recebe `{ value: 1|-1, replyId? }`; repetir o mesmo voto remove o voto. Downvotes atualizam contadores denormalizados de posts e comentarios para ranking interno, mas não devem ser exibidos como número público nem gerar item na central de notificações.
- `POST /api/private/posts/:id/save` e `DELETE /api/private/posts/:id/save` persistem salvos via `post_save` e mantêm `saves_count`.
- `POST /api/private/posts/:id/share` e `POST /api/private/posts/:id/replies/:replyId/share` persistem compartilhamentos reais via `post_share` apos sucesso de `navigator.share` ou clipboard no frontend. A rota usa `optionalAuth`, aceita `{ channel?: "clipboard"|"web_share", replyId? }`, deduplica por 1 hora por usuario/dispositivo e nao notifica o proprio autor. Na TASK-42, vídeo-respostas profissionais continuam usando essa mesma rota de reply share após Web Share API ou fallback de download/cópia de link; não há novo alvo de métrica.
- `POST /api/private/posts/:id/report` e `POST /api/private/posts/:id/replies/:replyId/report` registram denuncia reativa com motivo e descricao opcional, sem remocao automatica do conteudo; o alvo fica normalizado em `post_report.target_type`/`target_id` para triagem/admin futuro.

Complemento 2026-07-01: autoações autenticadas do autor sobre o próprio `community_post` ou
`post_reply` (comentar no próprio post/comentário, upvote ativo, salvamento ou compartilhamento do
próprio conteúdo) não devem criar `notification`, não aparecem em `/app/notifications` e não
enviam push imediato. Para pacientes, o digest push `community_evening_digest` também deve excluir
posts de autoria do próprio destinatário para que engajamento gerado no próprio post não vire push
do navegador. Autores anônimos continuam sendo identificados internamente por `author_id` para essa
regra, sem expor identidade na central.

Acompanhamento de comentarios do usuario em `GET /api/private/posts/mine?type=replies`: cada item de comentario retorna metadados derivados `replies_received_count`, `saves_count` e `has_verified_professional_reply`; a flag profissional deve ser calculada apenas por respostas diretas ativas daquele comentario especifico feitas por outro psicologo verificado, sem considerar respostas do proprio autor, respostas ao post principal nem respostas de outras arvores. `current_user_vote` e `saved` seguem derivados de `post_vote`/`post_reply_save` para alimentar a barra padrao de interacao. Comentarios diretos ao post usam `community_post.title` como contexto; respostas a comentarios usam `parent_reply.content`.

`post_vote` (PRD §9 regras: 1 voto/usuário, alteração permitida, downvote não público):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String?` | alvo post… |
| `reply_id` | `String?` | …ou reply (exatamente um preenchido) |
| `value` | `Int` | `1` (upvote) ou `-1` (downvote) |
| `@@unique([user_id, post_id])`, `@@unique([user_id, reply_id])`, `@@index([post_id])` | | upsert para alterar voto; downvotes nunca expostos individualmente |

`post_report` (denuncias reativas de posts comunitarios; base de entrada para moderacao/admin futuro):

| Campo | Tipo | Notas |
|---|---|---|
| `post_id` | `String` | post denunciado; sempre preenchido para escopo da comunidade e join com o conteudo principal |
| `reply_id` | `String?` | comentario/resposta denunciado quando a denuncia nao for do post principal |
| `target_type` | `String @default("post")` | alvo normalizado para fila de moderacao: `"post" | "reply"` |
| `target_id` | `String` | id normalizado do alvo: `post_id` para post, `reply_id` para reply |
| `reporter_id` | `String` | usuario autenticado que denunciou |
| `reason` | `String` | motivo informado pelo fluxo de denuncia; valores aceitos no backend: `spam`, `abuse`, `self_harm`, `privacy`, `other` |
| `description` | `String?` | detalhe opcional, limitado pelo backend |
| `status` | `String @default("pendente")` | fila de triagem futura: `"pendente" | "em_analise" | "resolvida" | "rejeitada"`; denuncia nao remove conteudo automaticamente |
| `@@unique([target_type, target_id, reporter_id])`, `@@index([target_type, target_id, status])`, `@@index([status, createdAt])`, `@@index([reporter_id, createdAt])` | | uma denuncia ativa por usuario/alvo; reenvio atualiza motivo, descricao e volta status para `pendente` |

Complemento 2026-06-29: o painel administrativo ainda e reservado/futuro e nao deve ser criado na audiencia `user`; a preparacao desta etapa e persistir denuncias com alvo normalizado e unicidade transacional para que uma futura audiencia admin consiga listar/tria-las sem migrar dados historicos.

`post_save` (TASK-28, "Posts Salvos"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String` | |
| `post_id` | `String` | |
| `@@unique([user_id, post_id])`, `@@index([user_id, createdAt])` | | |

`post_share` (TASK-29B, compartilhamento real de post/comentario):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String?` | usuario autenticado quando existir; `onDelete: SetNull` |
| `device_id` | `String?` | header `x-device` para anti-spam de visitantes anonimos |
| `post_id` | `String` | post compartilhado ou post pai do comentario |
| `reply_id` | `String?` | comentario/resposta compartilhado, quando aplicavel |
| `target_type` | `String @default("post")` | `"post" | "reply"` |
| `channel` | `String @default("web_share")` | `"web_share" | "clipboard"` |
| `@@index([post_id, createdAt])`, `@@index([reply_id, createdAt])`, `@@index([user_id, createdAt])`, `@@index([device_id, createdAt])` | | ranking, notificacao e anti-spam |

Regras: criar evento somente no fluxo real de compartilhamento da interface; deduplicar por 1 hora para o mesmo
usuario/dispositivo/alvo; emitir `compartilhamento` para o autor do post ou comentario, respeitando preferencias e
silenciamento do post. A identidade de quem compartilhou nao e exposta na central.

### Ranking de mentores (TASK-27 - derivado)

Nao ha modelo persistido obrigatorio nesta etapa. O ranking e **derivado** de eventos persistidos por comunidade e do entitlement profissional ativo (`professional_subscription`, PRD secao 10: so Plano Profissional). A formula foi aprovada e depois ajustada pelo PDF local `Sistema de Ranking de Mentores.pdf` em ADR-0070:

```text
score = (upvotes * 5) - (downvotes * 3) + (comentarios recebidos * 2) + (compartilhamentos * 4) + (salvamentos * 3) + (cliques WhatsApp da comunidade * 6) + (posts publicados * 1) + (respostas publicadas * 1) + (dias ativos * 1) - penalidade progressiva por posts removidos
```

A penalidade de posts removidos e progressiva por comunidade: `30 * removed_posts * (removed_posts + 1) / 2`.
`shares_received` deriva de `post_share` para posts e respostas; `community_whatsapp_clicks` permanece zerado ate existir
fonte persistida com origem de comunidade. Nao usar mocks para preencher componentes sem fonte real. Se for necessario
materializar para performance, criar `mentor_score_snapshot` (`psychologist_id`, `community_id`, `score Int`, `period
String`, `position Int`) ou modelo equivalente apos ADR especifica de snapshot.

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

Complemento 2026-06-26: `downvote` permanece como chave histórica/compatível no contrato, mas o produtor real `post_vote` não deve emitir nova notificação para votos negativos e a listagem da central deve ocultar registros legados com essa chave.

Complemento 2026-06-26: a listagem `GET /api/private/notification/index` pode retornar o campo derivado `actor` para notificações individuais em que a autoria melhora o contexto de conversa ou conversão: `novo_post`, `nova_resposta`, `nova_avaliacao`, `novo_favorito` e `clique_whatsapp` autenticado. A hidratação usa os ids persistidos em `message_props` (`post_id`, `reply_id`, `review_id`, `favorite_id`, `contact_request_id` ou `source_id` conforme `source_type`) e não altera o schema Prisma. `actor` contém `{ id, name, avatar, role, professional_label, verified, anonymous, deleted }` para apresentação in-app. Autores anônimos de posts devem usar o mesmo alias `Membro Anônimo #1234` derivado de `author_id`, com `id=null` e `avatar=null`; avaliações nunca são anônimas; favoritos exigem usuário autenticado; e cliques no WhatsApp sem usuário autenticado permanecem com `actor=null` e copy genérica. Psicólogos podem receber `verified=true` quando o perfil profissional tiver verificação atual equivalente à comunidade, mas a central não exibe sufixos como `· Psicólogo`; o selo verificado é suficiente para diferenciar profissionais. `visualizacao_perfil` permanece sem identificação do usuário. Interações passivas (`upvote`, `salvamento`, `compartilhamento` etc.) permanecem sem identificação de autor.

`notification_preference` (TASK-29A, "Configurações de Notificações"):

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | `String @unique` | |
| `prefs` | `Json` | mapa `message_key → { enabled: boolean }` por categoria do PRD §12 no MVP web; compatível com registros legados `{ in_app, push }`. Para `novo_post`, usar `post_author_scope: "patients_only" \| "professionals_only" \| "all" \| "favorites"` para segmentar alertas por tipo de autor. O padrão de pacientes é `"all"` (curadoria de psicólogos relevantes da plataforma, com favoritos priorizados); pacientes também podem escolher `"favorites"`. `enabled: false` representa a opção visual `Desativado`. |
| `@@map("notification_preferences")` | | |

`user_background` com `type="notification_digest_state"` guarda, sem novo modelo Prisma, o controle anti-duplicidade dos digests push de conteúdo para pacientes e do digest profissional dos psicólogos:

- `favorites_lunch_digest`: janela do almoço para atividade de psicólogos, priorizando favoritos, depois comunidades seguidas, Top Mentors e relevância geral.
- `community_evening_digest`: janela noturna para resumo de comunidades, priorizando comunidades seguidas, depois categorias relacionadas e conteúdo geral relevante; para pacientes, nunca escolhe post de autoria do próprio destinatário.
- `professional_daily_digest`: janela de fim de tarde/noite para resumo diário do psicólogo, consolidando eventos reais de conversão e reputação (`clique_whatsapp`, `nova_avaliacao`, `novo_favorito`, `nova_resposta`, `upvote`, `salvamento`) quando o canal push estiver habilitado.
- Cada chave armazena `last_checked_at`, `last_sent_at` e `last_sent_date` para evitar reenvio no mesmo dia e calcular a próxima janela temporal.

Endpoints de notificação (módulos separados, padrão do projeto): `notification/{index,update/:id,clean}`; `notification_preference/{show,update}`; `notification_subscription/{key,store}`. Cada caso é um módulo próprio sob `/api/private/...`.

Push real foi decidido na TASK-03 (ver ADR-0006), usando `web-push`/VAPID e `notification_subscription`. Sem chaves VAPID reais no ambiente, persistir preferência mas não prometer entrega push.

Complemento 2026-07-10 / TASK-63: o Admin passa a ter fundação de campanhas e logs sem e-mail.

- `admin_notification_campaign` (`@@map("admin_notification_campaigns")`): rascunho/agendamento/envio/cancelamento de campanhas manuais criadas por `admin`, com `title`, `body`, `redirect`, `audience`, `channels Json` limitado a `in_app`/`push`, `status` (`draft`, `scheduled`, `sending`, `sent`, `canceled`, `failed`), `scheduled_at`, `sent_at`, `canceled_at` e `created_by_admin_id`.
- `notification_delivery` (`@@map("notification_deliveries")`): log por usuário/canal/origem com `campaign_id?`, `notification_id?`, `user_id`, `source` (`manual`/`automatic`), `trigger_key`, `channel` (`in_app`/`push`), `status` (`queued`, `sent`, `delivered`, `read`, `clicked`, `failed`, `skipped`), `sent_at`, `delivered_at`, `read_at`, `clicked_at`, `failure_reason` e `metadata`.
- `message_key="admin_campaign"` representa uma notificação manual do Admin na central in-app. As preferências existentes são respeitadas por chave/canal; se o usuário tiver `admin_campaign.enabled=false`, `in_app=false` ou `push=false`, a entrega é registrada como `skipped` sem alcance.
- Abertura in-app usa o evento real de leitura (`PUT /api/private/notification/update/:id` ou `clean`) e clique usa `POST /api/private/notification/:id/click`. Push não tem abertura por recebimento; só pode ser contado quando houver interação real registrada.
- Endpoints Admin privados: `/api/admin/private/notifications/campaigns`, `/api/admin/private/notifications/campaigns/:id`, `/send`, `/schedule`, `/cancel`, `/automatic-logs` e `/metrics`. E-mail, SMTP, pixel de tracking e métricas inventadas permanecem fora do escopo.

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

- **Cartão de crédito (transparente):** tokenização **client-side** via Checkout Bricks (Card Payment Brick) / SDK MP → `card_token`. PAN/CVV nunca tocam o backend (escopo PCI reduzido). O token vira a referência em `payment_method.gateway_token`. Assinaturas Lectum aceitam somente `credit_card`; débito e pré-pago ficam fora do MVP para reduzir risco de recorrência e falha operacional.
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
| `gateway_plan_id` | `String?` | identificador do plano recorrente no gateway (`preapproval_plan_id` no Mercado Pago), criado uma vez no backend ou importado por env e reutilizado no checkout |

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
| `grant_reason` | `String?` | campo legado opcional; o fluxo vigente de cortesia administrativa não coleta motivo |
| `grant_notes` | `String?` | observações internas opcionais da concessão |
| `granted_by` | `String?` | responsável operacional pela concessão; texto livre enquanto `admin` segue fora do MVP |
| `grant_started_at` | `DateTime?` | data/hora da concessão administrativa |
| `@@index([psychologist_id, status])` | | habilita selo/destaque/ranking quando `ativa` |
| `@@index([source, status])`, `@@index([status, current_period_end])` | | auditoria e filtro de entitlement ativo não expirado |

`source="admin_grant"` com plano `profissional`, `status="ativa"` e `current_period_end` futuro concede a mesma experiência de perfil do Plano Profissional até expirar: selo, até 10 especialidades e seleção de todos os serviços/abordagens ativos. Vídeo de apresentação é permitido a todos os planos.

Complemento 2026-07-04: no fluxo pago via gateway (`source="mercadopago"`), assinatura profissional ativa e verificação profissional são estados separados. A assinatura paga ativa concede direito ao próximo passo de onboarding, mas **não** concede selo público de verificado nem libera edição do perfil profissional enquanto `psychologist_profile.cfp_verified_at` estiver nulo. Complemento 2026-07-11: a ordem vigente do onboarding pago é endereço de faturamento → WhatsApp → verificação profissional → perfil; a etapa pendente deve ser retomável e redirecionar para `/app/professional/whatsapp/verify` quando faltar WhatsApp e para `/app/professional/cfp` quando o WhatsApp já estiver cadastrado e a verificação profissional ainda estiver pendente. O Plano Gratuito (`slug="gratuito"`, `source="free_signup"`) não entra nesse gate de CFP e segue a jornada gratuita por WhatsApp/perfil. Cortesia administrativa ativa (`source="admin_grant"`) permanece como equivalência operacional de verificação pública quando concedida manualmente, conforme ADRs de cortesia.

Complemento 2026-07-11: cortesia administrativa ativa não entra no fluxo de assinatura paga. Psicólogos com `source="admin_grant"` ativo não devem ser direcionados para checkout, cartão ou endereço de faturamento; se houver onboarding pendente, a próxima etapa é WhatsApp/perfil, sem cobrança. O endereço de faturamento pertence somente ao fluxo pago com assinatura real `source="mercadopago"`, `gateway="mercadopago"` e `gateway_subscription_id` persistido.

Quando uma concessão `admin_grant` substitui a validação automática do CFP, a operação deve informar a data de inscrição no CRP do profissional para atualizar `psychologist_profile.crp_registration_date`. Essa data não é editável na tela de perfil pelo psicólogo, mas pode ser corrigida pelo Admin e exibida no perfil público como dado do registro profissional.

Complemento 2026-07-10: no Admin, a mesma operação de cortesia pode sobrescrever CPF, Regional e CRP informados pelo psicólogo quando a equipe operacional precisar corrigir a identidade profissional antes da concessão. A persistência usa os campos existentes `psychologist_profile.cpf` (somente dígitos) e `psychologist_profile.crp` (`regional/registro` quando ambos existirem), sem criar tabela nova e sem preencher artificialmente `psychologist_profile.cfp_verified_at`; essa data continua exclusiva de consulta CFP/InfoSimples real.

Complemento 2026-07-10: quando uma cortesia administrativa ativa precisa ser revogada pelo Admin, a operação cancela somente a assinatura `professional_subscription` vigente com `source="admin_grant"`, gravando `status="cancelada"` e `current_period_end` no momento da revogação. A revogação não cancela assinatura Mercado Pago, não altera cartão e não apaga CPF/Regional/CRP do `psychologist_profile`; esses campos permanecem como histórico operacional e eventual ponto de partida para nova concessão.

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

O fluxo de alteração de cartão da TASK-33 segue a mesma regra do checkout: re-tokenizar somente cartão de crédito (`credit_card`) no client, enviar `payment_type_id = credit_card` ao backend e rejeitar débito/pré-pago.

`payment_event` (webhook do gateway, TASK-32/33):

| Campo | Tipo | Notas |
|---|---|---|
| `gateway` | `String` | |
| `external_id` | `String` | id do evento (idempotência) |
| `type` | `String` | evento do provedor |
| `payload` | `Json` | bruto, para auditoria |
| `@@unique([gateway, external_id])` | | webhook verifica assinatura do provedor antes de processar |

---

## Analytics first-party e tráfego

Adicionado na TASK-49 para sustentar a aba Admin Tráfego sem integração de terceiros, sem IP bruto e sem user-agent bruto.

`page_view_event`:

| Campo | Tipo | Notas |
|---|---|---|
| `visitor_id` | `String` | Identificador first-party do visitante, gerado no frontend. |
| `session_id` | `String` | Sessão first-party por `sessionStorage`; também atualiza `visitor_session`. |
| `user_id` | `String?` | Associado quando houver token real opcional, sem exigir autenticação. |
| `path` / `normalized_path` | `String` | Caminho sem query sensível; `normalized_path` troca ids longos por `:id` para agregação. |
| `referrer_host` | `String?` | Apenas host do referrer; nunca URL externa completa. |
| `traffic_source` / `traffic_medium` | `String` / `String?` | Origem determinística por UTM/referrer (`direct`, busca, social, share, internal, referral). |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | `String?` | Somente UTMs permitidas, normalizadas e limitadas. |
| `page_kind` | `String` | `home`, `psychologists`, `psychologist_profile`, `community`, `community_post`, `login`, `signup`, `billing`, `other`. |
| `target_type` / `target_id` | `String?` | Derivado de URLs seguras, como psicólogo, comunidade ou post. |
| `display_mode` | `String` | `browser`, `standalone`, `fullscreen`, `minimal-ui`, `unknown`. |
| `is_entry` / `entry_path` | `Boolean` / `String?` | Identifica página de entrada por sessão. |
| `duration_seconds` | `Int?` | Atualizado por troca de rota/pagehide quando o browser permitir. |
| `occurred_at` | `DateTime` | Momento do evento; datas fora da janela confiável são normalizadas no backend. |

`important_action_event`:

| Campo | Tipo | Notas |
|---|---|---|
| `visitor_id`, `session_id`, `user_id` | | Mesma regra de `page_view_event`. |
| `action_type` | `String` | V1 aceita eventos reais de PWA: `pwa_install_prompt_accepted` e `pwa_installed`. |
| `path`, `page_kind`, `target_type`, `target_id`, `display_mode`, `occurred_at` | | Contexto mínimo para futuras agregações. |

Ambos seguem soft delete, relação opcional com `user` por `onDelete: SetNull` e índices por período, sessão, visitante, usuário e dimensões de agregação.

## Convencao de rotas (frontend e backend)

A auditoria achou namespaces conflitantes nas tasks de comunidade (`/communities` vs `/community` vs `/posts`). Padrao canonico apos TASK-40:

- Frontend publico indexavel fora de `/app`:
  - home/feed agregado: `/` (rota canônica do feed público da comunidade);
  - psicologos: `/psychologists`, perfil em `/psychologists/[id]` (`[id]` = `user.id`) e contato em `/psychologists/[id]/contact`;
  - comunidades: explorar/lista em `/community`, feed agregado legado/compatível em `/community/feed`, detalhe em `/community/[slug]`, post em `/community/[slug]/post/[id]` e thread em `/community/[slug]/post/[id]/thread/[replyId]`;
  - ranking de mentores: `/community/top-mentors`.
- Frontend autenticado sob `/app`: perfil do usuario, favoritos, notificacoes, configuracoes, posts do usuario, area profissional e fluxos de interacao/autoria. Exemplos: `/app/community/suggest`, `/app/community/[slug]/post/new`, `/app/posts/mine`, `/app/posts/saved`, `/app/professional/*`, `/app/profile`.
- `/app` nao deve hospedar paginas publicas indexaveis. URLs legadas sob `/app/community*` e `/app/psychologist*` podem existir apenas como compatibilidade autenticada/noindex ou redirecionamento, nunca como canonicas publicas.

Backend privado/publico operacional:

- **Descoberta/leitura de psicologos**: manter o namespace historico `/api/private/directory/psychologists`, `/api/private/directory/psychologists/:id`, posts/reviews/contact/contact-click/video-watch relacionados. Leituras publicas e abertura/registro de WhatsApp nao exigem sessao; quando o visitante nao estiver autenticado, `contact_request.user_id` fica `null` e a navegacao permanece livre, exibindo apenas dicas/prompts de cadastro quando algum gatilho de produto estiver definido, sem gate bloqueante no CTA de WhatsApp. Interacoes que dependem de identidade do usuario, como favoritos e avaliacoes, validam autenticacao no handler. **Nao** usar `/api/private/psychologists` para descoberta - esse namespace e confundivel com autogestao.
- **Autogestao do psicologo**: `/api/private/psychologist/*` (perfil, CRP, CFP, analytics, assinatura) -> `requireRole("psicologo")`.
- **Relacionamentos/avaliacoes de psicologos por usuario**: `/api/private/user/favorites`, `/api/private/user/favorites/:id`, `/api/private/user/reviews` e `/api/private/user/reviews/eligibility/:id` -> so `_auth`, porque favorito e avaliacao exigem usuario autenticado.
- **Autogestao do paciente**: `/api/private/patient/*` (onboarding; favoritos/follows/avaliacoes legados se mantidos) -> `requireRole("paciente")`.
- **Comunidade/posts**: `/api/private/community`, `/api/private/community/feed/posts`, `/api/private/community/:slug`, `/api/private/community/:slug/posts` e `/api/private/posts/:id` podem responder leitura publica com `optionalAuth`; seguir, sugerir, publicar, upload, comentar, votar, salvar, reportar, editar e excluir exigem autenticacao e permissao no handler. Singular `community`/`posts`.
- **Conta/preferencias compartilhadas** (qualquer autenticado): `/api/private/account/*`, incluindo `GET/PUT /api/private/account/tips` para dicas de onboarding por usuario.
- Cada task deve usar exatamente esses prefixos; divergencia exige atualizar este documento.

## Contrato padrão de API

Reutilizar a infraestrutura existente (ver `ARCHITECTURE.md` e o módulo `auth` como referência viva).

- **Resposta de sucesso** (helper `send`): `{ success: true, status?, message?, code?, data }`. O frontend (`handleReq`) desembrulha `data`.
- **Resposta de erro** (`send`/`error`/`error500`): `{ success: false, status, error, code, ... }`. Status default 400; 401 dispara signout no frontend.
- **Paginação padrão** para toda listagem (TASK-13/19/23/26/28): query `page` (1-based) e `limit` (default 20, máx 50); resposta `data: { data: T[], page: number, pages: number, count: number }` (forma do `PaginationResponse` real do backend). Para feeds/listas muito longas, avaliar cursor por `createdAt`+`id` e `@tanstack/react-virtual` (ver `PACKAGES.md`), registrando em ADR.
- **Sem `select`/`include` vindos do frontend**: o frontend NÃO define o shape dos dados (nada de seleção de campos estilo GraphQL). O backend retorna o conjunto de campos que a tela precisa, definido no service/repository. Não reintroduzir `select`/`include` nos validators/DTOs/repos das rotas de produto.
- **Filtro `deleted`**: toda query de listagem/leitura filtra `deleted: false` diretamente no `where` (soft delete; nunca retornar registros deletados).
- **GET sem corpo**: endpoints GET sem entrada não precisam de validator de body; se usarem o validator, ele já trata `body/query/params` ausentes como `{}` (evita erro `invalid_structure`).
- **Validação**: `validator/index.ts` com o pacote local (`method:"email"`, `"password"` = mín. 10, máx. 128, sem composição obrigatória, `"string"`, etc.). Mensagens de erro traduzidas em `backend/locales/pt/translation.json` (incl. `invalid_structure`).
- **Privado**: exige headers `Authorization: Bearer <jwt>` + `x-device`; `req.auth` traz o `user`. Nunca recriar autenticação.
- **Query keys** (frontend): adicionar famílias em `frontend/src/api/cache/keys.ts` ao lado de `auth.hydrate`; invalidar após mutations que alteram listas/detalhes.

## Ordem de criação sugerida

Para evitar referência a tabela inexistente, criar nesta ordem (cada uma com sua migração):

1. `user.role` + `patient_profile` + `psychologist_profile` (TASK-04/07/09).
2. catálogos `specialty`/`service`/`approach` + joins (TASK-09/13).
3. `psychologist_favorite`/`psychologist_follow`/`contact_request`/`professional_review` (TASK-14/16/17).
4. comunidade: `community` → `community_member`/`community_suggestion` → `community_post` → `post_reply`/`post_vote`/`post_save`/`post_share` (TASK-22..29B).
5. `notification`/`notification_preference` (TASK-29A).
6. `profile_view_event` quando analytics/notificacao de visualizacao entrar no escopo (TASK-20/29B).
7. `subscription_plan`/`professional_subscription`/`billing_address`/`payment_method`/`payment_event` (TASK-31..33) — após TASK-03.

## Complemento 2026-06-26 - mensagens `wa.me` personalizadas

- Links `author.whatsapp_url` e `whatsapp_url` de perfil/listagem/contato passam a incluir mensagem pronta com o mesmo nome exibido no CTA `Fale com ...` do psicólogo quando disponível.
- A partir da TASK-69, esse nome vem prioritariamente de `psychologist_profile.professional_first_name`; se o campo estiver vazio em perfil legado, o fallback continua usando o primeiro nome útil derivado de `user.name`.
- O fallback de primeiro nome útil normaliza espaços, remove prefixos/títulos profissionais de início (`Dr.`, `Dra.`, `Psicólogo`, `Psicóloga`, `Psi`/`Psic.`) e usa o primeiro termo restante que não seja partícula de nome (`de`, `da`, `do`, `das`, `dos`, `di`, `du`, `e`); se não houver nome, mantém fallback genérico.
- O texto do `wa.me` é contextual: perfil (`encontrei seu perfil na Lectum`), post profissional (`encontrei seu post na Lectum`) e resposta/comentário profissional (`encontrei sua resposta na Lectum`).
- O contrato permanece uma string URL pública; não há exposição do telefone bruto fora do link de intenção.
