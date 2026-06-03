# TASK-14: Favoritos e seguindo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-14 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta |
| Status | Pending |
| Dependências | TASK-13 |
| ADR alvo | ADR de favoritos e seguindo |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Favoritos.jpg` | `figma-design-frame-21-Favoritos.html` |
| `_product/proto/Seguindo.jpg` | `figma-design-frame-16-Seguindo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Favoritos e seguindo aparecem como listas próprias. A implementação precisa diferenciar ações, atualizar contadores e refletir mudanças imediatamente no frontend.

## Objetivo

Permitir que pacientes favoritem e sigam psicólogos com persistência real e telas dedicadas.

## Pré-requisitos e bloqueios

- Depende da listagem real de psicólogos.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/favorites`
- `/app/following`

Implementação esperada:

- Adicionar botão favoritar/seguir nos cards (TASK-13) e no perfil profissional (`/app/psychologist/[id]`, TASK-15).
- Criar telas Favoritos e Seguindo no shell privado da TASK-12.
- Usar optimistic update apenas com rollback real em erro.
- Exibir estados vazio, loading e erro.
- Reutilizar card de psicólogo da TASK-13.

## Escopo backend

**Guarda de papel:** estes endpoints são exclusivos de paciente, vivem sob `/api/private/patient/*` e são protegidos por `requireRole("paciente")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`). O escopo de ownership usa `req.auth.id`. O **alvo** da ação (favoritar/seguir) é um psicólogo (`:id` = `user.id`), mas a ação é executada **pelo** paciente sob `/api/private/patient/...`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

Implementação esperada:

- Usar os modelos `psychologist_favorite` e `psychologist_follow` (modelos distintos — favoritar é diferente de seguir; ver `DATA-MODEL.md`), com unicidade `@@unique([user_id, psychologist_id])`.
- Endpoints para listar, criar e remover; listagens paginadas conforme o "Contrato padrão de API" do `DATA-MODEL.md` (`page`/`limit`).
- Garantir que usuário não favorite/siga profissional inexistente ou não publicado (`psychologist_profile.published`).
- Índices por usuário e profissional já previstos no `DATA-MODEL.md`.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_favorite`
- `psychologist_follow`

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`):

- GET `/api/private/patient/favorites`
- POST `/api/private/patient/favorites/:id` (`:id` = `user.id` do psicólogo alvo)
- DELETE `/api/private/patient/favorites/:id`
- GET `/api/private/patient/follows`
- POST `/api/private/patient/follows/:id` (`:id` = `user.id` do psicólogo alvo)
- DELETE `/api/private/patient/follows/:id`

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

- TanStack Query
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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas sob `/api/private/patient/*` exigem `requireRole("paciente")` (fail-closed), conforme ADR-0002.
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
