# TASK-12: Shell privado mobile

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-12 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Infra UI |
| Status | Pending |
| Dependências | TASK-06, TASK-08 ou TASK-11 |
| ADR alvo | ADR de navegação privada mobile |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Psicólogos.jpg` | `figma-design-frame-15-Psic-logos.html` |
| `_product/proto/Feed Comunidade.jpg` | `figma-design-frame-3-Feed-Comunidade.html` |
| `_product/proto/Notificações.jpg` | `figma-design-frame-17-Notifica--es.html` |
| `_product/proto/Perfil do paciente.jpg` | `figma-design-frame-30-Perfil-do-paciente.html` |
| `_product/proto/Perfil - Psicólogo.jpg` | `figma-design-frame-19-Perfil---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

As telas internas compartilham topo, fundo, cards e navegação inferior. Esta task evita recriar layout por página e reduz risco de inconsistência visual.

## Objetivo

Criar o shell privado mobile-first com navegação, proteção e áreas por perfil, servindo de base para todas as telas internas.

## Pré-requisitos e bloqueios

- Depende de sessão real e ao menos um perfil cadastrado.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Prefixo canônico das telas privadas: `/app` (ver `DATA-MODEL.md`, "Convenção de rotas"). Esta task define esse prefixo e as tasks seguintes o reaproveitam. A navegação inferior segue o PRD §6 (Psicólogos, Favoritos, Comunidade, Notificações, Perfil).

Rotas esperadas:

- `/app`
- `/app/psychologists`
- `/app/community`
- `/app/notifications`
- `/app/profile`

Implementação esperada:

- Criar/ajustar `frontend/src/templates/private` com header, bottom nav e container responsivo.
- Integrar `proxy.ts` e sessão persistida sem loops.
- Ramificar a navegação por `user.role` (`"paciente" | "psicologo"`, ver `DATA-MODEL.md`), lido da sessão hidratada via `GET /api/private/auth/hidrate`.
- Criar estados globais de carregamento de sessão e fallback de rota.
- Garantir que cada item da navegação use ícone `lucide-react`.

## Escopo backend

Implementação esperada:

- Reusar o endpoint de sessão real `GET /api/private/auth/hidrate`, que já retorna `user`. Não inventar `/me`.
- O shell lê `user.role` (ver `DATA-MODEL.md`, "Decisão estrutural") da sessão hidratada para ramificar a navegação entre paciente e psicólogo.
- Não criar endpoint de shell sem necessidade; usar contrato de sessão existente.
- Se o shell precisar de flags de onboarding (`patient_profile.onboarding_completed_at`) ou status profissional (`psychologist_profile.crp_status`/`published`), expô-los no payload de `hidrate` ou via endpoint da TASK-08/11 — sem inventar campos além do que `DATA-MODEL.md` define.

Guarda de papel (estabelecer aqui — ver `DATA-MODEL.md`, "Camadas de autenticação e autorização", e `adrs/0002-arquitetura-auth-roles.md`):

- Criar o middleware `requireRole(...)` (fail-closed: papel divergente → `403`), aplicado **depois** do `_auth`.
- Aplicá-lo **por namespace no mount** em `backend/src/main/server/imports/write.ts`: `/api/private/psychologist/*` → `requireRole("psicologo")`; `/api/private/patient/*` → `requireRole("paciente")`; `/api/private/directory/*`, `/api/private/community/*`, `/api/private/posts/*`, notificações e conta → só `_auth`.
- A navegação por `user.role` no frontend é apenas UX; a fronteira de segurança é o middleware no servidor.
- Adicionar check no boot que falhe se rota sob `/psychologist/*` ou `/patient/*` subir sem o `requireRole` correspondente.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `user` (campo `user.role`)
- `patient_profile`
- `psychologist_profile`

Endpoints esperados:

- GET `/api/private/auth/hidrate` (sessão real; retorna `user` com `role`)

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

- Next.js App Router
- Redux Persist
- TanStack Query
- lucide-react

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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Middleware `requireRole(...)` criado, fail-closed, aplicado por namespace no `write.ts` conforme `DATA-MODEL.md`/ADR-0002.
- [ ] Smoke test: token de paciente recebe `403` em rota psicólogo-only e vice-versa.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
