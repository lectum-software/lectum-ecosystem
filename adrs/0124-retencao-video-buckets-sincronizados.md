# ADR-0124 — Retenção de vídeo com buckets de 5% e player sincronizado

## Status

Aceita em 2026-06-18.

## Contexto

O analytics do vídeo de apresentação precisa ajudar o psicólogo a entender em qual trecho as pessoas abandonam a reprodução. A experiência desejada é semelhante a produtos de vídeo social, mas a Lectum não precisa armazenar eventos por segundo nem recalcular uma linha de retenção em tempo real para cada frame.

## Decisão

Persistir, por sessão consolidada de visualização, um campo `retention_buckets` com buckets internos de 5% (`5, 10, ..., 100`). O backend calcula esses buckets a partir de `max_position_seconds`, `duration_seconds` e `completed`, mantendo compatibilidade com os marcos já existentes de 25/50/75/100%.

No endpoint de analytics do psicólogo:

- agregamos a curva em 20 pontos de 5%;
- preservamos os cartões resumidos de 25/50/75/100%;
- calculamos o maior trecho estimado de abandono entre dois buckets consecutivos;
- retornamos tempos aproximados do trecho para permitir sincronização com o player.

No frontend, o gráfico exibe uma curva suavizada/estimada entre os pontos agregados e sincroniza com o vídeo real: a linha do playhead acompanha a reprodução, e cliques no gráfico, nos marcos ou no destaque de abandono fazem seek para o trecho correspondente.

## Consequências

- Evitamos capturar evento por segundo, reduzindo escrita no banco e custo de armazenamento.
- Cada sessão armazena no máximo 20 buckets, mantendo payload e agregação previsíveis.
- A curva é uma visualização estimada entre pontos agregados; a UI comunica essa natureza sem apresentar como medição segundo a segundo.
- A experiência fica útil para análise qualitativa do vídeo sem depender de novos pacotes de gráfico.
- Sessões antigas sem `retention_buckets` continuam funcionando por derivação de `max_position_seconds`/`duration_seconds` e pelos marcos legados.
