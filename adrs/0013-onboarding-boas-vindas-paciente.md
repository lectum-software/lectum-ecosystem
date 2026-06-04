# ADR-0013: Onboarding de boas-vindas do paciente

## Status

Accepted

## Task relacionada

TASK-08: Boas-vindas do paciente.

## Contexto

A TASK-08 precisava iniciar a jornada privada do paciente apos cadastro e confirmacao de
e-mail. A verdade do progresso deve ser o `patient_profile` criado na TASK-07, porque o
onboarding nao pode depender de localStorage/redux nem repetir em outro dispositivo.

As referencias visuais foram consultadas pelas imagens locais:

- `_product/proto/Boas-vindas Paciente - 1.jpg`;
- `_product/proto/Boas-vindas Paciente - 2.jpg`;
- `_product/proto/Boas-vindas Paciente - 3.jpg`.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao as
imagens locais foram usadas como fallback auditavel.

## Decisao

- Criar os endpoints privados reais:
  - `GET /api/private/patient/profile` para retornar ou garantir o `patient_profile` de
    `req.auth.id`;
  - `PUT /api/private/patient/onboarding` para persistir `goal`, `birthdate`, `phone` e
    setar `onboarding_completed_at`.
- Implementar `requireRole("paciente")` agora, antes da TASK-12, porque a TASK-08 ja
  introduz o namespace `/api/private/patient/*` e o guard fail-closed e criterio de
  aceite obrigatorio. O guard fica aplicado no mount de `write.ts`, depois do `_auth`.
- Manter redundancia no service: mesmo com guard no mount, os services recusam
  `req.auth.role !== "paciente"` com `403`.
- Nao criar modelo Prisma novo. O onboarding usa somente `patient_profile`.
- O `PUT` e idempotente: se `onboarding_completed_at` ja existe, retorna o estado atual
  sem erro e sem sobrescrever campos.
- Implementar `/patient/welcome` no frontend, com fluxo mobile-first em 3 etapas
  alinhadas aos prototipos: acolhimento, informacoes pessoais e objetivo.
- Usar a fundacao da TASK-02 para os campos de informacoes pessoais (`calendar` e
  `phone`) e cards controlados por React Hook Form/Zod para o objetivo.
- Atualizar o redirecionamento de usuario paciente para `/patient/welcome`; a rota
  consulta o backend e pula para `/dashboard` quando o onboarding ja esta concluido.
- Como a TASK-12 ainda nao existe formalmente, usar o `PrivateTemplate` atual como shell
  minimo e registrar a dependencia de substituicao pelo shell privado mobile futuro.

## Consequencias

- Pacientes sem onboarding concluido passam pelo fluxo depois de confirmar e-mail ou
  fazer login.
- Pacientes com `onboarding_completed_at` preenchido nao repetem o fluxo em outro
  dispositivo.
- Rotas de paciente passam a ter uma primeira implementacao de `requireRole`, que deve
  ser reutilizada e auditada na TASK-12 para os demais namespaces privados.
- A Home privada real do paciente ainda e futura; apos concluir, o destino temporario e
  `/dashboard`, usando o shell minimo existente.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `http://localhost:3000/patient/welcome` validando:
  - carregamento do profile real;
  - fluxo completo ate `PUT /api/private/patient/onboarding`;
  - persistencia de `onboarding_completed_at` no banco;
  - reentrada com onboarding ja concluido pulando para `/dashboard`.

## Pendencias

- Substituir o shell minimo pelo shell privado mobile da TASK-12 quando ele existir.
- Redirecionar para a Home/busca/comunidade real quando as tasks privadas do paciente
  forem implementadas.
