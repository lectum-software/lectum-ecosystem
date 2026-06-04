# ADR-0012: Cadastro de paciente com role e patient_profile

## Status

Accepted

## Task relacionada

TASK-07: Cadastro de paciente.

## Contexto

O backend ja possuia `POST /api/public/user/store` para criar usuario e hidratar a
sessao. A TASK-07 precisava transformar esse fluxo em cadastro real de paciente sem
criar endpoint paralelo, adicionando o perfil 1:1 `patient_profile`, persistindo aceite
de termos e encaminhando o usuario nao confirmado para a verificacao de e-mail da
TASK-06.

A referencia visual ativa foi consultada pela imagem local
`_product/proto/Cadastro de Paciente.jpg`, porque Builder/Quick Copy nao esta exposto
como ferramenta direta nesta sessao.

## Decisao

- `patient_profile` foi adicionado ao Prisma conforme `DATA-MODEL.md`, com soft delete,
  `user_id @unique`, relacao cascade com `user` e migracao aditiva
  `20260604223000_add_patient_profile`.
- `POST /api/public/user/store` foi estendido para aceitar `role`, `terms_accepted` e
  `terms_version`; o service exige aceite de termos e defaulta `role` para `paciente`.
- A criacao do usuario, `patient_profile`, aceite em `user_background` (`type:
  "terms_accept"`) e `log__user` ocorre na mesma transacao.
- O fluxo Google existente continua usando o callback atual; o `state` agora tambem pode
  carregar `terms_accepted` e `terms_version`, e novos usuarios Google com role
  `paciente` tambem recebem `patient_profile`.
- O frontend implementa `/auth/register/patient` usando a fundacao da TASK-02
  (`useFormList`, controllers e Zod), com senha forte, confirmacao, aceite de termos,
  Google e chamada real a `POST /api/public/user/store`.
- O cadastro com Google pela rota de paciente nao depende de preencher os campos de
  e-mail/senha; o clique na CTA exibe copy de consentimento e envia
  `terms_accepted=true`/`terms_version` no `state` para persistencia no callback.
- O sucesso usa `useUserSet("/auth/verify-email")`; como `confirmed=false`, o guard de
  auth da TASK-06 tambem reforca o redirecionamento para verificacao.

## Consequencias

- Nao existe endpoint `/api/public/patients/register`; o contrato real permanece em
  `user/store`.
- O usuario paciente recem-criado ja possui sessao, `role="paciente"`,
  `patient_profile` e registro de aceite de termos.
- O texto legal/LGPD final ainda nao esta definido; a execucao registra o aceite com
  `terms_version="task07-pending-legal-copy"` para permitir rastreio ate a revisao da
  TASK-34.
- Usuarios temporarios usados na validacao foram criados por endpoint real e removidos
  ao final, sem deixar dado fake permanente.

## Validacao

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `http://localhost:3000/auth/register/patient` validou:
  - render mobile-first da tela;
  - cadastro real via `POST /api/public/user/store` retornando 200;
  - redirecionamento para `/auth/verify-email`;
  - chamada real subsequente de envio do codigo por `GET /api/private/auth/confirm`;
  - tentativa duplicada com o mesmo e-mail retornando 400 e erro em PT-BR;
  - banco com `role="paciente"`, `patient_profile` e um `user_background` de aceite.

## Pendencias

- Revisar e substituir o texto legal pendente nas tasks de LGPD/operacao.
- Quando TASK-08 criar o onboarding, atualizar o destino final do paciente apos
  confirmacao de e-mail se necessario.
