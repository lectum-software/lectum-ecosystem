# ADR-0216: Login preserva query string no retorno para rotas privadas

Data: 2026-07-05
Status: Aceita

## Contexto

O login iniciado a partir de uma rota privada com parâmetros de fluxo estava perdendo a query string no `callbackUrl` gerado pelo proxy do frontend.

O caso observado foi o fluxo de cortesia profissional:

1. usuário sem sessão abre `/app/professional/billing/checkout?intent=courtesy-renewal`;
2. o proxy redireciona para `/auth/login`;
3. o `callbackUrl` continha apenas `/app/professional/billing/checkout`;
4. após autenticar, o checkout abria sem `intent=courtesy-renewal`;
5. como a conta já possuía cortesia ativa, a tela era tratada como checkout comum para assinante ativo e redirecionava para `/app/professional/billing/address`.

Esse comportamento quebrava a decisão do ADR-0215, em que a cortesia deve coletar o cartão primeiro e só depois avaliar a necessidade de endereço.

## Decisão

O proxy do frontend passa a montar `callbackUrl` com `pathname + req.nextUrl.search` para rotas que exigem autenticação:

- `/auth/verify-email`;
- rotas privadas protegidas por `/app`, `/dashboard` e `/patient`.

Assim, parâmetros de intenção como `intent=courtesy-renewal` sobrevivem ao ciclo de login por senha ou Google, pois a página de login já encaminha `callbackUrl` para o fluxo OAuth quando necessário.

## Consequências

- O retorno de login preserva o estado do fluxo sem criar endpoint paralelo, mock ou regra especial para billing.
- A correção beneficia qualquer rota privada que dependa de query string para retomar contexto.
- Hash fragments continuam fora do escopo porque não são enviados ao servidor/proxy em requisições HTTP.
- Nenhuma alteração de schema, migration, package ou contrato backend foi necessária.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `http://localhost:3000/app/professional/billing/checkout?intent=courtesy-renewal` sem sessão retornou `307` para `/auth/login?callbackUrl=%2Fapp%2Fprofessional%2Fbilling%2Fcheckout%3Fintent%3Dcourtesy-renewal`.
