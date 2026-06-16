# ADR-0109 - Dicas de onboarding persistidas por usuário

## Status

Accepted

## Contexto

As dicas de descoberta de psicólogos e de publicação na comunidade eram controladas por `sessionStorage`/`localStorage`.
Esse controle era frágil: podia reaparecer após login/refresh/nova sessão, não era fonte de verdade persistida e podia vazar comportamento entre usuários no mesmo navegador.

## Decisão

- Persistir o estado das dicas diretamente em `user`:
  - `has_seen_discover_psychologists_tip Boolean @default(false)`.
  - `has_seen_community_post_tip Boolean @default(false)`.
- Expor contrato compartilhado de conta em `GET/PUT /api/private/account/tips`, protegido por `_auth`, sem `requireRole`, porque as dicas são por usuário autenticado e independem de papel.
- No frontend, consultar a preferência antes de renderizar a dica e marcar a respectiva flag como `true` quando a dica for exibida ou dispensada.
- Escopar a query key de tips por `user.id`, evitando reaproveitamento de cache React Query entre contas diferentes.
- Remover `sessionStorage`/`localStorage` como fonte de verdade dessas duas dicas.

## Consequências

- Cada dica passa a aparecer no máximo uma vez por usuário, mesmo após logout/login, refresh ou nova sessão.
- O estado fica separado por dica, permitindo que o usuário veja uma orientação sem afetar a outra.
- A tabela `users` recebe duas flags booleanas simples; uma tabela de preferências genérica pode ser considerada no futuro se o volume de flags crescer.
- A mutation é idempotente para o comportamento atual: o cliente envia apenas `true` quando a dica foi vista.

## Task relacionada

- Ajuste complementar da TASK-21 — perfil privado/preferências do usuário.

## Validações

- `pnpm --dir backend db:migrate --name add_user_onboarding_tips`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação HTTP local de `GET/PUT /api/private/account/tips` com token temporário, restaurando o usuário usado na validação.
- Renderização local via Chrome headless em `/app/psychologists`.
