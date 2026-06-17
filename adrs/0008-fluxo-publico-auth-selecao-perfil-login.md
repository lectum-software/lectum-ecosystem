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

## Atualizacao em 2026-06-05: seletor de conta no Google OAuth

### Contexto

Ao clicar em Google no login, cadastro de paciente ou cadastro de psicologo, o navegador
reaproveitava automaticamente a sessao Google ativa. Isso impedia o usuario de revisar
a conta ou escolher outro e-mail antes de concluir o OAuth.

### Decisao

- O endpoint real `GET /api/public/google/login/:deviceId` passa a enviar
  `prompt: "select_account"` para o Passport Google OAuth.
- A decisao fica no backend porque os tres fluxos publicos usam o mesmo endpoint:
  login, cadastro de paciente e cadastro de psicologo.
- O fluxo continua preservando `role`, `terms_accepted` e `terms_version` via `state`;
  nao foi criado endpoint, sessao ou autenticacao paralela.

### Consequencias

- O Google deve abrir o seletor/confirmacao de conta mesmo quando ja houver uma conta
  Google autenticada no navegador.
- O usuario pode trocar o e-mail antes de permitir o acesso ao perfil/e-mail Google.
- O comportamento e um pouco menos automatico para quem tem apenas uma conta ativa, mas
  evita cadastro/login acidental com e-mail errado.

## Atualizacao em 2026-06-05: captura de nome e foto no Google OAuth

### Contexto

Os fluxos de login/cadastro com Google precisam disponibilizar nome e foto de perfil do
usuario para uso posterior no produto, sem criar autenticacao paralela nem endpoint novo.

### Decisao

- O callback Google continua usando `GET /api/public/google/login/:deviceId` -> callback
  -> `/api/public/google/me`.
- Novos usuarios Google sao criados com `user.name` a partir de `profile.displayName` e
  `user.avatar` a partir de `profile.photos[0].value`.
- Usuarios existentes autenticados por Google recebem atualizacao controlada de
  identidade: `name` quando ausente ou quando o provider ja e Google, `avatar` quando
  ausente ou quando o provider ja e Google, e `provider="google"` para registrar o vinculo.
- O `role` salvo no banco continua sendo a fonte de verdade para usuarios existentes;
  o `state` de role segue valendo apenas para criacao de novo usuario.

### Consequencias

- Login, cadastro de paciente e cadastro de psicologo passam a compartilhar a mesma
  captura de nome/foto Google.
- Dados de perfil basicos ficam disponiveis para tasks futuras sem schema novo.
- A escolha de conta Google com `prompt="select_account"` permanece ativa.

### Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
- Redirect OAuth local continua incluindo `prompt=select_account`; a persistencia de
  nome/foto foi validada por typecheck/build do callback real, sem mockar perfil Google.

## Atualizacao em 2026-06-16: fallback pós-login em `/app/psychologists`

### Contexto

Após os ajustes de comunidade, o fallback autenticado havia ficado em `/app/community`. O produto passou a exigir que o destino padrão de login volte a ser a descoberta de psicólogos, mantendo a comunidade apenas quando o usuário navegar manualmente ou quando um destino explícito for informado.

### Decisão

- O fallback padrão do fluxo de auth passa a ser `/app/psychologists`.
- `redirectTo` é tratado como parâmetro explícito prioritário de pós-login.
- `callbackUrl` permanece aceito como compatibilidade com o proxy que envia usuários desautenticados para login a partir de uma rota privada.
- O início de login Google copia `redirectTo`/`callbackUrl` para o estado OAuth já existente, permitindo que `/auth/redirect` respeite o destino após hidratar a sessão.
- O proxy redireciona usuários com token que tentarem abrir rotas públicas de auth diretamente para `/app/psychologists`.
- A rota `/app` também usa `/app/psychologists` como fallback para paciente e psicólogo; navegação manual para demais rotas não foi alterada.

### Consequências

- Login inicial, retorno de OAuth e retorno a `/auth/login` com sessão ativa ficam consistentes no mesmo destino padrão.
- Deep links continuam funcionando por `redirectTo` e por `callbackUrl` legado.
- Rotas manuais como `/app/community`, `/app/profile` e demais páginas privadas permanecem acessíveis quando o usuário navega até elas.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local: `/auth/login` e `/auth/redirect` com cookie `lectum.token` retornaram `307` para `/app/psychologists`.
- Browser local via Chrome/CDP: abrir `/auth/login` com cookie de sessão navegou para `/app/psychologists`.

## Atualizacao em 2026-06-17: escala visual unificada do fluxo de auth

### Contexto

O fluxo publico de autenticacao havia acumulado escalas diferentes entre login,
selecao de perfil, cadastro, recuperacao de senha, redefinicao e confirmacao de e-mail.
No login, a logo estava visualmente grande e, no desktop, a combinacao de logo, card,
espacamentos e footer podia deixar a tela com sensacao de excesso vertical em relacao ao
restante da plataforma.

### Decisao

- Centralizar a compactacao no `AuthTemplate` e no `AuthCard`, usando `min-h-dvh`, menor
  padding vertical e footer discreto, sem alterar contratos de auth.
- Reduzir a logo do login para `148px` no mobile e `156px` no desktop, aplicando escala
  semelhante aos demais fluxos publicos.
- Ajustar cadastro de paciente, cadastro de psicologo, recuperacao, redefinicao,
  confirmacao de e-mail, erro de auth e retorno Google com tipografia, icones e
  espacos mais proximos do restante da Lectum.
- Preservar a legibilidade dos campos e CTAs principais: a compactacao ficou concentrada
  em logo, areas de respiro, icones decorativos e footers.
- Nao criar package, store, endpoint, layout paralelo ou fluxo novo de autenticacao.

### Consequencias

- `/auth/login` cabe em viewport desktop `1366x768` sem scroll vertical, mantendo o card
  centralizado e a hierarquia premium.
- As telas publicas de auth passam a usar uma escala mais consistente entre si e com as
  areas privadas da plataforma.
- Formulario, React Hook Form/Zod, Google OAuth, recovery/reset reais, `useUserSet` e
  redirecionamentos existentes nao foram alterados.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/auth/login` desktop `1366x768` confirmou ausencia de
  scroll vertical e logo com `156px`.
- Browser local via Chrome/CDP em auth mobile `390x844` confirmou ausencia de overflow
  horizontal em login, selecao de perfil, recuperacao e redefinicao de senha.
