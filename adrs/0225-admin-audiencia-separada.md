# ADR-0225: Admin como audiência separada

## Status

Accepted

## Task relacionada

TASK-45

## Contexto

O painel administrativo da Lectum será uma aplicação separada do app de pacientes e
psicólogos. O modelo de dados já reserva `admin` e `admin_token` como identidade própria e
proíbe `user.role="admin"`.

## Decisão

- Criar `admin` e `admin_token` no Prisma, sem alterar os valores aceitos de `user.role`.
- Expor autenticação admin em `/api/admin/public/*` e rotas protegidas em
  `/api/admin/private/*`.
- Assinar JWT admin com `ADMIN_JWT_SECRET`, `audience="lectum-admin"` e
  `issuer="lectum-api"`, separados do JWT de usuário final.
- Validar rotas admin com middleware próprio, exigindo `Authorization: Bearer ...` e
  `x-device`, além de conferir o token persistido em `admin_token`.
- Manter bootstrap operacional via `pnpm --dir backend admin:bootstrap`, com senha recebida
  por flag ou env e hash real pelo utilitário de criptografia existente.

## Consequências

- Tokens de pacientes/psicólogos não autenticam rotas admin.
- Tokens admin não autenticam rotas privadas de usuários finais, inclusive se alguém configurar
  segredos iguais por engano, porque o middleware de usuário rejeita payload sem `type="user"`.
- O backend passa a exigir `ADMIN_JWT_SECRET` para login/admin middleware; a variável é
  backend-only e documentada em `backend/.env.example`.
- A granularidade de permissões administrativas fica fora do escopo inicial e poderá ser
  adicionada em task futura.

## Validação

- `pnpm --dir backend db:migrate -- --name add_admin_auth`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Teste manual com admin temporário criado via `admin:bootstrap`: login admin, hydrate admin,
  rejeição de token admin em rota privada de usuário final, rejeição de token de usuário final em
  rota admin e logout admin. O admin temporário de validação foi removido após o teste.

## Pendências

- TASK-46 criará a aplicação visual `admin/`.
- Rotas de dados administrativos específicas serão implementadas nas tasks seguintes.
