# ADR-0124 — Retenção de vídeo com buckets de 5% e player sincronizado

## Status

Aceita em 2026-06-18.

## Contexto

O analytics do vídeo de apresentação precisa ajudar o psicólogo a entender em qual trecho as pessoas abandonam a reprodução. A experiência desejada é semelhante a produtos de vídeo social, mas a Lectum não precisa armazenar eventos por segundo nem recalcular uma linha de retenção em tempo real para cada frame.

## Decisão

Persistir, por sessão consolidada de visualização, um campo `retention_buckets` com buckets internos de 5% (`5, 10, ..., 100`). O backend calcula esses buckets a partir de `max_position_seconds`, `duration_seconds` e `completed`, mantendo compatibilidade com os marcos já existentes de 25/50/75/100%.

No endpoint de analytics do psicólogo:

- agregamos a curva em 20 pontos de 5%;
- usamos os pontos agregados para desenhar a curva de retenção;
- calculamos o percentual médio exibido no resumo a partir do tempo médio assistido (`average_watch_seconds / duration_seconds`), não pela média dos buckets;
- calculamos o maior trecho estimado de abandono entre dois buckets consecutivos;
- retornamos tempos aproximados do trecho para permitir sincronização com o player.

No frontend, o gráfico exibe uma curva suavizada/estimada entre os pontos agregados e sincroniza com o vídeo real: a linha do playhead acompanha a reprodução, e o destaque de abandono pode levar o player para o trecho correspondente.

## Consequências

- Evitamos capturar evento por segundo, reduzindo escrita no banco e custo de armazenamento.
- Cada sessão armazena no máximo 20 buckets, mantendo payload e agregação previsíveis.
- A curva é uma visualização estimada entre pontos agregados; a UI comunica essa natureza sem apresentar como medição segundo a segundo.
- O texto "Em média, os visitantes assistiram X% do seu vídeo" passa a representar a proporção do tempo médio assistido em relação à duração do vídeo, alinhando a copy ao entendimento esperado pelo usuário.
- A experiência fica útil para análise qualitativa do vídeo sem depender de novos pacotes de gráfico.
- Sessões antigas sem `retention_buckets` continuam funcionando por derivação de `max_position_seconds`/`duration_seconds` e pelos marcos legados.


## Complemento 2026-06-29 - curva visual continua e copy compacta

A curva de retencao exibida em `/app/professional/analytics` passa a separar a apresentacao visual da granularidade dos buckets persistidos. Os buckets reais de 5% continuam sendo a fonte para metricas agregadas e para detectar o maior trecho estimado de abandono, mas o SVG do frontend interpola esses pontos como uma curva continua estimada, iniciando em 100% quando existe ao menos uma visualizacao e encerrando visualmente em 0% no fim do eixo.

Essa decisao evita a percepcao de grafico em degraus no mobile sem criar novos eventos, novos pacotes de chart ou alteracao de schema. O texto do trecho de abandono tambem foi simplificado para exibir apenas intervalo percentual e tempo aproximado, removendo `Ver trecho` e a queda em pontos percentuais da UI.

Validacao desta execucao complementar: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check` e `pnpm --dir frontend build` passaram; rota local `/app/professional/analytics` respondeu `307` para login sem sessao.
