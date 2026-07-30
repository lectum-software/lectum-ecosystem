# TASK-102: Distribuição de cliques WhatsApp por psicólogo no Dashboard Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-102 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin Analytics |
| Status | Completed |
| Dependências | TASK-48, TASK-76, TASK-94, TASK-16 |
| ADR alvo | ADR-0363 |

## Contexto

O Dashboard Admin em `/dashboard` já possui a seção **Visão geral** com período selecionável e, abaixo, os blocos executivos de comunidades e denúncias. O fundador solicitou adicionar, logo abaixo da **Visão geral**, uma leitura de concentração da distribuição dos cliques de WhatsApp por psicólogo, com a pergunta operacional: **X% dos cliques de WhatsApp estão indo para X% dos psicólogos?**

A métrica deve ser interna ao Admin, observacional e não pública. Ela precisa usar somente cliques reais persistidos em `contact_request.channel="whatsapp"`, respeitar o período selecionado no Dashboard e não adicionar filtros por cidade, especialidade, plano ou origem nesta versão.

Referências visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Dashboard.png`;
- captura enviada pelo usuário em 2026-07-30 mostrando o Dashboard atual em `http://localhost:3002/dashboard`, com o novo bloco solicitado abaixo da **Visão geral**.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, não há ferramenta Builder/Quick Copy callable no ambiente; a implementação deve usar as referências locais/exportadas e registrar essa limitação.

## Objetivo

Criar no Dashboard Admin, abaixo da **Visão geral**, um bloco mobile-first de **Distribuição dos cliques de WhatsApp** que mostre se os cliques estão equilibrados entre psicólogos ou concentrados em poucos perfis, recalculando tudo conforme o período selecionado.

## Pré-requisitos e bloqueios

- TASK-48 concluída: Dashboard Admin e endpoint `GET /api/admin/private/dashboard/summary` reais.
- TASK-76 concluída: presets e semântica de período do Admin.
- TASK-94 concluída: Dashboard sem o bloco removido de fluxo de intenção/conversão.
- TASK-16 concluída: contatos de WhatsApp persistidos em `contact_request`.
- Sem requisito externo novo.
- Sem package novo.
- Sem mudança prevista de banco, schema Prisma ou migrations.

## Escopo frontend

- Atualizar `admin/src/app/(admin)/dashboard/client.tsx` para renderizar o novo bloco logo após **Visão geral** e antes de **Atividade nas comunidades**.
- Exibir cards resumidos:
  - total de cliques de WhatsApp;
  - psicólogos considerados;
  - psicólogos sem clique;
  - share dos top 10%;
  - share dos top 20%.
- Exibir curva acumulada/Lorenz em SVG/CSS próprio, com linha de equilíbrio como referência e alternativa textual acessível.
- Respeitar o período do Dashboard já existente, sem criar filtro novo.
- Preservar UI mobile-first, cards empilhados no mobile e progressão para desktop.

## Escopo backend

- Expandir o contrato real de `GET /api/admin/private/dashboard/summary` com `whatsapp_click_distribution`.
- Calcular a distribuição com:
  - base de psicólogos ativos e publicados atualmente (`psychologist_profile.published=true`, `deleted=false`, `user.active=true`, `user.deleted=false`, `user.role="psicologo"`);
  - cliques reais em `contact_request.channel="whatsapp"`, `deleted=false`, dentro do período selecionado;
  - psicólogos sem clique incluídos na base com valor zero.
- Retornar curva acumulada, top 10%, top 20%, total de cliques, total de psicólogos, psicólogos com/sem clique e índice de concentração derivado.
- Preservar compatibilidade do restante do contrato do Dashboard.

## Fora do escopo

- Filtros por cidade, especialidade, plano, origem de tráfego, CRP ou status de assinatura.
- Ranking individual, lista nominal de psicólogos ou navegação para detalhe/lista.
- Normalização por visualização de perfil, exposição, posts ou favoritos.
- Tracking novo, backfill, seed, mock ou endpoint simulado.
- Biblioteca de gráficos externa.
- Alterar o schema Prisma ou criar migrations.

## Contrato técnico detalhado

Referências obrigatórias:

- `_product/tasks/ARCHITECTURE.md`: padrões de backend, API e UI mobile-first.
- `_product/tasks/DATA-MODEL.md`: `contact_request`, `psychologist_profile` e analytics first-party já existentes.
- `_product/tasks/PACKAGES.md`: sem package novo para gráficos.
- `_product/tasks/PROTO-INVENTORY.md`: referência visual do Dashboard Admin.

Backend esperado:

- Reutilizar o módulo existente `backend/src/modules/api/admin/private/dashboard/summary`.
- Reutilizar o resolver de período do Dashboard; sem endpoint paralelo.
- Adicionar métodos de repositório para listar psicólogos publicados e agrupar cliques WhatsApp reais por psicólogo no período.
- Calcular a curva acumulada a partir da distribuição ascendente de cliques por psicólogo.
- Calcular top 10% e top 20% usando ao menos 1 psicólogo quando houver base (`Math.ceil(total * percentual)`), para evitar segmento vazio em bases pequenas.
- Calcular Gini somente quando houver clique real; quando não houver clique, retornar concentração indisponível com mensagem honesta.

Frontend esperado:

- Reutilizar o caller/query key atual do Dashboard, apenas expandindo os tipos em `admin/src/api/req/dashboard/index.ts`.
- Renderizar o gráfico em SVG/CSS próprio no client do Dashboard.
- Não usar `<img>` cru; a task não precisa de `next/image` porque o gráfico é vetorial inline.
- Usar tokens/classes do Admin existentes (`bg-surface`, `border-border`, `text-muted`, `text-primary`, etc.).
- Campos do filtro de período existentes continuam locais e não são formulário de produto com submit; TASK-02 não se aplica a novo campo porque não há campo novo.

## Critérios de aceite

- [x] O Dashboard Admin renderiza o bloco **Distribuição dos cliques de WhatsApp** logo abaixo da **Visão geral**.
- [x] O bloco recalcula conforme o período selecionado no Dashboard, sem filtro adicional.
- [x] A API retorna `whatsapp_click_distribution` com dados reais de `contact_request.channel="whatsapp"` e base real de psicólogos ativos/publicados.
- [x] Psicólogos sem clique entram na base da distribuição com valor zero.
- [x] A UI exibe total de cliques, psicólogos considerados, psicólogos sem clique, top 10% e top 20%.
- [x] A curva acumulada/Lorenz é renderizada em SVG/CSS próprio, com linha de equilíbrio e resumo textual acessível.
- [x] Estados sem psicólogos ou sem cliques são honestos, sem simulação de dados.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy não estava callable; `_product/proto/admin/Dashboard.png` e a captura do usuário foram usadas como referência.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser local validou desktop e mobile 390px.
- [x] ADR criado em `adrs/0363-distribuicao-cliques-whatsapp-dashboard-admin.md`.
- [x] Commit criado e push executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local autenticado em `http://localhost:3002/dashboard`, validando:
  - bloco logo abaixo da **Visão geral**;
  - troca de período;
  - mobile ~390px;
  - desktop;
  - ausência de dados simulados.

## Notas de execução

- Não alterar `backend/prisma/schema.prisma` nem `backend/prisma/migrations`; `pnpm --dir backend db:migrate` não se aplica se esse escopo for mantido.
- A leitura é de saúde do marketplace e não deve ser exibida publicamente nem virar ranking individual.


## Execução TASK-102 (2026-07-30)

- Backend: o contrato `GET /api/admin/private/dashboard/summary` foi expandido com `whatsapp_click_distribution`, calculado a partir de `contact_request.channel="whatsapp"` no período selecionado e da base real de `psychologist_profile.published=true` com usuário ativo, não deletado e `role="psicologo"`.
- Frontend Admin: o bloco **Distribuição dos cliques de WhatsApp** foi inserido em `/dashboard` logo abaixo da **Visão geral**, antes de **Atividade nas comunidades**, com cards executivos e curva acumulada/Lorenz em SVG/CSS próprio.
- O período é o mesmo seletor do Dashboard; não foi criado filtro por cidade, especialidade, plano ou origem.
- Estados vazios permanecem honestos: no período padrão de 7 dias da base local não havia clique de WhatsApp, então o bloco exibiu mensagem de ausência sem simular dados; em **Todo o período**, a API/local browser renderizou a curva com 24 cliques reais, 14 psicólogos considerados, 13 sem clique, top 10% e top 20% concentrando 100% dos cliques e Gini 0,929.
- O endpoint de exportação CSV existente passou a incluir linhas agregadas de `whatsapp_click_distribution`; a UI continua sem botão de exportação, conforme ajustes anteriores do Dashboard.
- Builder/Quick Copy não estava exposto como ferramenta callable; referências usadas: `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Dashboard.png` e a captura enviada pelo usuário.
- Não houve alteração em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` não se aplica.
- Admin temporário real `codex-task102-validation@lectum.local` foi criado para validação browser, usado via login real e removido do banco ao final.

## Validação executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/dashboard/summary/DTOs/IAdminDashboardSummaryDTO.ts" "src/modules/api/admin/private/dashboard/summary/repositories/interfaces/IAdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/repositories/AdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/use-cases/services.ts" "src/modules/api/admin/private/dashboard/export/use-cases/services.ts"`: OK.
- `pnpm --dir admin exec biome check --write "src/api/req/dashboard/index.ts" "src/app/(admin)/dashboard/client.tsx"`: OK.
- `pnpm --dir backend check`: OK.
- `pnpm --dir admin check`: OK.
- Smoke direto do service `buildDashboardSummary({ period: "7d" })`: OK, retornou `whatsapp_click_distribution` com 14 psicólogos e 0 cliques no período padrão local.
- Smoke direto do service `buildDashboardSummary({ period: "all" })`: OK, retornou 24 cliques, 14 psicólogos, 13 sem clique, top 10%/top 20% com 100% e Gini 0,929.
- HTTP local autenticado em `GET http://localhost:3001/api/admin/private/dashboard/summary?period=all`: OK, confirmou `whatsapp_click_distribution` no servidor local.
- `pnpm --dir backend build`: OK.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`: OK.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`: OK.
- Browser local/headless autenticado em `http://localhost:3002/dashboard`: OK em desktop 1366px e mobile 390px, sem overflow horizontal, com ordem de títulos **Visão geral** → **Distribuição dos cliques de WhatsApp** → **Atividade nas comunidades** → **Denúncias pendentes**.
- Browser local/headless em **Todo o período**: OK, renderizou a curva acumulada em SVG e o resumo `Top 20% (3 psicólogos) concentram 100% dos cliques de WhatsApp no período.` Evidências locais: `.tmp/dashboard-admin-task102-validation/desktop-1366.png`, `.tmp/dashboard-admin-task102-validation/desktop-1366-all-period.png` e `.tmp/dashboard-admin-task102-validation/mobile-390.png`.

## Observações

- A base desta V1 é "psicólogos ativos e publicados atualmente"; não reconstrói histórico de publicação para períodos passados.
- A métrica é agregada e interna ao Admin; não cria ranking individual nem altera exposição pública dos psicólogos.
