# TASK-104 - Reorganizacao segura da aba Estatisticas do psicologo no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-104 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-72, TASK-75, TASK-76 |
| ADR alvo | ADR-0367 |

## Contexto

A aba `/psicologos/[id]?tab=estatisticas` ja possuia blocos validados para estatisticas de negocio,
video de apresentacao, origem do trafego, uso da plataforma, estatisticas de comunidade,
comunidades ativas, distribuicao por formato e horarios de maior atividade.

O pedido de produto foi reorganizar a narrativa da tela sem redesenhar tudo: preservar os blocos ja
bons, alterar a alocacao na tela e concentrar as mudancas reais nos blocos de Conversao,
Visibilidade, Engajamento e Atividade.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- screenshot de contexto enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
Nesta execucao, nao houve ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao
visual usou a imagem local exportada e a rota local do Admin.

## Objetivo

Reorganizar a aba Estatisticas do detalhe administrativo do psicologo com mudanca pequena,
reversivel e sem desconfigurar os blocos existentes.

## Pre-requisitos e bloqueios

- Nao ha requisito externo novo.
- Nao ha package novo.
- Nao ha schema Prisma, migration ou endpoint novo.
- O tempo real de visibilidade em perfil/conteudo ainda nao existe como contrato consolidado para
  este bloco; por isso, esta task usa somente sinais reais ja presentes na serie do endpoint e nao
  simula tempo.

## Escopo frontend

- Rota Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Reordenar a aba para priorizar:
  1. Conversao, visibilidade, engajamento e atividade;
  2. Atividade e engajamento;
  3. Atividade e engajamento por comunidade;
  4. Detalhes do video de apresentacao;
  5. Posts e respostas por formato;
  6. Origem do trafego;
  7. Horarios de maior atividade;
  8. Uso da plataforma.
- Manter os componentes existentes de video, origem do trafego, posts por formato, uso da plataforma
  e horarios de maior atividade como estavam, alterando apenas a posicao no JSX.
- Trocar as opcoes do bloco principal para quatro indicadores:
  - Cliques no WhatsApp;
  - Visibilidade;
  - Engajamento (score);
  - Atividade (score).
- Atualizar as opcoes de atividade/engajamento para:
  - Posts;
  - Respostas;
  - Upvotes recebidos;
  - Downvotes recebidos;
  - Comentarios recebidos;
  - Salvamentos recebidos;
  - Compartilhamentos recebidos.

## Escopo backend

- Sem alteracao backend.

## Fora do escopo

- Criar endpoint novo.
- Criar banco/migration.
- Reescrever componentes existentes de video, origem do trafego, uso da plataforma, posts por
  formato ou horarios.
- Simular tempo de visibilidade ainda nao persistido/contratado para este bloco.
- Criar dashboard de BI novo ou redesign completo.

## Contrato tecnico detalhado

Frontend esperado:

- Reutilizar `CardShell`, `StatisticsMetricCarousel`, `StatisticsMetricToggleCard`,
  `StatisticsSeriesChart`, `StatisticsVideoCard`, `PsychologistTrafficSourcesCard`,
  `PsychologistPlatformUsageCard`, `PsychologistPlatformActivityHoursCard`,
  `ActiveCommunitiesBlock` e `ContentFormatDistributionsBlock`.
- Permitir que o grafico leia metricas derivadas a partir da serie real ja retornada pelo endpoint,
  por `getValue(point)`, sem alterar o contrato HTTP.
- Scores derivados nesta task sao apenas leitura operacional no Admin:
  - Engajamento: upvotes, comentarios, compartilhamentos e salvamentos recebidos, com penalidade de
    downvotes, usando pesos ja praticados em ranking/engajamento comunitario.
  - Atividade: posts e respostas, com resposta mais forte que post.
- Mobile-first preservado pela manutencao do layout responsivo ja existente.

Packages usados:

- Nenhum package novo.

## Criterios de aceite

- [x] A aba coloca o bloco principal de Conversao/Visibilidade/Engajamento/Atividade no topo.
- [x] Os blocos existentes de video, origem do trafego, uso da plataforma, horarios e formato de
      conteudo foram preservados e apenas realocados.
- [x] O bloco principal exibe quatro opcoes: Cliques no WhatsApp, Visibilidade, Engajamento (score)
      e Atividade (score), sem endpoint novo.
- [x] O grafico principal usa valores reais ou derivados de series reais ja retornadas pelo backend.
- [x] O bloco de Atividade e Engajamento mostra Posts, Respostas, Upvotes recebidos, Downvotes
      recebidos, Comentarios recebidos, Salvamentos recebidos e Compartilhamentos recebidos.
- [x] A tabela de comunidades aparece logo apos Atividade e Engajamento e foi renomeada para
      Atividade e engajamento por comunidade.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration
      foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado via descoberta de ferramenta; como nao estava callable, a imagem
      local de `_product/proto` foi usada e a limitacao foi registrada.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0367-reorganizacao-estatisticas-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir admin biome:fix` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Dev server Admin temporario em `localhost:3002` com `GET /psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` - HTTP 200.
- Tentativa de screenshot via Chrome headless local: limitada por falta de sessao admin/headless,
  capturando apenas estado de carregamento ou falhando ao persistir arquivo. Nao foi usada como
  evidencia visual final.

## Notas de execucao

Esta task evitou alterar backend justamente para reduzir risco de regressao. Uma task futura pode
contratar e persistir tempo real de visibilidade em perfil, video e conteudos de comunidade antes de
exibir uma opcao explicitamente chamada **Visibilidade (tempo)**.

## Ajuste pos-feedback 2026-07-30 - Simplificacao do bloco Conversao

- Pedido do usuario: simplificar o titulo do bloco principal para **Conversao**, trocar a descricao
  longa pelo periodo selecionado, remover a faixa de diagnostico textual de dados insuficientes e
  adicionar **Avaliacoes** como contador apos **Atividade**.
- A alteracao e frontend-only e reaproveita `business.period` e a serie real ja retornada pelo
  endpoint Admin de estatisticas; `Avaliacoes` usa `professional_review`/`point.reviews`, sem novo
  contrato HTTP.
- O badge de qualidade individual ao lado do titulo foi preservado; somente a faixa abaixo do
  cabecalho foi removida para reduzir redundancia visual.
- O layout segue mobile-first: os contadores continuam em carrossel/scroll horizontal em telas
  estreitas e passam a comportar cinco cards visiveis em `2xl`.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; foram usados o
  screenshot enviado pelo usuario e o PNG local
  `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png` como referencias
  auditaveis.

### Criterios de aceite do ajuste

- [x] O titulo visivel do bloco principal e **Conversao**.
- [x] A descricao longa foi substituida pelo periodo selecionado no formato label + intervalo.
- [x] A faixa com **Dados insuficientes para avaliar a Conversao.** nao e mais renderizada no bloco.
- [x] O contador **Avaliacoes** aparece apos **Atividade** e usa a serie real de avaliacoes.
- [x] Nenhum mock, endpoint simulado, migration, schema Prisma ou package novo foi adicionado.

## Ajuste pos-feedback 2026-08-01 - Ordem de trafego, Conversao, Visibilidade e video

- Pedido do usuario: na aba **Estatisticas** do detalhe Admin do psicologo, colocar a tabela
  **Origem do trafego** antes de **Conversao** e posicionar **Analise do video de apresentacao**
  imediatamente abaixo de **Visibilidade**.
- A alteracao e frontend-only: somente a ordem dos componentes existentes foi alterada em
  `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Os componentes, contratos, dados reais, filtros globais de periodo e estados de carregamento foram
  preservados; nenhum endpoint, migration, package, seed, mock ou regra de calculo foi criado.
- O layout mobile-first foi preservado porque os mesmos cards/tabelas responsivos continuaram sendo
  reutilizados, apenas em nova posicao.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram o screenshot enviado pelo usuario e o PNG local
  `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.

### Criterios de aceite do ajuste

- [x] **Origem do trafego** aparece antes de **Conversao** na aba **Estatisticas**.
- [x] **Analise do video de apresentacao** aparece imediatamente abaixo de **Visibilidade**.
- [x] A ordem restante preserva os blocos de atividade/engajamento, formatos, horarios e uso da
      plataforma.
- [x] Nenhum mock, endpoint simulado, migration, schema Prisma ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm --dir backend check` apos uma primeira tentativa de `pnpm check` falhar de forma
  transiente no Windows logo depois de `prisma generate`, sem erro TypeScript emitido.
- `pnpm check` reexecutado com sucesso.
- Browser local/headless via Chrome/CDP em build Admin servido temporariamente em
  `http://127.0.0.1:3012/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`, com backend real
  em `localhost:3001` e admin temporario real removido ao final: desktop 1365px e mobile 390px
  confirmaram a ordem **Origem do trafego** -> **Conversao** -> **Visibilidade** -> **Analises do
  video de apresentacao** -> **Atividade e engajamento**, sem overflow horizontal no mobile.
  Screenshots: `.tmp/admin-psychologist-stats-order-desktop.png` e
  `.tmp/admin-psychologist-stats-order-mobile.png`.

## Ajuste pos-feedback 2026-08-01 - Origem do trafego no formato expansivo do dashboard

- Pedido do usuario: na aba **Estatisticas** do detalhe Admin do psicologo, a tabela **Origem do trafego** deve ter o mesmo layout da tabela do dashboard Admin de psicologos, inclusive com grupos expansivos **Comunidades**, **Perfil** e **Video de apresentacao**.
- O backend passou a montar `traffic_sources` do detalhe com o mesmo contrato real do dashboard (`important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click`), porem escopado ao psicologo aberto e com somatorias dos seus sinais de engajamento/conversao por origem.
- A UI do detalhe reutiliza o padrao visual do dashboard: coluna **Fonte**, coluna **WhatsApp**, linha principal expansiva, detalhamento mobile-first e breakdown de autoria quando aplicavel. A coluna antiga **Perfil** foi removida da tabela do detalhe.
- Nenhum mock, seed, package novo, schema Prisma ou migration foi criado; os dados continuam vindo de eventos first-party reais (`important_action_event`, `page_view_event`, `content_attention_session`, `profile_video_watch_session` e eventos de comunidade/perfil ja existentes).
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram os screenshots enviados pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.

### Criterios de aceite do ajuste

- [x] **Origem do trafego** no detalhe do psicologo usa o layout expansivo do dashboard de psicologos.
- [x] A tabela tem grupos expansivos **Comunidades**, **Perfil** e **Video de apresentacao**.
- [x] O cabecalho desktop mostra somente **Fonte** e **WhatsApp**, sem a coluna antiga **Perfil**.
- [x] O detalhamento mostra a somatoria dos dados de engajamento/conversao do psicologo por origem.
- [x] A versao mobile mantem os cards expansivos e nao gera overflow horizontal.
- [x] Nenhum mock, endpoint simulado, package novo, schema Prisma ou migration foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx"`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke API real em `GET /api/admin/private/psychologists/cmrgztri7000tn0uh1q4n8vxf/statistics?period=all&from=2026-07-11&to=2026-08-01`: confirmou `traffic_sources.source=important_action_event.action_type=whatsapp_click+psychologist_video_whatsapp_click`, origens de comunidades/perfil/video e `platform_metrics` preenchidos com somatorias do psicologo.
- Browser local/headless com Admin em `http://localhost:3002` e backend real em `localhost:3001`: desktop 1365px e mobile 390px confirmaram grupos expansivos **Comunidades**, **Perfil** e **Video de apresentacao**, ausencia de coluna **Perfil** no cabecalho desktop, detalhamento de sublinhas e ausencia de overflow mobile. Screenshots: `.tmp/admin-psychologist-traffic-detail-desktop.png` e `.tmp/admin-psychologist-traffic-detail-mobile.png`.