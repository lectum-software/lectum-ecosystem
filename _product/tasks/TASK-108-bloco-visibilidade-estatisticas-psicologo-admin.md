# TASK-108 - Bloco Visibilidade nas estatisticas do psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-108 |
| Prioridade | P1 |
| Esforco | M |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-75, TASK-104, TASK-105, TASK-106, TASK-107 |
| ADR alvo | ADR-0372 |

## Contexto

Na aba `/psicologos/[id]?tab=estatisticas` do Admin, o bloco **Conversao** ja consolida sinais de
conversao e a TASK-107 separou a escala temporal de Visibilidade dentro do grafico principal. O pedido de
produto desta execucao adiciona, imediatamente apos **Conversao**, um bloco dedicado de **Visibilidade**
para detalhar o tempo por superficie e complementar a leitura com contadores de visualizacoes/aberturas.

Pedido de produto desta execucao:

1. Criar um bloco **Visibilidade** apos o bloco **Conversao**.
2. Exibir opcoes/contadores temporais: **Perfil**, **Video de apresentacao** e **Conteudo na comunidade**.
3. Cada metrica temporal deve compor um grafico de barras empilhadas.
4. A soma das barras deve formar um ponto acima e esses pontos devem desenhar uma curva ao longo do periodo.
5. A unidade de medida do bloco deve ser tempo.
6. Abaixo do grafico, exibir contadores de:
   - visualizacoes do video de apresentacao no explorar;
   - visualizacoes nos resultados de busca;
   - aberturas do perfil;
   - visualizacoes de conteudo.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- screenshot de contexto enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao,
nao ha ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao visual deve usar a imagem
local, o screenshot enviado e a rota local do Admin.

## Objetivo

Adicionar um bloco de Visibilidade com leitura temporal propria, usando dados reais ja capturados pela
plataforma, sem criar mock, seed ou endpoint paralelo. O bloco deve preservar a experiencia mobile-first
da aba de estatisticas.

## Pre-requisitos e bloqueios

- Nao ha requisito externo novo.
- Nao ha package novo.
- Nao ha schema Prisma ou migration nova.
- A task reutiliza eventos reais ja existentes:
  - `page_view_event.duration_seconds`;
  - `content_attention_session.attention_seconds`;
  - `profile_video_watch_session.watched_seconds`;
  - `profile_view_event`;
  - `page_view_event.target_type`.
- Limitacao de dominio: o historico atual nao persiste uma origem granular dedicada para diferenciar cada
  superficie de exibicao do video de apresentacao. Por isso, o contador **Video de apresentacao no
  explorar** usa sessoes reais de `profile_video_watch_session` filtradas para o video atual do perfil, sem
  inventar origem inexistente.

## Escopo backend

- Estender `GET /api/admin/private/psychologists/:id/statistics` com `business.visibility`.
- Retornar `business.visibility.cards` com metricas temporais:
  - `profile` em segundos;
  - `presentation_video` em segundos;
  - `community_content` em segundos.
- Retornar `business.visibility.series` por data com:
  - `profile_seconds`;
  - `presentation_video_seconds`;
  - `community_content_seconds`;
  - `total_seconds`.
- Retornar `business.visibility.counters` com:
  - `presentation_video_explore_views`;
  - `search_result_views`;
  - `profile_opens`;
  - `content_views`.
- Reutilizar helpers e repository methods existentes, sem criar estrutura paralela.

## Escopo frontend/Admin

- Aplicacao Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Inserir o bloco **Visibilidade** imediatamente depois de **Conversao**.
- Exibir tres cards/toggles temporais mobile-first.
- Desenhar grafico com barras empilhadas para as metricas selecionadas.
- Desenhar a curva da soma temporal acima das barras.
- Exibir labels temporais no eixo vertical usando `formatDurationSeconds`.
- Exibir os quatro contadores abaixo do grafico, em grid responsivo.

## Fora do escopo

- Criar endpoint novo.
- Criar seed, mock, backfill ou dado inventado.
- Alterar pesos de scores, classificacoes ou dashboards agregados de `/psicologos`.
- Criar origem historica retroativa para o video de apresentacao sem dado persistido.
- Instalar package.
- Alterar Prisma schema ou migrations.

## Contrato tecnico detalhado

Backend esperado:

- `business.visibility.source` deve explicitar as tabelas/campos usados.
- A serie temporal usa somente segundos de atencao/duracao reais.
- Os contadores de conteudo usam `page_view_event.target_type=post|reply` sobre conteudos autorais do
  psicologo no periodo selecionado.
- As comparacoes das tres metricas temporais usam o mesmo periodo anterior ja calculado pela API.

Frontend esperado:

- `VISIBILITY_CHART_METRICS` define as tres superficies temporais.
- `VisibilityStackedTimeChart` agrega pontos por calendario, empilha barras por metrica selecionada e
  desenha `buildSmoothSvgPath` para a soma.
- `VisibilityCountersGrid` renderiza os quatro contadores abaixo do grafico.
- Toggle nao permite ocultar todas as metricas disponiveis.

Packages usados:

- Nenhum package novo.

Regras de UI obrigatorias:

- Mobile-first preservado: cards e contadores ocupam uma coluna no mobile e progridem para grids maiores.
- Grafico mantem overflow horizontal controlado, sem quebrar a largura da tela.
- Tema claro/escuro por tokens existentes.
- Nenhum `<img>` cru.

## Criterios de aceite

- [x] O bloco **Visibilidade** aparece imediatamente apos o bloco **Conversao**.
- [x] O bloco exibe as opcoes temporais **Perfil**, **Video de apresentacao** e **Conteudo na comunidade**.
- [x] Cada opcao temporal forma uma barra empilhada por periodo.
- [x] A soma temporal das barras forma pontos acima e uma curva ao longo do periodo.
- [x] A unidade visual do bloco e tempo, com labels formatadas como duracao.
- [x] Abaixo do grafico aparecem os contadores de video no explorar, resultados de busca, aberturas do perfil e visualizacoes de conteudo.
- [x] Backend retorna `business.visibility` com cards, serie temporal, contadores e fonte tecnica.
- [x] Nenhum mock, seed, package novo, schema Prisma ou migration foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado quando disponivel, ou a limitacao foi registrada com fallback nas imagens locais/proprio screenshot.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0372-bloco-visibilidade-estatisticas-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 via `Invoke-WebRequest`; sem automacao autenticada para inspecionar o grafico renderizado, entao
  a validacao visual ficou limitada ao build, ao screenshot enviado pelo usuario e a imagem local de proto.

## Notas de execucao

- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, a task nao
  exige `pnpm --dir backend db:migrate`.
- Se no futuro o produto precisar separar visualizacoes de video por superficie exata, sera necessario
  persistir essa origem no evento de watch antes de recalcular historico.
