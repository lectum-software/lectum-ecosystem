# ADR-0011: Verificacao de e-mail por codigo

## Status

Accepted

## Task relacionada

TASK-06: Verificacao de e-mail por codigo.

## Contexto

O backend ja possuia os endpoints privados reais:

- `GET /api/private/auth/confirm` para enviar ou reenviar o codigo;
- `PUT /api/private/auth/code/:code` para validar o codigo de 6 digitos.

A task exigia conectar a rota frontend autenticada `/auth/verify-email`, sem criar
endpoint publico novo nem fluxo de autenticacao paralelo. As referencias visuais ativas
foram consultadas pelas imagens locais em `_product/proto`, porque Builder/Quick Copy nao
esta exposto como ferramenta MCP direta nesta sessao.

Durante a validacao do envio real, o adaptador de e-mail existente falhou antes do SMTP:
`nodemailer-express-handlebars` tentou acessar `handlebars.create`, mas a resolucao atual
de `express-handlebars` nao expoe esse default no runtime usado pelo backend. Sem corrigir
isso, `confirm` retornava 500 e a verificacao de e-mail nao poderia ser validada com o
endpoint real.

## Decisao

- A rota `/auth/verify-email` usa `useFormList`, Zod e um novo controller reutilizavel
  `OtpController` para os 6 digitos, com teclado numerico, paste completo, navegacao por
  setas/backspace e slot de erro fixo pelo `Container`.
- `frontend/src/api/req/auth/index.ts` concentra `sendConfirmCode` e `verifyCode` usando
  `callEndpoint` + `handleReq`; `useAuth` expoe as mutations React Query.
- O redirecionamento de usuario nao confirmado foi centralizado em `resolveAuthRedirect`.
  O proxy permite `/auth/verify-email` para usuarios autenticados e redireciona usuarios
  com cookie `confirm: true` para essa rota antes de liberar telas privadas.
- O sucesso de `code/:code` usa `useUserSet`, hidrata a sessao retornada pelo backend e
  atualiza o cookie `confirm: false`. Neste momento, o mapa de home por perfil ainda aponta
  paciente e psicologo para `/dashboard`, porque os destinos finais de onboarding e shell
  privado serao criados nas tasks seguintes.
- O envio de e-mail manteve `nodemailer` e `nodemailer-express-handlebars`, mas passou a
  fornecer um `viewEngine.renderView` local e minimo, capaz de renderizar os templates
  `.hbs` atuais (`{{#if}}`, `{{}}`, `{{{}}}` e comentarios). Isso evita depender do default
  quebrado de `express-handlebars` sem adicionar package novo ou alterar o contrato SMTP.

## Consequencias

- Nao ha endpoint publico de verificacao, client HTTP duplicado, store paralelo ou mock.
- Usuarios autenticados e nao confirmados sao direcionados para a verificacao de e-mail.
- O cooldown de reenvio e os estados de erro/sucesso ficam no frontend; a validade real do
  codigo continua sendo regra do backend.
- O renderer local cobre o template transacional existente. Se templates futuros exigirem
  helpers avancados de Handlebars, a decisao deve ser reavaliada antes de ampliar a sintaxe.
- A validacao de browser usou usuarios temporarios criados por endpoint real e removidos do
  banco ao final, sem deixar dado fake permanente.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Envio direto de `confirmEmailSend` retornou `Email sent: 250 ...`.
- API real:
  - `GET /api/private/auth/confirm` retornou 200 com `confirm_code_success`;
  - `PUT /api/private/auth/code/:code` com codigo incorreto retornou 400 `Codigo incorreto`;
  - `PUT /api/private/auth/code/:code` com codigo real retornou 200 e `confirmed: true`.
- Browser local em `http://localhost:3000/auth/verify-email` com usuario autenticado nao
  confirmado validou:
  - render mobile-first da rota;
  - 6 inputs numericos;
  - chamada real de envio para `/api/private/auth/confirm`;
  - cooldown visivel no reenvio;
  - erro de codigo incorreto em PT-BR;
  - sucesso redirecionando para `/dashboard` e cookie `confirm: false`.

## Pendencias

- Quando TASK-08, TASK-09 e TASK-12 criarem os destinos finais, atualizar
  `USER_HOME_PATHS` para enviar paciente/psicologo aos fluxos definitivos por perfil.
- Em homologacao/producao, validar entrega em caixa de e-mail operacional autorizada.


## Atualizacao em 2026-08-21 - logo transacional atualizada

O e-mail de confirmacao em homologacao ainda carregava `backend/public/logo.png` com a marca antiga, apesar de o frontend/admin ja usarem a logo atual azul com icone e wordmark. Como os e-mails transacionais recebem a URL da imagem via `SYSTEM_LOGO`, a decisao foi manter o caminho publico e substituir o asset servido pelo backend.

### Decisao

- Substituir `backend/public/logo.png` pela logo atual da Lectum usada no app.
- Manter `SYSTEM_LOGO` como env existente, sem criar nova configuracao obrigatoria.
- Ajustar `transactional.hbs` para largura controlada (`280`) e altura automatica, removendo a altura fixa que distorcia a marca.
- Usar fundo claro no cabecalho do e-mail para preservar contraste com a logo azul atual.
- Acrescentar cache-buster `v=<versao-do-backend>` em URLs absolutas HTTP/HTTPS da logo, para que novos e-mails nao reutilizem a imagem antiga em proxies/cache de clientes de e-mail.

### Impacto de deploy

- Backend-only: publica novo asset estatico, template e logica de montagem da URL de imagem.
- Sem mudanca de contrato de API, banco, migration, env, provider SMTP, jobs, dados persistidos, seed, mock ou package novo.
- Rollback por reversao simples do commit restaura o asset/template/logica anterior.
- E-mails antigos ja recebidos podem continuar exibindo a imagem cacheada pelo cliente; novos e-mails enviados apos o deploy passam a apontar para a logo versionada.

### Validacao

- `pnpm --dir backend exec biome check --write src/modules/api/config/nodemailer/send.ts src/modules/api/config/nodemailer/send.test.ts`
- `pnpm --dir backend exec node --import tsx --test src/modules/api/config/nodemailer/send.test.ts`
- Render estatico local do template transacional confirmou a logo versionada com `width='280'`, `height:auto`, cabecalho claro e fallback textual legivel.
- `pnpm --dir backend exec node --import tsx --test scripts/boot-safety.test.mjs`
- `pnpm --dir backend build`
- `pnpm version:bump` (`0.1.166` -> `0.1.167`)
- `pnpm check:version`
- `pnpm check`
- Smoke local do backend buildado: `/ping` `0.1.167`, `/health` OK, `/ready` ready e `/logo.png` com SHA-256 igual ao asset novo do repositorio.
