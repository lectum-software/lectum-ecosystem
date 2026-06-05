# ADR-0014: Cadastro inicial de psicologo com psychologist_profile

## Status

Accepted

## Task relacionada

TASK-09: Cadastro inicial de psicologo.

## Contexto

O cadastro de usuario ja existia em `POST /api/public/user/store` e a TASK-09 exigia
criar a identidade profissional sem endpoint paralelo, sem publicar o perfil antes da
validacao de CRP/CFP e sem simular dados profissionais. A referencia visual ativa foi
consultada pela imagem local `_product/proto/Cadastro de Psicólogo.jpg`, pois
Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao.

## Decisao

- `psychologist_profile` foi adicionado ao Prisma conforme `DATA-MODEL.md`, com
  `user_id @unique`, relacao cascade com `user`, soft delete, `crp_status`,
  `published`, campos opcionais profissionais, metricas e indices
  `[user_id]`/`[published, deleted]`.
- A migracao aditiva `20260605090000_add_psychologist_profile` cria a tabela
  `psychologist_profiles`.
- `POST /api/public/user/store` continua sendo o unico endpoint de cadastro. Quando
  `role="psicologo"`, a transacao cria `user`, `psychologist_profile`,
  `user_background type="terms_accept"` e `log__user`.
- O perfil profissional nasce sempre com `crp_status="pendente"` e
  `published=false`.
- O fluxo Google existente continua usando `GET /api/public/google/login/:deviceId` e
  callback atual. O `state` preserva `role=psicologo`, `terms_accepted` e
  `terms_version`; novos usuarios Google com role profissional tambem recebem
  `psychologist_profile`.
- O frontend implementa `/auth/register/psychologist` com a fundacao da TASK-02
  (React Hook Form, Zod, `useFormList` e controllers), Google/e-mail, aceite de termos
  e chamada real a `user/store`.
- O destino do psicologo confirmado passa a ser `/psychologist/cfp`. A rota criada nesta
  task e apenas um handoff seguro/privado; nao executa consulta automatica, mock,
  scraping ou aprova perfil. A consulta CFP/CRP real permanece no escopo da TASK-10.

## Consequencias

- Nao existe endpoint `/api/public/psychologists/register` nem autenticacao paralela.
- Todo psicologo recem-cadastrado tem `role="psicologo"`, sessao real e perfil
  profissional pendente/privado.
- O texto legal profissional/LGPD definitivo ainda nao esta definido. O aceite fica
  rastreavel por `terms_version="task09-professional-terms-pending-legal-copy"` ate a
  revisao legal futura.
- A rota `/psychologist/cfp` evita redirecionamento quebrado apos verificacao de e-mail,
  mas nao substitui a TASK-10.

## Validacao

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local headless em `http://localhost:3000/auth/register/psychologist`.
- Cadastro real via `POST /api/public/user/store` retornou 200 com
  `role="psicologo"`, `confirmed=false`, token, `psychologist_profile.crp_status` como
  `pendente`, `psychologist_profile.published=false` e aceite em
  `user_background type="terms_accept"`.
- O usuario temporario usado na validacao foi removido ao final.

## Pendencias

- Substituir a versao pendente de termos profissionais/LGPD quando a copy legal for
  aprovada.
- Implementar consulta CFP/CRP real somente na TASK-10, com fonte/API autorizada.

## Atualizacao visual em 2026-06-05

### Contexto

Pedido direto de produto solicitou que `/auth/register/psychologist` ficasse visualmente
alinhada a imagem local `_product/proto/Cadastro de Psicólogo.jpg`, mantendo os campos
adicionais de nome completo e confirmacao de senha. O Builder/Quick Copy nao esta
exposto como ferramenta direta nesta sessao; a referencia auditavel usada foi a imagem
local do inventario.

### Decisao

- A tela foi ajustada de forma mobile-first na base do prototipo, com card estreito,
  cabecalho com logo/tag, copy, botao Google, divisor, formulario e rodape interno.
- O formulario continuou usando React Hook Form, Zod, `useFormList` e controllers da
  TASK-02; os campos `name` e `password_confirm` foram preservados.
- A copy do CTA voltou para `Criar conta gratuita`, sem alterar o fluxo real posterior
  de verificacao de e-mail/planos definido nos ADRs anteriores.
- A mensagem de metricas sem fonte persistida foi evitada; o rodape mantem beneficios
  visuais e a regra real de perfil protegido ate validacao profissional.
- O script `frontend` de build foi alinhado para `next build --webpack`, preservando o
  mesmo bundler ja usado em `next dev --webpack`, porque o build Turbopack falhou por
  OOM no ambiente durante a validacao.

### Validacao

- `pnpm --dir frontend check`
- `pnpm check`
- `pnpm --dir frontend build` foi executado inicialmente com Turbopack e falhou na
  etapa TypeScript com `FATAL ERROR: Zone Allocation failed - process out of memory`;
  a repeticao com `NODE_OPTIONS=--max-old-space-size=4096` falhou pelo mesmo motivo.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm --dir frontend exec next build --webpack`
  passou antes da alteracao do script.
- `pnpm --dir frontend build` passou apos alinhar o script para `next build --webpack`.
- Browser local via Chrome headless em
  `http://localhost:3000/auth/register/psychologist`, viewport mobile, retornou 200 e
  gerou captura visual para conferencia.
