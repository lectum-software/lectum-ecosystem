# ADR-0074: Configurações de conta e segurança

## Status

Accepted

## Task relacionada

TASK-30

## Contexto

A TASK-30 exige uma tela mobile-first de e-mail/senha e Google sem recriar autenticação, modelos ou endpoints paralelos. O `DATA-MODEL.md` determina que identidade deve continuar nos modelos reais `user` e `user_token`, com verificação de novo e-mail em `user.confirm_code`/`user.confirmed`, sem `emailVerifiedAt`, `user_identity` ou `user_token.type`.

As referências visuais ativas foram as imagens locais `_product/proto/Configurações de Conta - Login Google.jpg` e `_product/proto/Editar E-mail e Senha.jpg`, pois o Builder/Quick Copy não estava exposto como ferramenta callable nesta sessão do Codex.

## Decisão

- Criar o domínio privado `backend/src/modules/api/private/account` com:
  - `GET /api/private/account/security`;
  - `PUT /api/private/account/email`;
  - `PUT /api/private/account/password`.
- Reusar `user.password`, `user.password_confirm`, `user.confirm_code`, `user.confirmed` e `user_token`, sem alteração de schema e sem migration.
- Exigir senha atual para alterações de e-mail e senha em contas com senha cadastrada.
- Antes de atualizar o e-mail, enviar o código de confirmação para o novo endereço e então persistir `confirmed=false`, `confirm_code` e `confirm_date`.
- Após alteração sensível, limpar os tokens antigos do usuário e reidratar a sessão do dispositivo atual com `LoginRepository.hidrate`, porque o JWT atual contém o e-mail como claim e ficaria obsoleto após troca de e-mail.
- Estender o módulo existente `backend/src/modules/api/public/google/*` com `/api/public/google/link`:
  - `POST /intent` gera URL de OAuth com token assinado de vínculo por 10 minutos;
  - o callback Google valida o token, exige o mesmo e-mail da conta Lectum e marca `user.provider="google"`;
  - `DELETE /api/public/google/link` desvincula apenas quando a conta tem senha cadastrada, evitando remover o último método de login.
- No frontend, criar `/app/settings/account` com `page.tsx`, `logic.tsx` e `use-form.tsx`, usando React Hook Form, Zod, `frontend/src/hooks/form` e `frontend/src/components/controllers`.
- Manter o estado de Google indisponível honesto quando o OAuth não estiver configurado, sem simular vínculo/desvínculo.

## Consequências

- O fluxo preserva a arquitetura atual de autenticação e evita novos modelos de identidade.
- A sessão continua utilizável após mudanças sensíveis porque o backend devolve um novo token real para o dispositivo atual.
- Outros dispositivos são desconectados após troca de e-mail/senha, reduzindo risco em alterações sensíveis.
- O vínculo Google fica limitado ao e-mail já cadastrado na conta Lectum; trocar para outro e-mail Google exige outro fluxo de conta, evitando tomada de conta por OAuth de e-mail divergente.
- Como o schema atual não possui identificador Google separado, `user.provider` continua sendo o indicador de vínculo. Se o produto exigir múltiplas identidades por conta no futuro, o `DATA-MODEL.md` deverá ser atualizado antes da implementação.
- A persistência de tema em `user_background(type:"preference")` não foi alterada nesta task porque as referências e o objetivo ativo cobrem e-mail/senha/Google; qualquer ampliação de preferências deve reutilizar `user_background` sem criar `user_identity`.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local no browser/dev server existente:
  - `http://localhost:3000/app/settings/account` sem token retorna redirecionamento de autenticação;
  - com cookie local de smoke para atravessar o proxy, a rota respondeu `200` e carregou o bundle da página.

## Pendências

- Nenhuma pendência bloqueante para a TASK-30.
- Se OAuth Google estiver ausente em algum ambiente, o backend retorna `google_oauth_not_configured` e a UI bloqueia a ação sem mock.

## Complemento em 2026-08-20 - intenção de vínculo no transporte cookie-aware

- A URL criada por `POST /api/public/google/link/intent` contém um `link_token` transitório de dez
  minutos, assinado e vinculado a intenção, usuário, e-mail e device; ele não é JWT de sessão.
- O DTO mínimo `{ url }` passa a declarar `allowAuthTokens: true`, permitindo que o sanitizador
  preserve apenas essa capability curta até a navegação OAuth. Respostas sem opt-in continuam
  redigidas.
- A capability `Lectum-User-Cookie-Auth` só pode forçar `allowAuthTokens: false` ao retirar o
  contrato top-level `user_tokens` de sessão do JSON. O limite geral e a exclusão Google estão
  detalhados no complemento de 2026-08-20 da ADR-0461.
