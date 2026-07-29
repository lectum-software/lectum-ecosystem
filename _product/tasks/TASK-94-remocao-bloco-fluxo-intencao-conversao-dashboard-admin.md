# TASK-94: Remocao do bloco Fluxo de intencao e conversao no Dashboard Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-94 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Admin Analytics |
| Status | Completed |
| Dependencias | TASK-93 |
| ADR alvo | ADR-0348 |

## Contexto

Apos a validacao visual do Dashboard Admin em localhost, o fundador solicitou remover o bloco **Fluxo de intencao e conversao** da rota /dashboard. O bloco vinha das TASK-91 a TASK-93 e ficava entre a **Visao geral** e os blocos de **Atividade nas comunidades** / **Denuncias pendentes**.

Referencias consultadas:

- _product/tasks/PROTO-INVENTORY.md;
- _product/proto/admin/Dashboard.png;
- captura enviada pelo usuario em 2026-07-29 mostrando o bloco **Fluxo de intencao e conversao** em /dashboard.

Builder/Quick Copy ativo: vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a. Nesta execucao, ele nao estava exposto como ferramenta callable; a referencia visual foi feita pela captura da conversa e pela imagem local/exportada citada no inventario.

## Objetivo

Remover o bloco **Fluxo de intencao e conversao** do Dashboard Admin, mantendo o restante do dashboard real, mobile-first e sem alteracao de contratos ou dados.

## Escopo frontend

- Remover a renderizacao do bloco **Fluxo de intencao e conversao** em admin/src/app/(admin)/dashboard/client.tsx.
- Remover os helpers, tipos locais, visualizacao de exemplo localhost e imports que existiam apenas para esse bloco.
- Manter a **Visao geral** seguida diretamente pelos blocos executivos ja existentes.
- Preservar layout mobile-first, sem tag img crua e sem criar componente, API client ou design system paralelo.

## Escopo backend

- Sem mudanca de backend, contrato de API, Prisma ou migrations.
- O campo intent_conversion_flow pode continuar sendo retornado por compatibilidade com o contrato Admin ate uma task futura decidir remover o calculo/contrato.

## Fora do escopo

- Alterar algoritmo, tracking, metricas ou classificacoes de intencao/conversao.
- Remover o bloco **Qualidade do trafego** do detalhe do psicologo.
- Criar seed, mock, backfill, endpoint simulado ou dados artificiais.
- Instalar package novo.
- Alterar schema Prisma ou migrations.

## Criterios de aceite

- [x] Dashboard Admin nao renderiza o titulo **Fluxo de intencao e conversao**.
- [x] Dashboard Admin nao renderiza o aviso **Exemplo visual local** nem matriz local de exemplo.
- [x] **Visao geral** permanece como primeiro bloco analitico e e seguida pelos blocos existentes de atividade/denuncias.
- [x] Codigo local do bloco removido nao deixa imports, hooks ou helpers sem uso.
- [x] UI permanece mobile-first e nenhuma tag img crua foi introduzida.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nao houve alteracao de banco/schema/migrations; db:migrate nao se aplica.
- [x] Nenhum package novo foi instalado.
- [x] Formularios/campos da TASK-02 nao se aplicam nesta task.
- [x] Builder/Quick Copy nao estava callable; imagem local de _product/proto/admin/Dashboard.png e captura do usuario foram usadas.
- [x] Checks/builds relevantes foram executados com as alteracoes da TASK-94 isoladas de mudancas externas ao escopo.
- [x] Browser local validou a ausencia do bloco em 390px e 1366px, sem overflow horizontal.
- [x] ADR criado em adrs/0348-remocao-bloco-fluxo-intencao-dashboard-admin.md.
- [x] Commit criado e push executado.

## Validacao minima

- pnpm --dir admin check
- NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build
- pnpm check (tentado; bloqueado por alteracoes backend fora do escopo reaparecendo no workspace durante a execucao)
- Browser local/headless autenticado em http://localhost:3002/dashboard, validando:
  - presenca de **Dashboard**, **Visao geral**, **Atividade nas comunidades** e **Denuncias pendentes**;
  - ausencia de **Fluxo de intencao** e **Exemplo visual local**;
  - ausencia de overflow horizontal em 390px e 1366px;
  - capturas .tmp/admin-dashboard-task94-mobile.png e .tmp/admin-dashboard-task94-desktop.png.

## Notas de execucao

- O pedido foi uma remocao visual do bloco no Dashboard Admin; por isso a API permaneceu compativel e sem migration.
- Para nao misturar escopos, alteracoes externas ja presentes/concorrentes no workspace foram isoladas temporariamente via stash durante validacoes e commit da TASK-94, e devem ser restauradas ao final da execucao.
- Admin temporario real codex-task94-validation-...@lectum.local foi criado com admin:bootstrap para validacao browser, usado via login real e removido do banco ao final.
