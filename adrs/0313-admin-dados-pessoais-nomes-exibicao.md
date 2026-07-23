# ADR-0313: Nomes de exibicao em Dados pessoais no Admin

## Status

Accepted

## Task relacionada

- TASK-55: ajuste pos-feedback no detalhe administrativo do psicologo.
- TASK-61: ajuste pos-feedback no detalhe administrativo do paciente.

## Contexto

Os cards **Dados pessoais** nas abas **Perfil e cadastro** dos detalhes administrativos de psicologo e paciente exibiam e-mail e demais atributos operacionais, mas nao repetiam o nome definido pelo usuario. No caso do psicologo, o cabecalho administrativo usa nome normalizado para leitura publica, podendo remover prefixos profissionais; porem o Admin precisa ver o nome completo exatamente como o psicologo definiu no cadastro/edicao profissional, inclusive quando houver termos como `Dra.` ou `Psicologa` no inicio.

## Decisao

- O detalhe administrativo do psicologo passa a retornar `profile.personal.full_name`.
- Esse campo e montado a partir de `psychologist_profile.professional_first_name` + `professional_last_name`, preservando prefixos/titulos digitados pelo psicologo; se esses campos estiverem ausentes, usa `user.name` apenas com normalizacao de espacos.
- A UI do Admin mostra **Nome completo** como primeira linha do card **Dados pessoais** do psicologo.
- O detalhe administrativo do paciente reutiliza `header.name`, ja derivado de `user.name`, como **Nome de exibicao** e mostra esse valor como primeira linha do card **Dados pessoais**.
- A mudanca e somente de leitura no Admin; nao cria edicao de nome, nao altera perfil publico, nao muda autenticacao e nao amplia dados sensiveis alem de nomes ja usados na identificacao administrativa.

## Consequencias

- O Admin consegue conferir o nome definido pelo usuario no mesmo bloco de dados pessoais, reduzindo ambiguidades de suporte.
- O header do psicologo continua livre para usar a apresentacao normalizada existente, enquanto o card de dados pessoais preserva o valor completo definido no perfil profissional.
- Nao houve schema Prisma, migration, package novo, mock, seed ou endpoint simulado.

## Validacao

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/detail/DTOs/IAdminPsychologistDetailDTO.ts" "src/modules/api/admin/private/psychologists/detail/repositories/AdminPsychologistDetailRepository.ts" "src/modules/api/admin/private/psychologists/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build` executado com sucesso apos aguardar/remover lock stale de build anterior.
- `pnpm check`
- API local com admin temporario real removido ao final: `GET /api/admin/private/psychologists/cmrwmw35t0000xkuhxoceh77v` retornou `profile.personal.full_name="Ana Beatriz Lima"`; `GET /api/admin/private/patients/cmrqsrab5001f1guh2ve5oy90?period=all` retornou `header.name="Paciente preview 52"`.
- Browser local/headless via Chrome CDP em viewport 390x844: `/psicologos/cmrwmw35t0000xkuhxoceh77v?tab=perfil` exibiu a linha **Nome completo / Ana Beatriz Lima** e `scrollWidth=390`; `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil` exibiu a linha **Nome de exibicao / Paciente preview 52** e `scrollWidth=390`.

## Pendencias

- Nenhuma pendencia externa.
