# ADR-0123: Analytics real de retenção do vídeo de apresentação

## Status

Aceito em 2026-06-18.

## Contexto

A área `Meus Analytics` precisava evoluir para mostrar desempenho do vídeo de apresentação do psicólogo, incluindo visualizações, tempo médio assistido, taxa de conclusão, replays, abandono e retenção por marcos 25%, 50%, 75% e 100%.

Pelas regras do produto, analytics não pode usar mocks nem dados simulados. Também não era desejável capturar cada segundo assistido como uma série temporal pesada nesta etapa do MVP.

## Decisão

Persistir sessões reais de reprodução no modelo `profile_video_watch_session`, consolidando atualizações do mesmo visitante por `session_key` e armazenando apenas métricas agregáveis:

- duração do vídeo;
- segundos únicos assistidos;
- maior posição alcançada;
- replays;
- conclusão;
- marcos 25/50/75/100%;
- `last_event_at` para data de atualização.

O player do perfil público envia heartbeats reais durante a reprodução e no pause/fim do vídeo. O backend agrega esses registros no endpoint existente `GET /api/private/psychologist/analytics`, retornando o bloco `presentation_video` junto com as demais métricas.

Na UI, a seção do vídeo aparece antes do card `Link da minha página de avaliações`, com cards de métricas principais e um bloco de retenção que alinha o vídeo a um gráfico por marcos. No modo prévia do Plano Gratuito, os valores continuam desfocados, mantendo a demonstração de valor sem expor os dados.

## Consequências

- Não há pacote novo nem ferramenta externa de analytics.
- A retenção é suficiente para leitura de produto sem custo de armazenamento por segundo.
- Sessões são consolidadas para evitar inflar visualizações por heartbeat.
- Visualizações do próprio psicólogo sobre seu perfil não são contabilizadas.
- Métricas de visitantes anônimos podem ser registradas quando a rota pública do perfil dispara o endpoint sem autenticação; se houver usuário autenticado, `viewer_id` é preservado.
- Trocas futuras de vídeo podem continuar usando o mesmo modelo, com `video_url` preservando auditoria básica do vídeo associado à sessão.
