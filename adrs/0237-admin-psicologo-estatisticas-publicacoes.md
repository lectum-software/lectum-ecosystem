# ADR-0237: Estatísticas e publicações reais do psicólogo no Admin

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-57: Detalhe administrativo do psicólogo — Estatísticas e publicações.

## Contexto

As abas administrativas **Estatísticas** e **Publicações** precisam permitir auditoria operacional do perfil do psicólogo, mas a base atual ainda não possui tracking para todas as métricas exibidas nos protótipos, principalmente impressões em busca e visualizações de respostas individuais.

A Lectum já registra dados reais em eventos e tabelas de domínio, incluindo `profile_view_event`, `profile_video_watch_session`, `contact_request`, `psychologist_favorite`, `community_post`, `post_reply`, `post_save`, `post_reply_save`, `post_share` e `page_view_event` para páginas públicas. A task exigia evitar qualquer estimativa ou dado fake permanente.

## Decisão

- Criar endpoints privados Admin específicos para engajamento do psicólogo:
  - `GET /api/admin/private/psychologists/:id/statistics`;
  - `GET /api/admin/private/psychologists/:id/publications`.
- Agregar somente fontes persistidas existentes:
  - métricas de negócio por `profile_view_event`, `contact_request.channel=whatsapp` e `psychologist_favorite`;
  - vídeo por `profile_video_watch_session`, derivando retenção dos marcos reais registrados;
  - comunidade por `community_post`, `post_reply`, `post_save`, `post_reply_save` e contadores reais de votos;
  - visualizações de posts apenas por `page_view_event.target_type=post/community_post`.
- Marcar como indisponíveis, e não estimar, métricas sem tracking confiável nesta etapa, como resultados de busca e visualizações de respostas individuais.
- A aba **Publicações** permanece somente leitura: não edita, remove nem modera posts/respostas.
- A UI Admin segue mobile-first, usa `next/image` para mídia renderizável e reaproveita o shell/cliente Admin existente.

## Consequências

- Administradores passam a ter visibilidade real de estatísticas e publicações sem criar uma camada paralela de analytics.
- O painel deixa explícita a diferença entre métrica real e métrica indisponível, reduzindo risco de decisões baseadas em estimativas invisíveis.
- A evolução futura de tracking de busca e respostas pode preencher os mesmos campos sem alterar o contrato principal, desde que a fonte real seja persistida.
- A leitura de publicações não interfere no fluxo público de comunidades nem adiciona poderes de moderação fora do escopo aprovado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin real:
  - `GET /api/admin/private/psychologists/:id/statistics` retornou `200` com cards reais de negócio/comunidade e vídeo disponível quando há sessões reais;
  - `GET /api/admin/private/psychologists/:id/publications` retornou `200` com publicações reais de `community_post`/`post_reply`, filtros e paginação.
- Browser local via Edge/CDP em `http://localhost:3002/psicologos/demo-profile-marina-rocha?tab=estatisticas` e `?tab=publicacoes`, com login administrativo real, confirmou renderização das duas abas, estado mobile-first em 390px, fontes reais e avisos de métricas indisponíveis.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelos PNGs locais:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.
- Não foi criado tracking novo nem seed artificial para completar métricas ausentes.
