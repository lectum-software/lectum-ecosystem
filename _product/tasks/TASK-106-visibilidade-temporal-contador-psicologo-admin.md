# TASK-106 - Visibilidade temporal no contador principal do psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-106 |
| Prioridade | P1 |
| Esforco | M |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-75, TASK-104, TASK-105 |
| ADR alvo | ADR-0370 |

## Contexto

Na aba `/psicologos/[id]?tab=estatisticas` do Admin, o contador **Visibilidade** do bloco principal
estava exibindo uma contagem derivada de `profile_view_event.source=profile_page+search_result`.
Essa leitura gerava numeros como `65` sem unidade temporal clara, embora as decisoes recentes do
produto para Visibilidade no Admin tenham migrado de pontuacao/eventos para tempo real de atencao.

Pedido de produto desta execucao: o contador **Visibilidade** deve deixar de comunicar eventos e
passar a exibir uma analise temporal, usando segundos reais ja persistidos pelos trackers first-party.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png` quando disponivel como
  fallback de leitura visual;
- screenshot de contexto enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao,
nao ha ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao visual usou as imagens
locais, o screenshot enviado e a rota local do Admin.

## Objetivo

Exibir **Visibilidade** como tempo de atencao no contador principal e no grafico temporal do bloco,
permitindo ao administrador entender a evolucao diaria/mensal da atencao recebida pelo psicologo no
periodo selecionado.

## Pre-requisitos e bloqueios

- Nao ha requisito externo novo.
- Nao ha package novo.
- Nao ha schema Prisma ou migration nova: a task usa `page_view_event.duration_seconds`,
  `content_attention_session.attention_seconds` e `profile_video_watch_session.watched_seconds`.
- A tela reutiliza o contrato real existente de `GET /api/admin/private/psychologists/:id/statistics`,
  adicionando campos ao DTO retornado.

## Escopo frontend

- Aplicacao Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Contrato tipado Admin: `admin/src/api/req/psychologists/index.ts`.
- Trocar a serie do contador **Visibilidade (tempo)** para `visibility_seconds`.
- Formatar valores em segundos como duracao legivel (`65s`, `1min 05s`, `1h 02min`).
- Manter o layout mobile-first e a navegacao horizontal dos cards.

## Escopo backend

- Modulo Admin existente de estatisticas do psicologo:
  `backend/src/modules/api/admin/private/psychologists/engagement`.
- Calcular `visibility_seconds` por dia a partir de dados reais:
  - duracao de visitas ao perfil publico (`page_view_event.duration_seconds`), excluindo autovisitas;
  - tempo assistido no video de apresentacao (`profile_video_watch_session.watched_seconds`);
  - tempo de atencao em posts/respostas autorais de comunidade (`content_attention_session.attention_seconds`).
- Retornar um card `visibility_signal` com `unit="seconds"`, valor total do periodo e comparativo com o
  periodo anterior.
- Preservar contadores antigos de `profile_views` e `search_results` como dados de suporte ja existentes,
  sem usa-los como unidade principal de Visibilidade.

## Fora do escopo

- Criar novos trackers.
- Criar banco/migration.
- Alterar ranking, donuts ou matrizes do dashboard `/psicologos`.
- Usar search result impression como tempo, pois essa fonte nao possui duracao real.
- Instalar package.
- Redesenhar o bloco principal alem da formatacao da metrica temporal.

## Contrato tecnico detalhado

Backend esperado:

- `AdminPsychologistStatisticsSeriesPoint` passa a expor `visibility_seconds: number`.
- `business.cards` passa a incluir `id="visibility_signal"`, `unit="seconds"` e `source` temporal real.
- A serie diaria usa os labels ja definidos por `resolvePeriod`; agregacoes longas continuam sendo
  consolidadas pelo helper de calendario do Admin.
- O comparativo usa a mesma janela anterior ja calculada para as demais metricas.
- Sem mocks, seeds ou endpoints simulados.

Frontend esperado:

- `BUSINESS_CHART_METRICS.visibility_signal.getValue` le `point.visibility_seconds`.
- `formatEngagementMetricValue` formata `unit="seconds"` como duracao humana.
- O grafico usa label temporal quando somente Visibilidade estiver selecionada e mantem escala numerica
  quando houver mistura de unidades.
- Nenhum `<img>` cru e nenhuma dependencia nova.

Packages usados:

- Nenhum package novo.

Regras de UI obrigatorias:

- Mobile-first preservado: os cards continuam com largura total no mobile (~390px) e grid/scroll
  progressivo em telas maiores.
- Tema claro/escuro por tokens existentes.
- Nenhum `<img>` cru.

## Criterios de aceite

- [x] O contador **Visibilidade (tempo)** exibe duracao legivel em vez de contagem de eventos.
- [x] O valor de Visibilidade vem de fontes temporais reais ja persistidas, sem mock.
- [x] O grafico temporal usa `visibility_seconds` para a linha de Visibilidade.
- [x] O comparativo do card usa o periodo anterior com a mesma unidade temporal.
- [x] `profile_views` e `search_results` permanecem no contrato como suporte, mas nao definem o valor principal do contador Visibilidade.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado quando disponivel, ou a limitacao foi registrada com fallback nas imagens locais/proprio screenshot.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0370-visibilidade-temporal-contador-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK; a primeira execucao terminou com exit 1 sem erro visivel no output, e a repeticao concluiu OK.
- `pnpm --dir admin build` - OK; a primeira tentativa encontrou outro `next build` em andamento, aguardamos finalizar e a repeticao concluiu OK.
- `pnpm check` - OK.
- Smoke backend real via `showAdminPsychologistStatistics` com primeiro psicologo ativo local - OK,
  retornando `visibility_signal.unit="seconds"`, `label="Visibilidade (tempo)"` e serie com
  `visibility_seconds`.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 e screenshot headless salvo em `.tmp/task106-admin-psychologist-stats-10s.png`; a sessao
  headless sem credenciais redirecionou para login, entao a validacao visual autenticada ficou limitada
  ao screenshot enviado pelo usuario e ao build local.

## Notas de execucao

A mudanca nao faz backfill. Perfis sem registros temporais recentes podem aparecer com `0s` ou sem
linha relevante de Visibilidade ate acumularem novas sessoes de perfil, video ou conteudo comunitario.
