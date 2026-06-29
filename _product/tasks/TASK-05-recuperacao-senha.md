# TASK-05: Recuperação de senha

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-05 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Auth |
| Status | Completed |
| Dependências | TASK-02, TASK-04 |
| ADR alvo | ADR de recuperação de senha reutilizando fluxo existente |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Recuperar Senha - Inserir Email.jpg` | `figma-design-frame-61-Recuperar-Senha---Inserir-Email.html` |
| `_product/proto/Recuperar Senha - Link Enviado.jpg` | `figma-design-frame-60-Recuperar-Senha---Link-Enviado.html` |
| `_product/proto/Recuperar Senha - Criar Nova Senha.jpg` | `figma-design-frame-36-Recuperar-Senha---Criar-Nova-Senha.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O backend **já implementa** o fluxo completo de recuperação de senha por link. Esta task é majoritariamente frontend: conectar as três telas exportadas aos endpoints reais. A jornada (fluxograma 19.8) é: Esqueci Minha Senha → Informar E-mail → Enviar Link → Abrir Link → Nova Senha → Login.

**Não crie endpoints novos de recuperação.** As tasks antigas pediam `/auth/password/forgot` e `/auth/password/reset`, que não existem e duplicariam o fluxo real, violando a regra anti-autenticação-paralela.

## Integração com backend existente (não recriar)

Fonte: `backend/src/modules/api/public/auth/recovery` e `.../reset`, registrados em `backend/src/main/server/imports/write.ts`.

- **`POST /api/public/auth/recovery`** — body `{ email }` (validator `method:"email"`). Sempre responde `200 { success:true, message:"recovery_code_success", data:true }`, inclusive para e-mail inexistente (anti-enumeração — preservar). Efeito: grava `user.recovery_code` (hash) + `user.recovery_date=now` e envia e-mail real com link `${WEB_URL}${RECOVERY_URL}?code=<recovery_code>` (`config/nodemailer/messages/recovery`).
- **`POST /api/public/auth/reset/:code`** — param `code` (o `recovery_code` do link); body `{ password, password_confirm }` (validator `method:"password"`: mín. 10, máx. 128, sem composição obrigatória; relação `password == password_confirm`); header `x-device` obrigatório. Valida `recovery_code` + janela `CODE_API_USER_VALID_MINUTES` (senão `404 code_incorrect` / `400 code_expired`). Em sucesso: atualiza senha, `confirmed=true`, limpa `recovery_code/recovery_date`, `need_reset=false` e **hidrata** (retorna `user` com `user_tokens[0].token` → usuário já autenticado).

Chaves de tradução já existentes: `message.recovery_code_success`, `message.password_update_success`, `error.code_incorrect`, `error.code_expired`. Não criar mensagens novas sem necessidade.

## Objetivo

Entregar as três telas de recuperação consumindo `recovery` e `reset/:code` reais, sem mock e sem endpoint paralelo.

## Pré-requisitos e bloqueios

- Envio de e-mail real usa Resend via Nodemailer/SMTP (decisão TASK-03 / ADR-0006) e depende de `EMAIL_API_EMAIL`/`EMAIL_API_KEY` e demais envs `EMAIL_API_*`. Sem essas variáveis, o `nodemailer` faz no-op (loga e não envia). Se o ambiente não tiver provedor configurado, registrar bloqueio em ADR e não marcar o envio como validado ponta a ponta (a UI e os contratos podem ser concluídos).
- `RECOVERY_URL` (env do backend) deve apontar para a rota de nova senha do frontend (abaixo). Se divergir, alinhar a env ou a rota e registrar.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/auth/recovery` — informar e-mail (estado de envio e confirmação "Link Enviado" podem ser passo único ou `/auth/recovery/sent`).
- `/auth/reset-password` — lê `?code=` da URL do e-mail e cria nova senha. **Deve corresponder ao `RECOVERY_URL` do backend.**

Implementação esperada:

- `/auth/recovery`: form com `email` (fundação TASK-02), chama o caller de `recovery`; após sucesso mostra confirmação "Link Enviado" com instrução em PT-BR (não revelar se o e-mail existe).
- `/auth/reset-password`: form com `password` + `password_confirm` (controllers da TASK-02; schema Zod espelhando a regra forte do backend), lê `code` de `useSearchParams`, chama `reset/:code`.
- Tratar `code` ausente/inválido/expirado com mensagem clara e CTA para reenviar.
- Como `reset/:code` retorna `user` hidratado, reaproveitar `useUserSet` (de `frontend/src/hooks/user-set`) para gravar sessão e redirecionar, OU redirecionar para `/auth/login` com toast de sucesso — escolher um comportamento e registrar no ADR (recomendado: `useUserSet`, já que o backend autentica).
- Adicionar funções em `frontend/src/api/req/auth/index.ts` (`recovery`, `resetPassword`) e hooks em `frontend/src/api/callers/auth/index.tsx`, no padrão do `login`/`googleMe` existentes. Não chamar Axios direto.

## Escopo backend

- **Nenhum endpoint novo.** Reutilizar `recovery` e `reset/:code` existentes.
- Permitido apenas: revisar/adicionar chaves de tradução PT-BR se faltar alguma mensagem visível, e ajustar `RECOVERY_URL` de ambiente. Qualquer mudança estrutural no backend deve ser justificada — o esperado é zero.

Modelos/tabelas: `user` (campos `recovery_code`, `recovery_date` já existentes — ver `DATA-MODEL.md`). Não usar `user_token` para token tipado; o fluxo real usa `user.recovery_code`.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx`.
- Chamadas HTTP em `frontend/src/api/req/auth/index.ts` usando `callEndpoint` + `handleReq`.
- Hooks React Query em `frontend/src/api/callers/auth/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts` (se necessário; recuperação é mutation, normalmente não precisa de key).
- Componentes de `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` reutilizados antes de criar novos.
- Formulários e campos via `frontend/src/hooks/form` + `frontend/src/components/controllers` (TASK-02).

Packages permitidos nesta task:

- React Hook Form, Zod, `@hookform/resolvers`, TanStack Query (já instalados). Backend: nenhum novo.

Regras anti-recriação específicas:

- Não criar endpoint, validator, repository ou service paralelo de recuperação — o fluxo já existe.
- Não criar client HTTP, store, auth flow ou design system paralelo.
- Não usar `sample/` como referência direta.
- Não instalar package novo sem `PACKAGES.md` + ADR.

## Estados obrigatórios

- Loading do envio e do reset.
- Erro de rede/API em PT-BR (código inválido, expirado).
- Confirmação "Link Enviado" sem vazar existência do e-mail.
- Sucesso de nova senha com feedback e redirecionamento.
- Responsividade mobile-first conforme imagens.

## Fora do escopo

- Criar endpoint próprio de recuperação.
- Recuperação por código numérico digitado (o fluxo real é por link; mudar isso exige ADR e mudança de backend).
- Criar dados fake, seed ou mock.
- Refatorar módulos não relacionados.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] As três telas consomem `POST /api/public/auth/recovery` e `POST /api/public/auth/reset/:code` reais.
- [x] Nenhum endpoint, validator ou service de recuperação foi duplicado.
- [x] `/auth/reset-password` corresponde ao `RECOVERY_URL` do backend (ou divergência registrada).
- [x] Formulários usam a fundação da TASK-02; senha valida a política atual (mín. 10, máx. 128, sem composição obrigatória) e confirmação.
- [x] Todos os estados obrigatórios existem em PT-BR.
- [x] Anti-enumeração preservado na tela de envio.
- [x] Nenhum mock, dado fake ou endpoint simulado foi usado.
- [x] Bloqueio de provedor de e-mail registrado se aplicável.
- [x] ADR criado/atualizado em `adrs/` (decisão de redirecionamento pós-reset).
- [x] `pnpm --dir frontend check` e `pnpm --dir frontend build` sem erros.
- [x] Browser local validou envio e ao menos um erro (código inválido/expirado).
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check` apenas se tocar tradução/env no backend.
- Browser local em `/auth/recovery` e `/auth/reset-password?code=...`.

## Notas para executor

O peso desta task é frontend e fidelidade ao contrato real. Se for tentado a "melhorar" criando um endpoint próprio, pare: o backend já resolve. Concluir em commit próprio.


## Evidencias de execucao

- Referencias visuais consultadas por fallback local:
  - `_product/proto/Recuperar Senha - Inserir Email.jpg`;
  - `_product/proto/Recuperar Senha - Link Enviado.jpg`;
  - `_product/proto/Recuperar Senha - Criar Nova Senha.jpg`.
- Builder/Quick Copy nao estava disponivel como ferramenta MCP direta nesta sessao; limitacao registrada na `ADR-0010`.
- Endpoints reais adicionados no frontend:
  - `POST /api/public/auth/recovery`;
  - `POST /api/public/auth/reset/:code`.
- `backend/.env` local alinhado para `RECOVERY_URL=/auth/reset-password`; como `.env` e ignorado pelo Git, a decisao foi registrada na `ADR-0010`.
- Provedor de e-mail: variaveis `EMAIL_API_EMAIL`, `EMAIL_API_KEY` e demais `EMAIL_API_*` esperadas estavam presentes no ambiente local; sem bloqueio aplicavel nesta execucao. A entrega em caixa real fica pendente para destinatario operacional autorizado.
- `pnpm --dir frontend check`: aprovado sem erros.
- `pnpm --dir frontend build`: aprovado, incluindo as rotas `/auth/recovery` e `/auth/reset-password`.
- Dev local:
  - `GET http://localhost:3000/auth/recovery`: 200;
  - `GET http://localhost:3000/auth/reset-password?code=invalid-task05`: 200;
  - `POST http://localhost:3001/api/public/auth/recovery`: 200 com `recovery_code_success`;
  - `POST http://localhost:3001/api/public/auth/reset/invalid-task05`: 404 com `code_incorrect`.
- Chrome headless/CDP validou browser local:
  - tela `/auth/recovery` renderizou;
  - submit de e-mail exibiu `Link enviado!`;
  - tela `/auth/reset-password?code=invalid-task05-browser` renderizou;
  - submit com codigo invalido exibiu CTA `Solicitar novo link`.
- ADR criado: `adrs/0010-recuperacao-senha-frontend.md`.
