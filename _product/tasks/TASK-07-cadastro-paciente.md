# TASK-07: Cadastro de paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-07 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Paciente |
| Status | Completed |
| Dependências | TASK-02, TASK-04, TASK-06 |
| ADR alvo | ADR de papel do usuário e perfil paciente |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Cadastro de Paciente.jpg` | `figma-design-frame-39-Cadastro-de-Paciente.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O cadastro de usuário **já existe** no backend (`POST /api/public/user/store`). Esta task adapta esse fluxo para criar um paciente: define o papel `role="paciente"` e cria o `patient_profile`, reaproveitando a criação de conta e a sessão existentes. A jornada (fluxograma 19.1/19.2) é: Seleção de Perfil → Cadastro → Verificação de E-mail → Onboarding.

**Não crie `/api/public/patients/register` nem autenticação paralela.** A decisão de papel está em `DATA-MODEL.md` (campo `user.role` + `patient_profile` 1:1).

## Integração com backend existente (não recriar)

Fonte: `backend/src/modules/api/public/user/store`, registrado em `write.ts`.

- **`POST /api/public/user/store`** — body atual `{ name, email, password, password_confirm }` (validator: `email`, `password` forte mín. 12, relação `password == password_confirm`); header `x-device` obrigatório. Cria `user`, grava `log__user` em `$transaction`, **hidrata** (retorna `user` com token → já autenticado). **Não** marca `confirmed` (por isso vai para a verificação de e-mail da TASK-06 em seguida).

Adaptação esperada nesta task (extensão, não duplicação):

- Estender o validator/DTO/service do `store` para aceitar `role` opcional (`"paciente" | "psicologo"`, default `"paciente"`) e, na mesma transação, criar o perfil correspondente. Aqui criamos `patient_profile`.
- Adicionar `user.role` + `patient_profile` ao schema conforme `DATA-MODEL.md` (migração aditiva; não quebra auth existente).
- Aceite de termos: capturar o consentimento e persistir como timestamp/registro (preferir `user_background type:"terms_accept"` com `data` em vez de criar modelo novo; ver `DATA-MODEL.md`). O texto legal/LGPD vem de TASK-03/TASK-34 — se ainda indefinido, capturar o aceite mas registrar a pendência do texto.

Google: o login Google já existe (`GET /api/public/google/login/:deviceId` → callback → `/auth/redirect`). Para nascer como paciente, carregar o papel escolhido na "Seleção de Perfil" via query do login Google (ex.: `?role=paciente`), propagado no `state` do OAuth e persistido no callback ao criar o usuário. Tratar como pequena extensão do callback existente, não como endpoint novo.

## Objetivo

Criar cadastro real de paciente reaproveitando `user/store`, com `role="paciente"` e `patient_profile`, deixando a sessão pronta para a verificação de e-mail (TASK-06).

## Pré-requisitos e bloqueios

- Texto de termos/LGPD obrigatório depende de TASK-03/TASK-34. Sem o texto final, capturar o aceite e registrar pendência (não bloqueia o cadastro técnico).
- A verificação de e-mail (TASK-06) deve existir para o passo seguinte; o cadastro em si não depende de e-mail configurado.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/auth/register/patient`

Implementação esperada:

- Tela baseada em `Cadastro de Paciente.jpg` com `name`, `email`, `password`, `password_confirm` e aceite de termos, mais opção Google quando aplicável.
- Form com a fundação da TASK-02; schema Zod espelhando a regra forte de senha do backend e a confirmação.
- Submit chama o caller de cadastro (estende `frontend/src/api/req/auth` ou cria domínio `patient` no padrão de `api/req`/`api/callers`); em sucesso, `useUserSet` grava a sessão hidratada.
- Como `store` não marca `confirmed`, após cadastro redirecionar para `/auth/verify-email` (TASK-06).
- Estados de e-mail já cadastrado (`error.unique`), senha fraca, termos não aceitos e erro de rede — em PT-BR.

## Escopo backend

Implementação esperada:

- Adicionar `user.role` (`@default("paciente")`) e modelo `patient_profile` (1:1) conforme `DATA-MODEL.md`, com migração Prisma aditiva.
- Estender `public/user/store` (validator/DTO/service/repository) para aceitar `role` e criar o `patient_profile` na mesma `$transaction` de criação do usuário.
- Preservar `hidrate`, `log__user` e o comportamento de não-confirmação automática.
- Estender o callback do Google para persistir `role` vindo do `state`.
- Traduções PT-BR para qualquer erro novo.

Modelos/tabelas (ver `DATA-MODEL.md`): `user` (+`role`), `patient_profile`, `user_background` (aceite de termos), `user_token` (sessão, já existente).

Endpoints:

- `POST /api/public/user/store` (estendido, **não** novo).
- Fluxo Google existente (estendido para `role`).

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/auth/register/patient/{page,logic,use-form}.tsx`.
- HTTP em `frontend/src/api/req/{auth|patient}/index.ts` com `callEndpoint` + `handleReq`.
- Hooks em `frontend/src/api/callers/{auth|patient}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts` se necessário.
- Reutilizar `registry/new-york-v4/ui` e `components/ui`; campos via controllers da TASK-02.

Arquitetura backend obrigatória:

- Manter o caso em `backend/src/modules/api/public/user/store` (controller/service/repository/validator já existem — estender, não recriar).
- Rotas já registradas em `write.ts`.
- Respostas com `send`/`error`/`error500` e traduções em `backend/locales/pt/translation.json`.
- Prisma seguindo convenções do `DATA-MODEL.md` (cuid, soft delete, snake_case, `@@map`, índices).

Packages permitidos nesta task:

- React Hook Form, Zod, `@hookform/resolvers`, TanStack Query, Prisma, argon2/bcrypt (hash já em uso). Sem package novo sem ADR.

Regras anti-recriação específicas:

- Não criar endpoint de cadastro paralelo; estender `user/store`.
- Não criar segundo fluxo de hash/sessão/token.
- Não criar client HTTP, store, validator ou design system paralelo.
- Não usar `sample/` como referência direta.

## Estados obrigatórios

- Loading do cadastro.
- Erro de rede/API em PT-BR (e-mail único, senha fraca, termos).
- Sucesso com sessão criada e redirecionamento para verificação.
- Responsividade mobile-first conforme imagem.

## Fora do escopo

- Implementar onboarding/boas-vindas (é a TASK-08).
- Concluir texto legal/LGPD final.
- Criar dados fake, seed ou mock.
- Refatorar módulos não relacionados.

## Critérios de aceite

- [x] A referência visual foi consultada via Builder Quick Copy ou imagem local citada.
- [x] `user.role` e `patient_profile` criados conforme `DATA-MODEL.md`, com migração aditiva que não quebra a auth existente.
- [x] Cadastro reaproveita `POST /api/public/user/store` (estendido), sem endpoint/auth paralelo.
- [x] `patient_profile` criado na mesma transação do usuário, com `role="paciente"`.
- [x] Google de paciente persiste `role` via callback existente.
- [x] Form usa a fundação da TASK-02; senha valida regra forte + confirmação.
- [x] Pós-cadastro redireciona para `/auth/verify-email` (sessão hidratada, `confirmed=false`).
- [x] Aceite de termos capturado/persistido; pendência de texto registrada se aplicável.
- [x] Nenhum mock, paciente fake ou seed artificial foi usado.
- [x] ADR criado/atualizado em `adrs/` (papel do usuário + perfil paciente).
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` sem erros.
- [x] Browser local validou cadastro real e erro de e-mail duplicado.
- [x] Commit criado com mensagem convencional.

## Execucao TASK-07

- Builder/Quick Copy nao estava disponivel como ferramenta direta nesta sessao; foi usada a imagem local `_product/proto/Cadastro de Paciente.jpg`.
- Implementado `/auth/register/patient` com UI mobile-first, Google, aceite de termos e formulario baseado na fundacao da TASK-02.
- Estendido `POST /api/public/user/store` para aceitar `role`, `terms_accepted` e `terms_version`, criar `patient_profile` e persistir aceite em `user_background` na mesma transacao do usuario.
- Estendido o fluxo Google existente para propagar `role=paciente` e dados de aceite pelo `state` do OAuth.
- Ajuste posterior: o CTA "Continuar com Google" foi habilitado sem depender dos campos de e-mail/senha; o clique exibe consentimento e envia o aceite no `state` do OAuth.
- Criada e aplicada a migracao `backend/prisma/migrations/20260604223000_add_patient_profile/migration.sql`.
- ADR registrado: `adrs/0012-cadastro-paciente-role-profile.md`.
- Pendencia registrada: texto legal/LGPD final ainda sera revisado nas tasks futuras; o aceite e persistido com `terms_version=task07-pending-legal-copy`.
- Validacoes executadas:
  - `pnpm --dir backend db:migrate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local em `http://localhost:3000/auth/register/patient`
- A validacao criou usuario temporario por endpoint real, verificou `role="paciente"`, `patient_profile` e aceite de termos, e removeu o registro ao final sem deixar dado fake permanente.

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build` (schema/migração).
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check` (toca front e back).
- Browser local em `/auth/register/patient`.

## Notas para executor

A adição de `user.role` afeta o redirecionamento por perfil da TASK-04 e a navegação da TASK-12 — mantenha o valor consistente. Concluir em commit próprio.
