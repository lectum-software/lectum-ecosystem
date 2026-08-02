# TASK-111 - Cobertura e visibilidade no bloco Atividade e engajamento do psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-111 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-104, TASK-105, TASK-106, TASK-107, TASK-108, TASK-109, TASK-110 |
| ADR alvo | ADR-0374 |

## Contexto

Na aba `/psicologos/[id]?tab=estatisticas` do Admin, o bloco **Atividade e engajamento** ja exibia posts,
respostas, cobertura operacional por tipo de resposta da TASK-110 e sinais de engajamento recebido por
comunidade. O pedido de produto desta execucao refinou a leitura do bloco para:

1. adicionar **Taxa de cobertura** apos **Respostas**, indicando o percentual de posts de pacientes que o
   psicologo respondeu;
2. substituir a descricao fixa do bloco pelo periodo selecionado;
3. adicionar, ao lado do titulo, duas tags de diagnostico: atividade (**Muito ativo**, **Ativo**, etc.) e
   engajamento recebido (**Alto engajamento**, etc.);
4. adicionar **Visibilidade** antes de **Posts**, com unidade de tempo, e separar essa unidade em eixo vertical
   direito no grafico.
5. alterar a contabilizacao do card **Atividade** da secao **Conversao** de score ponderado para **acoes**,
   contando volume bruto de posts autorais e respostas criadas pelo psicologo, inclusive varias respostas no
   mesmo post.

Referencias consultadas:

- `_product/tasks/README.md`;
- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/DATA-MODEL.md`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`;
- screenshot enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a
descoberta de ferramentas nao retornou Builder/Quick Copy callable no ambiente Codex; a validacao visual usou a
imagem local, o screenshot e a rota local do Admin.

## Objetivo

Ampliar o bloco **Atividade e engajamento** com leitura temporal de visibilidade comunitaria, taxa de cobertura
de respostas a posts de pacientes, periodo selecionado e diagnosticos resumidos, e trocar o card **Atividade**
da secao **Conversao** para a leitura bruta de **acoes**, sem criar mocks, endpoint paralelo, schema Prisma,
migration ou package novo.

## Escopo backend

- Reutilizar `GET /api/admin/private/psychologists/:id/statistics`.
- Adicionar ao ponto de serie `coverage_rate_percent`.
- Adicionar em `community.cards`:
  - `community_visibility`, com `unit="seconds"` e valor real de `content_attention_session.attention_seconds`;
  - `coverage_rate`, com `unit="percentage"`, calculado como posts de pacientes cobertos por resposta do psicologo / posts de pacientes no recorte.
- Filtrar visibilidade comunitaria e cobertura pelo filtro local de comunidade quando informado.
- Preservar os contadores da TASK-110 (`patient_post_text_reply_coverage` e `patient_post_video_reply_coverage`).
- Trocar o valor de `business.cards.activity_score` para `posts_criados + respostas_criadas`, mantendo o id
  `activity_score` apenas por compatibilidade de contrato e alterando o label para **Atividade (acoes)**.
- Usar somente eventos reais: `content_attention_session`, `community_post` e `post_reply`.

## Escopo frontend/Admin

- Aplicacao Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Exibir **Visibilidade** antes de **Posts** no carrossel de contadores do bloco.
- Exibir **Taxa de cobertura** apos **Respostas**.
- Trocar a descricao fixa pelo resumo do periodo selecionado.
- Renderizar duas tags ao lado de **Atividade e engajamento**:
  - atividade por acoes brutas de posts autorais e respostas criadas;
  - engajamento recebido por votos, comentarios, salvamentos e compartilhamentos.
- Reutilizar `StatisticsSeriesChart`, mantendo a escala numerica no eixo esquerdo e usando o eixo direito para metricas temporais.
- Renomear o card/grafico de **Atividade (score)** para **Atividade (acoes)** na secao **Conversao** e usar
  `posts + replies` para valor atual, serie e comparativo.

## Fora do escopo

- Criar endpoint novo.
- Criar seed, mock, dado artificial ou backfill.
- Alterar pesos dos rankings publicos ou dashboards agregados.
- Ponderar Atividade por formato de resposta, video, cobertura ou qualidade.
- Criar schema Prisma, migration ou package novo.
- Redesenhar outros blocos da aba Estatisticas.

## Criterios de aceite

- [x] O contador **Visibilidade** aparece antes de **Posts** no bloco **Atividade e engajamento**.
- [x] **Visibilidade** usa unidade de tempo e vem de `content_attention_session.attention_seconds` real.
- [x] O grafico do bloco exibe a escala temporal de Visibilidade no eixo direito.
- [x] O contador **Taxa de cobertura** aparece apos **Respostas**.
- [x] **Taxa de cobertura** calcula o percentual de posts de pacientes do recorte que receberam resposta do psicologo.
- [x] A descricao fixa do bloco foi substituida pelo periodo selecionado.
- [x] O titulo **Atividade e engajamento** exibe duas tags: atividade e engajamento recebido.
- [x] A tag de atividade usa acoes brutas reais (`posts + replies`), sem ponderar cobertura ou video.
- [x] As tags usam somente sinais reais ja retornados pela API, sem mock.
- [x] O card **Atividade (score)** foi renomeado para **Atividade (acoes)**.
- [x] **Atividade (acoes)** conta `posts + replies`, incluindo varias respostas no mesmo post.
- [x] O comparativo de **Atividade (acoes)** usa a mesma regra no periodo anterior.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado quando disponivel, ou a limitacao foi registrada com fallback nas imagens locais/proprio screenshot.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0374-cobertura-visibilidade-atividade-engajamento-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir backend check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Smoke backend real via `showAdminPsychologistStatistics({ period: "all" })` para `cmrgztri7000tn0uh1q4n8vxf` - OK,
  retornando `community_visibility` com `unit="seconds"`, `coverage_rate` com `unit="percentage"` e serie com
  `coverage_rate_percent`.
- Browser local Admin em `localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` - HTTP 200.

## Notas de execucao

A cobertura e calculada com denominador real de posts publicados por pacientes no periodo e nas comunidades do
psicologo (ou na comunidade selecionada). Quando nao ha posts de pacientes no recorte, o contador permanece
indisponivel em vez de inventar uma taxa. A visibilidade do bloco considera somente atencao em conteudos autorais de
comunidade, pois perfil publico e video de apresentacao ja sao detalhados no bloco dedicado de **Visibilidade**.

Por decisao de produto nesta execucao, **Atividade** voltou a ser uma metrica bruta de volume de acoes. Cobertura,
video e qualidade permanecem como leituras separadas para analise posterior, sem aumentar a contagem de atividade.

## Complemento 2026-08-02 - tabela por comunidade

Pedido complementar do produto para a mesma superficie `/psicologos/[id]?tab=estatisticas`:

- a coluna **Engajamento** da tabela por comunidade deve usar copy de intensidade de engajamento recebido
  (**Alto engajamento**, **Engajamento padrao**, **Baixo engajamento**, **Sem engajamento**), em vez de
  **Muito engajado**/**Engajado**;
- as colunas **Posts** e **Respostas** devem exibir, abaixo do numero, a taxa real **Com video** e **Sem video**,
  calculada por comunidade com `community_post.media_type`, `community_post_media` e `post_reply.media_type`;
- o titulo do bloco **Atividade e engajamento por comunidade** deve exibir tambem a tag de atividade
  (**Muito ativo**, **Ativo**, etc.) calculada somente por `posts + replies` do periodo.

### Criterios complementares

- [x] A coluna **Engajamento** da tabela por comunidade usa labels **Alto engajamento**,
  **Engajamento padrao**, **Baixo engajamento** e **Sem engajamento**.
- [x] Cada linha exibe, em **Posts**, as taxas reais **Com video** e **Sem video** abaixo do total.
- [x] Cada linha exibe, em **Respostas**, as taxas reais **Com video** e **Sem video** abaixo do total.
- [x] As taxas por comunidade sao calculadas no backend com formatos reais de posts/respostas, sem mocks,
  seeds, backfill ou endpoint paralelo.
- [x] O titulo do bloco mostra uma tag de atividade calculada por `posts + replies` do periodo selecionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] ADR-0374 foi atualizado com a decisao complementar.

### Validacao complementar

- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Smoke backend real via `showAdminPsychologistStatistics({ period: "all" })` para
  `cmrgztri7000tn0uh1q4n8vxf` - OK, retornando `posts_video_rate`, `replies_video_rate` e labels
  **Alto/Padrao/Baixo/Sem engajamento**.
- Browser local Admin em `localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` - OK,
  com tag **Muito ativo** no titulo do bloco, taxas **Com video/Sem video** abaixo de Posts/Respostas e
  coluna **Engajamento** com a nova copy.
