# ADR-0229: Analytics first-party de pageviews e origem de trafego

## Status

Accepted

## Contexto

A TASK-49 prepara os dados reais necessarios para a futura tela Admin Trafego, baseada na referencia visual da tela Trafego em `_product/proto/admin/`. A captura existente de sessao/dispositivo da TASK-47 nao armazenava navegacao por pagina, entrada de sessao, origem de trafego, UTMs, modo PWA ou duracao aproximada.

O requisito de produto exige dados first-party e privacidade-minimalista, sem Google Analytics, Meta Pixel, Mixpanel, PostHog ou equivalente, e sem armazenar IP bruto, user-agent bruto, textos digitados ou payloads de formulario.

O Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao estava disponivel como ferramenta MCP nesta execucao; a imagem local exportada foi usada como referencia auditavel.

## Decisao

- Criar os modelos Prisma `page_view_event` e `important_action_event`, ambos com soft delete, relacao opcional com `user` via `onDelete: SetNull` e indices por periodo, sessao, visitante, usuario e dimensoes de agregacao.
- Expor endpoints publicos first-party:
  - `POST /api/public/analytics/page-view`;
  - `POST /api/public/analytics/page-view/:id/duration`;
  - `POST /api/public/analytics/action`.
- Usar `optionalAuth` nos eventos de criacao para associar `user_id` quando houver token real valido, sem bloquear navegacao publica nem transformar analytics em rota privada.
- Reaproveitar e atualizar `visitor_session` da TASK-47 para ligar `visitor_id`, `session_id`, `device_type` quando ja conhecido e `user_id` apos autenticacao.
- Normalizar origem de trafego no backend, priorizando UTMs permitidas e usando apenas o host do referrer externo para classificar busca, social, share, internal, referral ou direct.
- Persistir `path` sem query sensivel; apenas UTMs permitidas sao aceitas e limitadas. `normalized_path` troca identificadores longos por `:id` para agregacoes futuras.
- Derivar `page_kind`, `target_type` e `target_id` somente de URLs conhecidas e seguras.
- Registrar `display_mode` do browser/PWA e eventos de PWA apenas para sinais reais: `appinstalled` e aceite real do prompt de instalacao ja existente.
- Implementar atualizacao de duracao como melhor esforco por troca de rota, `visibilitychange` e `pagehide`, sem degradar UX e com falha silenciosa.
- Nao instalar pacote novo e nao criar integracao de analytics de terceiros.

## Consequencias

- A TASK-50 podera calcular origem de trafego, paginas de entrada, sessoes, paginas por sessao, taxa de retorno, trafego por comunidade/psicologo e qualidade de trafego a partir de dados reais.
- Metricas de tempo e rejeicao devem ser tratadas como aproximacoes, pois browsers podem bloquear ou interromper chamadas de fechamento/keepalive.
- A associacao de usuario e progressiva: pageviews anonimos do mesmo `visitor_id` passam a ser vinculados quando uma navegacao autenticada valida ocorrer.
- A privacidade fica limitada por desenho: nao ha IP bruto, user-agent bruto, URL externa completa, query sensivel, texto digitado ou payload de formulario.
- Caso a estrategia de analytics evolua para consentimento granular, retencao, exportacao LGPD ou terceiros, uma nova task/ADR devera revisar este desenho.

## Validacao

- `pnpm --dir backend db:migrate --name add_page_view_tracking` criou/aplicou a migration; em seguida `pnpm --dir backend exec prisma migrate status` confirmou o banco atualizado.
- `pnpm --dir backend db:migrate` reexecutado durante a task confirmou schema em sincronia.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke API com usuario/token transitorio real:
  - `POST /api/public/analytics/page-view` com UTMs/referrer e Authorization;
  - `POST /api/public/analytics/page-view/:id/duration`;
  - `POST /api/public/analytics/action` para `pwa_installed`;
  - conferencia de `user_id`, `visitor_session`, origem normalizada, path sem query sensivel e limpeza dos dados transitorios.
- Browser local automatizado por Chrome DevTools Protocol:
  - frontend temporario em `http://localhost:3100`;
  - navegacao com UTM entre `/psychologists` e `/community`;
  - validacao de dois pageviews reais no banco, display mode `browser`, paths sem query sensivel e limpeza dos dados transitorios.
- Browser local autenticado por token real transitorio:
  - cookie de autenticacao real definido no browser;
  - navegacao em `/psychologists`;
  - conferencia de `page_view_event.user_id` e limpeza do usuario/token transitorio.

## Pendencias

- Calcular e expor agregacoes administrativas fica para a TASK-50.
- Definir politica de retencao/anonimizacao de longo prazo se o volume de analytics crescer ou se houver demanda legal especifica.
