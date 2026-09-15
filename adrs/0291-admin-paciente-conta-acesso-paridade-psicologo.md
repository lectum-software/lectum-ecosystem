# ADR-0291 - Paridade da aba Conta do paciente com psicologo no Admin

Data: 2026-07-20
Status: Aceito

## Contexto

O detalhe administrativo de paciente, originalmente definido na TASK-61 como leitura sem acoes de conta, recebeu feedback explicito para que a aba **Conta** replique as mesmas opcoes existentes na aba **Conta** do detalhe administrativo do psicologo.

A implementacao precisava manter a separacao entre backend e admin frontend, nao criar mocks, nao adicionar pacotes, nao alterar schema Prisma/migrations e preservar o limite de escopo de moderacao: a nova permissao vale apenas para conta/acesso, nao para silenciamento, banimento, moderacao textual parcial ou automacoes de moderacao de paciente.

Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente. A referencia visual auditavel foi a captura enviada pelo usuario e o padrao ja implementado em `/psicologos/[id]?tab=conta`.

## Decisao

- Criar o modulo `backend/src/modules/api/admin/private/patients/account` com endpoints admin autenticados equivalentes ao modulo de conta do psicologo:
  - `GET /api/admin/private/patients/:id/account`;
  - `POST /change-email`;
  - `POST /send-email-confirmation`;
  - `POST /send-password-reset`;
  - `POST /set-temporary-password`;
  - `POST /revoke-sessions`;
  - `POST /suspend`;
  - `POST /deactivate`;
  - `POST /delete`.
- Usar apenas fontes reais ja existentes: `user`, `user_token`, `patient_profile` e `admin_activity_log`.
- Carregar a conta administrativa pelo `user` quando o paciente existe em `users` mas ainda nao possui `patient_profile`, mantendo suporte a `patient_profile.id`/`patient_profile.user_id` quando o perfil existir.
- Exigir motivo interno e confirmacao forte quando a acao for destrutiva/sensivel, espelhando as regras do psicologo.
- Registrar auditoria como `target_type="patient"`, `domain="patient_account"` e `area="conta_e_acesso"`.
- Generalizar o `AccountRepository.deleteOwnAccount` para permitir metadados de auditoria de paciente sem duplicar a rotina de anonimizacao/soft delete ja existente.
- No Admin frontend, adicionar contrato/cache/hooks de conta do paciente e renderizar a aba **Conta** com os mesmos grupos operacionais do psicologo: resumo, e-mail, senha/recuperacao, sessoes/seguranca e acoes da conta.
- Para contas Google sem senha local, manter estados honestos bloqueando alteracao/criacao de senha local e alteracao administrativa de e-mail.

## Consequencias

- A decisao anterior de conta somente leitura da TASK-61 fica substituida somente para a aba **Conta** e para fluxos de conta/acesso.
- Nao ha novo modelo Prisma, migration, pacote, seed, mock ou endpoint simulado.
- A exclusao administrativa de paciente reaproveita a anonimizacao real de conta e marca `patient_profile` como deletado pela rotina existente.
- Pacientes preview/onboarding incompleto sem linha em `patient_profiles` deixam de receber 404 na aba **Conta**; as capacidades sao calculadas diretamente de `users`/`user_tokens` e ficam bloqueadas quando faltar senha local ou sessao real.
- O suporte administrativo passa a ter paridade operacional entre psicologos e pacientes para incidentes de acesso, com auditoria explicita.
- Continuam fora do escopo silenciar, banir, moderar publicacoes/comentarios/votos/avaliacoes ou criar restricoes parciais de comunidade.

## Validacao

- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/callers/patients/index.ts" "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/main/server/imports/write.ts" "src/modules/api/private/account/repositories/AccountRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts" "src/modules/api/admin/private/patients/account/index.ts" "src/modules/api/admin/private/patients/account/DTOs/IAdminPatientAccountDTO.ts" "src/modules/api/admin/private/patients/account/repositories/AdminPatientAccountRepository.ts" "src/modules/api/admin/private/patients/account/use-cases/controller.ts" "src/modules/api/admin/private/patients/account/use-cases/services.ts" "src/modules/api/admin/private/patients/account/validator/index.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=conta` retornou `200`.
- Smoke HTTP local sem token: `POST http://localhost:3001/api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90/account/suspend` retornou `401`.


## Revisao 2026-07-20 - Paciente sem patient_profile

Foi identificado que pacientes preview podem existir apenas em `users` com `role="paciente"` e sem linha em `patient_profiles`. O detalhe do paciente ja carregava esses casos a partir de `users`, mas a nova aba **Conta** buscava somente `patient_profile`, gerando `404 not_found` para usuarios validos.

Decidimos que a aba **Conta** deve seguir a mesma identidade do detalhe administrativo: primeiro resolve `patient_profile.id`/`user_id` quando houver perfil; se nao houver perfil, resolve diretamente `users.id` para pacientes nao deletados. Nenhum dado fake, seed, migration ou backfill foi criado.

Validacao complementar:

- Service local: `showAdminPatientAccount({ id: "cmrqsr926001d1guhoz10yvaz" })` retornou `200` com capacidades reais calculadas de `users`/`user_tokens`.
- `pnpm --dir backend exec biome check --write src/modules/api/admin/private/patients/account/repositories/AdminPatientAccountRepository.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
