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
