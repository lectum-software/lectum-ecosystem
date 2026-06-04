# TASK-08: Boas-vindas do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-08 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Paciente |
| Status | Completed |
| Dependências | TASK-07 (TASK-12 quando o shell privado existir) |
| ADR alvo | ADR de onboarding paciente |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Boas-vindas Paciente - 1.jpg` | `figma-design-frame-44-Boas-vindas-Paciente---1.html` |
| `_product/proto/Boas-vindas Paciente - 2.jpg` | `figma-design-frame-45-Boas-vindas-Paciente---2.html` |
| `_product/proto/Boas-vindas Paciente - 3.jpg` | `figma-design-frame-46-Boas-vindas-Paciente---3.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Após cadastro e verificação, o paciente passa pelo onboarding (fluxograma 19.2): Onboarding Inicial → Informações Pessoais → Escolha do Objetivo → Home. As três telas de boas-vindas são a parte introdutória; a conclusão deve persistir em `patient_profile` (criado na TASK-07), não em localStorage, para não repetir o onboarding em outro device.

## Integração com backend (modelo já definido em DATA-MODEL)

Usa o `patient_profile` da TASK-07. Campos relevantes (ver `DATA-MODEL.md`): `goal` (`"encontrar_psicologo" | "conhecer_comunidade"`), `birthdate?`, `phone?`, `onboarding_completed_at?` (null = pendente).

Endpoints a criar (privados, módulo `private/patient`, padrão controller/service/repository de `ARCHITECTURE.md`):

- **`GET /api/private/patient/profile`** — retorna o `patient_profile` do `req.auth`, incluindo `onboarding_completed_at` (para o frontend decidir se mostra o onboarding). Cria/garante o profile se faltar.
- **`PUT /api/private/patient/onboarding`** — body `{ goal?, birthdate?, phone? }`; grava os campos e seta `onboarding_completed_at=now`. Idempotente: se já concluído, retorna o estado atual sem erro.

Ambos exigem `Authorization: Bearer` + `x-device` (middleware `_auth`) e devem validar `req.auth.role === "paciente"`.

## Objetivo

Entregar o onboarding inicial do paciente com progresso real persistido em `patient_profile` e entrada no shell privado, sem repetição em re-login.

## Pré-requisitos e bloqueios

- Depende de sessão paciente real e do `patient_profile` (TASK-07).
- Idealmente roda após o shell privado (TASK-12); se a TASK-12 ainda não existir, usar um shell mínimo e registrar a dependência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/patient/welcome` (ou rota dentro do shell privado da TASK-12).

Implementação esperada:

- Fluxo em etapas (carrossel) com voltar/avançar, progresso e conclusão, refletindo as 3 telas + "Informações Pessoais" + "Escolha do Objetivo".
- Campos de informações pessoais e objetivo via fundação da TASK-02 (controllers: input, calendar/date, phone, select/cards de objetivo).
- Ao concluir, chamar o caller de `PUT /api/private/patient/onboarding`; só então redirecionar para a Home privada do paciente.
- Na entrada, consultar `GET /api/private/patient/profile`: se `onboarding_completed_at` já preenchido, pular o onboarding e ir para a Home.
- Não persistir conclusão apenas em localStorage/redux; a verdade é o backend.
- Adicionar `req`/`callers` em domínio `patient` e query key (ex.: `keys.patient.profile`) em `frontend/src/api/cache/keys.ts`.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Módulo `backend/src/modules/api/private/patient/profile` (GET) e `.../onboarding` (PUT) no padrão controller/service/repository.
- Registrar rotas em `write.ts` com prefixo `/api/private/patient/...`.
- Validar `role="paciente"` e existência do profile; criar profile vazio na primeira leitura se necessário.
- Validadores com o pacote local; respostas via `send`/`error`/`error500` e traduções PT-BR.
- Não criar paciente/seed fake para validar a tela.

Modelos/tabelas: `patient_profile` (TASK-07 / `DATA-MODEL.md`). Sem modelo novo.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/patient/welcome/{page,logic}.tsx` (+ `use-form.tsx` para Informações Pessoais).
- HTTP em `frontend/src/api/req/patient/index.ts` com `callEndpoint` + `handleReq`.
- Hooks em `frontend/src/api/callers/patient/index.tsx` (query para profile, mutation para onboarding; invalidar a query após concluir).
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shell em `frontend/src/templates` (privado da TASK-12 quando existir).
- Reutilizar `registry/new-york-v4/ui` e `components/ui`; campos via controllers da TASK-02.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/private/patient/{profile,onboarding}`.
- Middleware `_auth` (Bearer + `x-device`).
- Respostas e traduções padrão; Prisma conforme `DATA-MODEL.md`.

Packages permitidos nesta task:

- TanStack Query, React Hook Form, Zod (frontend), Prisma (backend). Sem package novo sem ADR.

Regras anti-recriação específicas:

- Não criar client HTTP, store, auth flow, validator ou design system paralelo.
- Não persistir progresso só no cliente.
- Não usar `sample/` como referência direta.
- Não instalar package novo sem `PACKAGES.md` + ADR.

## Estados obrigatórios

- Loading da consulta de profile e da conclusão.
- Erro de rede/API em PT-BR.
- Estado "onboarding já concluído" (pula direto para Home).
- Sucesso com redirecionamento para a área privada.
- Responsividade mobile-first conforme imagens.

## Fora do escopo

- Implementar Home/busca/comunidade (tasks próprias).
- Criar dados fake, seed ou mock.
- Refatorar módulos não relacionados.

## Critérios de aceite

- [x] As referências visuais foram consultadas via Builder Quick Copy ou imagens locais citadas.
- [x] Onboarding em etapas com voltar/avançar e progresso.
- [x] Conclusão persiste em `patient_profile.onboarding_completed_at` via `PUT /api/private/patient/onboarding` real.
- [x] `GET /api/private/patient/profile` evita repetir o onboarding em re-login/outro device.
- [x] Endpoints privados exigem sessão e validam `role="paciente"`.
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
- [x] Campos usam a fundação da TASK-02.
- [x] Conclusão não fica apenas em localStorage/redux.
- [x] Nenhum mock, paciente fake ou seed artificial foi usado.
- [x] ADR criado/atualizado em `adrs/`.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` sem erros.
- [x] Browser local validou onboarding completo e o caso "já concluído".
- [x] Commit criado com mensagem convencional.

## Execucao TASK-08

- Builder/Quick Copy nao estava disponivel como ferramenta direta nesta sessao; foram usadas as imagens locais `_product/proto/Boas-vindas Paciente - 1.jpg`, `_product/proto/Boas-vindas Paciente - 2.jpg` e `_product/proto/Boas-vindas Paciente - 3.jpg`.
- Implementado `/patient/welcome` com UI mobile-first em 3 etapas: acolhimento, informacoes pessoais e escolha do objetivo.
- Campos de informacoes pessoais usam a fundacao da TASK-02 (React Hook Form, Zod, controllers `calendar` e `phone`); objetivo usa cards controlados pelo mesmo form.
- Criados `GET /api/private/patient/profile` e `PUT /api/private/patient/onboarding` em `backend/src/modules/api/private/patient/*`, sem criar modelo novo.
- Criado `requireRole("paciente")` fail-closed e aplicado no mount de `/api/private/patient/*` em `write.ts`, com reforco redundante nos services.
- A conclusao persiste `goal` e `onboarding_completed_at` em `patient_profile`; o `PUT` e idempotente quando o onboarding ja esta concluido.
- Redirecionamento de pacientes apos login/verificacao passa por `/patient/welcome`; se o profile ja estiver concluido, a rota pula para `/dashboard`.
- Como a TASK-12 ainda nao existe formalmente, foi usado o `PrivateTemplate` atual como shell minimo; a substituicao pelo shell privado mobile ficou registrada no ADR.
- ADR registrado: `adrs/0013-onboarding-boas-vindas-paciente.md`.
- Validacoes executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local em `http://localhost:3000/patient/welcome`
- A validacao criou usuarios temporarios por endpoints reais, testou profile, guard `403` para papel divergente, fluxo completo no browser, skip de onboarding ja concluido e removeu os registros ao final sem deixar dado fake permanente.

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build`.
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em `/patient/welcome`.

## Notas para executor

O onboarding só termina quando o backend confirma. Se o shell privado (TASK-12) ainda não existir, use um container mínimo e registre a dependência. Concluir em commit próprio.
