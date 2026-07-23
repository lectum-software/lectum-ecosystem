# ADR-0290: Edição administrativa limitada de dados pessoais de pacientes

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

Após a padronização da aba **Perfil e cadastro** do detalhe administrativo de pacientes, o produto pediu que o card **Dados pessoais** recebesse o botão **Editar** no mesmo padrão visual existente no detalhe administrativo do psicólogo.

A TASK-61 nasceu como tela somente leitura para pacientes. Para não criar uma ação falsa de UI, a edição precisa ter contrato real, persistência real e auditoria, mas sem ampliar indevidamente dados sensíveis de paciente nem criar paridade artificial com o fluxo de psicólogos.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência auditável usada foi a captura enviada pelo usuário e os PNGs locais `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`.

## Decisão

- O botão **Editar** do card **Dados pessoais** em `/pacientes/[id]?tab=perfil` abre uma edição real e auditada.
- A edição administrativa de paciente fica limitada ao campo `patient_profile.gender`.
- `user.email` permanece somente leitura nesse card, porque alteração de e-mail é ação de conta e exige fluxo próprio.
- `visitor_location.city/state/country` permanece somente leitura, porque é localização coarse derivada de evento real e não deve ser sobrescrita manualmente.
- O endpoint novo é `PUT /api/admin/private/patients/:id/personal-data`, autenticado pela audiência Admin existente.
- O payload exige `reason` e aceita `gender` opcional/nulo.
- A operação grava auditoria em `admin_activity_log` com:
  - `target_type="patient"`;
  - `domain="patient_profile"`;
  - `action="patient_personal_data_updated"`;
  - `area="perfil_e_cadastro"`;
  - snapshots seguros apenas do label **Gênero**.
- Se um paciente legado estiver sem `patient_profile` ou com perfil soft-deleted, a operação recria/restaura o perfil real de paciente para armazenar o gênero informado, registrando isso nos metadados da auditoria.
- Não há alteração de schema Prisma, migration, package, seed, mock, backfill, bloqueio, silenciamento, banimento, exclusão ou moderação de paciente.

## Consequências

- A regra original de "somente leitura" da TASK-61 passa a ter uma exceção explícita e auditada: edição limitada de gênero em Dados pessoais.
- E-mail e localização continuam protegidos contra edição indevida nesta aba.
- O dashboard/lista/detalhe de pacientes são invalidados no frontend após a mutação para refletir o gênero real persistido.
- Qualquer edição futura de e-mail, conta, localização manual, telefone, nascimento, bio ou ações de moderação de paciente exige task e ADR próprios.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local em `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=perfil` retornou `200`.
- Smoke HTTP local do endpoint `PUT /api/admin/private/patients/:id/personal-data` sem token retornou `401`.

## Atualizacao 2026-07-23: nome de exibicao editavel

O pedido de produto desta data tornou o **Nome de exibicao** editavel pelo Admin no mesmo fluxo auditado de dados pessoais do paciente. A persistencia altera `user.name`, nao `patient_profile`, e o payload do endpoint `PUT /api/admin/private/patients/:id/personal-data` passa a aceitar `display_name` opcional junto de `gender` opcional/nulo e `reason` obrigatorio.

Esta atualizacao substitui a limitacao anterior de editar apenas `patient_profile.gender`. A auditoria grava `action="patient_personal_data_updated"`, `domain="patient_personal_data"`, `changed_field_keys=["display_name"]` quando o nome muda e snapshots seguros apenas de **Nome de exibicao** e/ou **Genero**. E-mail e localizacao continuam fora do fluxo. Nao houve schema Prisma novo, migration, package novo, mock, seed, backfill ou endpoint simulado.
