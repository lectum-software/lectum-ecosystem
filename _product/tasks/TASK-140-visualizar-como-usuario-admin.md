# TASK-140: Visualização administrativa como usuário

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-140 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Conta e acesso |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-61, TASK-68, TASK-73 |
| ADR alvo | ADR-0405 |

## Contexto

Feedback explícito do usuário em 2026-08-02: a ação **Visualizar como usuário** deve existir, mas ficar mais escondida dentro da aba **Conta** dos detalhes administrativos de pacientes e psicólogos.

As tasks anteriores mantinham impersonação fora do escopo. Esta task reabre a decisão com um recorte mais seguro: **visualização auditada em modo somente leitura**, sem transformar o Admin em sessão operacional plena do usuário.

Referências visuais usadas:

- Capturas compartilhadas pelo usuário de `/pacientes/[id]` e `/psicologos/[id]`.
- `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png` e demais telas de detalhe do psicólogo.

Builder/Quick Copy não esteve disponível como ferramenta callable no ambiente; foi registrada a limitação e usado o fallback de imagens locais/capturas.

## Objetivo

Permitir que um Admin autenticado abra a experiência real de paciente ou psicólogo em nova aba, visualizando a conta do usuário final em modo somente leitura, com TTL curto, auditoria real e bloqueio backend para ações de escrita.

## Escopo

### Backend

- Adicionar endpoint Admin privado:
  - `POST /api/admin/private/psychologists/:id/account/view-as`;
  - `POST /api/admin/private/patients/:id/account/view-as`.
- Exigir motivo obrigatório com o validator existente de **Conta**.
- Criar token de usuário final real em `user_token`, com `device_id` prefixado por `admin_view_as:` e TTL de 30 minutos.
- Registrar `admin_activity_log` com:
  - `domain="psychologist_account"` ou `domain="patient_account"`;
  - `area="conta_e_acesso"`;
  - ações `psychologist_account_view_as_started` e `patient_account_view_as_started`;
  - sem armazenar JWT, senha, hash, código ou segredo.
- Bloquear qualquer método não seguro (`POST`, `PUT`, `PATCH`, `DELETE`) quando o bearer token for de visualização administrativa.
- Preservar `GET`, `HEAD` e `OPTIONS` para leitura real.
- Excluir sessões `admin_view_as:*` das contagens normais de sessões ativas na aba **Conta**.

### Admin UI

- Inserir o card **Visualização administrativa** dentro da aba **Conta**, entre **Sessões e segurança** e **Ações da conta**.
- O card deve usar React Hook Form, Zod e controllers existentes para motivo obrigatório.
- O botão **Visualizar como usuário** abre `/auth/admin-view-as` do frontend em nova aba via hash, sem enviar o JWT na URL de request.
- A ação deve estar indisponível para contas suspensas, desativadas ou excluídas.

### Frontend do usuário

- Criar `/auth/admin-view-as` para consumir o hash, salvar o token real, hidratar a sessão e redirecionar para:
  - paciente: `/app/profile`;
  - psicólogo: `/app/professional/profile/setup`.
- Exibir banner global indicando visualização administrativa em modo somente leitura, com ação para sair e voltar ao painel Admin.
- Não registrar pageview, captura de localização ou eventos PWA enquanto a sessão `admin_view_as` estiver ativa.

## Fora do escopo

- Impersonação com escrita.
- Bypass de permissões de domínio do usuário final.
- Alteração visual profunda das telas do usuário final.
- Novo modelo Prisma ou migration.
- Novo package.
- Captura de senha, segredo, refresh token ou token em auditoria.

## Critérios de aceite

- [x] A opção fica na aba **Conta** dos detalhes de paciente e psicólogo, não no header.
- [x] O card aparece antes de **Ações da conta**, mantendo ações sensíveis no final da aba.
- [x] A ação exige motivo obrigatório usando React Hook Form, Zod e controllers existentes.
- [x] Backend cria sessão real em `user_token` com `device_id` `admin_view_as:*` e TTL curto.
- [x] Backend audita a abertura em `admin_activity_log` sem armazenar JWT/segredos.
- [x] A sessão de visualização é somente leitura: métodos não seguros são bloqueados por `_auth` e `optionalAuth`.
- [x] Leituras reais continuam usando os endpoints existentes, sem mocks ou endpoints simulados.
- [x] Sessões `admin_view_as:*` não poluem o contador normal de sessões ativas da aba **Conta**.
- [x] Frontend do usuário possui rota `/auth/admin-view-as` para instalar a sessão e redirecionar ao app real.
- [x] Banner global informa **modo somente leitura** e permite sair da visualização.
- [x] Analytics/location/PWA não são registrados enquanto `admin_view_as` estiver ativo.
- [x] UI mobile-first mantida nos cards/formulários da aba **Conta**.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum package novo foi instalado.
- [x] Não houve alteração de Prisma schema ou migrations; `db:migrate` não se aplica.
- [x] ADR criado em `adrs/`.
- [x] Checks/builds relevantes executados ou bloqueio preexistente registrado.
- [x] Commit próprio criado e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local:
  - Admin `/psicologos/[id]?tab=conta`;
  - Admin `/pacientes/[id]?tab=conta`;
  - Frontend `/auth/admin-view-as` sem hash retorna estado de erro honesto.

## Execução TASK-140

- Implementados endpoints Admin privados de view-as para pacientes e psicólogos.
- O token gerado usa `user_token` real, `device_id` especial `admin_view_as:*` e expiração JWT de 30 minutos.
- A hidratação do usuário preserva o token especial e não transforma visualização em sessão normal.
- `_auth` e `optionalAuth` bloqueiam ações de escrita com token `admin_view_as:*`.
- A aba **Conta** de pacientes e psicólogos recebeu card **Visualização administrativa** com formulário de motivo obrigatório.
- O frontend do usuário recebeu `/auth/admin-view-as`, storage local da sessão, banner global e saída para o Admin.
- Pageviews, localização e eventos PWA são ignorados durante a visualização administrativa.
- Correção pós-teste em browser: a aba é pré-aberta de forma síncrona no submit, antes da chamada assíncrona ao backend, evitando bloqueio de popup e evitando toast falso quando o navegador bloquear a nova aba.
- Não houve schema Prisma, migration, package novo, seed, mock, endpoint simulado ou auditoria com segredo.

## Validações executadas

- `pnpm --dir backend exec biome check --write ...` nos arquivos backend da task — OK.
- `pnpm --dir backend typecheck` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin exec biome check --write ...` nos arquivos Admin da task — OK.
- `pnpm --dir admin exec biome check --write ...` nos arquivos Admin do ajuste de popup — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm --dir frontend exec biome check --write ...` nos arquivos frontend da task — OK.
- `pnpm --dir frontend check` — OK.
- `pnpm --dir frontend build` — OK após aguardar finalização de build Next concorrente já em andamento no ambiente local.
- `pnpm check` — OK após isolar temporariamente alterações preexistentes fora do escopo, validando o estado final apenas com os arquivos desta task.
- A base remota atual trouxe uma quebra de formatação em `frontend/src/app/app/professional/analytics/logic.tsx`; foi aplicado ajuste formatter-only para manter `pnpm check` verde, sem mudança funcional desta task.
- Smoke HTTP local:
  - `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8vxf?tab=conta` — 200.
  - `GET http://localhost:3002/pacientes/visual-user-content-sensitive-admin-detail?tab=conta` — 200.
  - `GET http://localhost:3000/auth/admin-view-as` — 200.
  - `POST /api/admin/private/psychologists/:id/account/view-as` sem sessão Admin — 401.
  - `POST /api/admin/private/patients/:id/account/view-as` sem sessão Admin — 401.
- Uma execução anterior de `pnpm check`/`pnpm --dir backend check` com alterações preexistentes não relacionadas à task no worktree falhou em `AnalyticsRepository.ts` e `analytics-traffic-path.ts`; essas alterações foram isoladas e não entraram no commit desta task.

## ADR

- ADR-0405 — Visualização administrativa como usuário em modo somente leitura.
