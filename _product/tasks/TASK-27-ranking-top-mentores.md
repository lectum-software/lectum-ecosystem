# TASK-27: Ranking Top Mentores

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-27 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-03, TASK-23 |
| ADR alvo | ADR de ranking e pontuação de mentores |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Top 5 Mentores da comunidade.jpg` | `figma-design-frame-20-Top-5-Mentores-da-comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Ranking não pode ser uma lista decorativa. A regra de pontuação precisa ser transparente e não confiar em flag enviada pelo frontend.

## Objetivo

Criar ranking real de mentores com pontuação documentada e baseada em eventos persistidos.

## Pré-requisitos e bloqueios

- BLOQUEIO RÍGIDO: o ranking é **derivado** (ver `DATA-MODEL.md` "Ranking de mentores") de `post_vote` (upvotes recebidos), participação e `professional_subscription` ativa. A fórmula de pontuação é **decisão externa** — sem ADR aprovando o cálculo, a task fica bloqueada e não pode ser concluída. Materializar `mentor_score_snapshot` só após a fórmula existir.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/top-mentors`

Implementação esperada:

- Criar tela Top 5 Mentores.
- Exibir posição, profissional, métricas que compõem pontuação e CTA para perfil.
- Mostrar vazio quando não houver dados suficientes.
- Não ordenar localmente dados incompletos.
- Usar query real.

## Escopo backend

Implementação esperada:

- Definir a fórmula de pontuação em ADR (bloqueio rígido — ver "Ranking de mentores" em `DATA-MODEL.md`).
- Endpoint de ranking por período/comunidade.
- Score derivado de eventos persistidos (`post_vote` upvotes, participação, `professional_subscription` ativa); nunca aceitar score vindo do frontend.
- Filtrar psicólogos com perfil publicado/aprovado (`psychologist_profile.published`).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `post_vote` (upvotes recebidos)
- `community_post` / `post_reply` (participação)
- `professional_subscription` (Plano Profissional ativo — PRD §10)
- `psychologist_profile`
- `mentor_score_snapshot` (opcional, só se materializar após a fórmula existir)

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community/top-mentors`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md`. As métricas que compõem a pontuação só podem ser retornadas após a fórmula ser aprovada em ADR.

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
- date-fns

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
- [x] Fórmula de pontuação aprovada em ADR antes de concluir (bloqueio rígido).
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
