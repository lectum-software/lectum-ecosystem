# ADR-0008: Fluxo publico de auth, selecao de perfil e login

## Status

Accepted

## Task relacionada

TASK-04: Selecao de perfil e login.

## Contexto

A entrada publica do Lectum precisa permitir que um usuario nao-dev abra a aplicacao,
entenda se esta entrando como paciente ou psicologo, e faca login sem criar fluxo
paralelo de sessao. A arquitetura existente ja usa cookie de token, Redux Persist,
`useUserSet`, `proxy.ts`, React Query e os endpoints reais:

- `POST /api/public/auth/login`;
- `GET /api/public/google/login/:deviceId`;
- `GET /api/public/google/me`;
- `GET /api/private/auth/hidrate`.

O modelo de produto tambem exige `user.role` (`"paciente" | "psicologo"`) para orientar
a UX privada, mas a seguranca por papel continua sendo responsabilidade do servidor
conforme ADR-0002.

## Decisao

- A rota inicial publica passa a ser `/auth/profile-selection`.
- `/auth/profile-selection` mostra os dois perfis usando os prototipos exportados como
  referencia visual, mas sem aceitar codigo gerado automaticamente.
- `/auth/login` continua sendo o ponto unico de login por e-mail/senha e Google.
- `useUserSet` permanece o unico caminho de gravacao de usuario/token no frontend.
- `callbackUrl` continua tendo prioridade no pos-login; quando nao existir, o frontend
  resolve o destino pelo `user.role`.
- Enquanto a shell privada segmentada da TASK-12 nao existir, paciente e psicologo
  redirecionam para `/dashboard`; a ramificacao fica centralizada para evoluir sem
  recriar auth.
- `user.role` foi adicionado ao schema real com default `"paciente"` e indice
  `[role, deleted]`.
- O Google OAuth preserva `role` recebido no `state` apenas ao criar usuario novo.
  Para usuarios existentes, o papel salvo no banco e a fonte de verdade.

## Consequencias

- A tela publica nao depende de mock, seed ou endpoint simulado.
- Login comum e Google continuam usando os endpoints reais e o token por device.
- A UX ja fica preparada para separar destinos por papel quando a TASK-12 criar shells
  privadas distintas.
- A protecao de rotas por papel nao foi implementada aqui; ela permanece escopo da
  TASK-12 conforme ADR-0002.
- As futuras tasks de cadastro (`TASK-07` e `TASK-09`) devem reutilizar o `role` ja
  existente em `user` e nao adicionar outro campo ou endpoint paralelo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local nas rotas `/auth/profile-selection` e `/auth/login`
