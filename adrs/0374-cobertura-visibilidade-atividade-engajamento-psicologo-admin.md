# ADR-0374: Cobertura e visibilidade temporal no bloco Atividade e engajamento

## Status

Accepted

## Task relacionada

TASK-111

## Contexto

O bloco **Atividade e engajamento** do detalhe administrativo do psicologo precisava mostrar sinais de operacao
comunitaria alem de volume bruto de posts/respostas: tempo real de atencao nos conteudos autorais, taxa de
resposta a posts de pacientes, periodo selecionado e diagnosticos resumidos no titulo.

A tela ja possuia um bloco dedicado de **Visibilidade** para perfil/video/comunidade. Para nao duplicar superficies
nem misturar fontes sem unidade temporal, o bloco de Atividade deve limitar sua nova Visibilidade aos conteudos de
comunidade. A TASK-110 tambem introduziu cobertura por tipo de resposta; esta ADR preserva esses contadores e adiciona
a leitura percentual solicitada pelo produto.

Durante a revisao da regra, o produto decidiu que **Atividade** nao deve medir qualidade, formato ou cobertura
ponderada. Esses sinais explicam a atividade, mas nao devem inflar a quantidade de atividade. A contagem principal
deve mostrar volume bruto de acoes reais do psicologo.

## Decisao

- A **Visibilidade** do bloco **Atividade e engajamento** usa somente `content_attention_session.attention_seconds` de
  posts/respostas autorais do psicologo, respeitando o filtro local de comunidade.
- A **Taxa de cobertura** e calculada como `posts de pacientes com ao menos uma resposta do psicologo / posts de
  pacientes` no periodo selecionado e nas comunidades do psicologo, ou na comunidade selecionada.
- Quando nao ha denominador real de posts de pacientes, a taxa fica indisponivel em vez de usar `0%` artificial.
- **Atividade** deixa de ser exibida como score ponderado e passa a ser exibida como **Atividade (acoes)**,
  calculada por `posts_criados + respostas_criadas`.
- Respostas extras no mesmo post contam como acoes adicionais, porque representam participacao real.
- Video, cobertura e qualidade de resposta permanecem metricas separadas/auxiliares; nao aumentam o contador bruto
  de Atividade.
- O id interno `activity_score` e preservado no contrato de `business.cards` por compatibilidade entre backend e
  Admin, mas o label, o valor, a serie e o comparativo passam a representar acoes brutas.
- O grafico reutiliza `StatisticsSeriesChart`: metricas numericas permanecem no eixo esquerdo e metricas em segundos
  usam o eixo direito ja existente.
- As tags do titulo sao leituras operacionais derivadas dos contadores reais ja retornados pela API: atividade por
  posts/respostas e engajamento recebido por votos, comentarios, salvamentos e compartilhamentos.
- Complemento de 2026-08-02: a tabela **Atividade e engajamento por comunidade** tambem expõe a leitura de atividade
  no titulo do proprio bloco, calculada somente por `posts + replies` do periodo, para nao confundir volume de autoria
  com votos ou outros sinais de engajamento.
- Complemento de 2026-08-02: o contrato de `GET /api/admin/private/psychologists/:id/statistics` passa a retornar, em
  cada comunidade, `posts_video_rate` e `replies_video_rate`, com contagem e percentual **Com video**/**Sem video**
  derivados dos campos reais `community_post.media_type`, `community_post_media` e `post_reply.media_type`.
- Complemento de 2026-08-02: labels de engajamento do psicologo em comunidade usam copy de intensidade de engajamento
  recebido (**Alto engajamento**, **Engajamento padrao**, **Baixo engajamento**, **Sem engajamento**) em vez de
  adjetivar o profissional como engajado.
- Ajuste pos-feedback de 2026-08-02: o contador/card **Taxa de cobertura** deixa de aparecer no carrossel principal
  de **Atividade e engajamento** para reduzir ruido visual; a cobertura permanece disponivel como coluna detalhada da
  tabela por comunidade.
- Ajuste pos-feedback de 2026-08-02: o titulo principal **Atividade e engajamento** passa a exibir duas tags
  sinteticas, uma de atividade por `posts + replies` e outra de engajamento recebido com a mesma nomenclatura
  Alto/Padrao/Baixo/Sem engajamento usada na tabela.
- Ajuste visual de 2026-08-02: as tags do titulo principal deixam de renderizar icones internos e permanecem apenas
  com texto, preservando o diagnostico, a cor e a fonte real de dados.

## Consequencias

- O administrador passa a enxergar tempo, cobertura percentual e diagnosticos operacionais no mesmo bloco de comunidade.
- A cobertura nao faz backfill e pode aparecer indisponivel em recortes sem posts de pacientes.
- A visibilidade deste bloco nao inclui perfil publico nem video de apresentacao; essas superficies continuam no bloco
  **Visibilidade** dedicado.
- Os diagnosticos do titulo sao resumidos e nao alteram rankings, filtros publicos ou dashboards agregados.
- As novas taxas com/sem video sao percentuais descritivos por comunidade; quando nao ha posts ou respostas, a UI exibe
  ausencia de base em vez de inventar distribuicao.
- A remocao do card de taxa de cobertura nao remove o calculo nem o detalhe operacional; apenas evita duplicidade no
  topo do bloco.
- As tags no titulo principal usam os dados reais ja carregados pela aba Estatisticas, sem endpoint, mock, migration ou
  package adicional.
- Remover os icones das tags reduz ruido visual no cabecalho e nao altera contrato, fonte de dados, thresholds ou
  calculos de atividade/engajamento.
- A API preserva o endpoint existente, sem migration, package novo, seed ou backfill.
- A ADR-0373 fica superada para a metrica principal de Atividade; sua cobertura por tipo de resposta permanece
  disponivel apenas como sinal auxiliar.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke backend real de `showAdminPsychologistStatistics({ period: "all" })` confirmou `community_visibility`,
  `coverage_rate` e `coverage_rate_percent`.
- Smoke complementar de 2026-08-02 para `cmrgztri7000tn0uh1q4n8vxf` confirmou `posts_video_rate`,
  `replies_video_rate` e labels **Alto/Padrao/Baixo/Sem engajamento** por comunidade.
- Browser local Admin: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`.
- Browser local complementar de 2026-08-02 confirmou, na tabela por comunidade, tag **Muito ativo** no titulo,
  taxas **Com video/Sem video** em Posts/Respostas e a nova copy da coluna Engajamento.
- Browser local pos-feedback de 2026-08-02 em
  `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` confirmou cabecalho com tags
  **Muito ativo** e **Alto engajamento**, ausencia do contador **Taxa de cobertura** no carrossel principal e coluna
  **Engajamento** com **Alto engajamento**, **Engajamento padrao**, **Baixo engajamento** e **Sem engajamento**.
- Browser local do ajuste visual de 2026-08-02 confirmou que as tags **Muito ativo** e **Alto engajamento** no
  cabecalho principal renderizam somente texto, sem `svg` interno.

## Pendencias

- Nenhuma pendencia externa. Se o produto quiser benchmarkar as tags por percentis da plataforma, deve abrir task
  propria para contratar thresholds/benchmark especificos.
