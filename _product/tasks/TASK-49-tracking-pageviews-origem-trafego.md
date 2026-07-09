# TASK-49: Tracking de pageviews e origem de tráfego

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-49 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Analytics |
| Status | Completed |
| Dependências | TASK-39, TASK-40, TASK-47 |
| ADR alvo | ADR sobre analytics first-party, pageviews, origem de tráfego e privacidade |

## Contexto

A tela Admin de Tráfego (`_product/proto/admin/Tráfego.png`) mostra dados que vão além da captura atual de localização e do futuro `visitor_session` da TASK-47. Hoje a Lectum tem:

- `x-device` como identificador/fingerprint de device, sem tipo de dispositivo persistido;
- `visitor_location` com localização por IP/proxy;
- eventos de domínio pontuais (`profile_view_event`, `post_share`, posts, replies, contatos, assinaturas etc.).

Ainda não existe camada first-party de pageviews/sessões de navegação com `path`, página de entrada, referrer/UTM, origem de tráfego, tempo de permanência e páginas por sessão. Sem essa task, blocos da tela Tráfego como "Origem do tráfego", "Páginas de entrada", "Taxa de rejeição", "Tempo médio na plataforma", "Páginas por sessão", "Taxa de retorno" e "Tráfego por comunidade/psicólogo" seriam mockados ou imprecisos.

## Objetivo

Criar tracking real, first-party e privacidade-minimalista de pageviews e origem de tráfego para alimentar a aba Admin Tráfego e complementar o Dashboard.

## Pré-requisitos e bloqueios

- TASK-47 concluída, com `visitor_session` ou equivalente persistindo `visitor_id`, `session_id` e `device_type`.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Tráfego.png` como referência visual de dados necessários.
- Não armazenar IP bruto.
- Não armazenar user-agent bruto.
- Não criar tracking de terceiros.
- Se algum dado exigir consentimento/decisão LGPD adicional, parar e registrar bloqueio.

## Escopo frontend

- Criar tracking client-side global para pageview em navegação inicial e trocas de rota.
- Enviar payload mínimo para backend público:
  - `visitor_id`;
  - `session_id`;
  - `path`;
  - `title?`;
  - `referrer?` sanitizado;
  - `utm_source?`;
  - `utm_medium?`;
  - `utm_campaign?`;
  - `utm_content?`;
  - `utm_term?`;
  - `page_kind?` derivado no client somente quando seguro, ou derivado no backend;
  - `occurred_at?` opcional.
- Capturar modo PWA/app instalado:
  - `display_mode`: `browser | standalone | fullscreen | minimal-ui | unknown`;
  - evento `pwa_install_prompt_accepted` ou `pwa_installed` apenas quando o browser expuser o evento real.
- Enviar heartbeat/fechamento de página apenas se possível sem degradar UX, usando `sendBeacon` ou request silenciosa.
- Falhas de analytics devem ser silenciosas.

## Escopo backend

- Criar modelos Prisma para pageviews e, se necessário, ações importantes:
  - recomendado: `page_view_event`;
  - opcional/justificado: `important_action_event`.
- Criar endpoint público:
  - `POST /api/public/analytics/page-view`
  - opcional: `POST /api/public/analytics/action`
- Validar payload e normalizar origem de tráfego.
- Associar `user_id` quando houver token válido, sem exigir auth.
- Associar/atualizar sessão criada pela TASK-47.
- Calcular e persistir campos derivados úteis:
  - `traffic_source`;
  - `traffic_medium`;
  - `entry_path` ou flag de primeira pageview da sessão;
  - `page_kind`: `home`, `psychologists`, `psychologist_profile`, `community`, `community_post`, `login`, `signup`, `billing`, `other`;
  - `target_type`/`target_id` quando a URL permitir derivação segura.
- Criar índices para agregações por período, path, origem, sessão, user e tipo de página.

## Fora do escopo

- Implementar a tela Admin Tráfego.
- Criar dashboard visual.
- Instalar pacote externo de analytics.
- Criar integração com Google Analytics, Meta Pixel, Mixpanel, PostHog ou similares.
- Capturar conteúdo sensível de query string.
- Capturar texto digitado, payloads de formulário ou dados pessoais extras.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos backend, validação, resposta, Prisma e regras de privacidade.
- `DATA-MODEL.md`: convenções de modelo, soft delete e relação com `user`.
- `PACKAGES.md`: não instalar pacote novo.

Backend esperado:

- Modelo sugerido `page_view_event`:
  - `id`
  - `deleted`, `deletedAt`, `createdAt`, `updatedAt`
  - `visitor_id String`
  - `session_id String`
  - `user_id String?`
  - `path String`
  - `normalized_path String`
  - `title String?`
  - `referrer_host String?`
  - `traffic_source String @default("direct")`
  - `traffic_medium String?`
  - `utm_source String?`
  - `utm_medium String?`
  - `utm_campaign String?`
  - `utm_content String?`
  - `utm_term String?`
  - `page_kind String @default("other")`
  - `target_type String?`
  - `target_id String?`
  - `display_mode String @default("unknown")`
  - `duration_seconds Int?`
  - `occurred_at DateTime @default(now())`
  - relação opcional com `user`
  - índices por `[occurred_at]`, `[session_id, occurred_at]`, `[visitor_id, occurred_at]`, `[user_id, occurred_at]`, `[traffic_source, occurred_at]`, `[page_kind, occurred_at]`, `[target_type, target_id, occurred_at]`
  - `@@map("page_view_events")`
- Origem de tráfego:
  - `direct` quando não houver referrer/UTM;
  - `google`/`search` para referrers de busca conhecidos;
  - `instagram`/`social`, `whatsapp`/`share`, `lectum_community`/`internal`, `lectum_profile`/`internal`, etc.;
  - regra determinística no service, documentada e testável manualmente.
- Sanitização:
  - salvar apenas host do referrer externo;
  - remover query string sensível de `path` e preservar somente UTMs permitidas;
  - limitar tamanho de strings.
- Compatibilidade:
  - não quebrar `LocationCapture`;
  - não exigir sessão autenticada.

Frontend esperado:

- Componente global de analytics no `frontend`.
- Reutilizar `visitor_id`/`session_id` da captura existente.
- Chamar endpoint em mudança de rota do Next App Router.
- Evitar duplicidade de pageview para a mesma rota no mesmo render.
- Capturar `document.referrer` somente para primeira pageview da sessão quando aplicável.
- Capturar UTMs da URL e persistir em sessionStorage para atribuição da sessão.
- Detectar PWA:
  - `window.matchMedia("(display-mode: standalone)")`;
  - `navigator.standalone` para iOS quando existir;
  - evento `appinstalled`, quando suportado.

Packages usados:

- Nenhum pacote novo.

Regras anti-recriação:

- Reutilizar `visitor_id`/`session_id` criados na analytics atual.
- Reutilizar padrões existentes de callers/req no frontend e controller/service/repository/validator no backend.
- Não criar um "analytics mock" para preencher a tela.

## Critérios de aceite

- [x] Pageviews reais são persistidos ao navegar por rotas públicas e privadas permitidas.
- [x] O tracking associa `visitor_id`, `session_id` e `user_id` quando houver usuário autenticado.
- [x] Origem de tráfego é normalizada a partir de UTMs/referrer sem salvar URL externa completa.
- [x] Páginas de entrada por sessão podem ser identificadas por agregação real.
- [x] `display_mode` permite distinguir uso em browser e PWA/standalone quando o browser suportar.
- [x] Não há armazenamento de IP bruto, user-agent bruto, texto digitado ou payload de formulário.
- [x] Não há pacote externo de analytics.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteração de banco/schema/migrations, `pnpm --dir backend db:migrate` foi executado sem erro.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check` e `pnpm check` foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`
- Browser local:
  - abrir página pública com UTM;
  - navegar entre rotas;
  - logar e navegar novamente;
  - verificar registros reais no banco;
  - testar modo standalone/PWA quando possível.

## Notas de execução

- Métricas como taxa de rejeição e tempo médio só devem ser calculadas na TASK-50 se o dado de duração/pageviews por sessão for confiável.
- Se o navegador bloquear beacon/analytics, a experiência do usuário deve continuar normal.
- Se `prisma migrate dev` falhar por estado local, perguntar antes de resetar banco.



### Execucao 2026-07-09

- Dependencias TASK-39, TASK-40 e TASK-47 confirmadas como concluidas em `_product/tasks/README.md`.
- Builder/Quick Copy nao estava disponivel como ferramenta MCP nesta execucao; a referencia de dados usada foi a imagem local da tela Trafego em `_product/proto/admin/`, registrada no inventario visual.
- Backend criado com tracking first-party em `page_view_event` e `important_action_event`, endpoint publico de pageview, endpoint publico de acao PWA e atualizacao de duracao por rota/fechamento de pagina.
- O tracking associa `visitor_id`, `session_id`, `visitor_session` e `user_id` quando ha token real opcional; nao exige autenticacao para navegacao publica.
- Origem de trafego e normalizada no backend por UTM/referrer; o path remove queries sensiveis e o referrer externo persiste somente como host.
- Frontend passou a incluir tracker global no layout, reaproveitando os IDs da captura de sessao/localizacao, persistindo UTMs permitidas na sessao e enviando eventos PWA apenas a partir dos eventos reais expostos pelo browser/fluxo de instalacao.
- Validacao de API criou usuario/token transitorio real, persistiu pageview autenticado, duracao, evento PWA e confirmou limpeza dos registros transitorios.
- Validacao em browser local usou Chrome DevTools Protocol com app frontend temporario em `http://localhost:3100`, navegou com UTM entre `/psychologists` e `/community`, confirmou registros reais no banco e removeu dados transitorios.
- Validacao em browser autenticado definiu cookie de token real transitorio, navegou em `/psychologists` e confirmou `user_id` associado no `page_view_event`, sem query sensivel persistida.
- Migrations aplicadas com `pnpm --dir backend db:migrate`; apos a criacao da migration, o comando foi reexecutado e confirmou schema em sincronia.
