# ADR-0284: Horários de maior atividade nas estatísticas da comunidade

## Status

Aceita

## Task relacionada

Ajuste complementar da TASK-71 para a aba **Estatísticas** do detalhe administrativo de comunidade.

## Contexto

O Admin já exibe, em `/comunidades/[slug]?tab=estatisticas`, blocos separados de
**Estatísticas de pessoas** e **Estatísticas de conteúdo**, cada um com período
independente, contadores clicáveis e gráfico temporal. O pedido de produto foi
adicionar, logo após o gráfico de **Estatísticas de conteúdo**, um bloco que
mostre os horários em que a comunidade concentra mais atividade.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A
referência visual usada foi a captura enviada pelo usuário, o layout atual da aba
**Estatísticas** da comunidade e `_product/proto/admin/Comunidades/Comunidades -
Detalhes.png`.

## Decisão

Estender o contrato real `GET /api/admin/private/communities/:id/statistics` com
`charts.hourly_activity`, sempre contendo 24 pontos horários no timezone
`server-local`.
O contrato também retorna `charts.hourly_activity_by_weekday`, com os mesmos 24
pontos para cada dia da semana (`Dom` a `Sáb`), agregando todos os eventos daquele
dia da semana dentro do período filtrado.

Cada ponto agrega eventos reais do período selecionado no bloco de conteúdo:

- `accesses`: `page_view_event` da comunidade, posts e respostas relacionadas;
- `posts`: `community_post`;
- `replies`: `post_reply`;
- `engagement`: `post_vote`, `post_save`, `post_reply_save`,
  `important_action_event` de WhatsApp e acessos reais a perfis originados pelos
  conteúdos da comunidade;
- `reports`: `post_report`;
- `total`: soma dos grupos acima.

A UI Admin renderiza o novo bloco abaixo de **Estatísticas de conteúdo**, usando
filtros próprios de **Período**, **De** e **Até**. Esses filtros são
independentes dos blocos de pessoas e conteúdo para permitir analisar horários
sem recarregar outros gráficos da aba. No filtro próprio do bloco, a opção
**Hoje** não é exibida e o estado padrão é **Todo o período**. O bloco mostra os
três picos de atividade sempre agregados em todos os dias do período próprio,
conforme pedido de produto. A seleção por dia da semana altera somente o gráfico
de 24 barras e o rótulo acessível do gráfico, mantendo os cards de pico como
visão geral.

A copy visível do bloco é curta e operacional: `Distribuição por hora das
atividades na comunidade.`

O seletor exibe `Todos`, `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb` e `Dom`, em
ordem operacional de semana. O gráfico permanece em um scroller local,
mantendo abordagem mobile-first e sem criar biblioteca ou componente de gráfico
paralelo. Não há texto auxiliar visível repetindo a seleção do gráfico.

Nos cards de pico, acessos, conteúdos, interações e denúncias aparecem em uma
linha compacta para reduzir altura visual e facilitar comparação rápida entre
picos.

## Consequências

- O Admin passa a identificar janelas operacionais de maior atividade sem
  inferência artificial.
- A métrica segue recorte independente e não recarrega os blocos de pessoas ou
  conteúdo.
- A leitura por dia ajuda a identificar distribuição semanal sem alterar a regra
  dos picos gerais.
- Eventos históricos sem dados horários suficientes continuam aparecendo como
  zero real.
- Não houve schema Prisma/migration, pacote novo, mock, seed ou backfill.

## Validação

- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real do service `showStatistics` para
  `autocuidado-em-pratica?period=all`, retornando `status=200`,
  `period=Todo o período`,
  `charts.hourly_activity.length=24`,
  `charts.hourly_activity_by_weekday.length=7` e total horário real maior que
  zero, com soma total horária igual à soma por dia da semana.
- Smoke HTTP local
  `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=estatisticas`
  retornando 200.

## Atualizacao 2026-07-20: ordem operacional dos blocos

A ordem visual da aba **Estatisticas** do detalhe administrativo de comunidade passa a ser **Estatisticas de conteudo**, **Cobertura de acolhimento**, **Horarios de maior atividade** e **Estatisticas de pessoas**. O bloco de horarios permanece independente em filtro e consulta e fica acima da leitura de pessoas para seguir a hierarquia solicitada pelo produto.

Consequencia: a leitura comeca por atividade de conteudo e engajamento, segue para cobertura qualificada, depois distribuicao horaria e termina com composicao/atividade de pessoas. Nao houve alteracao de contrato dos horarios, calculo, persistencia, schema Prisma/migration, pacote ou fonte de dados.

Validacao complementar: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornando 200.
