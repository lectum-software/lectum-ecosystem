# ADR-0278: Detalhe analítico de conteúdo e retenção first-party de vídeo no Admin

## Status

Accepted

## Data

2026-07-18

## Contexto

O Admin já mostra listas e métricas resumidas de conteúdos de comunidades, mas ainda não possui uma página dedicada para analisar um post ou resposta individualmente. O produto também já possui retenção real para vídeo de apresentação de psicólogo via `profile_video_watch_session`, mas vídeos publicados em posts/respostas de comunidade não têm tracking de retenção próprio.

Exibir gráfico de retenção sem fonte real criaria métrica enganosa. Ao mesmo tempo, abrir apenas o post público não resolve a necessidade operacional do Admin de investigar desempenho, denúncias, eventos de moderação e consumo de vídeo do conteúdo.

## Decisão

Criar a especificação `TASK-75 - Detalhe analítico administrativo de conteúdo e retenção de vídeo`.

A rota preferida da futura implementação é contextual dentro da comunidade: `/comunidades/[slug]/conteudo/[type]/[id]`. A decisão preserva contexto operacional e evita uma central global de conteúdo antes de existir necessidade consolidada.

A retenção de vídeos de posts/respostas deve usar uma nova tabela first-party `content_video_watch_session`, definida em `DATA-MODEL.md`, com alvo genérico (`target_type`, `target_id`) limitado a `post` e `reply` na V1. A coleta deve consolidar sessões por `session_key`, armazenar apenas dados técnicos de consumo de vídeo e nunca persistir texto do conteúdo, IP bruto, user-agent bruto, tokens ou query sensível.

Não haverá backfill histórico nem retenção estimada a partir de `page_view_event.duration_seconds`. Quando não houver dados reais suficientes, a UI deve mostrar indisponibilidade honesta.

## Consequências

- A execução futura terá fonte de verdade para schema e contratos, reduzindo risco de cada agente inventar modelo de retenção.
- O Admin poderá diferenciar análise pública do post de análise administrativa protegida.
- Métricas de vídeo só aparecem quando houver vídeo e eventos first-party reais.
- Vídeos antigos começam sem curva de retenção até receberem novos acessos após a implementação.
- Não há pacote novo, tracking de terceiros, IA ou integração externa previstos para essa fundação.

## Validação documental

- Criada `_product/tasks/TASK-75-detalhe-analytics-conteudo-admin.md`.
- Atualizado `_product/tasks/README.md` com a nova task Pending na fila Admin.
- Atualizado `_product/tasks/DATA-MODEL.md` com `content_video_watch_session`.