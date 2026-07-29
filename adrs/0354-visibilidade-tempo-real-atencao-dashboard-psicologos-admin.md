# ADR-0354 - Visibilidade por tempo real de atenção no dashboard Admin de psicólogos

## Status

Accepted

## Contexto

Após o bloco **Exposição** ter sido renomeado para **Visibilidade**, o produto decidiu abandonar pesos abstratos para posts, respostas, listagens, perfil e vídeo. A leitura precisa ser explícita para o Admin: Visibilidade deve representar tempo real de atenção recebido pelo psicólogo, e não pontos.

Também ficou definido que tempo em aba oculta, janela sem foco ou conteúdo fora do viewport não deve ser contabilizado como atenção efetiva.

## Decisão

- `profile_exposure` permanece como nome técnico do contrato para compatibilidade, mas a cópia pública é **Visibilidade**.
- A Visibilidade passa a ser classificada por segundos de atenção, exibidos como tempo (`40min`, `1h 30min`, etc.) no Admin.
- Aparição em listagem deixa de pontuar Visibilidade; só há tempo quando o usuário permanece em superfície ligada ao psicólogo.
- A fonte comunitária passa a usar `content_attention_session`, persistida por `POST /api/public/analytics/content-attention`, para posts e respostas autorais de psicólogos.
- O tracker de conteúdo comunitário usa `IntersectionObserver`, `document.visibilityState` e foco da janela. Um card só conta quando está visível no viewport por pelo menos 35% do card ou 160px de altura visível.
- O tempo de perfil usa `page_view_event.duration_seconds` e o tracker de pageview também passa a pausar em aba oculta ou janela sem foco.
- O vídeo de apresentação permanece como sinal de Visibilidade via `profile_video_watch_session.watched_seconds`; os trackers de vídeo ajustados nesta execução evitam avançar atenção quando o documento não tem atenção do usuário.
- Para não inflar artificialmente o tempo do perfil quando o vídeo é assistido dentro do próprio perfil, o agregado usa `max(profile_attention_seconds, profile_video_attention_seconds)` como superfície de perfil/vídeo, e soma esse valor ao tempo de posts/respostas de comunidade.
- Não há backfill histórico: a nova métrica começa a acumular a partir da implantação do tracking.

## Consequências

- O Admin passa a interpretar **Visibilidade Padrão** como faixa de tempo real da plataforma no período selecionado.
- Dados anteriores à criação de `content_attention_session` podem aparecer como **Sem Visibilidade** ou **Dados Insuficientes** até haver nova coleta.
- A métrica fica mais legível para operação, mas não deve ser comparada diretamente com o antigo score ponderado.
- A medição continua first-party e não registra texto de conteúdo, IP bruto, user-agent bruto, payload sensível ou WhatsApp.
- A migration `20260729225209_content_attention_sessions` foi alinhada de forma não destrutiva após um `migrate dev` anterior ter criado a tabela/metadado durante timeout; não houve reset nem perda de dados.

## Task relacionada

- TASK-89 - ajuste complementar de Visibilidade por tempo real no dashboard Admin de psicólogos.

## Validações

- `pnpm --dir backend db:migrate -- --name content_attention_sessions_check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir frontend check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de serviço `buildPsychologistsDashboard({ period: "all" })` confirmou Visibilidade por segundos, sem pontuar listagem.
- Smoke real do endpoint `POST /api/public/analytics/content-attention` confirmou persistência com post publicado de psicólogo; dados de validação foram removidos.
- Browser local/headless autenticado validou desktop `1920x1080` e mobile `390x844` em `/psicologos`, com ordem **Visibilidade**, **Engajamento**, **Conversão**, tempo real de atenção e sem copy pública de score ponderado.
