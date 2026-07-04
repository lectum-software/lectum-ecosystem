# ADR 0202 - Bypass do aviso do ngrok nas chamadas da API pública

- **Status:** Accepted
- **Data:** 2026-07-04

## Contexto

As rotas públicas `/` e `/psychologists` devem carregar para visitantes sem sessão. No ambiente local atual, o `NEXT_PUBLIC_API_URL` aponta para um túnel ngrok usado pelo fluxo de desenvolvimento. O ngrok gratuito pode responder com uma página intermediária de aviso em vez de encaminhar a requisição para a API, o que faz o navegador tratar as chamadas públicas como erro de rede e exibir `Feed indisponível`/`Não foi possível carregar` para usuário não autenticado.

## Decisão

O cliente HTTP do frontend passa a enviar `ngrok-skip-browser-warning: true` somente quando a URL base da API pertence a domínios ngrok conhecidos. O backend inclui esse header na lista de CORS permitida para que o preflight do navegador autorize as chamadas.

## Consequências

- Visitantes conseguem carregar as telas públicas quando o ambiente local usa túnel ngrok.
- Ambientes sem ngrok não recebem header extra.
- Não há mock, fallback fake ou endpoint paralelo; as telas continuam dependendo dos dados reais da API.
- Se outro provedor de túnel introduzir aviso semelhante, será necessária nova inclusão explícita.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP no túnel ngrok confirmou `OPTIONS` com `Access-Control-Allow-Headers` contendo `ngrok-skip-browser-warning`.
- Smoke HTTP no túnel ngrok confirmou `200` em `/api/private/community/feed/posts` e `/api/private/directory/psychologists` sem token.
- Browser local headless validou `/` e `/psychologists` sem sessão em viewport mobile-first (390px) e `/psychologists` em desktop, sem erro de rede.

## Pendências

- Sem pendências externas.
