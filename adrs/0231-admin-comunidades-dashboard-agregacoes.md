# ADR-0231: Agregacoes administrativas de comunidades sem moderacao V1

## Status

Accepted

## Contexto

A TASK-51 implementa o Dashboard administrativo de Comunidades com base na referencia visual `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`. O objetivo e dar visao operacional de atividade, engajamento e risco sem antecipar a edicao de comunidades, regras ou moderacao, que ficam para tasks posteriores.

O Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao estava disponivel como ferramenta MCP nesta execucao; a imagem local exportada foi usada como referencia visual auditavel.

## Decisao

- Criar o endpoint admin privado `GET /api/admin/private/communities/dashboard` para agregar dados reais de comunidades.
- Reutilizar exclusivamente modelos existentes: `community`, `community_member`, `community_post`, `post_reply`, `post_report`, `post_vote`, `post_save` e `user.role`.
- Manter periodo padrao de 7 dias, limite maximo inicial de 90 dias e validacao `from <= to`.
- Calcular cards por papel do autor:
  - posts de psicologos a partir de `community_post.author.role=psicologo`;
  - posts de pacientes a partir de `community_post.author.role=paciente`;
  - respostas de psicologos a partir de `post_reply.author.role=psicologo`;
  - comentarios de pacientes a partir de `post_reply.author.role=paciente`;
  - membros ativos por usuarios distintos com atividade real no periodo, cruzados com `community_member`.
- Derivar posts anonimos vs identificados pelo campo real `community_post.anonymous` somente para posts de pacientes.
- Derivar status de discussao de cada post por `replies_count > 0`, sem criar novo status.
- Derivar severidade de alertas pendentes por regra deterministica sobre `post_report.reason` e `target_type`: violencia, autolesao, odio, ameaca e abuso sao alta; conteudo inadequado, ofensa, desrespeito, desinformacao, assedio e denuncia de comentario sao media; demais motivos, incluindo spam quando isolado, sao baixa.
- Manter a rota de detalhe `/comunidades/[slug]` como placeholder honesto da TASK-52 para permitir navegacao a partir do dashboard sem antecipar edicao/moderacao.
- Nao instalar pacotes novos de grafico/tabela: a tela usa SVG/CSS e tabelas responsivas simples.

## Consequencias

- O Admin passa a ter visao real de atividade de comunidades sem seeds, mocks ou endpoint simulado.
- A severidade e operacional, derivada e revisavel; caso a moderacao precise de severidade persistida ou workflow de tratamento, nova task/ADR deve evoluir `post_report`.
- A contagem de membros ativos depende de eventos de atividade existentes e de membership ativo; usuarios sem atividade no periodo nao entram nesse card.
- O detalhe da comunidade ainda nao edita nem modera; a navegacao existe para preservar o fluxo visual e sera substituida pela TASK-52.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke API com admin real transitorio:
  - login admin;
  - `GET /api/admin/private/communities/dashboard?from=2026-07-03&to=2026-07-09`;
  - conferencia de periodo, cards, series, breakdown, posts recentes e ranking de comunidades;
  - limpeza do admin/token transitorio.
- Browser local com admin real:
  - abertura da rota `/comunidades`;
  - validacao mobile (~390px), tablet (768px) e desktop;
  - abertura de detalhe `/comunidades/[slug]`.

## Task relacionada

- TASK-51

## Atualizacao 2026-07-17: dashboard sem coluna lateral de alertas

O dashboard `/comunidades` deve caber na largura util da tela sem rolagem horizontal global. A coluna lateral com **Alertas de prioridade** e **Moderacao automatica** estava competindo por largura com grafico e tabelas, gerando overflow em desktop.

A decisao e remover esses dois blocos do dashboard de visao geral, mantendo a operacao de denuncias e moderacao automatica nas experiencias dedicadas existentes. O dashboard de comunidades passa a priorizar atividade, distribuicao de posts de pacientes, postagens recentes e principais comunidades.

Consequencia: a tela fica mais enxuta e responsiva. O grafico escala dentro do card, tabelas usam apresentacao mobile-first em cards no mobile e `table-fixed` no desktop, e a contencao `min-w-0`/`overflow-x-hidden` fica local ao dashboard. Nao ha alteracao de endpoint, schema Prisma, migration, dependencia, mock ou regra de agregacao.

## Atualizacao 2026-07-17: estatisticas globais de pessoas e conteudo

O dashboard geral de comunidades passa a reutilizar o conceito dos blocos de estatisticas da aba de uma comunidade, mas com agregacao global sobre todas as comunidades ativas. A decisao e expor no contrato do dashboard os objetos `global_statistics.current` e `global_statistics.previous`, mantendo o endpoint unico da visao geral em vez de criar uma rota paralela apenas para cards e graficos.

As estatisticas globais usam somente dados persistidos existentes: `community_member`, `community_post`, `post_reply`, `post_report`, `post_vote`, `post_save`, `post_reply_save`, `page_view_event` e `important_action_event`. Para o bloco de pessoas, seguidores sao contados por usuario unico que segue ao menos uma comunidade, evitando inflar a metrica quando a mesma pessoa participa de varias comunidades; atividade e novos ativos tambem sao por usuario unico no periodo. Para conteudo, as contagens permanecem agregadas por evento/conteudo real.

A UI renderiza cards selecionaveis e grafico SVG/CSS proprio, sem pacote de charts e sem rolagem horizontal global. Os blocos laterais de alertas removidos no ajuste anterior continuam fora do dashboard; denuncias e moderacao seguem em fluxos dedicados.

Consequencias: o contrato do dashboard fica maior, mas evita requests extras e garante que filtros de periodo e comparacao com periodo anterior sejam consistentes entre cards, graficos e os demais indicadores da pagina. Nao houve schema Prisma, migration, pacote novo, mock ou seed.

## Atualizacao 2026-07-17: remocao dos cards legados de visao geral

Apos a inclusao dos blocos globais de **Estatisticas de pessoas** e **Estatisticas de conteudo**, os cinco cards legados do topo do dashboard (`psychologist_posts`, `patient_posts`, `psychologist_replies`, `patient_comments` e `active_members`) passaram a duplicar informacao e alongar a pagina antes das estatisticas principais.

A decisao e remover a renderizacao desses cards do dashboard `/comunidades`, mantendo os dados no contrato atual do endpoint para compatibilidade e para nao alterar agregacoes existentes nesta correcao visual. A visao principal da pagina passa a iniciar pelos blocos globais de estatisticas.

Consequencia: a interface fica mais direta e com menor redundancia visual, sem mudanca de backend, schema Prisma, migration, pacote novo, mock ou seed.

## Atualizacao 2026-07-17: paridade visual dos blocos globais com o detalhe da comunidade

Os blocos globais de estatisticas do dashboard `/comunidades` devem seguir o mesmo padrao de interacao visual da aba de estatisticas do detalhe da comunidade para reduzir divergencia entre visao geral e visao por comunidade.

A decisao e manter os mesmos dados globais ja expostos por `global_statistics`, mas renderizar os contadores como toggles selecionados por default, sem descricao individual nos cards. O bloco de pessoas usa grid, enquanto o bloco de conteudo usa carrossel horizontal com botoes laterais, seguindo o comportamento existente no detalhe. O grafico tambem passa a usar linhas suavizadas e area isolada, mantendo os pontos e titulos acessiveis.

Consequencia: ha maior consistencia visual e menos redundancia textual, sem alterar backend, contrato persistido, Prisma, pacotes ou regras de agregacao. A rolagem horizontal permanece restrita aos componentes interativos que exigem esse comportamento, evitando overflow global da pagina.

## Atualizacao 2026-07-18: remocao dos blocos legados de atividade e posts de pacientes

O dashboard geral `/comunidades` deixa de renderizar os blocos **Atividade nas comunidades** e **Posts de pacientes**.

A decisao e tratar esses dois cards como visualizacao legada depois que os blocos globais de **Estatisticas de pessoas** e **Estatisticas de conteudo** passaram a concentrar a leitura analitica principal. O grafico legado de atividade duplicava a evolucao temporal de conteudo, enquanto o donut de posts de pacientes duplicava a quebra anonimos/identificados ja exposta no contador de postagens de pacientes dentro de **Estatisticas de conteudo**.

O contrato do endpoint `GET /api/admin/private/communities/dashboard` permanece inalterado para compatibilidade e para evitar mudanca de backend desnecessaria em uma correcao apresentacional. A interface passa a sequenciar **Postagens mais recentes** e **Principais comunidades** diretamente apos os blocos globais de estatisticas.

Consequencia: a pagina fica mais curta e menos redundante, sem endpoint novo, schema Prisma/migration, dependencia, mock, seed ou alteracao de regra de agregacao.

## Atualizacao 2026-07-18: remocao do card de metricas indisponiveis

O dashboard geral `/comunidades` deixa de renderizar o bloco **Metricas indisponiveis ou vazias**.

A decisao e remover esse aviso da superficie principal porque, apos a limpeza dos blocos legados e laterais, a pagina deve terminar nas listas operacionais reais (**Postagens mais recentes** e **Principais comunidades**) sem expor mensagens tecnicas de indisponibilidade que nao representam uma acao imediata para o Admin. O contrato `unavailable` permanece no endpoint para compatibilidade e para possivel uso futuro em experiencias mais contextuais.

Consequencia: a tela fica mais enxuta e evita ru�do operacional, sem endpoint novo, alteracao de contrato backend obrigatoria, schema Prisma/migration, dependencia, mock, seed ou mudanca nas regras de agregacao.

## Atualizacao 2026-07-18: periodo como unico texto abaixo dos titulos dos blocos

O dashboard geral `/comunidades` passa a exibir o contexto de periodo imediatamente abaixo dos titulos dos blocos filtrados por periodo, seguindo o padrao visual ja aplicado no Admin de Psicologos: `Periodo: {preset} · {data inicial} a {data final}`.

A decisao e remover, nessa posicao, descricoes tecnicas ou auxiliares como fontes de dados e textos explicativos gerais. Para **Estatisticas de pessoas**, **Estatisticas de conteudo**, **Postagens mais recentes** e **Principais comunidades**, a linha imediatamente abaixo do titulo deve conter somente o periodo selecionado. O preset e resolvido no frontend a partir do seletor visivel, enquanto as datas continuam vindo do periodo real retornado por `GET /api/admin/private/communities/dashboard`.

Consequencia: a leitura do filtro aplicado fica consistente com `/psicologos` e mais clara para o Admin, sem endpoint novo, alteracao de contrato, schema Prisma/migration, dependencia, mock, seed ou mudanca nas regras de agregacao.

## Atualizacao 2026-07-18: posts mais populares na visao geral

O dashboard geral `/comunidades` passa a ter um bloco **Posts mais populares** imediatamente abaixo de **Postagens mais recentes**.

A decisao e ampliar o contrato do endpoint existente `GET /api/admin/private/communities/dashboard` com `popular_posts`, em vez de criar uma rota paralela ou derivar ranking apenas no frontend. O ranking usa os contadores reais ja persistidos em `community_post` (`upvotes_count`, `replies_count` e `saves_count`) e segue a mesma ordem do detalhe da comunidade: upvotes, comentarios, salvamentos e recencia como desempate. O item tambem expoe `engagement_score` como soma desses tres sinais para consumo analitico futuro, sem alterar schema ou recalcular por dados simulados.

A UI mantem o bloco mobile-first, com cards no mobile e tabela no desktop, e exibe somente a linha de periodo abaixo do titulo, mantendo consistencia com os blocos ajustados anteriormente. A sequencia da pagina passa a ser: estatisticas globais, **Postagens mais recentes**, **Posts mais populares** e **Principais comunidades**.

Consequencia: o Admin ganha uma leitura global de conteudo com maior interacao no periodo sem package novo, endpoint novo, schema Prisma/migration, mock, seed ou nova regra persistida. A fonte de verdade continua sendo a agregacao backend do dashboard.

## Atualizacao 2026-07-18: identificacao e navegacao dos posts populares

O bloco **Posts mais populares** da visao geral `/comunidades` passa a tratar cada linha como atalho para o post original no site publico.

A decisao e manter o endpoint unico do dashboard, ampliando o item de `popular_posts` com o mesmo objeto de autor normalizado usado em conteudos da comunidade: nome exibivel, papel, genero, avatar e flag de verificacao derivada de `psychologist_profile`/assinatura profissional real. Para pacientes anonimos, o autor continua sem avatar e com identificacao anonima, preservando a regra visual ja existente.

A UI remove as colunas **Salvos** e **Acoes** dessa tabela porque elas competiam por largura e duplicavam a navegacao para comunidade. O ranking continua podendo usar `saves_count` no backend como criterio de ordenacao/desempate, mas esse contador deixa de ser exibido nesse bloco resumido. Todas as celulas da linha e o card mobile apontam para `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}`, abrindo o conteudo publico original.

Consequencia: a leitura do autor fica consistente com foto e selo quando houver, a tabela fica mais enxuta e a acao primaria vira abrir o post publico, sem endpoint novo, package, schema Prisma/migration, mock, seed ou alteracao de regra persistida.

## Atualizacao 2026-07-18: postagens recentes com autor, visualizacoes e link publico

- Pedido do usuario: no bloco **Postagens mais recentes** do dashboard `/comunidades`, exibir foto de perfil e selo de verificado na identificacao do autor quando houver, remover a coluna **Acoes** e qualquer exposicao de **Salvos**, fazer o clique na linha abrir o post publico original e substituir **Discussao** por **Visualizacoes**.
- O contrato `recent_posts` passou a expor `views_count`, calculado a partir de `page_view_event` real para o post em todo o periodo quando usado no dashboard fixo, aceitando os aliases `target_type="community_post"` e `target_type="post"`.
- A identificacao do autor reutiliza o objeto `author` ja normalizado pelo backend com avatar, anonimato, genero, papel e verificacao real de psicologo. O frontend renderiza a imagem com `next/image`, iniciais como fallback e selo de verificado somente quando `author.verified=true`.
- A UI desktop agora mostra somente **Titulo**, **Autor**, **Visualizacoes** e **Comentarios**; no mobile o card inteiro abre o post publico em nova aba.
- A URL publica segue a convencao canonica da TASK-40: `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}`.
- Nao houve package novo, schema Prisma, migration, endpoint paralelo, seed, mock ou dado fake permanente.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.

## Atualizacao 2026-07-18: presets completos no filtro de periodo do dashboard

O seletor de periodo do dashboard geral `/comunidades` deve ter a mesma lista usada nas demais areas analiticas do Admin: **Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**. O estado **Personalizado** aparece apenas quando o Admin digita manualmente uma data em **De** ou **Ate**.

A decisao e estender o contrato existente `GET /api/admin/private/communities/dashboard` para aceitar `period=today|week|month|year|all|custom`, preservando compatibilidade com `from`/`to` legados como periodo personalizado. No frontend, `custom` nao e uma opcao fixa do dropdown: ele e selecionado automaticamente quando datas manuais sao editadas. O periodo inicial continua sendo **Esta semana**. Para **Todo o periodo**, o backend resolve a data inicial a partir do primeiro registro real relevante do dashboard de comunidades, incluindo comunidades, membros, posts, respostas, votos, salvamentos, compartilhamentos, pageviews, cliques e moderacao; se nao houver registros, volta ao intervalo operacional padrao.

O limite tecnico foi alinhado aos demais dashboards analiticos longos do Admin (`max_days=3660`) para permitir **Este ano** e **Todo o periodo** sem reintroduzir o preset antigo **Ultimos 90 dias**. Nao houve alteracao de schema Prisma, migration, pacote, mock, seed ou endpoint paralelo.

## Atualizacao 2026-07-18: coluna dedicada de acoes nos posts do dashboard

Os blocos **Postagens mais recentes** e **Posts mais populares** do dashboard geral `/comunidades` voltam a ter uma coluna explicita **Acoes** na tabela desktop, agora com dois botoes compactos e sem misturar a navegacao dentro da coluna de titulo.

A decisao e diferenciar os dois destinos operacionais: **Abrir publico** usa a URL canonica `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}` em nova aba; **Analytics** usa a rota Admin contextual `/comunidades/{slug}/conteudo/post/{id}` criada na TASK-75. No mobile, a mesma decisao aparece como botoes com texto dentro do card, preservando a abordagem mobile-first e evitando linha inteira clicavel com destino ambiguo.

Consequencia: o Admin ganha leitura mais clara e consistente com listas administrativas, com acoes acessiveis por `aria-label`, sem alterar endpoint, contrato backend, schema Prisma, migration, pacote, mock, seed ou regra de agregacao.

## Atualizacao 2026-07-18: paridade de acoes e alinhamento em principais comunidades

O bloco **Principais comunidades** da visao geral `/comunidades` passa a seguir o mesmo comportamento visual das tabelas de posts recentes e populares: hover suave nas linhas/cards, coluna de acoes explicita e grid de colunas alinhado aos blocos acima.

A decisao e manter os dados existentes de `top_communities`, sem alterar o endpoint, e tratar a acao primaria de leitura publica separada da acao administrativa. **Abrir publico** usa a URL canonica `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}` em nova aba; **Detalhes** usa a rota Admin `/comunidades/{slug}`. O icone de detalhes usa `BarChart3`, o mesmo sinal visual das acoes de estatisticas/analytics das tabelas anteriores, para manter consistencia operacional.

No desktop, a tabela usa `colgroup` `48% / 8% / 8% / 36%`: a coluna **Comunidade** ocupa o espaco equivalente a titulo+autor das tabelas de posts, enquanto **Seguidores**, **Posts** e **Acoes** alinham com as colunas numericas e de acoes acima. No mobile, os botoes permanecem no card para preservar a abordagem mobile-first.

Consequencia: o bloco final do dashboard fica consistente com os demais blocos operacionais, sem endpoint novo, contrato backend, schema Prisma, migration, pacote, mock, seed ou mudanca de regra de agregacao.

## Atualizacao 2026-07-18: avatar real em principais comunidades

O bloco **Principais comunidades** passa a exibir o avatar real de cada comunidade no lugar do bloco colorido com icone generico.

A decisao e ampliar o item existente de `top_communities` com `avatar_url`, usando o campo persistido em `community` no mesmo endpoint `GET /api/admin/private/communities/dashboard`. A UI resolve o caminho publico do backend com os helpers ja existentes do Admin e renderiza via `next/image`; quando a comunidade ainda nao possui avatar, a apresentacao usa iniciais como fallback honesto, sem asset artificial ou mock.

Consequencia: o ranking final do dashboard fica visualmente alinhado com a identidade editavel da comunidade no Admin e na lista administrativa, sem endpoint novo, schema Prisma/migration, dependencia, seed, mock ou mudanca na regra de ordenacao de `top_communities`.
