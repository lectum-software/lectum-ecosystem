# ADR-0323: Visão geral de Tráfego com timeline filtrável

## Status

Accepted

## Task relacionada

TASK-50

## Contexto

O feedback de 2026-07-26 pediu que a **Visão geral** de `/trafego` mantivesse somente os
contadores **Sessões**, **Visitantes únicos**, **Novos visitantes** e **Visitantes recorrentes**, e que
ganhasse um gráfico abaixo seguindo o layout da visão geral de `/psicologos`: filtro de período,
campos de data e cards que exibem/ocultam curvas.

## Decisão

- A UI de `/trafego` passa a whitelistar os contadores principais da Visao geral.
- Em complemento de 2026-07-27, **Visitantes nao autenticados** passa a compor a Visao geral como quinto card agregado, usando `overview_cards.anonymous_visitors`; ele nao alterna curva no grafico diario porque a timeline vigente permanece com as quatro series historicas.
- Os cards da Visão geral viram botões acessíveis (`aria-pressed`) para alternar as curvas do
  gráfico SVG local.
- Os cards não exibem badge visual **real** nem descrições internas para reduzir ruído visual; a
  origem real permanece documentada no contrato e nas seções analíticas.
- O contador `unique_visitors` é apresentado como **Visitantes únicos** na Visão geral.
- Os segmentos **Novos visitantes** e **Visitantes recorrentes** exibem a taxa entre parênteses,
  usando **Visitantes únicos** como denominador do período.
- O filtro de período fica dentro da Visão geral, preservando o header limpo de Tráfego.
- O backend mantém os agregados reais existentes e adiciona `recurring_visitors` e `timeline.points`
  ao payload de `GET /api/admin/private/traffic/summary`.
- A timeline é diária, limitada pelo range atual da TASK-50 (máximo de 180 dias), e deriva somente de
  `visitor_session`, `page_view_event` e `important_action_event`.
- `Visitantes recorrentes` na Visão geral é um segmento disjunto de `Novos visitantes`: conta
  somente visitantes com sessão anterior ao início do recorte, evitando que retornos dentro do
  próprio período façam `novos + recorrentes` exceder `visitantes únicos`.
- A UI passa a exibir, imediatamente abaixo do gráfico da Visão geral, um bloco de **Detalhes da
  navegação por páginas** usando os agregados reais já presentes no resumo: `pageviews`,
  `pages_per_session`, `entry_pages.total`, `bounce_rate` e `entry_pages.items`.
- A lista de **Páginas de entrada** deixa a grade inferior e passa a compor esse bloco para manter a
  leitura de navegação junto ao gráfico de comportamento, sem alterar contrato HTTP ou fórmulas.
- O indicador **Sessões com página de entrada** deixa de ser exibido como card nesse bloco, porque
  duplicava o total já apresentado na lista de **Principais páginas de entrada** e podia sugerir
  incorretamente que nem toda sessão possui uma entrada.
- O bloco passa a reaproveitar os indicadores reais de qualidade `average_time`, `return_rate` e
  `important_action_sessions` como cards: **Tempo médio na plataforma**, **Taxa de retorno** e
  **Sessões com ação importante**. Esses cards usam `quality.items`; não criam endpoint, fórmula,
  backfill ou contrato novo.
- O card visual **Qualidade do trafego** deixa de ser renderizado como bloco autonomo; as metricas
  de qualidade permanecem no contrato para alimentar os detalhes de navegacao e as limitacoes
  indisponiveis.
- A UI passa a posicionar, imediatamente abaixo de **Detalhes da navegacao por paginas**, uma grade
  mobile-first de rankings: **Trafego por comunidade**, **Trafego por post** e **Trafego por
  psicologo**. Em desktop amplo, a grade usa tres colunas lado a lado; em telas estreitas, empilha
  sem overflow horizontal.
- A lista **Principais páginas de entrada** passa a consolidar entradas dinâmicas por tipo para
  evitar linhas separadas por URL individual: posts de comunidade entram em **Posts**
  (`/community/*/post/*`), detalhes de comunidade em **Comunidades** (`/community/*`) e perfis em
  **Perfis de psicólogos** (`/psychologists/*`). O total continua contando a primeira pageview real
  de cada sessão; apenas a chave de agrupamento dessas rotas dinâmicas mudou.
- A mesma lista passa a exibir apenas nomes operacionais no UI: o grupo de posts aparece como
  **Posts**, rotas como `/auth/login` e `/auth/register/psychologist` aparecem como **Login** e
  **Cadastro de psicólogo**, e o path/slug não é renderizado abaixo do titulo.
- O bloco visual deixa de se chamar **Detalhes da navegação por páginas** e passa a usar o titulo
  **Uso da plataforma**. O paragrafo explicativo abaixo do periodo e o card azul **Principal
  entrada** foram removidos para reduzir ruido visual.
- A tabela/lista **Principais páginas de entrada** permanece focada somente em página, sessões e
  participação. **Conversões geradas** continua como card/tabela separado da tela, usando
  `summary.conversions.items`.
- Os rankings **Trafego por comunidade**, **Trafego por post** e **Trafego por psicologo** deixam de
  exibir tags tecnicas de fonte no cabecalho e deixam de mostrar slug/path abaixo do titulo do item.
- O subtitulo passa a exibir `sessões · pageviews`, e cada linha recebe um atalho acessivel
  `Ir ate ... no Admin` para abrir a comunidade, post ou psicologo dentro do painel administrativo.
- Os labels desses rankings ficam limpos e com menor peso visual: comunidades usam nome, posts usam
  somente titulo, psicologos usam somente nome, e a classe visual do label passa de `font-black` para
  `font-semibold`.
- Nenhum pacote novo, mock, endpoint simulado, schema Prisma ou migration foi adicionado.

## Consequências

- A Visão geral fica mais focada e consistente com o padrão visual do dashboard de Psicólogos.
- O contrato HTTP é expandido de forma compatível: consumidores existentes continuam recebendo os
  agregados anteriores, e a UI nova usa apenas o subconjunto solicitado.
- O CSV de exportação passa a incluir linhas `overview_timeline` para manter paridade com o resumo
  real retornado pela API.
- A faixa visual **Resumo textual do gráfico** não é exibida nos gráficos de Tráfego; o resumo foi
  mantido como `figcaption` apenas para leitores de tela.
- O bloco de navegação fica mobile-first: indicadores empilham no mobile e a lista de entradas usa
  cards em telas estreitas com apenas sessões e participação; a tabela responsiva a partir de `md`
  também mantém apenas página, sessões e percentual, preservando `overflow-x=0`.
- Builder/Quick Copy não estava exposto como ferramenta callable neste ambiente; a validação visual
  usou `_product/proto/admin/Tráfego.png`, `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`
  e browser local.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` — OK.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx" "src/api/req/traffic/index.ts"` — OK.
- `pnpm --dir backend check` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK.
- API real local em `GET /api/admin/private/traffic/summary?from=2026-06-27&to=2026-07-26` — OK:
  `usuarios_unicos=224`, `novos_visitantes=224`, `visitantes_recorrentes=0`,
  `novos+recorrentes=224`.
- Browser local/headless em `http://localhost:3002/trafego` — OK: validou com admin real
  transitório removido após o teste, 4 contadores, remoção do badge **real**, remoção das descrições
  internas, remoção da faixa visual
  **Resumo textual do gráfico**, filtros de período/data, toggle de curva por contador e mobile
  390x844 sem overflow horizontal.
- Browser local/headless complementar — OK: validou **Visitantes únicos** e taxas visíveis em
  **Novos visitantes** e **Visitantes recorrentes**.
- Browser local/headless complementar — OK: validou **Detalhes da navegação por páginas** logo abaixo
  do gráfico da Visão geral, **Principais páginas de entrada**, **Visualizações de páginas**,
  **Média de páginas por sessão**, **Sessões com página de entrada** e viewports 1366x900 e 390x844
  sem overflow horizontal.
- Browser local/headless complementar em `http://localhost:3002/trafego` — OK: validou os cards
  **Visualizações de páginas**, **Média de páginas por sessão**, **Tempo médio na plataforma**,
  **Taxa de rejeição**, **Taxa de retorno** e **Sessões com ação importante**, confirmou a remoção
  do card **Sessões com página de entrada** e manteve `horizontalOverflowPx=0` em 1366x900 e
  390x844.
- Browser local/headless complementar (2026-07-26) - OK: validou a remocao visual de
  **Qualidade do trafego**, a grade imediatamente abaixo de **Detalhes da navegacao por paginas**
  com **Trafego por comunidade**, **Trafego por post** e **Trafego por psicologo**, tres cards na
  mesma linha em desktop amplo e viewport mobile 390x844 sem overflow horizontal.
- API real local complementar (2026-07-26) - OK: validou
  `entry_pages.total=238` com as entradas dinâmicas consolidadas em **Posts específicos**
  (`197` sessões), **Perfis de psicólogos** (`4`) e **Comunidades** (`4`), preservando linhas
  exatas para páginas não dinâmicas como `/`, `/auth/login` e `/psychologists`.
- Browser local/headless complementar (2026-07-26) - OK: validou a lista **Principais páginas de
  entrada** com `/community/*/post/*`, `/psychologists/*` e `/community/*` em desktop 1366x900 e
  mobile 390x844, sem exibir paths específicos de post nesse bloco.
- Browser local/headless complementar (2026-07-26) - OK: validou ausencia das tags
  `page_view_event.target_type=community`, `page_view_event.page_kind=community_post` e
  `page_view_event.target_type=psychologist` nos rankings, metricas `sessões · pageviews` abaixo dos
  titulos, links `Ir ate ...` por item e viewport mobile 390x844 sem overflow horizontal.
- Browser local/headless complementar (2026-07-27) - OK: validou 11 links `Ir ate ... no Admin`
  com hrefs internos em `/comunidades/...` ou `/psicologos/...`, sem `target="_blank"`, sem tags
  tecnicas, e labels dos rankings com `font-semibold` sem `font-black`.
- API real local complementar (2026-07-27) - OK: validou `entry_pages.total=238`, grupo
  **Posts** (`197`), label **Login** (`10`) e label **Cadastro de psicólogo** (`3`).
- Browser local/headless complementar (2026-07-27) - OK: validou a lista **Principais páginas de
  entrada** com nomes sem slugs/paths, sem **Posts específicos**, sem `/auth/login`,
  `/auth/register/psychologist`, `/community/*/post/*`, `/community/*` ou `/psychologists/*`, em
  desktop 1366x900 e mobile 390x844 sem overflow horizontal.
- Browser local/headless complementar (2026-07-27) - OK: validou **Uso da plataforma**, ausencia de
  **Detalhes da navegação por páginas**, ausencia do paragrafo explicativo removido, ausencia de
  **Principal entrada**, ausência da coluna **Conversões geradas** em **Principais páginas de
  entrada**, card/tabela separado **Conversões geradas** preservado e `horizontalOverflowPx=0` em
  desktop 1366x900 e mobile 390x844.
- Validacao complementar (2026-07-27) - OK: `pnpm --dir admin check` e `pnpm --dir admin build`; validou o quinto card **Visitantes nao autenticados** na **Visao geral**, com participacao sobre **Visitantes unicos** e sem nova serie no grafico diario.
