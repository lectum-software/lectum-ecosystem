# TASK-04: Seleção de perfil e login

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-04 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Auth |
| Status | Completed |
| Dependências | TASK-01, TASK-02, TASK-03 |
| ADR alvo | ADR-0008 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Seleção de Perfil.jpg` | `figma-design-frame-57-Sele--o-de-Perfil.html` |
| `_product/proto/Login.jpg` | `figma-design-frame-55-Login.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O usuário não-dev precisa conseguir abrir a aplicação, escolher se quer entrar como paciente ou psicólogo e autenticar sem cair em loops de login. O backend já possui base de autenticação e o frontend já possui sessão com cookies, Redux Persist, proxy e `useUserSet`; esta task deve consolidar esse fluxo com visual aderente aos protótipos.

## Objetivo

Entregar a entrada pública do produto com escolha de perfil, login por e-mail/senha e login Google real, preservando o fluxo atual de sessão e redirecionamento.

## Pré-requisitos e bloqueios

- Chaves OAuth Google ausentes bloqueiam apenas login Google, não login comum.
- Se endpoint `/me` retornar `null` após login, corrigir backend/sessão antes de concluir.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/auth/profile-selection`
- `/auth/login`

Implementação esperada:

- Criar ou ajustar `/auth/profile-selection` com cards/CTAs para Paciente e Psicólogo.
- Revisar `/auth/login` usando o protótipo `Login.jpg` e componentes existentes.
- Preservar `useUserSet`, cookies, Redux Persist, `proxy.ts` e redirects pós-login.
- Adicionar estados de loading, erro de credenciais, erro Google e sucesso sem textos técnicos.
- Atualizar `frontend/src/api/req/auth`, `frontend/src/api/callers/auth` e `frontend/src/api/cache/keys.ts` se houver contrato novo.

## Escopo backend

Implementação esperada:

- Preservar os endpoints reais de login comum (`POST /api/public/auth/login`), Google (`/api/public/google/login/:deviceId` → callback → `/api/public/google/me`) e a sessão privada `GET /api/private/auth/hidrate` (que retorna `user`). **Não inventar `/me`.**
- Garantir que o `user` hidratado traga `user.role` (`"paciente" | "psicologo"`, ver `DATA-MODEL.md` "Decisão estrutural") suficiente para o redirecionamento por perfil.
- O redirecionamento por papel no frontend é UX; a proteção de rota por papel é imposta no servidor pela guarda da TASK-12 (ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`).
- Não criar login alternativo, token fake nem bypass de `x-device`.
- Revisar traduções PT-BR de mensagens de auth usadas pelo backend.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `user` existente (+ campo `user.role`)
- `user_token` existente

Endpoints esperados (reais, não recriar):

- POST `/api/public/auth/login`
- Fluxo Google existente (`/api/public/google/login/:deviceId`, callback, `GET /api/public/google/me`)
- GET `/api/private/auth/hidrate` (sessão privada real)

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- Next.js 16
- React 19
- TanStack Query 5
- Redux Toolkit
- Axios
- React Hook Form
- Zod
- Sonner
- js-cookie
- Passport/JWT/Google OAuth

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema; sessão via `/api/private/auth/hidrate`, não `/me`).
- [x] Redirecionamento por `user.role` no frontend é UX; a proteção por papel fica no servidor (TASK-12 / ADR-0002).
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Evidências de execução

- Referências visuais consultadas por imagens locais:
  - `_product/proto/Seleção de Perfil.jpg`;
  - `_product/proto/Login.jpg`.
- ADR criado: `adrs/0008-fluxo-publico-auth-selecao-perfil-login.md`.
- Schema aditivo criado: `backend/prisma/migrations/20260604100000_add_user_role/migration.sql`.
- Rotas frontend entregues:
  - `/auth/profile-selection`;
  - `/auth/login`.
- Endpoints reais preservados:
  - `POST /api/public/auth/login`;
  - `GET /api/public/google/login/:deviceId`;
  - `GET /api/public/google/me`;
  - `GET /api/private/auth/hidrate`.
- Validação executada:
  - `pnpm --dir backend db:migrate` (`Already in sync`);
  - `pnpm --dir frontend check`;
  - `pnpm --dir backend check`;
  - `pnpm --dir frontend build`;
  - `pnpm --dir backend build`;
  - `pnpm check`.
- Validação local:
  - `next dev --webpack` em `http://localhost:3000`;
  - `HEAD /auth/profile-selection` retornou `200`;
  - `HEAD /auth/login` retornou `200`;
  - Chrome headless validou screenshots de `/auth/profile-selection` e `/auth/login` em viewport larga (`500x900`). A tentativa inicial via Browser in-app não estava disponível na sessão; a validação foi feita por navegador local headless.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Ajuste posterior em 2026-06-05: confirmação de conta Google

- Pedido direto de produto: ao clicar em Google no login, cadastro de paciente ou
  cadastro de psicólogo, o usuário deve poder confirmar/trocar a conta Google em vez de
  conectar automaticamente com a sessão ativa do navegador.
- O ajuste foi centralizado no endpoint real `GET /api/public/google/login/:deviceId`,
  adicionando `prompt: "select_account"` ao Passport Google OAuth.
- Login, cadastro de paciente e cadastro de psicólogo continuam usando o mesmo endpoint
  real e preservam `role`, `terms_accepted` e `terms_version` via `state`.
- Nenhum endpoint paralelo, mock, store paralela ou dado fake foi criado.

### Validação do ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Validação local do redirect OAuth em
  `GET /api/public/google/login/:deviceId` confirmando `prompt=select_account` na URL do
  Google.
