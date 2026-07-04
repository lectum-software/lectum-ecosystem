# ADR-0203: Falha no OAuth Google limpa sessão antiga antes de voltar ao login

## Status

Accepted

## Task relacionada

Correção operacional de autenticação em 2026-07-04, a partir de regressão reportada no login com uma conta Google ainda não cadastrada.

## Contexto

Ao tentar autenticar com uma conta Google sem cadastro prévio, o backend já rejeitava corretamente a tentativa com `account_not_registered`.
Porém, quando o navegador ainda possuía cookies/client state de uma sessão Lectum anterior, o proxy do frontend redirecionava rotas `/auth/*` com token existente para `/psychologists`.
Com isso, a tela de erro `/auth/error` não era exibida e os guards privados podiam reencaminhar o usuário antigo para etapas pendentes do onboarding profissional, como verificação CFP ou finalização de assinatura.

O mesmo risco existia no retorno bem-sucedido `/auth/redirect`: uma sessão anterior podia impedir o consumo do cookie temporário do OAuth antes da troca de conta.

## Decisão

- Tratar `/auth/redirect` e `/auth/error` como rotas de resultado OAuth que devem ser acessíveis mesmo quando existir cookie de sessão frontend anterior.
- Em falhas do callback Google, redirecionar para `/auth/error` com `clearSession=1`.
- Quando `clearSession=1` estiver presente, o proxy remove os cookies frontend `lectum.token` e `lectum.user` com `Path=/`.
- A página `/auth/error` também limpa token/user client-side, remove o `persist:lectum` do Redux Persist e despacha remoção do usuário em memória.
- O erro no consumo de `/api/public/google/me` em `/auth/redirect` deixa de ficar parado quando existe token antigo e passa a ir para `/auth/error?clearSession=1`.
- A remoção genérica de cookies frontend passa a chamar `Cookies.remove` com os mesmos atributos usados no `set`, além da remoção padrão, para reduzir retenção de cookie antigo em HTTPS/ngrok.

## Consequências

- Login Google com e-mail não cadastrado mostra erro honesto em vez de reutilizar uma sessão anterior.
- Troca de conta Google consegue passar por `/auth/redirect` mesmo quando havia token frontend antigo.
- Falhas reais de OAuth encerram a sessão local antiga para evitar que o usuário continue navegando com uma identidade diferente da escolhida no provedor.
- Usuários que acessarem manualmente `/auth/redirect` sem cookie temporário válido podem ser enviados para `/auth/error` e ter a sessão local limpa; a rota é técnica e não deve ser usada como navegação normal.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- Validação local com `next start -p 3100`: requisição a `/auth/error?error=Conta%20n%C3%A3o%20cadastrada&clearSession=1` contendo cookies `lectum.token` e `lectum.user` retornou `200` e `Set-Cookie` removendo ambos com `Path=/; Max-Age=0`.

## Pendências

- Nenhuma pendência externa.
