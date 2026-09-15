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
- A UI de **Conversoes geradas** nao exibe as fontes tecnicas (`visitor_id+...`,
  `user+domain_events`) nem as descricoes longas dos itens. Essas informacoes continuam no payload e
  na exportacao, mas a tela prioriza leitura operacional com periodo, graficos e tabelas simples.
- As conversoes antes/depois do cadastro usam tabela com conversao, pessoas, eventos e taxa, em vez
  de cards com barras, porque o objetivo desse bloco e comparacao rapida e nao ranking visual.

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
- Validacao complementar em 2026-07-27 para tabela simples de conversoes:
  - `pnpm --dir admin check` e `pnpm --dir admin build` executados sem erros;
  - HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Task relacionada

- TASK-50

## Complemento 2026-07-27 - Mapa de acessos por localizacao no padrao pacientes

Por feedback direto de produto, o bloco **Acessos por localizacao** de `/trafego` deve reutilizar a
composicao visual mais completa ja adotada em **Localizacao** de `/pacientes`, em vez do card simples
com top estados e mapa basico.

Decisao:

- Renderizar o bloco com resumo de cidades/estados/paises, mapa SVG amplo, alternancia
  **Estados/Paises**, ranking lateral com barras, legenda inferior de intensidade e rankings
  secundarios.
- Reutilizar as malhas locais `admin/src/lib/brazil-state-map.ts` e
  `admin/src/lib/world-country-map.ts`, sem dependencia nova, sem asset remoto e sem chamada externa
  em runtime.
- Manter `visitor_location` como unica fonte real para o painel; o frontend nao infere estado/pais
  alem do agregado ja retornado pelo backend.
- Permitir somente no cliente Admin local (`localhost`/`127.0.0.1`) um preview visual rotulado quando
  o agregado real vier vazio, para que o layout possa ser validado antes de haver capturas reais no
  ambiente de desenvolvimento. Qualquer agregado real desativa automaticamente esse preview.

Consequencia:

- `/trafego` e `/pacientes` passam a ter leitura geografica consistente, mobile-first e sem pacote
  novo de mapa.
- A operacao continua vendo dados reais de `visitor_location` em producao; o preview local nao cria
  registros, nao altera exportacao, nao muda API e nao participa dos calculos de analytics.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Complemento 2026-07-27 - Copy limpa no bloco online agora

Por feedback direto de produto, o bloco **Usuarios online agora** deve mostrar apenas contexto
operacional legivel e evitar detalhes tecnicos ou faixas de vazio redundantes.

Decisao:

- Remover da UI a fonte tecnica `visitor_session.last_seen_at` do card destacado de visitantes
  ativos.
- Remover a faixa vazia **Nenhum visitante ativo foi encontrado na janela movel atual.** quando a
  contagem atual vier zerada.
- Simplificar a frase de contexto para indicar somente a janela de 5 minutos e o horario de
  atualizacao, sem citar `analytics first-party` nessa microcopy.
- Preservar o contrato e a exportacao existentes, mantendo `summary.online_now.source` disponivel
  para consumidores tecnicos.

Consequencia:

- A leitura fica mais limpa para operacao, sem perder a fonte tecnica no payload/API.
- Estado zerado passa a ser comunicado pelos contadores em `0`, sem faixa adicional.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Complemento 2026-07-27 - Usuarios online agora

Por feedback direto de produto, a tela `/trafego` tambem deve destacar quem esta ativo no momento,
sem depender de rolagem ate outras secoes e sem misturar essa leitura instantanea com as metricas
historicas filtradas.

Decisao:

- Expor `summary.online_now` no resumo administrativo de trafego como snapshot real calculado a
  partir de `visitor_session.last_seen_at`.
- Usar uma janela movel de 5 minutos terminando no horario da consulta, independente do periodo
  selecionado na UI.
- Contar visitantes ativos pelo ultimo registro de sessao de cada `visitor_id` dentro da janela,
  evitando duplicar um visitante que abriu mais de uma sessao recente.
- Manter tambem `active_sessions` como contagem operacional de sessoes ativas na janela, separada da
  contagem de visitantes unicos.
- Classificar o ultimo estado ativo do visitante em pacientes, psicologos ou visitantes nao
  autenticados; admins nao entram porque a audiencia Admin usa outro contexto e nao deve poluir
  analytics first-party do produto.
- Reconsultar o resumo no Admin a cada 60 segundos para atualizar o bloco **Usuarios online agora**,
  sem criar endpoint paralelo.
- Incluir o snapshot atual na exportacao CSV nas secoes `online_now` e `online_now_segment`.

Consequencia:

- A metrica pode aparecer zerada quando nenhuma sessao tiver `last_seen_at` atualizado nos ultimos 5
  minutos; isso e esperado e evita backfill ou mock para preencher o card.
- Os filtros de periodo seguem controlando a analise historica, enquanto **Usuarios online agora**
  representa sempre a janela movel atual.
- A exportacao CSV passa a conter uma foto do momento da exportacao para essa metrica, nao uma serie
  historica.

Validacao complementar:

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- API real local direta em `buildTrafficSummary({ period: "30d" })` confirmou `online_now`,
  `window.minutes=5` e `source=visitor_session.last_seen_at`.
- HTTP local autenticado em `/api/admin/private/traffic/summary?period=30d` confirmou `online_now`
  no contrato.
- HTTP local `GET http://localhost:3024/trafego` retornou `200` e o bundle servido da rota continha
  a copy do bloco **Usuarios online agora**.
- Browser/headless CDP completo ficou limitado pela politica do ambiente, que bloqueou a
  inicializacao de processo auxiliar do Chrome.

## Complemento 2026-07-27 - Tabelas compactas de conversao

Por feedback direto de produto, a leitura operacional do bloco **Conversoes geradas** deve evitar peso textual excessivo e qualquer rolagem horizontal nas tabelas de conversao.

Decisao:

- Manter o periodo apenas no cabecalho geral do bloco, nao nos subtitulos das duas colunas.
- Trocar as legendas dos donuts para acoes em voz ativa: **Se cadastraram**, **Nao se cadastraram**, **Se converteram apos o cadastro** e **Nao se converteram apos o cadastro**.
- Exibir em **Conversao geral apos cadastro** uma explicacao curta: usuarios que realizaram pelo menos uma acao apos se cadastrarem.
- Renderizar as conversoes antes/depois do cadastro em tabela `table-fixed`, largura total, sem `min-width` e sem wrapper de rolagem horizontal.
- Reduzir o peso textual da tabela, preservando destaque apenas para a taxa e mantendo as descricoes tecnicas fora da UI.

Consequencia:

- O bloco fica mais compacto e responsivo, com menos ruido visual para operacao.
- As fontes tecnicas e descricoes continuam disponiveis no contrato/exportacao, mas nao aparecem na tela principal.

Validacao complementar:

- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Complemento 2026-07-27 - Quatro contadores em usuarios online agora

Por feedback direto de produto, o bloco **Usuarios online agora** deve reduzir os contadores
inferiores para a leitura operacional minima pedida na tela.

Decisao:

- Manter o total destacado de visitantes ativos como resumo principal do bloco.
- Substituir os seis contadores inferiores anteriores por apenas quatro cards: **Sessoes ativas**,
  **Pacientes**, **Psicologos** e **Nao autenticados**.
- Reutilizar os campos reais ja existentes em `summary.online_now` sem alterar o contrato do
  backend nem a exportacao CSV.
- Remover da UI as barras percentuais dos segmentos nessa area para diminuir ruido visual.

Consequencia:

- O bloco fica mais compacto e direto, preservando a diferenca entre sessoes ativas e visitantes
  ativos.
- A API continua expondo os demais campos do snapshot para compatibilidade e exportacao, mas a tela
  principal mostra somente a leitura solicitada.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Complemento 2026-07-27 - Aviso de visitantes rastreados nas conversoes

Por feedback direto de produto, o grafico **Visitantes para cadastro** precisa deixar explicita a
limitacao de atribuicao do recorte rastreado para nao ser lido como o universo absoluto de cadastros
do periodo.

Decisao:

- Exibir abaixo do titulo **Visitantes para cadastro** uma copy curta informando que os registros
  consideram apenas visitantes rastreados.
- Informar tambem que podem existir outros usuarios cadastrados sem rastreamento associado.
- Manter a formula e o contrato inalterados: o grafico continua calculado por identidade
  first-party rastreavel (`visitor_id`) e nao tenta completar usuarios sem ponte de tracking.

Consequencia:

- A UI fica mais honesta sobre a diferenca entre cadastros rastreados e cadastros totais.
- A operacao consegue reconciliar visualmente casos em que o total de usuarios cadastrados do
  periodo seja maior que os visitantes rastreados convertidos.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

## Complemento 2026-07-27 - Posicao e colunas das conversoes em Trafego

Por feedback direto de produto, o bloco **Conversoes geradas** precisa ficar mais perto da leitura principal da tela e suas tabelas devem priorizar pessoas por perfil em vez de volume bruto de eventos.

Decisao:

- Renderizar **Conversoes geradas** imediatamente abaixo de **Visao geral** em `/trafego`.
- Remover o contador **Visitantes nao autenticados** apenas da UI da **Visao geral**; o agregado permanece no contrato e em outros blocos, como **Tipo de usuario** e **Usuarios online agora**.
- Remover a coluna **Eventos** das tabelas antes/depois do cadastro.
- Manter **Conversoes antes do cadastro** com colunas **Conversao**, **Pessoas** e **Taxa**, pois antes do cadastro nao ha papel de usuario confiavel.
- Expandir `conversion_groups.post_signup.items[]` com `patient_actors` e `psychologist_actors`, calculados por usuarios unicos reais de cada conversao pos-cadastro a partir de `user.role`.
- Renderizar **Conversoes apos o cadastro** com colunas **Conversao**, **Pacientes**, **Psicologos** e **Taxa**.
- Preservar `events` no payload e no CSV tecnico para auditoria/exportacao, mesmo sem exibi-lo na tabela principal.

Consequencia:

- A hierarquia da tela passa a destacar conversao logo apos a evolucao geral, sem esperar a rolagem ate o fim da pagina.
- A operacao consegue diferenciar o perfil convertido depois do cadastro sem confundir usuarios unicos com repeticao de eventos.
- O contrato ganha dois campos agregados compativeis com os dados existentes, sem migration, backfill ou nova fonte de tracking.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/api/req/traffic/index.ts" "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"`.

Validacao final adicional:

- `pnpm --dir backend check` reexecutado sem erros apos uma primeira tentativa encerrada sem erro de TypeScript depois do `prisma generate`.
- `pnpm --dir admin check` sem erros.
- `pnpm --dir backend build` sem erros.
- `pnpm --dir admin build` sem erros.
- `pnpm check` sem erros.
- API real local direta via `buildTrafficSummary({ period: "30d" })` confirmou `patient_actors` e `psychologist_actors` em `conversion_groups.post_signup.items[]`.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.
- Browser headless autenticado com admin transitorio ficou limitado pela politica local, que bloqueou o comando antes de qualquer criacao/limpeza de dados de validacao.

## Complemento 2026-07-27 - Graficos de distribuicao logo abaixo da Visao geral

Por feedback direto de produto, a leitura de distribuicao de trafego precisa ficar mais proxima da
evolucao geral, antes dos blocos longos de conversoes, navegacao, rankings e localizacao.

Decisao:

- Renderizar os tres cards **Origem do trafego**, **Dispositivos** e **Tipo de usuario**
  imediatamente apos o card **Visao geral** em `/trafego`.
- Manter os mesmos agregados reais ja retornados em `traffic_sources`, `devices` e `user_types`;
  a mudanca nao altera formulas, contratos, exportacao, backend ou fonte de dados.
- Preservar o comportamento mobile-first existente: uma coluna no mobile e tres colunas no
  desktop amplo.

Consequencia:

- A operacao passa a ver a composicao do trafego logo apos os contadores e a timeline.
- **Conversoes geradas** continua proximo do topo, mas abaixo dos graficos de distribuicao
  solicitados.

Validacao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build` com `NODE_OPTIONS=--max-old-space-size=8192`.
- Checagem estatica com `node` confirmou a ordem: **Visao geral** -> tres graficos ->
  **Conversoes geradas**.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.
- `pnpm check` ficou bloqueado por alteracao paralela fora deste ajuste em
  `backend/src/modules/api/public/analytics/helpers/signup-identity.ts`.

## Complemento 2026-07-27 - Sistemas operacionais no donut de dispositivos

Por feedback direto de produto, o bloco **Dispositivos** de `/trafego` deve mostrar a composicao de
sistemas operacionais abaixo de cada tipo de dispositivo, como ja acontece no dashboard de pacientes.

Decisao:

- Reutilizar o utilitario backend compartilhado `admin-operating-system` para normalizar `Android`,
  `iOS`, `iPadOS`, `Windows`, `macOS`, `Outros` e `Nao identificado`.
- Expandir `devices.items[]` com `operating_systems[]`, calculado somente com registros reais de
  `visitor_session.os` dentro do mesmo recorte de sessoes usado pelo donut de dispositivos.
- Manter **PWA instalado** como agrupamento derivado de `page_view_event.display_mode`, mas calcular
  o sistema operacional a partir do dispositivo fisico original da `visitor_session`.
- Mostrar os sistemas como sublabel na legenda do donut, evitando novo grafico e preservando o padrao
  visual do dashboard de pacientes.
- Incluir as linhas `device_operating_system` na exportacao CSV para manter os agregados exportaveis.

Consequencia:

- A operacao consegue comparar dispositivo e sistema no mesmo bloco sem navegar para outra tela.
- O contrato de `devices.items[]` fica mais rico, mas segue retrocompativel para consumidores que
  usam apenas `count`, `label`, `percentage` e `device_type`.
- Nao ha backfill nem inferencia cross-device: sessoes sem `os` confiavel continuam aparecendo como
  `Nao identificado` no agregado real.

Validacao complementar:

- `pnpm --dir backend check`.
- `pnpm --dir admin check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin build`.
- `pnpm check`.
- API real local direta via `buildTrafficSummary({ period: "30d" })` confirmou
  `devices.source=visitor_session.device_type+visitor_session.os+page_view_event.display_mode` e
  `operating_systems[]` por dispositivo.
- HTTP local `GET http://localhost:3002/trafego` retornou `200`.

Revalidacao complementar apos ajuste final de ordem:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` sem erros.
- `pnpm --dir admin exec next typegen` regenerou `.next/types` apos uma tentativa anterior de build ter sido interrompida por lock/worker residual local.
- `pnpm --dir admin check` com `NODE_OPTIONS=--max-old-space-size=8192` sem erros.
- `pnpm --dir admin build` com `NODE_OPTIONS=--max-old-space-size=8192` sem erros.
- `pnpm check` com `NODE_OPTIONS=--max-old-space-size=8192` sem erros.

## Complemento 2026-07-27 - Copy e periodo nos graficos de distribuicao

Por feedback direto de produto, os cards de distribuicao logo abaixo da **Visao geral** precisam
explicitar periodo em todos os cards e simplificar os nomes exibidos nas legendas.

Decisao:

- Renomear o card **Dispositivos** para **Dispositivos e sistemas**, porque a legenda agora inclui a
  composicao de sistemas operacionais por dispositivo.
- Manter os sistemas operacionais em uma unica linha no sublabel da legenda, sem truncamento por
  ellipsis, para igualar a leitura do dashboard de pacientes.
- Alterar o label do segmento anonimo de **Tipo de usuario** para **Nao autenticados**, sem mudar o
  identificador tecnico `anonymous` nem a formula por `visitor_session.user.role`.
- Controlar a quebra visual do label **Nao autenticados** para manter a palavra `autenticados`
  inteira na segunda linha, evitando particionar a palavra por falta de largura da coluna.
- Exibir `periodDescription` tambem em **Origem do trafego** e **Dispositivos e sistemas**, mantendo
  a consistencia com **Tipo de usuario**.

Consequencia:

- A leitura fica mais proxima do dashboard de pacientes e reduz quebra vertical desnecessaria nas
  legendas.
- O contrato permanece estavel: apenas o label humano de `user_types.items[]` muda para a UI/export.

Validacao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check` com `NODE_OPTIONS=--max-old-space-size=8192`.
- `pnpm --dir admin build` com `NODE_OPTIONS=--max-old-space-size=8192`.
- `pnpm check` com `NODE_OPTIONS=--max-old-space-size=8192`.
- HTTP local `GET http://localhost:3002/trafego`.

## Complemento 2026-07-27 - Novos visitantes no bloco online agora

O contrato `online_now` da tela Trafego passa a expor `new_visitors`, calculado como visitantes presentes na janela operacional de 5 minutos que nao possuem sessao anterior a essa janela. A fonte declarada do bloco passa a ser `visitor_session.last_seen_at+visitor_session.first_seen_at` para refletir a combinacao entre presenca recente e historico previo do visitante.

A decisao apenas alinha backend, DTO e tipo do Admin ao contador que a UI ja consome. Nao altera schema Prisma, migration, tracking first-party, endpoint, package, mock, seed ou backfill.
