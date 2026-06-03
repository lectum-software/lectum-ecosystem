# ADR-0002: Arquitetura de autenticação e papéis (paciente, psicólogo, admin)

## Status

Accepted

## Task relacionada

Transversal às tasks de auth e privadas: TASK-04 a TASK-34. Fonte de schema/contratos em `_product/tasks/DATA-MODEL.md`.

## Contexto

O backend Lectum hoje tem uma única audiência (`api`) com tabela `user`/`user_token` e estratégia JWT `jwt-user-api`, e **não** possui campo de papel. O produto (PRD) tem três atores: paciente, psicólogo e, futuramente, admin (moderação de comunidade, aprovação de CRP/CFP, curadoria, moderação de avaliações).

Preocupação central levantada na revisão: um usuário com papel `paciente` não pode, em hipótese alguma, acessar rotas destinadas a psicólogos — nem por token forjado, nem por papel obsoleto, nem por esquecimento de guard em endpoint novo.

Referência de arquitetura: `sample/backend/src/modules` separa audiências em módulos top-level (`api`, `manager`, `integration`), cada um com login/middleware/estratégia próprios. A audiência `manager` (admin) usa tabela `admin`/`admin_token` e estratégia `jwt-admin-manager`, totalmente separada do usuário final; dentro da audiência `api`, o middleware `level` autoriza por papel/permissão após o `_auth`.

## Decisão

Adotar duas camadas independentes de controle.

**Camada 1 — Isolamento por audiência (fronteira dura).**
- Paciente e psicólogo compartilham a tabela `user`/`user_token` e a estratégia `jwt-user-api` já existentes. Diferenciados por `user.role` (`"paciente" | "psicologo"`), com `patient_profile`/`psychologist_profile` 1:1 para dados específicos. Não há razão de segurança para separar tabelas — a jornada e a identidade são majoritariamente compartilhadas; separar duplicaria login/recovery/confirm sem ganho.
- Admin é audiência separada: tabela `admin`/`admin_token` e estratégia própria (`jwt-admin-manager`), módulo/middleware próprios. **`user.role` nunca recebe `"admin"`.** Reservado e fora do MVP; estrutura fixada em `DATA-MODEL.md` para evitar que tasks tratem admin como papel de usuário.

**Camada 2 — Guarda de papel dentro da audiência `api`.**
- Middleware `requireRole(...)` aplicado **depois** do `_auth`, **fail-closed** (papel divergente → `403`).
- Imposto **por namespace no mount** em `backend/src/main/server/imports/write.ts`, não por handler: `/api/private/psychologist/*` exige `psicologo`; `/api/private/patient/*` exige `paciente`; `/api/private/directory/*` (descoberta de psicólogos por pacientes), `/api/private/community/*`, `/api/private/posts/*`, notificações e conta exigem apenas `_auth`.
- Reforços redundantes: ownership scoping por `req.auth.id` em todo handler; trava por existência de `psychologist_profile`/`patient_profile`.
- `req.auth.role` é sempre lido do banco (a estratégia `jwt-user-api` recarrega o usuário a cada request), não de claim do token.

## Consequências

- Positivo: token de paciente não acessa rota de psicólogo (guard fail-closed + ownership + existência de perfil); token de usuário não acessa admin (estratégia/tabela distintas). Defesa em profundidade.
- Positivo: guard por namespace torna impossível "esquecer" o controle em endpoint novo — ele é herdado do prefixo.
- Positivo: reaproveita 100% do fluxo de auth atual para paciente/psicólogo; admin não onera o MVP.
- Trade-off: descoberta de psicólogos precisa de namespace neutro (`/api/private/directory/...`) separado da autogestão (`/api/private/psychologist/...`) para o guard-por-prefixo ser inequívoco. Ajusta a convenção de rotas do `DATA-MODEL.md`.
- Trade-off: não adotamos o aparato completo de `level/role/action/feature` do sample no MVP; um `requireRole` enxuto basta e evolui para permissões finas depois sem retrabalho.
- Revisitar: ao construir a audiência admin (módulo, estratégia, telas); ao introduzir permissões mais finas que papel; se o produto algum dia exigir uma conta com múltiplos papéis (hoje: um papel por usuário).

## Validação

- `pnpm --dir backend check` e `pnpm --dir backend build` após adicionar `user.role`, `patient_profile`, `psychologist_profile` e o middleware `requireRole`.
- Check no boot: falha se rota sob `/api/private/psychologist/*` ou `/api/private/patient/*` subir sem o `requireRole` correspondente.
- Smoke test: token de paciente recebe `403` em rota psicólogo-only e vice-versa (critério de aceite em TASK-12 e TASK-34).

## Pendências

- Construção da audiência admin (pós-MVP).
- Seed/curadoria de catálogos e categorias (TASK-03) não é afetada por esta ADR.
