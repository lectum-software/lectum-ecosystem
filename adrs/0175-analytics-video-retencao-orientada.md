# ADR-0175 - Analytics de video com leitura orientada para psicologos

## Status

Accepted em 2026-06-29.

## Task relacionada

TASK-20 - Analytics do psicologo.

## Contexto

A secao de video dos Analytics estava tecnicamente correta, mas alguns contadores criavam leitura negativa ou excessivamente tecnica para psicologos pouco familiarizados com marketing. A `Taxa de abandono`, por exemplo, podia mostrar 71% mesmo quando a retencao media e o ponto de maior queda indicavam bom desempenho. O bloco tambem tinha um insight isolado e generico, alem de um vazio visual no grid de contadores de negocio.

## Decisao

- Remover da UI os contadores frios `Taxa de abandono`, `Taxa de conclusao` e `Tempo medio assistido` na secao de video, preservando esses valores no contrato para calculo e auditoria.
- Manter como contadores de video apenas `Visualizacoes` e `Taxa de replays`.
- Agrupar retencao percentual e tempo medio em uma unica frase dentro do card de retencao: `Em media, os visitantes assistiram X% do video, cerca de mm:ss.`.
- Substituir o insight isolado por um diagnostico contextual dentro do card de retencao, com recomendacoes focadas em permanencia no video, sem misturar WhatsApp, conversao ou convite nesta area.
- Reordenar os contadores de negocio para que `Conversoes WhatsApp` ocupe um card largo de duas colunas ao final do bloco, removendo o espaco vazio deixado por `Favoritado` e destacando a metrica de maior valor comercial.
- No card largo de `Conversoes WhatsApp`, manter o icone e o numero em uma linha de topo e posicionar label/descricao abaixo do icone, evitando compressao lateral do texto no mobile.

## Consequencias

- A tela comunica desempenho e proxima acao de forma mais humana para o publico profissional da Lectum.
- Evita que metricas simetricas ou negativas sejam interpretadas como problema quando o comportamento real do video e saudavel.
- Mantem o backend e o contrato sem quebra, permitindo futuras analises ou comparacoes sem nova migration.
- O card de WhatsApp ganha mais peso visual por representar intencao real de contato.
- A secao de retencao passa a orientar melhorias de abertura, ritmo, objetividade e duracao do video, enquanto conversao para WhatsApp permanece nos contadores de negocio e origem de trafego.
- A leitura mobile do card largo fica mais parecida com os cards verticais existentes, com numero destacado sem competir com a descricao.

## Atualizacao 2026-07-07 - Amostra pequena sem recomendacao de teste

Quando o video ainda tem menos de 30 visualizacoes reais, a leitura de retencao deve tratar a curva como dado inicial e nao recomendar que o psicologo teste uma apresentacao diferente. Nesse volume, uma queda estimada pode ser causada por poucos visitantes e nao e evidencia suficiente para orientar mudanca no conteudo.

Decidimos manter `MIN_RETENTION_SAMPLE_FOR_CONFIDENCE = 30` como limite minimo de confianca para recomendacoes acionaveis. Abaixo desse limite, a copy orienta o profissional a manter o video atual por enquanto e acompanhar novas visitas. As recomendacoes de teste, encurtamento, abertura mais objetiva ou ajuste de trecho continuam permitidas somente quando houver amostra minima.

Consequencias:

- Evita acionar psicologos com conclusoes prematuras baseadas em 1 ou poucas visualizacoes.
- Mantem a transparencia da secao `Dados iniciais`, sem esconder que a metrica ainda existe, mas reduz o risco de orientar mudancas indevidas.
- Nao altera contrato, backend, schema, tracking nem limiares de agregacao; a decisao e de interpretacao/copy no frontend.

## Atualizacao 2026-08-02 - Metricas do video antes da retencao

O painel `Consumo e acoes do video` ocupava altura excessiva no mobile e ficava visualmente misturado ao bloco azul de retencao. Decidimos separar a leitura em tres partes: uma grade de `Metricas do video` antes da retencao, o bloco azul apenas para permanencia/curva do video e um `Diagnostico` separado fora do card azul.

A grade de metricas fica em duas colunas com quatro blocos lado a lado no mobile: `Visualizacoes`, `Tempo total assistido`, `Assistiram completo` e `Taxa de replays`. Para reduzir peso visual, essa grade nao exibe titulo/descricao auxiliar, nao usa sombra e nao usa borda cinza nos blocos. As acoes comerciais `Acesso ao perfil`, `Favoritado`, `Compartilhamento` e `Cliques no WhatsApp` deixam de aparecer nessa grade.

Tambem passamos a calcular no contrato privado `presentation_video.metrics.total_watch_seconds` pela soma real de `watched_seconds` e `presentation_video.metrics.completed_views` pela quantidade real de sessoes que chegaram ao bucket/marco de 100%. `Resultados de busca` permanece disponivel em `metrics.search_results` e `presentation_video.metrics.search_results_from_video` usando `profile_view_event.source="search_result"`, sem backfill, estimativa, mock nem eventos de `source="profile_page"`.

Consequencias:

- A leitura mobile do video fica mais clara: primeiro indicadores essenciais de consumo em blocos comparaveis, depois retencao, depois diagnostico.
- A remocao de titulo, descricao, sombras e bordas reduz o peso visual antes do card azul de retencao.
- A hierarquia visual separa retencao do video das acoes derivadas, evitando que a area azul pareca conter blocos heterogeneos.
- `Resultados de busca` diferencia impressoes reais de listagem/busca das visitas efetivas ao perfil.
- O contrato privado do Analytics do psicologo ganha campos numericos reais para `search_results`, `search_results_from_video`, `total_watch_seconds` e `completed_views`, sem schema Prisma, migration ou package novo.


## Validacao

- `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `Invoke-WebRequest` em `/app/professional/analytics` retornando `307` para login sem sessao.
- Atualizacao 2026-07-07: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `next start` local com `Invoke-WebRequest` em `/app/professional/analytics` retornando `307` para login sem sessao.
- Atualizacao 2026-08-02: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e `next start` local com request em `/app/professional/analytics` retornando `307` para login sem sessao.

## Pendencias

- A calibragem dos limiares de diagnostico deve ser revista quando houver maior volume real de sessoes de video por perfil.

## Atualizacao 2026-08-02 - Acoes principais voltam ao bloco de video

Produto pediu que a secao `Video de apresentacao` volte a mostrar, junto das metricas principais, as acoes reais de `Compartilhamento`, `Acesso ao perfil`, `Favoritado` e `Cliques WhatsApp`. Mantemos a separacao de retencao: a area azul continua focada na permanencia/curva, enquanto as acoes ficam na grade de metricas antes dela.

Para evitar misturar atribuicao, os cliques de WhatsApp do video tambem aparecem separados entre `Explorar` e `Resultados de busca`, usando o detalhamento real ja presente em `traffic_sources.sources[].breakdown` para a origem `presentation_video`.

Consequencia: reaproveitamos campos existentes do contrato privado (`shares_from_video`, `profile_accesses_from_video`, `favorites_from_video`, `whatsapp_clicks_from_video` e o breakdown da origem de trafego), sem schema, migration, endpoint paralelo, mock, seed ou package novo.

## Atualizacao 2026-08-02 - Compactacao visual das metricas do video

Por feedback visual no browser mobile/desktop, os cards de metricas do Video de apresentacao estavam ocupando altura excessiva antes do bloco de retencao.

Decidimos remover da secao de video o bloco adicional Cliques no WhatsApp por origem (Explorar e Resultados de busca) e manter apenas o card agregado Cliques WhatsApp junto das demais metricas principais. A leitura por origem continua disponivel no contrato privado e pode ser usada em outra area, mas nao deve duplicar espaco dentro deste painel compacto.

Os cards de metrica passam a seguir a hierarquia label leve acima do numero, com icone alinhado verticalmente ao label. A decisao reduz rolagem e peso visual no mobile sem alterar contratos, schema, tracking ou fontes persistidas.

Consequencia: a secao fica mais curta e objetiva, mantendo todos os totais principais reais (Visualizacoes, Tempo total assistido, Assistiram completo, Taxa de replays, Compartilhamento, Acesso ao perfil, Favoritado e Cliques WhatsApp) antes da retencao. Nao ha migration, endpoint paralelo, mock, seed, dado artificial ou package novo.