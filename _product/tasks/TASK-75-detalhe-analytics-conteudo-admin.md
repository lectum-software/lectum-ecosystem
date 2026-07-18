# TASK-75: Detalhe analítico administrativo de conteúdo e retenção de vídeo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-75 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Comunidades / Conteúdo / Analytics |
| Status | Pending |
| Dependências | TASK-23, TASK-24, TASK-26, TASK-40, TASK-42, TASK-45, TASK-46, TASK-49, TASK-51, TASK-57, TASK-71, TASK-72, TASK-74 |
| ADR alvo | `adrs/0278-detalhe-analytics-conteudo-admin.md` |

## Contexto

O Admin já possui dashboard de comunidades, detalhe de comunidade com abas contextuais, listagem de **Conteúdo**, ranking, denúncias, atividades, moderação auditada e métricas agregadas. Também já existem métricas por item em cards/listas administrativas, como visualizações, upvotes, downvotes, comentários, salvamentos, compartilhamentos, cliques WhatsApp e denúncias.

Ainda falta, porém, uma página de detalhe operacional para um conteúdo específico. Hoje o Admin consegue ver o item na listagem e abrir o post original no site público, mas não possui uma visão dedicada para entender:

- desempenho acumulado e por período de um post/resposta;
- evolução temporal de visualizações e engajamento;
- origem e qualidade das interações;
- denúncias e eventos de moderação associados;
- contexto completo do autor, comunidade e conteúdo;
- retenção de vídeo quando o conteúdo possui mídia de vídeo.

O produto já tem gráfico de retenção real para **vídeo de apresentação do psicólogo** (`profile_video_watch_session`) e padrões visuais administrativos consolidados em TASK-57/TASK-72. Para vídeos publicados em posts/respostas de comunidade, entretanto, não existe ainda tabela real de retenção. Esta task deve criar uma fundação first-party específica para vídeos de conteúdo, sem backfill, sem estimativa enganosa e sem inferir retenção a partir de pageviews.

Decisões de produto desta task:

- Criar uma página administrativa de detalhe analítico de conteúdo dentro do contexto da comunidade.
- A rota preferida é contextual: `/comunidades/[slug]/conteudo/[type]/[id]`, onde `type` diferencia `post` e `comment`/`reply` conforme o padrão real do Admin.
- A página deve ser acessível a partir da aba **Conteúdo**, dos blocos de posts recentes/populares e de outros pontos administrativos que listam posts/respostas.
- Métricas de conteúdo devem usar fontes reais já existentes (`community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `post_share`, `post_report`, `page_view_event`, `important_action_event`, `content_moderation_event`).
- Retenção de vídeo de conteúdo deve usar nova persistência first-party real definida em `DATA-MODEL.md` como `content_video_watch_session`.
- Se o conteúdo não tiver vídeo, a seção de retenção não deve aparecer.
- Se o conteúdo tiver vídeo mas ainda não houver eventos reais suficientes, mostrar estado honesto de indisponibilidade/coleta iniciada, nunca gráfico fake.
- Não criar métricas clínicas, de sessão terapêutica, mensagens privadas, WhatsApp fora do clique registrado nem inferências sobre atendimento.

## Objetivo

Permitir que um Admin autenticado abra o detalhe de um post ou resposta de comunidade e veja, em uma página dedicada, dados reais do conteúdo, estatísticas por período, evolução de engajamento, contexto de moderação/denúncias e, quando houver vídeo com tracking real, gráfico de retenção e consumo do vídeo.

## Pré-requisitos e bloqueios

- TASK-23, TASK-24 e TASK-26 concluídas: feed, criação e detalhe de post/respostas reais.
- TASK-40 concluída: rotas públicas canônicas fora de `/app` para comunidades/posts.
- TASK-42 concluída: referência de layout/social para vídeo-resposta e mídia vertical.
- TASK-45 e TASK-46 concluídas: autenticação Admin real e app `admin/`.
- TASK-49 concluída: tracking first-party de pageviews/origem/sessão.
- TASK-51 concluída: dashboard administrativo de comunidades.
- TASK-57 e TASK-72 concluídas: padrões administrativos de estatísticas, retenção de vídeo e blocos analíticos.
- TASK-71 concluída: abas administrativas da comunidade, conteúdo, ranking completo e moderação auditada.
- TASK-74 concluída: eventos de moderação textual sensível (`content_moderation_event`).
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`;
  - `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.
- Não há protótipo específico para a página de detalhe analítico de conteúdo nesta data. Usar padrões visuais existentes do Admin e registrar a limitação.
- Se Builder/Quick Copy estiver disponível, usar como complemento visual; se não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Antes de alterar `backend/prisma/schema.prisma`, validar a seção `content_video_watch_session` em `DATA-MODEL.md`.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Se `prisma migrate dev` falhar por dados/estado preexistente, parar e perguntar ao usuário antes de resetar banco.
- Não usar mocks, endpoints simulados, seed fake, backfill artificial, dados inventados ou retenção estimada sem fonte real.
- Não instalar pacote novo por padrão; se for necessário, validar `PACKAGES.md` e registrar ADR.

## Escopo frontend

### Admin - rota de detalhe analítico de conteúdo

Criar a página mobile-first no app `admin/`, preferencialmente:

- `/comunidades/[slug]/conteudo/post/[id]` para posts;
- `/comunidades/[slug]/conteudo/comment/[id]` ou `/reply/[id]` para respostas/comentários, escolhendo o termo já usado no Admin e registrando no ADR.

A página deve conter, no mínimo:

1. **Cabeçalho contextual**
   - breadcrumb: Comunidades > comunidade > Conteúdo > detalhe;
   - título do conteúdo ou fallback seguro (`Post sem título`, `Resposta`);
   - tipo do conteúdo: post, resposta/comentário, vídeo-resposta, post anônimo etc.;
   - status: publicado/removido/bloqueado quando aplicável;
   - CTA para abrir conteúdo público quando existir URL pública;
   - CTA para voltar à aba **Conteúdo** preservando filtros quando possível.

2. **Preview do conteúdo**
   - texto/título/excerpt seguro;
   - mídia principal quando existir;
   - vídeo com player administrativo reutilizando padrão já existente do Admin;
   - origem/contexto quando for resposta (post pai ou comentário pai);
   - autor com avatar via `Image` de `next/image`, papel, selo verificado quando aplicável e marcador de anonimato público quando houver.

3. **Cards de estatísticas principais**
   - visualizações;
   - upvotes;
   - downvotes;
   - comentários/respostas geradas;
   - salvamentos;
   - compartilhamentos;
   - cliques WhatsApp quando o conteúdo for de psicólogo e houver CTA real;
   - denúncias;
   - eventos de moderação associados.

4. **Gráfico de evolução por período**
   - filtro próprio de período: Hoje, Esta semana, Este mês, Este ano, Todo o período e Personalizado, se compatível com os padrões já existentes;
   - séries por dia/semana conforme janela: visualizações, votos, comentários, salvamentos, compartilhamentos e denúncias;
   - alternativa textual acessível;
   - estado honesto quando não houver dados.

5. **Retenção de vídeo**
   - renderizar somente se o conteúdo tiver mídia de vídeo;
   - mostrar visualizações de vídeo, conclusão, replay, tempo médio assistido, retenção média e maior queda quando houver dados reais;
   - gráfico de retenção reutilizando o padrão visual do vídeo de apresentação do psicólogo;
   - se `content_video_watch_session` ainda não tiver dados suficientes, exibir `Retenção indisponível - a coleta começa a partir dos próximos acessos ao vídeo.`;
   - não mostrar retenção para imagem, texto puro ou áudio.

6. **Moderação e denúncias**
   - lista resumida de denúncias associadas ao conteúdo;
   - eventos `content_moderation_event` relacionados;
   - status de resolução quando houver;
   - link/ação para remover conteúdo publicado usando o fluxo auditado existente da TASK-71, sem duplicar endpoint de remoção.

7. **Metadados operacionais**
   - comunidade;
   - autor;
   - data de publicação;
   - última edição/remoção quando existir;
   - origem das métricas;
   - indicação de indisponibilidades históricas sem alarmismo.

### Pontos de entrada

Adicionar links para a página de detalhe analítico em:

- aba **Conteúdo** do detalhe de comunidade;
- blocos **Postagens mais recentes** e **Posts mais populares** do dashboard de comunidades, se o produto quiser diferenciar `Abrir público` de `Ver detalhes`; caso o clique principal continue abrindo o site público, incluir ação secundária acessível para o detalhe Admin;
- aba **Publicações** do detalhe administrativo do psicólogo, quando o item for post/resposta de comunidade;
- lista de denúncias/moderação quando o evento possuir conteúdo publicado.

### Regras de UI

- Mobile-first base ~390px, progredindo para desktop.
- Não usar `<img>` cru; usar `Image` de `next/image`.
- Tema claro/escuro/sistema por tokens existentes.
- Reutilizar componentes/padrões do Admin antes de criar estrutura nova.
- Gráficos em SVG/HTML simples já existentes; não instalar biblioteca de gráfico.
- Filtros de período simples podem usar inputs/selects existentes; se houver formulário complexo, usar a fundação da TASK-02 quando aplicável ao app correspondente.

## Escopo frontend público

Para alimentar retenção real de vídeos de conteúdo, atualizar o frontend público/autenticado onde vídeos de posts/respostas são exibidos:

- `/community/[slug]/post/[id]`;
- `/community/[slug]/post/[id]/thread/[replyId]` quando aplicável;
- feed/listas que reproduzem vídeo inline, se houver reprodução real ali.

Comportamentos esperados:

- Gerar `visitor_id` e `session_id` já compatíveis com a fundação de analytics first-party.
- Enviar eventos de consumo de vídeo de conteúdo para endpoint real, sem payload textual do post/resposta.
- Consolidar heartbeats por sessão sem gerar evento a cada segundo.
- Enviar duração, maior posição alcançada, segundos únicos assistidos quando possível, replay, conclusão e buckets de retenção.
- Não enviar conteúdo digitado, texto do post, comentários, token, query sensível, IP bruto ou user-agent bruto.
- Não contar autoplay invisível como retenção se o player não estiver efetivamente reproduzindo.

## Escopo backend

### Novo tracking first-party de vídeo de conteúdo

Criar persistência real conforme `DATA-MODEL.md`:

- modelo `content_video_watch_session`;
- migration real;
- endpoint público/first-party para upsert de sessão de vídeo, preferencialmente:
  - `POST /api/public/analytics/content-video-watch`;
  - ou endpoint equivalente se a arquitetura existente indicar outro namespace.

Regras de domínio:

- `target_type` aceita apenas `post` e `reply` na V1.
- `target_id` deve apontar para `community_post.id` ou `post_reply.id` real, publicado e não deletado.
- Persistir `community_id` derivado do conteúdo real, nunca vindo apenas do frontend como verdade final.
- Não persistir evento para conteúdo removido/deletado.
- `session_key` deve consolidar atualizações do mesmo visitante/sessão/alvo.
- Se houver usuário autenticado, associar `viewer_id`; visitantes anônimos permanecem nulos.
- Se o autor do conteúdo assistir ao próprio vídeo autenticado, não contabilizar na métrica pública/Admin do conteúdo, ou persistir com flag excluível somente se houver justificativa em ADR. Preferência: não persistir auto-view do autor autenticado.
- Normalizar e limitar duração/posição para evitar valores absurdos.
- `retention_buckets` deve ser derivado no backend a partir da maior posição/duração/buckets recebidos de forma segura.
- Não criar backfill para vídeos antigos.

### Endpoint Admin de detalhe analítico

Criar ou estender endpoints Admin privados reais, protegidos por autenticação Admin:

- `GET /api/admin/private/communities/:id/content/:type/:contentId/detail`
  - retorna identidade do conteúdo, autor, comunidade, mídia, status, URL pública, contexto e métricas agregadas;
  - aceita `period`, `from`, `to` para métricas temporais;
  - pode incluir analytics e moderação no mesmo contrato quando performático.

Se necessário por performance/organização, separar:

- `GET /api/admin/private/communities/:id/content/:type/:contentId/analytics`;
- `GET /api/admin/private/communities/:id/content/:type/:contentId/moderation`.

A decisão deve ser registrada no ADR.

### Contrato esperado do detalhe

O backend deve retornar dados seguros equivalentes a:

```ts
type AdminContentAnalyticsDetail = {
  content: {
    id: string;
    type: "post" | "reply";
    status: "published" | "removed";
    title: string | null;
    excerpt: string;
    body?: string; // somente se já houver padrão seguro para detalhe protegido
    created_at: string;
    updated_at: string;
    public_url: string | null;
    media: {
      media_type: "image" | "video" | string;
      media_url: string;
      cover_url: string | null;
      duration_seconds: number | null;
    } | null;
  };
  community: { id: string; name: string; slug: string };
  author: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
    gender: string | null;
    anonymous: boolean;
    verified: boolean;
  };
  period: {
    from: string | null;
    to: string | null;
    label: string;
    timezone: "server-local";
  };
  metrics: {
    views_count: number;
    upvotes_count: number;
    downvotes_count: number;
    comments_count: number;
    saves_count: number;
    shares_count: number;
    whatsapp_clicks_count: number;
    reports_count: number;
    moderation_events_count: number;
  };
  series: Array<{
    date: string;
    views: number;
    upvotes: number;
    downvotes: number;
    comments: number;
    saves: number;
    shares: number;
    whatsapp_clicks: number;
    reports: number;
  }>;
  video: null | {
    available: boolean;
    unavailable_reason: string | null;
    source: "content_video_watch_session";
    metrics: {
      plays_count: number;
      completed_count: number;
      completion_rate: number;
      replay_count: number;
      average_watched_seconds: number | null;
      average_retention_percent: number | null;
      duration_seconds: number | null;
    };
    retention: Array<{
      label: string;
      position_percent: number;
      percentage: number;
    }>;
    retention_dropoff: null | {
      from_label: string;
      to_label: string;
      rate_drop: number;
    };
  };
  moderation: {
    reports: Array<unknown>;
    events: Array<unknown>;
  };
  source: string;
};
```

O shape final deve seguir o padrão real de `admin/src/api/req/communities` e dos DTOs backend, sem `select/include` vindos do frontend.

### Regras de cálculo

- Visualizações usam `page_view_event` com `target_type` compatível (`community_post`/`post` para post; `post_reply`/`reply` para resposta) e `target_id` do conteúdo.
- Upvotes/downvotes usam `post_vote` real.
- Salvamentos usam `post_save` para posts e `post_reply_save` para respostas.
- Compartilhamentos usam `post_share` real.
- WhatsApp usa `important_action_event.action_type="whatsapp_click"` quando `target_type/target_id` apontarem explicitamente para o conteúdo.
- Denúncias usam `post_report` real.
- Moderação usa `content_moderation_event` real.
- Comentários de post usam `post_reply` associado ao post; para resposta, contar filhos/árvore se existir relação real, ou retornar zero honesto com `unavailable_reason` se não houver suporte confiável.
- Retenção usa somente `content_video_watch_session`.
- Não inferir retenção de `page_view_event.duration_seconds`.
- Não redistribuir cliques WhatsApp históricos sem alvo explícito.

## Fora do escopo

- Analytics de pacientes como entidade individual.
- Métricas clínicas, sessões terapêuticas, atendimento, mensagens privadas ou conversas WhatsApp.
- Moderação por IA ou análise semântica nova.
- Backfill histórico de retenção de vídeo.
- Estimar retenção a partir de visualização de página.
- Alterar o ranking de mentores.
- Criar tela global de todos os conteúdos fora do contexto de comunidade, salvo se ADR justificar.
- Trocar o player de vídeo público por biblioteca externa.
- Instalar biblioteca de gráficos.
- Criar dashboard paralelo de comunidades.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos backend, app Admin, UI mobile-first e regras de data fetching.
- `DATA-MODEL.md`: seção `content_video_watch_session` e analytics first-party.
- `PACKAGES.md`: usar pacotes já instalados; não instalar gráfico/analytics externo.
- `PROTO-INVENTORY.md`: registrar ausência de protótipo específico e imagens Admin usadas.
- TASK-49: pageviews, origem e privacidade de analytics.
- TASK-57/TASK-72: padrões de gráficos, retenção e estatísticas no Admin.
- TASK-71/TASK-74: conteúdo administrativo, moderação auditada e eventos sensíveis.

Backend esperado:

- Migration para `content_video_watch_session` se ainda não existir.
- `pnpm --dir backend db:migrate` obrigatório quando schema/migrations forem alterados.
- Endpoint público first-party para registrar consumo de vídeo de conteúdo.
- Endpoint(s) Admin privado(s) para detalhe/analytics/moderação do conteúdo.
- Validators reais para `type`, `id`, período e payload de watch.
- Repositories/services/helpers compartilháveis para métricas de conteúdo.
- Traduções PT-BR para erros user-facing.
- Sanitização explícita de snapshots/trechos sensíveis.
- Sem logs de conteúdo bruto ou payload de analytics.

Frontend Admin esperado:

- Rota nova em `admin/src/app/(admin)/comunidades/[slug]/conteudo/...` ou equivalente justificado.
- Atualização de `admin/src/api/req/communities`, callers e query keys.
- Links de entrada a partir das listas/cards existentes.
- Componentes de detalhe, gráfico temporal e retenção reutilizando padrões locais.
- Ações de remoção/revisão reaproveitando mutations existentes quando aplicável.
- Browser local obrigatório para validar rota.

Frontend público esperado:

- Tracking de consumo de vídeo de conteúdo no player/componente existente.
- Chamada HTTP via padrão `frontend/src/api/req`/`callers` quando aplicável ou helper de analytics já existente.
- Preservar performance e não enviar heartbeats excessivos.
- Não alterar permissão de upload/mídia.

Packages usados:

- Somente pacotes já instalados.
- Não instalar PostHog, Mixpanel, GA, player externo ou biblioteca de gráficos.

Regras anti-recriação:

- Reutilizar padrões existentes de:
  - Admin shell;
  - cards/tabelas/listas;
  - modais/actions de remoção da TASK-71;
  - gráficos SVG/HTML já usados em Admin;
  - tracking de pageview/important action;
  - player de vídeo vertical existente.
- Não criar design system paralelo.
- Não criar API client paralelo.
- Não duplicar endpoint de remoção/moderação.

## Critérios de aceite

- [ ] Existe uma rota Admin para detalhe analítico de post/resposta de comunidade.
- [ ] A rota é acessível a partir da aba **Conteúdo** de comunidade.
- [ ] A rota mostra identidade do conteúdo, comunidade, autor, status, mídia e URL pública quando disponível.
- [ ] Métricas principais usam fontes reais e não mocks.
- [ ] Há gráfico de evolução por período com alternativa textual acessível.
- [ ] O período do detalhe é independente dos filtros de outras páginas.
- [ ] Conteúdo sem vídeo não renderiza seção de retenção.
- [ ] Conteúdo com vídeo e sem dados suficientes mostra estado honesto de indisponibilidade/coleta iniciada.
- [ ] Conteúdo com vídeo e eventos reais mostra gráfico de retenção baseado em `content_video_watch_session`.
- [ ] O frontend público registra consumo de vídeo de posts/respostas em endpoint real first-party.
- [ ] O backend persiste `content_video_watch_session` sem conteúdo textual, IP bruto, user-agent bruto, tokens ou query sensível.
- [ ] Não há backfill, seed fake ou retenção estimada por pageview.
- [ ] Denúncias e eventos de moderação associados aparecem no detalhe.
- [ ] Remoção de conteúdo publicado reaproveita fluxo auditado existente.
- [ ] UI mobile-first, tema claro/escuro e nenhum `<img>` cru.
- [ ] Nenhum package novo foi instalado, salvo ADR explícito e validação de `PACKAGES.md`.
- [ ] Se houve alteração de schema/migrations, `pnpm --dir backend db:migrate` foi executado.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Browser local validou a rota Admin e pelo menos um post real.
- [ ] ADR criado/atualizado em `adrs/`.
- [ ] Critérios de aceite foram marcados `[x]` somente após evidência.
- [ ] Commit próprio e `git push` executados.

## Validação mínima

- `pnpm --dir backend db:migrate` quando houver migration/schema.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build` se tracking público/rotas públicas mudarem.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Smoke HTTP/Admin local da rota nova.
- Browser local autenticado no Admin:
  - abrir detalhe a partir da aba Conteúdo;
  - alternar período;
  - abrir conteúdo público;
  - validar estado sem vídeo;
  - validar estado de vídeo sem retenção histórica.
- Quando houver vídeo real reproduzível, validar que a sessão é persistida e aparece no detalhe após refetch.

## Notas de execução

- Esta task deve ser executada sem tentar "melhorar" toda a navegação de conteúdo do Admin. O foco é detalhe analítico por item.
- Se a execução decidir que a rota global `/conteudos/[type]/[id]` é superior à rota contextual, registrar ADR explicando trade-off de contexto vs. simplicidade.
- Retenção de vídeos publicados antes da task deve começar vazia; isso é esperado e deve ser explicado na UI.
- Evitar múltiplos eventos por segundo. A coleta deve consolidar heartbeats por `session_key`.
- Se o player atual não expuser duração ou posição de forma confiável em algum navegador, retornar `duration_seconds=null`/estado honesto em vez de fabricar curva.
- Se `prisma migrate dev` falhar por estado do banco, perguntar ao usuário antes de resetar banco ou rodar comando destrutivo.