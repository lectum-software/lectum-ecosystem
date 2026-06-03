# TASK-06: Verificação de e-mail por código

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-06 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Auth |
| Status | Pending |
| Dependências | TASK-02, TASK-04 |
| ADR alvo | ADR de verificação de e-mail reutilizando fluxo privado existente |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Verificação de E-mail com Código.jpg` | `figma-design-frame-58-Verifica--o-de-E-mail-com-C-digo.html` |
| `_product/proto/Confirmação de Código - Versão Moderna.jpg` | `figma-design-frame-59-Confirma--o-de-C-digo---Vers-o-Moderna.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O backend **já implementa** verificação de e-mail por código numérico de 6 dígitos. Esta task conecta as telas de código aos endpoints reais. No fluxo de produto (fluxograma 19.1), a verificação acontece **depois** de cadastro/login, com o usuário já autenticado — por isso os endpoints são **privados**.

**Não crie endpoints públicos `/auth/email/send-code` nem `/auth/email/verify-code`.** Eles não existem; o fluxo real já está pronto e é privado.

## Integração com backend existente (não recriar)

Fonte: `backend/src/modules/api/private/auth/confirm` e `.../code` (atenção ao nome **invertido** dos diretórios). Ambos passam pelo middleware `_auth` (exigem `Authorization: Bearer <jwt>` + `x-device`).

- **`GET /api/private/auth/confirm`** — envia/reenvia o código. Gera `confirm_code` numérico de 6 dígitos (`utils/code`), grava `user.confirm_code` + `user.confirm_date=now` e envia e-mail real (`config/nodemailer/messages/confirm`). Erros: `404 auth_incorrect`, `400 confirmed_already` (já verificado). Sucesso: `200 { message:"confirm_code_success", data:true }`.
- **`PUT /api/private/auth/code/:code`** — valida o código. Param `code` = os 6 dígitos digitados. Confere `confirm_code` para `req.auth.id`, rejeita se já `confirmed` (`400 code_confirmed`) ou fora da janela `CODE_API_USER_VALID_MINUTES` (`403 code_expired`) ou incorreto (`400 code_incorrect`). Sucesso: `confirmed=true`, `confirmed_date=now`, limpa `confirm_code`, **hidrata** e retorna `200 { message:"confirmed_success", data:<user> }`.

Frontend já tem o sinal: o reducer de usuário grava o cookie/flag `confirm: !data.confirmed` (`store/modules/user`). Use esse flag (e/ou `user.confirmed` hidratado) para decidir se deve enviar o usuário recém-logado para esta tela.

## Objetivo

Entregar a verificação de e-mail por código de 6 dígitos consumindo `confirm` (enviar/reenviar) e `code/:code` (validar) reais, com reenvio controlado por cooldown.

## Pré-requisitos e bloqueios

- Os endpoints são privados: o usuário precisa estar autenticado (vindo de cadastro/login). Garantir que a sessão (Bearer + `x-device`) esteja ativa antes de chamar.
- Envio real usa Resend via Nodemailer/SMTP (decisão TASK-03 / ADR-0006) e depende de `EMAIL_API_EMAIL`/`EMAIL_API_KEY` e demais envs `EMAIL_API_*`; sem provedor, `nodemailer` faz no-op. Registrar bloqueio se o ambiente não tiver e-mail configurado (UI/contratos podem concluir).

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/auth/verify-email` — input de código de 6 dígitos + reenvio com cooldown. O sucesso pode usar estado interno/toast (telas "com Código" e "Versão Moderna" são variações da mesma jornada).

Implementação esperada:

- Input de 6 dígitos mobile-first com colagem completa (paste), navegação entre casas e teclado numérico.
- Botão "Reenviar código" com cooldown visível, chamando o caller de `confirm`.
- Caller de `code/:code` para validar; em sucesso, gravar sessão hidratada (`useUserSet`) e redirecionar por `user.role` (paciente → onboarding TASK-08; psicólogo → fluxo TASK-09+).
- Tratar: código incorreto, expirado, já verificado (`confirmed_already`/`code_confirmed`) e erro de rede — tudo em PT-BR.
- Adicionar `sendConfirmCode` (GET confirm) e `verifyCode` (PUT code/:code) em `frontend/src/api/req/auth/index.ts` e hooks em `frontend/src/api/callers/auth/index.tsx`. Não chamar Axios direto.

## Escopo backend

- **Nenhum endpoint novo.** Reutilizar `confirm` (enviar) e `code/:code` (validar) existentes.
- Permitido apenas revisar traduções PT-BR se alguma mensagem visível faltar. Esperado: zero mudança estrutural.

Modelos/tabelas: `user` (campos `confirmed`, `confirmed_date`, `confirm_code`, `confirm_date` já existentes — ver `DATA-MODEL.md`). Não criar `emailVerifiedAt`, não usar `user_token` tipado.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/auth/verify-email/page.tsx`, `logic.tsx` e `use-form.tsx` (se modelar o código como form).
- Chamadas HTTP em `frontend/src/api/req/auth/index.ts` usando `callEndpoint` + `handleReq` (rotas privadas — os headers `Authorization`/`x-device` já são injetados pelo interceptor de `frontend/src/api/index.ts`).
- Hooks React Query em `frontend/src/api/callers/auth/index.tsx`.
- Reutilizar componentes de `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui`; se precisar de um input de OTP, criar como controller reutilizável na linha da TASK-02, não como input solto na página.

Packages permitidos nesta task:

- React Hook Form, Zod, TanStack Query (já instalados). Backend: nenhum novo. Não instalar lib de OTP sem ADR — o input de 6 casas pode ser composto com os componentes existentes.

Regras anti-recriação específicas:

- Não criar fluxo público de verificação; o privado já existe.
- Não criar client HTTP, store, auth flow, validator ou design system paralelo.
- Não usar `sample/` como referência direta.
- Não instalar package novo sem `PACKAGES.md` + ADR.

## Estados obrigatórios

- Loading de envio e de validação.
- Cooldown ativo no reenvio.
- Erro em PT-BR: código incorreto, expirado, já verificado.
- Sucesso com redirecionamento por `role`.
- Responsividade mobile-first conforme imagens.

## Fora do escopo

- Criar endpoint público de verificação.
- Verificação por link (o fluxo real é por código de 6 dígitos).
- Criar dados fake, seed ou mock.
- Refatorar módulos não relacionados.

## Critérios de aceite

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] As telas consomem `GET /api/private/auth/confirm` (enviar/reenviar) e `PUT /api/private/auth/code/:code` (validar) reais.
- [ ] Nenhum endpoint público de verificação foi criado; nenhum fluxo de auth duplicado.
- [ ] Input de 6 dígitos funciona com colagem e teclado numérico mobile.
- [ ] Reenvio tem cooldown visível.
- [ ] Erros `code_incorrect`/`code_expired`/`code_confirmed` tratados em PT-BR.
- [ ] Sucesso hidrata sessão e redireciona por `user.role`.
- [ ] Nenhum mock, dado fake ou endpoint simulado foi usado.
- [ ] Bloqueio de provedor de e-mail registrado se aplicável.
- [ ] ADR criado/atualizado em `adrs/`.
- [ ] `pnpm --dir frontend check` e `pnpm --dir frontend build` sem erros.
- [ ] Browser local validou envio, reenvio com cooldown e um erro de código.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check` apenas se tocar tradução no backend.
- Browser local em `/auth/verify-email` com usuário autenticado não confirmado.

## Notas para executor

A inversão de nomes no backend é real: `confirm` envia o código, `code/:code` valida. Não confie no nome do diretório — confira o controller. Concluir em commit próprio.
