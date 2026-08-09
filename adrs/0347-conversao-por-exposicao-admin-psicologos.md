# ADR 0347 - Conversao por exposicao no Admin de psicologos

## Status

Accepted - 2026-07-29

## Contexto

A leitura anterior de Conversao dos psicologos combinava cliques de WhatsApp, aberturas de perfil e favoritos normalizados para 30 dias. O usuario definiu que a conversao deve medir somente eficiencia de conversao, sem tracao normalizada, porque o clique no WhatsApp pode ocorrer a partir do perfil, video, busca ou comunidade.

## Decisao

- A taxa de Conversao passa a ser `cliques WhatsApp / exposicao` no periodo analisado.
- A categoria `unconverted_traffic` mantem o ID interno por compatibilidade de URLs, filtros, matriz e contratos, mas a label exibida passa a ser **Exposicao Nao Convertida**.
- Exposicao e a soma, com peso 1 por evento registrado, de:
  - visualizacao de perfil (`profile_view_event.source=profile_page`);
  - impressao em resultado de busca (`profile_view_event.source=search_result`);
  - visualizacao qualificada de video do perfil (`profile_video_watch_session` com `watched_seconds >= 3` ou `max_position_seconds >= 3`);
  - visualizacao de posts autorais em comunidade (`page_view_event.target_type=post/community_post`);
  - visualizacao de respostas autorais em comunidade (`page_view_event.target_type=reply/post_reply`).
- Cliques WhatsApp continuam vindo de `contact_request.channel=whatsapp`, preservando cliques iniciados por perfil, video ou comunidade quando a acao cria `contact_request`.
- A normalizacao por 30 dias deixa de entrar no calculo da Conversao. Ela continua existindo somente para os blocos de engajamento comunitario que ja usam leitura por janela.
- Os cortes operacionais da primeira versao por exposicao sao:
  - exposicao minima para classificar taxa: 50;
  - Alta Conversao: pelo menos 50 exposicoes, pelo menos 3 cliques WhatsApp e taxa >= 5%;
  - Exposicao Nao Convertida: pelo menos 60 exposicoes e taxa < 2% ou sem clique;
  - Interesse Nao Convertido: pelo menos 5 favoritos e sem taxa/volume para Alta Conversao;
  - Dados Insuficientes: exposicao abaixo de 50 sem sinal suficiente para outro bucket;
  - Baixa Conversao: exposicao suficiente, mas fora dos demais buckets.
- A UI do dashboard de psicologos exibe tooltip nas cinco categorias do donut usando a descricao retornada pela API.

## Consequencias

- O denominador da taxa nao fica preso a visitas de perfil e acompanha melhor jornadas com video, busca e comunidades.
- Nao ha migration, backfill, seed, endpoint simulado ou package novo.
- Eventos ainda nao rastreados de forma first-party, como determinadas exibicoes em listas relacionadas, nao entram na exposicao ate existir instrumentacao real.
- O ID `unconverted_traffic` permanece como legado tecnico; novas telas devem tratar sua copy como **Exposicao Nao Convertida**.
