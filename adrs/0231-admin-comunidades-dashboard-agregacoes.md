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