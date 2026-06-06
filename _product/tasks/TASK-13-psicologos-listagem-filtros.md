# TASK-13: Psicólogos: listagem e filtros

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-13 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Descoberta |
| Status | Completed |
| Dependências | TASK-02, TASK-12 |
| ADR alvo | ADR de descoberta de psicólogos |

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
| `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg` | `figma-design-frame-12-Filtros-de-Psic-logos---Servi-os-Expandidos.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A listagem é uma tela central para pacientes. Ela deve consultar backend real, filtrar por dados persistidos e não exibir profissionais fake.

## Objetivo

Implementar listagem real de psicólogos aprovados com busca, filtros e paginação.

## Pré-requisitos e bloqueios

- Sem psicólogos aprovados reais, a tela deve mostrar estado vazio, não seed fake.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/psychologists` (lista de descoberta, dentro do shell privado da TASK-12)
- Cada card aponta para o detalhe do perfil em `/app/psychologist/[id]` (TASK-15).

Implementação esperada:

- Criar tela `/app/psychologists` dentro do shell privado.
- Implementar busca, filtros expandidos, chips ativos, limpar filtros e paginação conforme o "Contrato padrão de API" do `DATA-MODEL.md` (`page`/`limit`).
- Filtros por taxonomia: `specialty`, `service` e `approach` (ver `DATA-MODEL.md`), além do filtro "verificados" (`psychologist_profile.cfp_verified_at` preenchido).
- Usar callers React Query e query keys dedicadas.
- Exibir vazio honesto quando não houver profissionais publicados.
- Não hardcodar cards de psicólogos.

## Escopo backend

Implementação esperada:

- Criar endpoint de listagem com paginação (`page`/`limit`, default 20, máx 50 — ver "Contrato padrão de API" do `DATA-MODEL.md`), busca e filtros.
- Retornar somente psicólogos publicados (`psychologist_profile.published = true`) e de `user` ativo (PRD §7: só ativos/verificados aparecem).
- Expor ordenação/exibição de `rating_avg`/`rating_count` (ver `DATA-MODEL.md`; `rating_avg` é nota ×100).
- Filtro "verificados" = `cfp_verified_at` não nulo.
- Usar catálogos `specialty`/`service`/`approach` e os joins `psychologist_specialty`/`psychologist_service`/`psychologist_approach` (ver `DATA-MODEL.md`).
- Adicionar índices para filtros frequentes conforme já previstos no `DATA-MODEL.md`.
- Não retornar dados sensíveis do profissional (`cpf`, `whatsapp`, campos de conta).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_profile` (`published`, `rating_avg`, `rating_count`, `cfp_verified_at`)
- `specialty` / `service` / `approach` (catálogos)
- `psychologist_specialty` / `psychologist_service` / `psychologist_approach` (joins)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticação e autorização" e ADR-0002):

- Estas são rotas de leitura caller-neutras, montadas sob `/api/private/directory/*`, guardadas apenas por `_auth` (qualquer autenticado) — **nunca** por `requireRole`. Pacientes precisam navegar/descobrir psicólogos, então a descoberta não pode ser psicólogo-only.
- Não usar `/api/private/psychologists` (confundível com a autogestão do psicólogo em `/api/private/psychologist/*`).
- Expor apenas campos PUBLIC-safe do `psychologist_profile`; nunca `cpf`, `whatsapp` ou campos de conta.

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`):

- GET `/api/private/directory/psychologists` (listagem paginada de descoberta, neutra, só `_auth`)

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
- @radix-ui/react-select candidato
- @radix-ui/react-checkbox candidato
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
- [x] Rotas de descoberta sob `/api/private/directory/*` usam só `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Execução

- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a validação visual
  usou as imagens locais obrigatórias `_product/proto/Psicólogos.jpg` e
  `_product/proto/Filtros de Psicólogos - Serviços Expandidos.jpg`.
- Backend criou `GET /api/private/directory/psychologists`, montado sob namespace neutro com apenas
  `_auth`, sem `requireRole`.
- Prisma criou os catálogos `specialty`, `service`, `approach` e os joins
  `psychologist_specialty`, `psychologist_service`, `psychologist_approach`, sem seed artificial.
- A listagem retorna somente `psychologist_profile.published = true`, usuário ativo e campos
  public-safe; `cpf`, `whatsapp`, e-mail e dados de conta não são expostos.
- Frontend implementou `/app/psychologists` mobile-first dentro do shell privado, com busca,
  filtros expandidos, chips ativos, limpar filtros, paginação, loading, erro, sucesso e vazio
  honesto.
- Busca e filtros usam a fundação da TASK-02 (`useFormList` e controllers), React Query, req/caller
  dedicados e query key `directory.psychologists`.
- ADR criado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validações executadas:
  - `pnpm --dir backend db:migrate --name add_directory_taxonomies`
  - `pnpm --dir backend db:generate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke de API real com paciente temporário removido ao final;
  - browser local headless em viewport mobile `390x844` com cookie real, sessão hidratada,
    estado vazio/lista real e bottom nav.

## Execução complementar: desktop e filtros em modal (2026-06-06)

- Pedido do usuário: adaptar `/app/psychologists` para desktop e fazer os filtros abrirem em modal.
- Builder/Quick Copy foi revalidado via `npx "@builder.io/dev-tools@latest" auth status`, mas o CLI retornou
  não autenticado nesta sessão; a execução manteve o fallback auditável das imagens locais obrigatórias da task.
- A tela permanece mobile-first com base nos protótipos `390px`, mas agora expande em desktop para `lg:max-w-6xl`,
  card de busca/filtros responsivo e grid de resultados em duas colunas.
- Os filtros avançados deixaram de abrir inline e passaram a abrir em modal com `role="dialog"`, `aria-modal`,
  fechamento por `Escape`/backdrop e foco inicial no botão de fechar, sem instalar pacote novo.
- A busca, filtros e switch continuam usando dados reais da URL/API e a fundação da TASK-02 (`useFormList` +
  controllers) para campos avançados.
- ADR atualizado: `adrs/0019-descoberta-psicologos-taxonomias.md`.
- Validações executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - browser local headless em viewport desktop `1440x1000`, com cookie real, sessão hidratada, `sectionWidth=1112`
    e modal de filtros aberta com largura `520px`; usuário temporário de validação removido ao final.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
