# TASK-107 - Eixo direito de visibilidade e comparativos dos scores no psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-107 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-104, TASK-105, TASK-106 |
| ADR alvo | ADR-0371 |

## Contexto

Na aba `/psicologos/[id]?tab=estatisticas` do Admin, a TASK-106 converteu o contador **Visibilidade**
para tempo real (`visibility_seconds`). Em seguida, a leitura combinada no mesmo grafico passou a misturar
scores/contagens e duracao em uma escala unica, o que reduz a clareza visual da linha de Visibilidade.

Pedido de produto desta execucao:

1. Exibir o tempo de Visibilidade em eixo vertical separado, a direita do grafico principal.
2. Adicionar comparativo aos contadores **Engajamento (score)** e **Atividade (score)**, assim como os
   demais contadores do bloco.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- screenshot de contexto enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao,
nao ha ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao visual usou a imagem local,
o screenshot enviado e a rota local do Admin.

## Objetivo

Separar a escala temporal de Visibilidade da escala numerica dos demais contadores e completar a leitura
temporal dos scores derivados com comparativo contra o periodo anterior.

## Pre-requisitos e bloqueios

- Nao ha requisito externo novo.
- Nao ha package novo.
- Nao ha schema Prisma ou migration nova.
- A task reutiliza os DTOs reais ja retornados por `GET /api/admin/private/psychologists/:id/statistics`.

## Escopo frontend

- Aplicacao Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- No grafico principal do bloco **Conversao**, desenhar a serie `unit="seconds"` em escala independente no eixo direito.
- Manter os demais contadores em escala numerica no eixo esquerdo.
- Quando somente Visibilidade estiver selecionada, exibir apenas o eixo direito temporal.
- Calcular comparativo de **Engajamento (score)** a partir dos valores anteriores reais dos sinais
  `upvotes`, `comments_received`, `shares`, `saves` e `downvotes`.
- Calcular comparativo de **Atividade (score)** a partir dos valores anteriores reais de `posts` e `replies`.
- Reutilizar o componente existente `MetricComparisonLine`.

## Escopo backend

- Fora do escopo. O backend ja retorna os comparativos reais dos sinais de base e o periodo anterior.

## Fora do escopo

- Criar novo endpoint, seed, mock ou backfill.
- Alterar pesos dos scores.
- Redesenhar dashboards agregados de `/psicologos`.
- Instalar package.
- Alterar Prisma schema ou migrations.

## Contrato tecnico detalhado

Frontend esperado:

- `StatisticsSeriesChart` separa metricas `unit="seconds"` em `rightAxisKeys`.
- O eixo esquerdo usa o maior valor dos contadores/scores selecionados.
- O eixo direito usa o maior valor temporal selecionado e formata labels como duracao humana.
- Paths e pontos usam `yForMetric`, escolhendo a escala correta por unidade.
- O comparativo derivado segue a mesma regra percentual do backend: periodo anterior `0` gera `0%` quando
  atual tambem e `0`, e `sem base anterior` quando atual e maior que `0`.

Packages usados:

- Nenhum package novo.

Regras de UI obrigatorias:

- Mobile-first preservado: o grafico continua dentro de overflow horizontal com largura minima progressiva.
- Tema claro/escuro por tokens existentes.
- Nenhum `<img>` cru.

## Criterios de aceite

- [x] A linha de **Visibilidade (tempo)** usa eixo vertical separado a direita do grafico principal.
- [x] O eixo direito exibe labels de duracao e nao contagens numericas.
- [x] As demais metricas selecionadas continuam usando o eixo esquerdo numerico.
- [x] O card **Engajamento (score)** exibe comparativo contra o periodo anterior.
- [x] O card **Atividade (score)** exibe comparativo contra o periodo anterior.
- [x] Os comparativos dos scores usam somente sinais reais ja retornados pela API, sem mock.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado quando disponivel, ou a limitacao foi registrada com fallback nas imagens locais/proprio screenshot.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0371-eixo-direito-visibilidade-comparativos-scores-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local Admin em `localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` -
  HTTP 200 via `Invoke-WebRequest`; sem automacao autenticada para inspecionar o grafico renderizado, entao a
  validacao visual ficou limitada ao build, ao screenshot enviado pelo usuario e a imagem local de proto.

## Notas de execucao

A mudanca nao altera coleta nem historico. Se nao existir base anterior para os sinais usados nos scores,
o comparativo apresenta o mesmo comportamento dos demais contadores: `sem base anterior`.
