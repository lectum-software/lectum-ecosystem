# TASK-45: Fundação backend do Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-45 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-34, TASK-44 |
| ADR alvo | ADR sobre admin como audiência separada, rotas `/api/admin/*` e app separado |

## Contexto

O painel administrativo da Lectum será um ambiente exclusivo para administradores e não deve ser vinculado ao site/app de pacientes e psicólogos. O backend atual já separa `user.role` entre `"paciente"` e `"psicologo"` e o `DATA-MODEL.md` reserva admin como audiência separada, com `admin` e `admin_token`, sem usar `user.role="admin"`.

Essa task cria a base segura para qualquer tela administrativa futura. Sem ela, o app Admin não pode consumir dados operacionais com autenticação própria.

## Objetivo

Permitir que um administrador real faça login por uma audiência própria e acesse rotas backend protegidas por token admin, sem misturar credenciais, tokens ou permissões com usuários finais.

## Pré-requisitos e bloqueios

- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md` e `_product/tasks/PACKAGES.md`.
- Confirmar que admin permanece fora de `user.role`; se a implementação tentar adicionar `"admin"` em `user.role`, parar.
- Definir/registrar em ADR o namespace final de backend para admin. Recomendação: `/api/admin/public/*` e `/api/admin/private/*`.
- Definir env backend-only para assinatura do JWT admin, preferencialmente `ADMIN_JWT_SECRET`.
- Não criar credencial inicial hardcoded, seed permanente ou admin fake.

## Escopo frontend

- Nenhum app visual nesta task.
- Pode ser necessário atualizar documentação/env example para informar variáveis usadas pelo futuro `admin/`.

## Escopo backend

- Criar modelos Prisma `admin` e `admin_token`, conforme seção "Admin" de `DATA-MODEL.md`.
- Criar middleware/estratégia de autenticação admin independente da autenticação de `user`.
- Criar rotas públicas e privadas mínimas:
  - `POST /api/admin/public/auth/login`;
  - `GET /api/admin/private/auth/hidrate`;
  - `POST /api/admin/private/auth/logout` quando houver token a invalidar.
- Criar comando operacional para bootstrap/upsert do primeiro admin, com senha recebida por flag/env e hash real.
- Registrar rotas em `backend/src/main/server/imports/write.ts` ou arquivo equivalente, sem quebrar as rotas existentes.
- Atualizar `backend/src/interfaces/objects` quando necessário.
- Adicionar traduções PT-BR para erros visíveis.

## Fora do escopo

- Criar app `admin/`.
- Criar Dashboard ou telas administrativas.
- Criar roles/perfis granulares de admin além do mínimo necessário para autenticação.
- Implementar recuperação de senha por e-mail, a menos que a task seja explicitamente expandida.
- Usar `user.role="admin"` ou reaproveitar `user_token`.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: padrões de módulos, resposta, validação, Prisma e segurança.
- `DATA-MODEL.md`: seção "Admin" e "Camadas de autenticação e autorização".
- `PACKAGES.md`: usar `argon2`, `jsonwebtoken`, Passport/JWT e Zod já instalados.

Backend esperado:

- Prisma:
  - `admin` com `id`, `deleted`, `deletedAt`, `createdAt`, `updatedAt`, `name`, `email @unique`, `password?`, `password_confirm?`, `active`, `confirmed`, `confirmed_date?`, `confirm_code?`, `confirm_date?`, `recovery_code?`, `recovery_date?`, `need_reset`, relação `admin_tokens`.
  - `admin_token` com `admin_id`, `token?`, `device_id?`, relação cascade e índices por token/admin/device.
  - Nomes snake_case e `@@map("admins")` / `@@map("admin_tokens")`.
- Auth:
  - JWT admin com secret/audience separados da audiência `user`.
  - Middleware fail-closed para `/api/admin/private/*`.
  - Verificação de token contra `admin_token` persistido e `admin.active=true`.
  - `x-device` obrigatório para persistência/validação do device, mantendo compatibilidade com o padrão atual.
- Módulos:
  - Usar controller/service/repository/validator.
  - Não retornar formato ad hoc; usar helpers `send`, `error`, `error500` e `msg`.
- Operação:
  - Comando de bootstrap documentado, exemplo: `pnpm --dir backend admin:bootstrap -- --email ... --name ... --password ...`.
  - O comando deve criar ou atualizar admin real com hash de senha e nunca logar a senha.

Packages usados:

- Apenas pacotes backend já instalados.
- Não instalar SDK, RBAC framework ou pacote de auth novo.

Regras anti-recriação:

- Reutilizar padrões dos módulos de auth existentes apenas como referência estrutural; não misturar tabelas/tokens.
- Reutilizar helpers de JWT, validação, tradução e resposta quando possível.
- Qualquer exceção estrutural por ser audiência admin deve ser registrada em ADR.

## Critérios de aceite

- [x] `admin` e `admin_token` existem no Prisma com migration aplicada.
- [x] `pnpm --dir backend db:migrate` foi executado sem erro após alteração de schema/migrations.
- [x] Existe login admin real que valida senha com hash e persiste token admin.
- [x] `GET /api/admin/private/auth/hidrate` só responde com token admin válido.
- [x] Token de usuário final (`user_token`) não autentica rota admin.
- [x] Token admin não autentica rota privada de paciente/psicólogo.
- [x] Bootstrap do primeiro admin é operacional, auditável e não usa senha hardcoded.
- [x] Respostas e erros seguem os helpers do backend e mensagens PT-BR.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` foram executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Teste manual com admin real criado pelo comando de bootstrap:
  - login;
  - hydrate;
  - acesso negado com token de usuário final.

## Notas de execução

- Se `prisma migrate dev` falhar por conflito com dados/estado local, não resetar banco automaticamente; perguntar ao usuário antes de comando destrutivo.
- O segredo `ADMIN_JWT_SECRET` nunca deve sair do backend, aparecer em resposta HTTP, log ou frontend.
