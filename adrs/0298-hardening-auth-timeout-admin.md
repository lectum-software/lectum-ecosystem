# ADR-0298: Hardening de falhas assíncronas na autenticação

## Status

Accepted

## Task relacionada

Correção operacional solicitada em 2026-07-21 para o Admin local.

## Contexto

O Admin em `http://localhost:3002` redirecionava para login e exibia erro de conexão com `http://localhost:3001`.
O backend havia iniciado, mas caiu depois de um `ETIMEDOUT` do Prisma dentro da estratégia JWT administrativa.
Como a falha ocorria em callback assíncrono do Passport, o `try/catch` externo do middleware não impedia a queda do processo.

## Decisão

- Capturar erros assíncronos dentro das estratégias JWT de Admin e usuário.
- Capturar erros assíncronos também na hidratação pós-`passport.authenticate`.
- Retornar `503` com mensagem PT-BR quando a autenticação estiver temporariamente indisponível.
- Manter `401` para token ausente, mal formatado, inválido ou não autorizado.

## Consequências

- Um timeout transitório de banco não derruba mais o backend e não vira erro de conexão no browser.
- O Admin passa a receber uma falha explícita e localizada quando a dependência de banco estiver indisponível.
- Erros reais de banco continuam sendo logados no backend para diagnóstico.

## Validação

- `pnpm --dir backend check`.
- `Invoke-WebRequest http://localhost:3001/health` retornou HTTP 200 após reiniciar o backend.
- Preflight CORS de `POST /api/admin/public/auth/login` com origem `http://localhost:3002` retornou HTTP 204.
- `POST /api/admin/public/auth/login` com senha inválida retornou HTTP 403 sem derrubar o backend.

## Pendências

- Se timeouts Prisma ficarem recorrentes, abrir task específica para revisar pool/adapter PostgreSQL e observabilidade de banco.
