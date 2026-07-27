# ADR-0230: Agregacoes administrativas de trafego sem BI externo

## Status

Accepted

## Contexto

A TASK-50 implementa a tela Admin Trafego usando a referencia visual `_product/proto/admin/Tráfego.png` e os contratos de tracking criados nas TASK-47 e TASK-49. A tela precisa consolidar sessoes, pageviews, origem, dispositivos, tipos de usuario, localizacao, entradas, conversoes, qualidade e rankings sem usar mocks nem ferramentas externas de BI.

O Builder/Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao estava disponivel como ferramenta MCP nesta execucao; a imagem local exportada foi usada como referencia visual auditavel.

## Decisao

- Calcular as metricas de Trafego sob demanda em endpoints admin privados:
  - `GET /api/admin/private/traffic/summary`;
  - `GET /api/admin/private/traffic/export`.
- Reutilizar apenas dados reais ja existentes: `visitor_session`, `page_view_event`, `important_action_event`, `visitor_location`, `user`, `community`, `community_post`, `post_reply`, `contact_request` e assinaturas profissionais.
- Manter o periodo padrao em 30 dias e limite maximo inicial em 180 dias, validando `from <= to`.
- Usar as mesmas agregacoes no CSV de exportacao, evitando divergencia entre tela e relatorio.
- O endpoint de resumo aceita presets reais de periodo (`today`, `week`, `month`, `year`,
  `7d`, `30d`, `90d`, `all` e `custom`). Periodos personalizados continuam limitados a
  180 dias; presets operacionais como **Este ano** e **Todo o periodo** podem chegar a 3660 dias e
  usam a menor data real encontrada nas fontes reais de trafego e conversao (sessoes, pageviews,
  acoes importantes, localizacao e registros de dominio agregados) para o inicio de **Todo o periodo**.
- Consolidar, em **Principais páginas de entrada**, URLs dinamicas de posts, comunidades e perfis
  de psicologos por tipo de entrada, mantendo páginas não dinamicas por path exato. Assim, dois
  posts diferentes aparecem como uma linha **Posts** em vez de duas linhas por URL.
- Exibir a lista **Principais páginas de entrada** por nomes operacionais, sem subtitulo de path/slug
  abaixo do titulo. As chaves tecnicas seguem no contrato para agrupamento/exportacao, enquanto a UI
  apresenta rotas comuns como **Login** e **Cadastro de psicólogo** em vez de `/auth/login` ou
  `/auth/register/psychologist`.
- Expor, em cada item de `entry_pages.items`, o campo `conversions`, calculado a partir de
  `important_action_event` com a mesma chave real de visitante/sessao da primeira pageview da
  sessao. Essa atribuicao representa conversoes/acoes importantes geradas na sessao de entrada; ela
  nao tenta atribuir todos os eventos de dominio agregados nem promete atribuicao cross-device.
- Expor tambem `top_posts` no resumo e no CSV, agregando pageviews reais de posts de comunidade
  por `page_view_event.page_kind="community_post"`/`target_id` e enriquecendo o label somente com
  `community_post.title` quando o post ainda existir.
- Os rankings operacionais `top_communities`, `top_posts` e `top_psychologists` expõem `path` como
  rota interna do Admin para drill-down (`/comunidades/[slug]`,
  `/comunidades/[slug]/conteudo/post/[id]` e `/psicologos/[id]`), nao como URL publica.
- Labels de psicologos em `top_psychologists` usam somente `user.name`; CRP e demais dados de
  `psychologist_profile` ficam fora desse ranking resumido para reduzir ruido visual.
- O segmento tecnico `anonymous` de **Tipo de usuario** continua significando sessoes sem usuario
  autenticado vinculado, mas passa a ser exibido como **Visitantes nao autenticados** para evitar
  confusao com anonimato de posts/comunidades.
- Expor metricas de qualidade somente com formula explicita:
  - taxa de cadastro = cadastros de pacientes e psicologos / visitantes unicos;
  - taxa de rejeicao = sessoes com 1 pageview e sem acao importante / sessoes com pageview;
  - taxa de retorno = visitantes com sessao anterior ao periodo ou mais de uma sessao no periodo / visitantes unicos;
  - tempo medio = media de duracao de pageviews quando houver duracao persistida;
  - sessoes com acao importante = sessoes com eventos de dominio em `important_action_event`.
- Tratar conversoes como agregacoes de eventos reais de dominio e documentar a limitacao de atribuicao, sem prometer atribuicao cross-device absoluta.
- Separar o bloco **Conversões geradas** em `conversion_groups.pre_signup` e
  `conversion_groups.post_signup`, mantendo `conversions.items` como contrato compatível para
  exportação/consumidores anteriores.
- Em **Conversões para cadastro**, calcular:
  - `visitor_to_signup`: visitantes únicos do período que aparecem vinculados, pelo mesmo
    `visitor_id`, a usuários `paciente` ou `psicologo` criados no recorte versus visitantes sem
    cadastro vinculado;
  - `signup_roles`: distribuição dos cadastros reais do período entre pacientes e psicólogos;
  - ações de WhatsApp/PWA antes do cadastro a partir de `important_action_event` sem `user_id` ou
    com evento anterior a `user.createdAt`.
- Em **Conversões após cadastro**, usar usuários cadastrados observados no período como base
  (`visitor_session`, `page_view_event`, `important_action_event`, usuários criados no recorte e
  eventos de domínio com `user_id`) e calcular:
  - gráfico geral de usuários com ao menos uma conversão pós-cadastro versus sem conversão;
  - barras por item com usuários únicos e total de eventos, pois posts, comentários, WhatsApp,
    assinatura e PWA podem ocorrer mais de uma vez pelo mesmo usuário.
- WhatsApp e PWA podem aparecer nas duas colunas porque existem antes e depois da autenticação. A
  coluna pré-cadastro usa `important_action_event` por `visitor_id`; a coluna pós-cadastro usa
  eventos de domínio com `user_id` e `occurred_at/createdAt >= user.createdAt`.
- Nao instalar package de grafico, tabela ou mapa: a primeira versao usa SVG/CSS acessivel, listas responsivas e ranking de localizacao como alternativa honesta ao mapa interativo.

## Consequencias

- A tela Admin Trafego passa a refletir dados operacionais reais sem depender de Google Analytics, ferramentas terceiras ou seeds artificiais.
- O custo computacional fica no backend em consultas agregadas sob demanda; se o volume crescer, uma nova ADR devera avaliar pre-agregacao ou jobs analiticos.
- O mapa fica deliberadamente simples nesta etapa para evitar package novo e evitar visual cartografico enganoso quando a fonte disponivel e um ranking por localidade.
- A exportacao CSV herda as mesmas limitacoes e formulas do resumo, reduzindo ambiguidade operacional.
- A exportacao CSV tambem recebe as chaves padrao de agrupamento para entradas dinamicas
  (`/community/*/post/*`, `/community/*`, `/psychologists/*`), e não URLs individuais desses
  registros.
- A exportacao CSV de `entry_page` passa a incluir `conversions` no campo `extra`, mantendo paridade
  com o resumo sem alterar o valor principal da linha, que continua sendo sessoes de entrada.
- O ranking de posts reaproveita o tracking first-party ja capturado; posts sem label resolvido
  continuam aparecendo pelo id real em vez de receber mock ou seed visual.
- Posts sem rota administrativa resolvida ficam com `path=null`, deixando o atalho indisponivel na
  UI em vez de levar a operacao para uma rota falsa ou publica.
- Os atalhos de periodo reduzem divergencia entre datas calculadas no cliente e no backend; o cliente
  exibe o periodo efetivo retornado pelo resumo e nao cria range artificial para **Todo o periodo**.
- As taxas das barras pós-cadastro não somam 100% por desenho: uma pessoa pode gerar múltiplos
  tipos de conversão no mesmo período. O gráfico geral pós-cadastro é o indicador disjunto para
  "teve ao menos uma conversão".
- Cadastros sem `visitor_id` vinculado continuam contabilizados em `signup_roles`, mas não entram
  como visitante convertido em `visitor_to_signup`, evitando atribuição falsa ou cross-device.
- Na UI, os graficos **Visitantes para cadastro** e **Cadastros por perfil** ficam empilhados dentro
  da coluna **Conversoes para cadastro**, evitando cards estreitos e legendas quebradas em desktop
  sem alterar a regra mobile-first.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke API com admin real transitorio em backend local:
  - login admin;
  - `GET /api/admin/private/traffic/summary?from=2026-07-03&to=2026-07-09`;
  - `GET /api/admin/private/traffic/export?from=2026-07-03&to=2026-07-09`;
  - conferencia de origem, dispositivos, PWA, localizacao, paginas de entrada, conversoes e rankings;
  - limpeza dos registros transitorios.
- Browser local com admin real:
  - abertura da rota `/trafego`;
  - troca do periodo para 7 dias;
  - exportacao CSV;
  - validacao mobile (~390px), tablet (768px) e desktop.
- Validacao complementar em 2026-07-26:
  - `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`,
    `pnpm --dir admin build` e `pnpm check`;
  - API real local confirmou `entry_pages.total=238` e agregacao de entradas dinamicas em
    **Posts específicos** (`197`), **Perfis de psicologos** (`4`) e **Comunidades** (`4`);
  - browser local/headless confirmou os paths padrao `/community/*/post/*`, `/psychologists/*` e
    `/community/*` na lista **Principais páginas de entrada**.
- Validacao complementar em 2026-07-27:
  - `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`,
    `pnpm --dir admin build` e `pnpm check`;
  - API real local confirmou `entry_pages.total=238`, grupo **Posts** (`197`), label **Login**
    (`10`) e label **Cadastro de psicólogo** (`3`);
  - browser local/headless confirmou a lista **Principais páginas de entrada** sem subtitulos de
    path/slug, sem **Posts específicos** e sem exibir `/auth/login`,
    `/auth/register/psychologist`, `/community/*/post/*`, `/community/*` ou `/psychologists/*`.
- Validacao complementar em 2026-07-27 para rankings:
  - API real local confirmou labels de posts sem comunidade, labels de psicologos sem CRP, paths
    internos do Admin e `path=null` para posts nao resolvidos;
  - browser local/headless em `http://localhost:3002/trafego` confirmou links `Ir ate ... no Admin`
    sem `target="_blank"` e sem href publico.
- Validacao complementar em 2026-07-27 para conversoes por entrada:
  - API real local confirmou `entry_pages.source=page_view_event.is_entry+important_action_event.session_id`,
    `entry_pages.total=238` e campo `conversions` numerico nos itens de entrada;
  - `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`,
    `pnpm --dir admin build` e `pnpm check` executados sem erros.
- Validacao complementar em 2026-07-27 para copy de tipo de usuario:
  - `buildTrafficSummary({ period: "30d" })` contra banco local confirmou o label
    **Visitantes nao autenticados** em `user_types.items`;
  - `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`,
    `pnpm --dir admin build` e `pnpm check` executados sem erros.
- Validacao complementar em 2026-07-27 para conversoes em duas colunas:
  - API real local confirmou `conversion_groups.pre_signup` com gráficos de cadastro/perfil,
    `conversion_groups.post_signup.overall` e barras pós-cadastro com usuários únicos + eventos;
  - `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`,
    `pnpm --dir admin build` e `pnpm check` executados sem erros.
- Validacao complementar em 2026-07-27 para empilhamento dos graficos de cadastro:
  - `pnpm --dir admin check` e `pnpm --dir admin build` executados sem erros;
  - HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Task relacionada

- TASK-50
