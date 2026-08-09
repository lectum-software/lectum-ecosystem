# ADR-0434 - Base local separada para Google OAuth em desenvolvimento

- **Status:** Accepted
- **Data:** 2026-07-08

## Task relacionada

Solicitação direta de ajuste de ambiente/desenvolvimento local.

## Contexto

O ambiente local precisa testar o login com Google sem depender do limite de banda do ngrok. Ao mesmo tempo, o fluxo de billing do Mercado Pago continua exigindo uma URL pública HTTPS para retorno/webhook em desenvolvimento.

Antes desta decisão, o backend usava `BASE` para montar o redirect URI do Google OAuth (`/api/public/google/callback`) e também para gerar URLs de intenção de login/link/reauth. Quando `BASE` apontava para o tunnel público usado pelo Mercado Pago, o login com Google também era roteado pelo tunnel e ficava sujeito ao limite do ngrok.

## Decisão

Adicionar `GOOGLE_OAUTH_BASE_URL` como origem específica da API para o OAuth do Google. O valor é usado para:

- `callbackURL` da estratégia Google no Passport;
- URLs de intenção de login/link/reauth em `/api/public/google/login/:deviceId`;
- validação de configuração do OAuth.

Quando `GOOGLE_OAUTH_BASE_URL` não estiver configurado, o backend preserva compatibilidade usando `BASE` como fallback.

No ambiente local atual, `GOOGLE_OAUTH_BASE_URL` e os callbacks de frontend do Google apontam para `localhost`, enquanto `BASE` e `MERCADO_PAGO_BACK_URL` podem continuar apontando para o tunnel público.

## Consequências

- O login com Google pode ser testado localmente sem consumir ngrok.
- Mercado Pago permanece isolado no tunnel público HTTPS exigido pelo gateway.
- O redirect URI `http://localhost:3001/api/public/google/callback` precisa estar autorizado no OAuth Client do Google Cloud para o fluxo local funcionar.
- Integrações que ainda dependem de `BASE` não são alteradas.

## Validação

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.

## Pendências

- Sem pendências de implementação.
