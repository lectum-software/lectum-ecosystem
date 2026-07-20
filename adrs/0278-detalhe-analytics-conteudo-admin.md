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

## Update 2026-07-18: TASK-75 implementation

TASK-75 was implemented with the contextual route `/comunidades/[slug]/conteudo/[type]/[id]`. The Admin URL accepts `post`, `comment` and `reply`, while backend metrics normalize targets to canonical `post` and `reply`.

A single private Admin endpoint (`GET /api/admin/private/communities/:id/content/:type/:contentId/detail`) returns identity, main metrics, time series, moderation events, reports and video retention in one contract for this V1.

The content-video retention store was added by migration `20260718174247_add_content_video_watch_session`. Public collection uses `POST /api/public/analytics/content-video-watch`, derives `community_id` from the real content, consolidates by visitor/session/target, links `viewer_id` when an authenticated user is available, and skips authenticated author self-views.

Retention in the Admin detail uses only `content_video_watch_session`. There is no historical backfill, no fake seed and no estimate from `page_view_event`. Content without video hides the retention section; video content without enough real sessions shows an honest unavailable state until new real accesses are collected.

The public frontend reuses the existing media/player components and sends consolidated heartbeats for post/reply videos in details, threads, feed/list views, own posts and saved posts. The payload does not include post text, reply text, raw IP, raw user-agent, token or sensitive query; stored video URLs are normalized without query/hash.

Builder/Quick Copy was not available as a callable tool in this environment, so implementation used the local `_product/proto` Admin images and existing Admin visual patterns. No package was added.

Validation evidence: `pnpm --dir backend db:migrate`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, real `showContentDetail` smoke for a video post and a non-video post, and HTTP 200 for `/comunidades/autocuidado-em-pratica/conteudo/post/cmrmg709v000yt0uh8x55eqae` on localhost Admin.

## Update 2026-07-20: comment-origin breakdown in content preview

The Admin content-detail preview now exposes comment-origin details immediately below the post metrics row. The backend adds `metrics.comment_breakdown` to the existing private Admin detail endpoint instead of creating a parallel endpoint.

The breakdown is computed only from real `post_reply` records already selected for the detail period. A reply/comment authored by `user.role="psicologo"` is classified as a verified psychologist response when `isVerifiedProfessionalEntitlement` returns true for the selected psychologist profile; otherwise it is an unverified psychologist response. Non-psychologist authors remain patient comments. This keeps the detail page aligned with the same professional-verification rule used by content filters and author badges.

The UI decision is to show four compact mobile-first blocks below the existing analytics line: total comments, verified psychologist responses, unverified psychologist responses and patient comments. The total count does not display a redundant `100%`; the other three counts display their rate inline in parentheses with lower visual weight. Label height is reserved so numeric baselines remain aligned even when labels wrap.

Consequences: Admins can audit the quality/origin of discussion on a specific post without opening a separate analytics section. No schema/migration, new package, mock, seed, backfill or additional endpoint was introduced.
