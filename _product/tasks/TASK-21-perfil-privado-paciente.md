# TASK-21: Perfil privado do paciente

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-21 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Paciente privado |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de perfil paciente privado |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Perfil do paciente.jpg` | `figma-design-frame-30-Perfil-do-paciente.html` |
| `_product/proto/Editar Perfil - Paciente.jpg` | `figma-design-frame-37-Editar-Perfil---Paciente.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Paciente precisa controlar dados básicos sem afetar autenticação sensível como e-mail/senha, que fica na task de configurações de conta.

## Objetivo

Criar perfil privado do paciente e edição de dados pessoais permitidos.

## Pré-requisitos e bloqueios

- Upload de avatar usa Cloudflare R2 (ADR-0006); sem credenciais/bucket no ambiente, manter avatar textual/initials e registrar pendência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/profile`
- `/app/profile/edit`

Implementação esperada:

- Criar tela de perfil e edição.
- Validar nome, telefone, preferências básicas e avatar se storage existir.
- Separar edição de conta de edição de perfil.
- Usar React Hook Form + Zod.
- Atualizar store/sessão quando nome/avatar mudarem.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Endpoints privados de leitura/atualização do perfil paciente.
- Validar telefone com `libphonenumber-js` quando aplicável.
- Não permitir editar role pelo frontend.
- Persistir campos de preferência reais.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `patient_profile` (campos `goal`, `birthdate`, `phone`, `bio`, `onboarding_completed_at`)
- `user` (`name`, `avatar`; nunca editar `role` pelo frontend)

Endpoints esperados (reusar o padrão de rotas da TASK-08, singular `patient`):

- GET `/api/private/patient/profile`
- PUT `/api/private/patient/profile`

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

- React Hook Form
- Zod
- libphonenumber-js
- Prisma

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
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.


## Registro de execução

- Referências visuais consultadas por imagens locais: `_product/proto/Perfil do paciente.jpg` e `_product/proto/Editar Perfil - Paciente.jpg`. Builder/Quick Copy não ficou exposto como ferramenta no ambiente desta sessão.
- Avatar por upload permanece pendente de bucket/credenciais Cloudflare R2 públicos definitivos; a UI mantém foto de login existente ou initials, sem mock de storage.
- ADR criado: `adrs/0031-perfil-privado-paciente.md`.
