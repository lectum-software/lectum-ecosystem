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
- Expor tambem `top_posts` no resumo e no CSV, agregando pageviews reais de posts de comunidade
  por `page_view_event.page_kind="community_post"`/`target_id` e enriquecendo o label com
  `community_post.title` + comunidade real quando o post ainda existir.
- Expor metricas de qualidade somente com formula explicita:
  - taxa de cadastro = cadastros de pacientes e psicologos / visitantes unicos;
  - taxa de rejeicao = sessoes com 1 pageview e sem acao importante / sessoes com pageview;
  - taxa de retorno = visitantes com sessao anterior ao periodo ou mais de uma sessao no periodo / visitantes unicos;
  - tempo medio = media de duracao de pageviews quando houver duracao persistida;
  - sessoes com acao importante = sessoes com eventos de dominio em `important_action_event`.
- Tratar conversoes como agregacoes de eventos reais de dominio e documentar a limitacao de atribuicao, sem prometer atribuicao cross-device absoluta.
- Nao instalar package de grafico, tabela ou mapa: a primeira versao usa SVG/CSS acessivel, listas responsivas e ranking de localizacao como alternativa honesta ao mapa interativo.

## Consequencias

- A tela Admin Trafego passa a refletir dados operacionais reais sem depender de Google Analytics, ferramentas terceiras ou seeds artificiais.
- O custo computacional fica no backend em consultas agregadas sob demanda; se o volume crescer, uma nova ADR devera avaliar pre-agregacao ou jobs analiticos.
- O mapa fica deliberadamente simples nesta etapa para evitar package novo e evitar visual cartografico enganoso quando a fonte disponivel e um ranking por localidade.
- A exportacao CSV herda as mesmas limitacoes e formulas do resumo, reduzindo ambiguidade operacional.
- A exportacao CSV tambem recebe as chaves padrao de agrupamento para entradas dinamicas
  (`/community/*/post/*`, `/community/*`, `/psychologists/*`), e não URLs individuais desses
  registros.
- O ranking de posts reaproveita o tracking first-party ja capturado; posts sem label resolvido
  continuam aparecendo pelo id real em vez de receber mock ou seed visual.
- Os atalhos de periodo reduzem divergencia entre datas calculadas no cliente e no backend; o cliente
  exibe o periodo efetivo retornado pelo resumo e nao cria range artificial para **Todo o periodo**.

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

## Task relacionada

- TASK-50
