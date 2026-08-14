# ADR-0313: Nomes de exibicao em Dados pessoais no Admin

## Status

Accepted

## Task relacionada

- TASK-55: ajuste pos-feedback no detalhe administrativo do psicologo.
- TASK-61: ajuste pos-feedback no detalhe administrativo do paciente.

## Contexto

Os cards **Dados pessoais** nas abas **Perfil e cadastro** dos detalhes administrativos de psicologo e paciente exibiam e-mail e demais atributos operacionais, mas nao repetiam o nome definido pelo usuario. No caso do psicologo, o cabecalho administrativo originalmente usava o nome da conta/login, enquanto o Admin precisa ver a identidade profissional definida no cadastro/edicao profissional. Em 2026-08-13, uma divergencia real mostrou o header com `user.name` diferente de **Dados pessoais > Nome completo**; por isso o header tambem deve priorizar o nome profissional separado.

## Decisao

- O detalhe administrativo do psicologo passa a retornar `profile.personal.full_name`.
- Esse campo e montado a partir de `psychologist_profile.professional_first_name` + `professional_last_name`, preservando prefixos/titulos digitados pelo psicologo; se esses campos estiverem ausentes, usa `user.name` apenas com normalizacao segura de apresentacao.
- Atualizacao 2026-08-13: `header.name` do detalhe Admin do psicologo passa a reutilizar a mesma regra, para que o cabecalho represente a identidade profissional e nao necessariamente o nome da conta/login.
- A UI do Admin mostra **Nome completo** como primeira linha do card **Dados pessoais** do psicologo.
- O detalhe administrativo do paciente reutiliza `header.name`, ja derivado de `user.name`, como **Nome de exibicao** e mostra esse valor como primeira linha do card **Dados pessoais**.
- Atualizacao 2026-07-23: por pedido de produto, **Nome de exibicao** do paciente deixa de ser somente leitura no Admin e passa a ser editavel no mesmo fluxo auditado de dados pessoais de paciente.
- A edicao do paciente persiste somente `user.name` e exige motivo obrigatorio; e-mail e localizacao continuam fora desse fluxo. A auditoria grava `changed_field_keys=["display_name"]` quando o nome muda, snapshots seguros de **Nome de exibicao** e `action="patient_personal_data_updated"`.
- A mudanca nao altera autenticacao, nao cria sobrenome de exibicao para paciente, nao muda schema Prisma e nao amplia dados sensiveis alem de nomes ja usados na identificacao administrativa.

## Consequencias

- O Admin consegue conferir o nome definido pelo usuario no mesmo bloco de dados pessoais, reduzindo ambiguidades de suporte.
- O Admin consegue corrigir erro operacional no nome de exibicao do paciente sem usar fluxo de conta, sem editar e-mail e sem impersonar o paciente.
- Atualizacao 2026-08-13: o header do detalhe Admin do psicologo tambem passa a usar o nome profissional completo quando disponivel, mantendo `user.name` apenas como fallback legado. O card de dados pessoais e o header deixam de divergir quando o nome da conta/login e diferente do nome profissional.
- Nao houve schema Prisma, migration, package novo, mock, seed ou endpoint simulado.

## Validacao

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/detail/DTOs/IAdminPsychologistDetailDTO.ts" "src/modules/api/admin/private/psychologists/detail/repositories/AdminPsychologistDetailRepository.ts" "src/modules/api/admin/private/psychologists/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos aguardar/remover lock stale de build anterior.
- `pnpm check`
- Atualizacao 2026-08-13: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check` e smoke de homologacao em `/ping`, `/health`, `/ready` e `/version`.
- API local com admin temporario real removido ao final: `GET /api/admin/private/psychologists/cmrwmw35t0000xkuhxoceh77v` retornou `profile.personal.full_name="Ana Beatriz Lima"`; `GET /api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90?period=all` retornou `header.name="Paciente preview 52"`.
- Browser local/headless via Chrome CDP em viewport 390x844: `/psicologos/cmrwmw35t0000xkuhxoceh77v?tab=perfil` exibiu a linha **Nome completo / Ana Beatriz Lima** e `scrollWidth=390`; `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil` exibiu a linha **Nome de exibicao / Paciente preview 52** e `scrollWidth=390`.

## Pendencias

- Nenhuma pendencia externa.
