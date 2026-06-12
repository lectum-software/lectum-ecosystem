# TASK-22: Explorar e sugerir comunidades

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-22 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de comunidades e sugestões |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Explorar Comunidades.jpg` | `figma-design-frame-9-Explorar-Comunidades.html` |
| `_product/proto/Sugerir Comunidade.jpg` | `figma-design-frame-23-Sugerir-Comunidade.html` |
| `_product/proto/Confirmação de Sugestão de Comunidade.jpg` | `figma-design-frame-33-Confirma--o-de-Sugest-o-de-Comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Comunidades são eixo do produto. Sugestões devem virar registros pendentes, não criar comunidades públicas automaticamente sem regra.

## Objetivo

Permitir explorar comunidades reais e sugerir novas comunidades para moderação.

## Pré-requisitos e bloqueios

- Categorias iniciais são catálogo curado decidido em `TASK-03`/seed real (campo `community.category`, ver `DATA-MODEL.md`), nunca inventadas nem mock invisível.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community`
- `/app/community/suggest`
- `/app/community/suggest/success`

Implementação esperada:

- Criar listagem de comunidades com busca/categorias.
- Criar formulário de sugestão.
- Criar confirmação de sugestão.
- Exibir estados vazios reais.
- Usar cards reutilizáveis e shell privado.

## Escopo backend

Implementação esperada:

- Modelos de comunidade e sugestão conforme `DATA-MODEL.md` (sem inventar campos).
- Endpoint de listagem de comunidades.
- Endpoint para sugerir comunidade com status inicial `pendente` (`community_suggestion.status`).
- Não publicar sugestão automaticamente sem ADR/regra.
- Índices conforme `DATA-MODEL.md` (`community` por `slug` e `category`; `community_suggestion` por `status`).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community`
- `community_suggestion`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community`
- POST `/api/private/community/suggestions`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — listagem paginada (`page`/`limit`, resposta `data: { items, total, page, limit }`) e envelope de sucesso/erro padrão.

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

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
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
