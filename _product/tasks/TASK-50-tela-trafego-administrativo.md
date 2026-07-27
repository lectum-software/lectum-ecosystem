# TASK-50: Tela Tráfego administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-50 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-47, TASK-49 |
| ADR alvo | ADR se houver decisão nova sobre fórmulas de métricas, exportação, mapa ou gráficos |

## Contexto

A aba Tráfego do painel Admin foi definida visualmente em `_product/proto/admin/Tráfego.png`. Ela mostra comportamento de acesso, origem de tráfego, dispositivos, tipos de usuário, localização, páginas de entrada, conversões, qualidade do tráfego e rankings de comunidades/psicólogos.

Essa tela depende da fundação admin, do tracking de sessão/dispositivo e do tracking de pageviews/origem. Nenhuma métrica pode ser inventada.

## Objetivo

Implementar a tela Admin Tráfego com dados reais agregados, filtro de período e exportação honesta, permitindo à operação entender como usuários chegam e navegam na Lectum.

## Pré-requisitos e bloqueios

- TASK-45 concluída: auth admin.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-47 concluída: `visitor_session`/tipo de dispositivo.
- TASK-49 concluída: `page_view_event`/origem/pageviews.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Tráfego.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação.

## Escopo frontend

- Criar rota protegida no app Admin:
  - `/traffic` ou `/trafego`, conforme convenção adotada na TASK-46.
- Renderizar:
  - breadcrumb Dashboard > Tráfego;
  - título e subtítulo;
  - filtro de período;
  - botão "Exportar relatório" somente se houver endpoint real;
  - visão geral com cards;
  - gráficos/listas de origem de tráfego, dispositivos e tipo de usuário;
  - acessos por localização;
  - mapa/lista de acessos quando houver implementação real;
  - páginas de entrada;
  - conversões geradas;
  - qualidade do tráfego;
  - tráfego por comunidade;
  - tráfego por psicólogo.
- Estados:
  - loading;
  - erro;
  - vazio;
  - métrica indisponível com explicação.
- UI mobile-first:
  - cards em 1 coluna no mobile;
  - tabelas com layout responsivo/scroll horizontal acessível;
  - gráficos com alternativa textual.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/traffic/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Criar endpoint de exportação real, se o botão for habilitado:
  - `GET /api/admin/private/traffic/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais:
  - sessões: `visitor_session`;
  - usuários únicos: `visitor_id` distintos;
  - novos visitantes: primeiro registro do `visitor_id` dentro do período;
  - visitantes anônimos: sessões/pageviews sem `user_id`;
  - psicólogos logados: `user.role="psicologo"` associado a sessões/pageviews;
  - pacientes logados: `user.role="paciente"` associado a sessões/pageviews;
  - pageviews: `page_view_event`;
  - páginas por sessão: pageviews / sessões com pageview;
  - origem do tráfego: `page_view_event.traffic_source`;
  - dispositivos: `visitor_session.device_type`;
  - PWA: `display_mode="standalone"` ou evento real de instalação;
  - localização: `visitor_location`;
  - páginas de entrada: primeira pageview por sessão;
  - conversões: eventos reais existentes, atribuindo por `visitor_id`/`session_id`/`user_id` quando possível;
  - rankings de comunidade/psicólogo: pageviews com `page_kind`/`target_type` correspondentes.

## Fora do escopo

- Criar tracking novo além do contrato da TASK-49.
- Criar BI externo.
- Criar mapa geográfico interativo com package novo sem ADR.
- Criar moderação ou ações operacionais de comunidades/psicólogos dentro da tela.
- Prometer precisão absoluta de atribuição cross-device.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: rotas, módulos, resposta, validação e separação admin.
- `PACKAGES.md`: não instalar charts/maps/tables sem necessidade concreta e ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Tráfego.

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Validator de período:
  - default: últimos 30 dias;
  - limite máximo inicial: 180 dias, salvo ADR;
  - `from <= to`.
- Resposta sugerida:
  - `period`;
  - `overview_cards`;
  - `traffic_sources`;
  - `devices`;
  - `user_types`;
  - `locations`;
  - `entry_pages`;
  - `conversions`;
  - `quality`;
  - `top_communities`;
  - `top_psychologists`;
  - `unavailable`.
- Fórmulas devem estar documentadas no service:
  - taxa de cadastro = novos cadastros / visitantes únicos;
  - taxa de rejeição = sessões com 1 pageview e sem ação importante / sessões com pageview;
  - taxa de retorno = visitantes com sessão anterior ao período ou mais de uma sessão no período / visitantes únicos;
  - tempo médio = duração calculada por heartbeat/beacon quando disponível; se não disponível, retornar indisponível;
  - sessões com ação importante = sessões com conversão/evento de domínio relevante.
- Export:
  - CSV ou JSON real com os mesmos agregados;
  - sem dados pessoais sensíveis além do necessário para agregados.

Frontend esperado:

- `admin/src/api/req/traffic`;
- `admin/src/api/callers/traffic`;
- query keys próprias;
- componentes reutilizáveis de cards/gráficos do Dashboard quando existirem.
- Gráficos:
  - preferir SVG/CSS próprio e acessível, sem package novo;
  - se houver mapa, pode começar com ranking por estado/país e mapa estático só se houver asset real autorizado;
  - nunca usar imagem do protótipo como gráfico final.
- Tabelas/listas:
  - sem `@tanstack/react-table` nesta primeira versão, salvo ADR por necessidade concreta;
  - usar tabelas responsivas simples.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer gráfico/mapa/tabela avançada exige validação em `PACKAGES.md` e ADR.

Regras anti-recriação:

- Reutilizar app admin, shell, API client e cards da TASK-46/TASK-48.
- Reutilizar dados de `visitor_session`, `page_view_event`, `visitor_location` e modelos de domínio existentes.
- Não criar JSON estático para reproduzir os números do protótipo.

Regras de UI obrigatórias:

- Mobile-first obrigatório.
- Nenhum `<img>` cru; usar `next/image` se imagem for inevitável.
- Cores por tokens.
- Foco visível e labels acessíveis.
- Gráficos com nomes/valores legíveis por leitores de tela via tabela/resumo alternativo.

## Critérios de aceite

- [x] A rota de Tráfego só abre para admin autenticado.
- [x] Cards de visão geral usam dados reais.
- [x] Origem do tráfego usa `page_view_event.traffic_source` real.
- [x] Dispositivos usam `visitor_session.device_type` real.
- [x] Tipo de usuário distingue pacientes, psicólogos e anônimos por dados reais.
- [x] Localização usa `visitor_location` real.
- [x] Páginas de entrada são derivadas da primeira pageview por sessão.
- [x] Métricas de qualidade são exibidas somente quando houver fórmula e dados confiáveis; caso contrário, aparecem como indisponíveis.
- [x] Conversões são baseadas em eventos reais e documentam limitações de atribuição.
- [x] Rankings de comunidade/psicólogo são derivados de pageviews/target real.
- [x] Filtro de período atualiza todas as agregações.
- [x] Exportação só aparece/habilita se usar endpoint real.
- [x] Estados loading, erro, vazio e indisponível foram implementados.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Tráfego.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check` foram executados sem erros.
- [x] Browser local validado com admin real.
- [x] ADR criado ou atualizado em `adrs/` se houver nova decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - login admin;
  - abrir Tráfego;
  - trocar período;
  - validar relatório/export se implementado;
  - validar mobile ~390px e desktop.

## Notas de execução

- Os números do protótipo são referência visual, não dados de seed.
- Se uma métrica ainda não tiver dado suficiente, retornar `unavailable` com copy clara.
- A tela pode ser entregue incrementalmente desde que todos os blocos indisponíveis sejam honestos e não simulem dados.


## Execucao TASK-50

- Implementada a rota protegida do Admin em `/trafego`, seguindo a convencao adotada no app `admin/`.
- Implementados os endpoints reais `GET /api/admin/private/traffic/summary` e `GET /api/admin/private/traffic/export`, com agregacoes derivadas de `visitor_session`, `page_view_event`, `important_action_event`, `visitor_location` e modelos reais de dominio.
- A exportacao CSV usa o mesmo servico de agregacao do resumo, sem dados pessoais sensiveis alem de labels agregados ou publicos.
- O mapa foi entregue como ranking/lista acessivel de localizacao nesta primeira versao, sem pacote novo e sem imagem do prototipo como grafico final.
- Builder/Quick Copy nao estava exposto como ferramenta MCP nesta execucao; a referencia visual usada foi `_product/proto/admin/Tráfego.png`.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao foi necessario.
- Foram criados registros transitorios para smoke de API com admin real e dados reais relacionais; os registros transitorios foram removidos apos a validacao.
- Browser local validado com admin real em dev server do Admin na porta 3102 por indisponibilidade/conflito local da porta 3002 durante a validacao; a porta alvo local do app Admin permanece 3002.
- ADR criado: `adrs/0230-admin-trafego-agregacoes.md`.

## Evidencias de validacao

- `pnpm --dir backend check`: sem erros.
- `pnpm --dir backend build`: sem erros.
- `pnpm --dir admin check`: sem erros.
- `pnpm --dir admin build`: sem erros.
- `pnpm check`: sem erros.
- Smoke API: resumo e exportacao retornaram dados agregados reais, incluindo origem, dispositivos, PWA, localizacao, paginas de entrada, conversoes e rankings.
- Browser local: login admin real, abertura de `/trafego`, troca de periodo para 7 dias, exportacao CSV e validacao visual mobile (~390px), tablet (768px) e desktop.

## Execucao complementar - layout piloto em Trafego (2026-07-25)

- Aplicado o escopo visual `admin-premium-pilot` tambem em `/trafego`, sem alterar endpoints,
  contratos HTTP, formulas, exportacao CSV, Prisma/migrations ou packages.
- O topo passou a usar card mobile-first com label **Analytics first-party**, filtros de datas,
  atalhos reais de periodo e CTA **Exportar relatorio**.
- A **Visao geral** foi agrupada em card proprio com o periodo retornado pelo backend e contadores
  reais preservando badge `real`, variacao vs. periodo anterior e descricoes de origem.
- Graficos de origem, dispositivos e tipo de usuario mantem os mesmos agregados reais e passaram a
  exibir contagem + percentual na legenda.
- O bloco de localizacao passou a renderizar mapa SVG local do Brasil com agregados reais de
  `visitor_location`, sem package novo; se nao houver estado real, exibe o mapa base sem simular
  volume estadual e com copy honesta.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; a referencia
  auditavel foi `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0263-admin-psicologos-piloto-premium.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real transitorio removido apos o teste: build atual servido em
  `http://localhost:3012/trafego`, Chrome headless com viewport desktop e emulacao mobile
  390x844; validou `admin-premium-pilot`, label **Analytics first-party**, card **Visao geral**,
  10 badges `real`, CTA de exportacao, 22 cards/sections e mapa SVG do Brasil com 27 estados.

## Execucao complementar - contencao de largura util em Trafego (2026-07-25)

- Corrigida a barra horizontal do browser em `/trafego` sem alterar backend, contratos HTTP,
  metricas, exportacao CSV, Prisma/migrations ou packages.
- O `AdminShell` e a base global do Admin passaram a conter overflow horizontal do documento,
  mantendo a largura util como limite do layout.
- A tela de Trafego recebeu `min-w-0`, quebras para paths/fontes tecnicas/rankings, cards mobile
  para paginas de entrada e header empilhado ate `2xl`, evitando que controles e textos longos
  ultrapassem a area disponivel ao lado da sidebar.
- O grafico donut passou a usar composicao lado a lado somente em `2xl`, preservando leitura em
  desktops menores sem forcar largura extra.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; a referencia
  auditavel foi `_product/proto/admin/TrÃ¡fego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0263-admin-psicologos-piloto-premium.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/globals.css" "src/components/admin-shell/shell.tsx" "src/app/(admin)/trafego/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless com admin real transitorio removido apos o teste: build servido em
  `http://localhost:3002/trafego`; viewports 390x844, 1366x900 e 1920x1000 ficaram com
  `horizontalOverflowPx=0` e `offscreenCount=0`.

## Execucao complementar - header limpo em Trafego (2026-07-26)

- Removidos do header de `/trafego` os campos visuais de data **De/Ate**, os atalhos **7/30/90 dias**
  e o CTA **Exportar relatorio**, conforme feedback visual direto.
- A tela continua consultando dados reais no periodo padrao de 30 dias por meio do endpoint
  `GET /api/admin/private/traffic/summary`; o periodo permanece visivel no card **Visao geral**.
- O endpoint e o caller de exportacao foram preservados para nao alterar contrato backend nesta
  correcao visual, mas a acao deixou de ser exposta no header.
- Nao houve alteracao em backend, Prisma/migrations, packages, formulas de metricas ou dados
  persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; a referencia
  auditavel foi `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido
  apos o teste: header validado sem campos de data, sem atalhos de periodo e sem CTA de
  exportacao; conteudo segue renderizando a **Visao geral** com periodo de 30 dias retornado pelo
  backend.

## Execucao complementar - Visao geral com timeline filtravel (2026-07-26)

- Ajustada a **Visao geral** de `/trafego` para exibir somente os contadores **Sessoes**,
  **Visitantes unicos**, **Novos visitantes** e **Visitantes recorrentes**.
- Adicionado grafico SVG abaixo dos contadores, seguindo o layout da Visao geral de `/psicologos`,
  com filtro de periodo, campos **De/Ate** e cards que exibem/ocultam curvas via `aria-pressed`.
- Os contadores ficaram sem badge visual **real** e sem texto descritivo interno, conforme feedback
  de limpeza visual; o comparativo com periodo anterior permanece.
- Removida a faixa visivel **Resumo textual do grafico** dos graficos de Trafego; o resumo
  permanece somente como `figcaption` screen-reader-only para acessibilidade.
- Backend expandiu o resumo real de Trafego com `recurring_visitors` e `timeline.points`, derivados
  de `visitor_session`, `page_view_event` e `important_action_event`, sem mocks.
- A exportacao CSV real passa a incluir linhas `overview_timeline`, mantendo paridade com o payload.
- Nao houve alteracao em Prisma schema/migrations, packages ou dados persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  visuais usadas foram o prototipo local de Trafego, o prototipo local do dashboard de Psicologos
  e a captura enviada pelo usuario.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx" "src/api/req/traffic/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido
  apos o teste: validou 4 contadores (**Sessoes**,
  **Visitantes unicos**, **Novos visitantes**, **Visitantes recorrentes**), ausencia de badge
  **real**, ausencia das descricoes internas, ausencia da faixa visivel **Resumo textual do
  grafico**, filtros de periodo/data, toggle de curva por contador e viewport mobile 390x844 sem
  overflow horizontal.

## Execucao complementar - segmentos disjuntos de visitantes em Trafego (2026-07-26)

- Corrigida a formula de **Visitantes recorrentes** da Visao geral para ser disjunta de
  **Novos visitantes**: recorrente agora exige sessao anterior ao inicio do periodo.
- Retornos adicionais dentro do proprio recorte continuam pertencendo ao segmento **Novos
  visitantes** quando o visitante nao tinha historico anterior, evitando casos como `224 novos + 4
  recorrentes` com apenas `224 visitantes unicos`.
- A timeline passa a usar o mesmo criterio disjunto para a curva de recorrentes.
- Nao houve alteracao em Prisma schema/migrations, packages, mocks ou dados persistidos.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- API real local em `GET /api/admin/private/traffic/summary?from=2026-06-27&to=2026-07-26` com admin transitorio removido apos o teste: `usuarios_unicos=224`, `novos_visitantes=224`, `visitantes_recorrentes=0`, `novos+recorrentes=224`.

## Execucao complementar - copy e taxas dos segmentos de visitantes em Trafego (2026-07-26)

- Padronizado o texto do contador como **Visitantes unicos** na Visao geral de `/trafego`, mantendo o identificador tecnico `unique_visitors` no contrato.
- Os contadores **Novos visitantes** e **Visitantes recorrentes** agora exibem a taxa entre parenteses ao lado do numero, com menor peso visual.
- A taxa exibida usa **Visitantes unicos** como denominador do periodo: `segmento / visitantes_unicos`.
- Nao houve alteracao em Prisma schema/migrations, packages, mocks ou dados persistidos.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido apos o teste: validou **Visitantes unicos** e taxas visiveis em **Novos visitantes** (`100%`) e **Visitantes recorrentes** (`0%`).

## Execucao complementar - limpeza dos donuts de Trafego (2026-07-26)

- Removidas as tags tecnicas dos tres cards de donut: **Origem do trafego**, **Dispositivos** e
  **Tipo de usuario**. As fontes reais continuam no contrato backend (`source`), mas deixam de
  competir visualmente com os titulos desses blocos.
- As legendas dos tres donuts agora exibem os labels completos com quebra de linha e sem ellipsis,
  preservando contagem e percentual alinhados a direita.
- Nao houve alteracao em backend, Prisma/migrations, packages, formulas, tracking, dados
  persistidos ou mocks.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  visuais usadas foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check "src/app/(admin)/trafego/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- HTTP local `GET http://localhost:3002/trafego` retornou 200.

## Execucao complementar - canais canonicos de origem do trafego (2026-07-26)

- Mapeada a agregacao **Origem do trafego** para canais canonicos solicitados: **Google organico**, **Google Ads**, **Meta Ads**, **Instagram organico**, **Instagram (Link na bio)** e **TikTok**.
- A classificacao usa somente campos reais de `page_view_event`: `traffic_source`, `traffic_medium`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` e `referrer_host`.
- `Direto`, canais internos Lectum e `WhatsApp` permanecem preservados; demais origens ficam em **Outros**.
- A distincao entre pago, organico e link na bio depende de UTMs quando referrer/app nao fornecer sinal confiavel; nao houve backfill, mock, pacote novo, Prisma schema/migration ou tracking de terceiros.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; a referencia auditavel foi `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR criado: `adrs/0324-canais-origem-trafego-admin.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/traffic/index.ts"`

Validacao adicional concluida:

- `pnpm --dir backend check` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK apos limpar apenas o Prisma Client gerado em `backend/src/external/generated/prisma`, pois a primeira tentativa encontrou `EEXIST` em artefato gerado.
- HTTP local `GET http://localhost:3002/trafego` — 200.
- Smoke direto do servico contra o banco local nao foi repetido porque o Postgres local retornou `EMAXCONNSESSION` (limite de conexoes da sessao); nenhuma limpeza/destruicao de dados foi executada.

## Execucao complementar - navegacao por paginas abaixo da Visao geral (2026-07-26)

- Criado um bloco logo abaixo do grafico da **Visao geral** em `/trafego` com detalhes de navegacao por paginas.
- O bloco exibe **Visualizacoes de paginas**, **Media de paginas por sessao**, **Sessoes com pagina de entrada** e **Taxa de rejeicao**, todos derivados do payload real ja retornado por `GET /api/admin/private/traffic/summary`.
- A lista de **Principais paginas de entrada** foi promovida para esse bloco e continua usando `page_view_event.is_entry`, sem mock, backfill, novo endpoint, pacote novo, Prisma schema/migration ou dados persistidos.
- O antigo card isolado de **Paginas de entrada** foi removido da grade inferior para evitar duplicidade; conversoes e qualidade do trafego permanecem na sequencia.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias visuais usadas foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK.
- API real local em `GET /api/admin/private/traffic/summary` com admin real transitorio removido apos o teste: `pageviews=519`, `pages_per_session=2.18`, `entry_pages.total=238`.
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido apos o teste: validou o bloco **Detalhes da navegacao por paginas**, a lista **Principais paginas de entrada**, os indicadores **Visualizacoes de paginas**, **Media de paginas por sessao** e **Sessoes com pagina de entrada**, e viewports 1366x900 e 390x844 sem overflow horizontal.

## Execucao complementar - metricas de qualidade no bloco de navegacao (2026-07-26)

- Removido do bloco **Detalhes da navegacao por paginas** o indicador **Sessoes com pagina de entrada**, pois o total de entradas ja aparece no cabecalho/lista de **Principais paginas de entrada**.
- Adicionados ao mesmo bloco os indicadores **Tempo medio na plataforma**, **Taxa de retorno** e **Sessoes com acao importante**, reutilizando os agregados reais `average_time`, `return_rate` e `important_action_sessions` ja retornados em `quality.items`.
- O bloco continua sem mock, sem endpoint novo, sem alteracao de contrato HTTP, sem Prisma schema/migration, sem packages novos e sem backfill.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias visuais usadas foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` — OK.
- `pnpm --dir admin check` — OK apos reexecucao; a primeira tentativa excedeu o timeout operacional local sem emitir erro.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK.
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido apos o teste: validou presenca de **Visualizacoes de paginas**, **Media de paginas por sessao**, **Tempo medio na plataforma**, **Taxa de rejeicao**, **Taxa de retorno** e **Sessoes com acao importante**, ausencia de **Sessoes com pagina de entrada** como card, e viewports 1366x900 e 390x844 sem overflow horizontal.

## Execucao complementar - rankings abaixo dos detalhes de navegacao (2026-07-26)

- Removido da UI o bloco autonomo **Qualidade do trafego**.
- Mantidas as metricas reais de qualidade no contrato para alimentar os cards do bloco
  **Detalhes da navegacao por paginas** e as limitacoes indisponiveis, sem mock nem formula nova.
- Criado o ranking real **Trafego por post** no backend, derivado de `page_view_event` com
  `page_kind="community_post"`/`target_id` e labels reais de `community_post.title` + comunidade.
- Abaixo de **Detalhes da navegacao por paginas**, a UI agora exibe tres cards lado a lado em
  desktop amplo e empilhados no mobile: **Trafego por comunidade**, **Trafego por post** e
  **Trafego por psicologo**.
- A exportacao CSV passou a incluir a secao `top_post` com a mesma agregacao do resumo.
- Nao houve alteracao em Prisma schema/migrations, packages, mocks ou dados persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  visuais usadas foram `_product/proto/admin/Tráfego.png` e as capturas enviadas pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e
  `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx" "src/api/req/traffic/index.ts"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- API real local em `GET /api/admin/private/traffic/summary?from=2026-06-27&to=2026-07-26`
  com admin real transitorio removido apos o teste: `top_posts=5`,
  `top_post_source=page_view_event.page_kind=community_post`, `top_communities=3` e
  `top_psychologists=5`.
- Browser local/headless com build atual servido em porta local efemera e admin real transitorio
  removido apos o teste: validou **Detalhes da navegacao por paginas**, **Trafego por comunidade**,
  **Trafego por post**, **Trafego por psicologo**, ausencia de **Qualidade do trafego**, tres cards
  na mesma linha em 1366x900 e `horizontalOverflowPx=0` em 1366x900 e 390x844.

## Execucao complementar - paginas de entrada dinamicas consolidadas (2026-07-26)

- Ajustada a agregacao de **Principais paginas de entrada** para somar URLs dinamicas por tipo:
  **Posts especificos** (`/community/*/post/*`), **Comunidades** (`/community/*`) e
  **Perfis de psicologos** (`/psychologists/*`).
- Paginas nao dinamicas continuam agrupadas pelo path exato, preservando a leitura operacional de
  entradas como `/`, `/auth/login`, `/psychologists` e cadastros.
- O total de entradas permanece derivado da primeira `page_view_event` real de cada sessao; nao
  houve backfill, mock, endpoint novo, package novo, Prisma schema/migration ou dados persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e
  `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK em reexecucao com timeout ampliado.
- API real local direta em `buildTrafficSummary({ from: "2026-06-27", to: "2026-07-26" })` - OK:
  `entry_pages.total=238`, **Posts especificos** `197`, **Perfis de psicologos** `4` e
  **Comunidades** `4`, com paths de agrupamento `/community/*/post/*`, `/psychologists/*` e
  `/community/*`.
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido
  apos o teste - OK: validou **Posts especificos** com `/community/*/post/*`, **Perfis de
  psicologos** com `/psychologists/*`, **Comunidades** com `/community/*`, ausencia de path
  especifico de post na lista de entradas e viewports 1366x900 e 390x844 sem overflow horizontal.

## Execucao complementar - rankings com metricas e atalho publico (2026-07-26)

- Removidas da UI dos cards **Trafego por comunidade**, **Trafego por post** e **Trafego por
  psicologo** as tags tecnicas `page_view_event.target_type=community`,
  `page_view_event.page_kind=community_post` e `page_view_event.target_type=psychologist`.
- O texto abaixo do titulo de cada item desses rankings deixou de exibir o slug/path e passou a
  exibir `sessoes · pageviews`, com pluralizacao de **sessao/sessoes** e **pageview/pageviews**.
- Cada item recebeu um icone/link acessivel para abrir a comunidade, post ou perfil de psicologo no
  frontend publico, usando `NEXT_PUBLIC_FRONTEND_URL` quando a URL capturada for relativa.
- Mantidos apenas dados reais do payload existente; nao houve mock, backfill, package novo,
  endpoint simulado, Prisma schema/migration ou dados persistidos.
- Preservado o contrato de periodo por preset ja em andamento no resumo de Trafego
  (`period=today|week|month|year|7d|30d|90d|all|custom`) para alinhar a UI ao backend sem
  depender de intervalo fake no cliente.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e
  `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir backend check` - OK via `pnpm check`.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido
  apos o teste - OK: validou ausencia das tres tags tecnicas nos rankings, metricas
  `sessoes · pageviews` abaixo dos titulos, links `Ir ate ...` e viewport mobile 390x844 sem
  overflow horizontal. O admin transitorio `codex-trafego-*` foi removido e a conferencia direta no
  banco retornou `codex_trafego_admin_count=0`.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).
- Smoke estatico do codigo - OK: confirmou `formatRankingSummary`, links de ranking, ausencia das
  tres fontes tecnicas nos `PanelTitle` desses cards e ausencia de `{item.path}` no bloco
  `RankingList`.

## Execucao complementar - nomes de paginas de entrada sem slugs (2026-07-27)

- A lista **Principais paginas de entrada** deixou de renderizar o path/slug abaixo do titulo em
  desktop e mobile; a chave tecnica continua apenas no payload para agrupamento e exportacao.
- O agrupamento dinamico de posts passou a aparecer como **Posts** em vez de **Posts especificos**.
- Rotas de entrada nao dinamicas relevantes passaram a usar labels operacionais:
  `/auth/login` -> **Login**, `/auth/register/psychologist` -> **Cadastro de psicologo** e
  `/auth/register/patient` -> **Cadastro de paciente**.
- Mantida a agregacao real por `page_view_event.is_entry`; nao houve mock, backfill, endpoint novo,
  package novo, Prisma schema/migration ou dados persistidos.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e
  `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"` - OK.
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- API real local direta em `buildTrafficSummary({ from: "2026-06-27", to: "2026-07-26" })` - OK:
  `entry_pages.total=238`, **Posts** `197`, **Login** `10` e **Cadastro de psicologo** `3`.
- Browser local/headless com admin real transitorio removido apos o teste em
  `http://localhost:3022/trafego` - OK: validou **Posts**, **Login** e
  **Cadastro de psicologo** sem `/community/*/post/*`, `/psychologists/*`, `/community/*`,
  `/auth/login`, `/auth/register/psychologist` ou **Posts especificos** na lista, em 1366x900 e
  390x844 sem overflow horizontal.
- Conferencia direta no banco apos limpeza - OK: `codexTrafficOverviewAdminCount=0`.

## Execucao complementar - labels limpos e atalhos internos nos rankings (2026-07-27)

- O ranking **Trafego por post** passou a exibir somente `community_post.title`, sem concatenar o nome da comunidade ao label.
- O ranking **Trafego por psicologo** passou a exibir somente `user.name`, sem concatenar CRP ou outros dados profissionais vindos de `psychologist_profile`.
- Os atalhos dos rankings deixaram de montar URLs do frontend publico e agora usam rotas internas do Admin:
  `/comunidades/[slug]`, `/comunidades/[slug]/conteudo/post/[id]` e `/psicologos/[id]`.
- Posts sem resolucao real em `community_post` nao recebem rota inventada: o payload retorna `path=null` e a UI mantém o estado desabilitado do icone.
- O peso visual dos nomes/titulos nos rankings foi reduzido de `font-black` para `font-semibold`, preservando truncamento e acessibilidade.
- Nao houve mock, backfill, endpoint novo, package novo, Prisma schema/migration ou dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable nesta execucao; as referencias auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- API real local com admin transitorio removido apos o teste: `top_posts.items` retornou titulos sem comunidade/CRP, `top_psychologists.items` retornou nomes sem CRP, nenhum path publico `/community/*` ou `/psychologists/*`, e posts sem registro resolvido ficaram com `path=null`.
- Browser local/headless em `http://localhost:3002/trafego` com admin real transitorio removido apos o teste: validou 11 links `Ir ate ... no Admin`, `href` interno em `/comunidades/...` ou `/psicologos/...`, ausencia de `target="_blank"`, ausencia das tags tecnicas dos rankings, labels com `font-semibold` e sem `font-black`.
- HTTP local com build atual em `http://localhost:3017/trafego` - OK (`200`).

## Execucao complementar - Uso da plataforma e conversoes por entrada (2026-07-27)

- O bloco **Detalhes da navegacao por paginas** foi renomeado para **Uso da plataforma**.
- Removido o paragrafo explicativo "Acompanhe como as sessoes comecam..." abaixo do periodo.
- Removido o card azul **Principal entrada** do topo do bloco.
- A lista **Principais paginas de entrada** recebeu a coluna/campo **Conversoes geradas** no
  desktop e nos cards mobile.
- O backend passou a retornar `entry_pages.items[].conversions`, derivado de
  `important_action_event` pela mesma chave real de visitante/sessao da primeira pageview da sessao.
- A exportacao CSV real passou a incluir `conversions` no extra das linhas `entry_page`.
- Nao houve mock, backfill, endpoint simulado, package novo, Prisma schema/migration ou dado
  persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADRs atualizados: `adrs/0230-admin-trafego-agregacoes.md` e
  `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx" "src/api/req/traffic/index.ts"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK apos reexecucao com timeout ampliado; a primeira tentativa excedeu o timeout operacional local sem emitir erro.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK em reexecucao.
- API real local em `GET /api/admin/private/traffic/summary?period=30d` - OK:
  `entry_pages.total=238`, `entry_pages.source=page_view_event.is_entry+important_action_event.session_id`
  e campo `conversions` numerico nos itens de entrada.
- Browser local/headless em `http://localhost:3002/trafego` - OK: validou **Uso da plataforma**,
  ausencia de **Detalhes da navegacao por paginas**, ausencia do paragrafo removido, ausencia de
  **Principal entrada**, presenca de **Conversoes geradas** em **Principais paginas de entrada** e
  `horizontalOverflowPx=0` em desktop 1366x900 e mobile 390x844.

## Execucao complementar - remocao da coluna de conversoes em paginas de entrada (2026-07-27)

- Removida da tabela **Principais paginas de entrada** a coluna **Conversoes geradas**.
- Nos cards mobile da mesma lista, tambem foi removido o terceiro campo de conversoes, mantendo
  apenas **Sessoes** e **Participacao**.
- O card/tabela separado **Conversoes geradas** permanece na tela com dados reais de
  `summary.conversions.items`.
- Nao houve mock, backfill, endpoint novo, package novo, Prisma schema/migration ou dado
  persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- Browser local/headless em `http://localhost:3002/trafego` - OK: validou ausencia da coluna
  **Conversoes geradas** em **Principais paginas de entrada**, card/tabela separado
  **Conversoes geradas** preservado e `horizontalOverflowPx=0` em desktop e mobile.

## Execucao complementar - Visitantes nao autenticados na Visao geral (2026-07-27)

- Adicionado o card **Visitantes nao autenticados** diretamente a **Visao geral** de `/trafego`, usando o agregado real `overview_cards.anonymous_visitors` ja retornado pelo backend.
- O card tambem mostra a participacao sobre **Visitantes unicos**, sem expor detalhes individuais e sem mostrar atividade de Admins.
- O novo card nao alterna curva no grafico diario; a timeline permanece focada nas quatro series ja existentes: sessoes, visitantes unicos, novos visitantes e visitantes recorrentes.
- A UI normaliza a label desse card no frontend para garantir a copy **Visitantes nao autenticados** mesmo quando o payload vier de um build backend anterior com contrato compativel.
- Nao houve mock, tracking novo, endpoint novo, pacote novo, alteracao em Prisma schema/migrations ou dados persistidos; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a referencia auditavel permaneceu `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0323-trafego-visao-geral-timeline.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.

## Execucao complementar - conversoes em duas colunas (2026-07-27)

- O bloco **Conversoes geradas** foi reorganizado em duas colunas mobile-first:
  **Conversoes para cadastro** e **Conversoes apos cadastro**.
- O backend passou a retornar `conversion_groups.pre_signup` com grafico de visitantes que fizeram
  cadastro versus nao fizeram, grafico de cadastros por perfil (pacientes/psicologos) e barras de
  WhatsApp/PWA antes do cadastro por `important_action_event`.
- O backend passou a retornar `conversion_groups.post_signup` com grafico geral de usuarios
  cadastrados que tiveram ao menos uma conversao apos cadastro versus sem conversao, alem de barras
  por posts, comentarios, WhatsApp, assinaturas e PWA com usuarios unicos e total de eventos.
- WhatsApp e PWA podem aparecer nas duas colunas porque existem antes e depois do login; a atribuicao
  continua first-party por `visitor_id`/`user_id`, sem inferir cross-device.
- A exportacao CSV real passou a incluir as secoes `pre_signup_conversion_chart`,
  `pre_signup_conversion_action`, `post_signup_conversion_chart` e
  `post_signup_conversion_action`, mantendo `conversions.items` compativel.
- Nao houve mock, backfill, package novo, endpoint simulado, Prisma schema/migration ou dado
  persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram `_product/proto/admin/Tr?fego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check --write "src/api/req/traffic/index.ts" "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- API real local direta em `buildTrafficSummary({ period: "30d" })` - OK: `conversion_groups` presente, `visitor_to_signup=45/224`, `signup_roles=155 pacientes + 14 psicologos`, `post_signup_overall=19/169` e barras pos-cadastro com usuarios unicos + eventos.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).
- Browser/headless CDP completo nao foi concluido porque a politica do ambiente bloqueou a inicializacao de processo auxiliar para Chrome/servidores efemeros; nao houve comando destrutivo nem alteracao de dados para contornar essa limitacao.

## Execucao complementar - graficos de cadastro empilhados (2026-07-27)

- O grafico **Cadastros por perfil** passou a ficar abaixo de **Visitantes para cadastro** dentro da coluna **Conversoes para cadastro**.
- A decisao evita cards estreitos em desktop amplo e reduz quebra vertical das legendas dos donuts, preservando a leitura mobile-first ja empilhada.
- Nao houve mock, endpoint novo, package novo, alteracao em Prisma schema/migrations ou dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Tr?fego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - usuarios online agora em Trafego (2026-07-27)

- Adicionado o bloco **Usuarios online agora** perto do topo de `/trafego`, antes de **Visao geral**,
  para deixar a metrica visivel sem exigir rolagem.
- O backend passou a retornar `summary.online_now` com janela movel real de 5 minutos sobre
  `visitor_session.last_seen_at`, contando visitantes unicos ativos, sessoes ativas, usuarios
  autenticados, visitantes sem login e segmentos de pacientes, psicologos e visitantes nao
  autenticados.
- A metrica **agora** e independente do periodo selecionado nos filtros; os filtros continuam
  controlando as demais agregacoes historicas da tela.
- A exportacao CSV passou a incluir o snapshot atual nas secoes `online_now` e
  `online_now_segment`.
- O Admin refaz a consulta de trafego a cada 60 segundos para manter o bloco atualizado sem criar
  endpoint paralelo ou fonte simulada.
- Nao houve mock, seed, endpoint simulado, package novo, alteracao em Prisma schema/migrations ou
  dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts" "src/modules/api/admin/private/traffic/export/use-cases/services.ts"` - OK.
- `pnpm --dir admin exec biome check --write "src/api/req/traffic/index.ts" "src/api/callers/traffic/index.ts" "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir backend check` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir backend build` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- API real local direta em `buildTrafficSummary({ period: "30d" })` - OK: `online_now`
  presente, `window.minutes=5`, `source=visitor_session.last_seen_at` e contadores zerados quando
  nao havia sessao atualizada nos ultimos 5 minutos.
- HTTP local autenticado `GET /api/admin/private/traffic/summary?period=30d` - OK:
  `online_now` presente no contrato.
- HTTP local `GET http://localhost:3024/trafego` - OK (`200`) e bundle da rota confirmou a copy do
  bloco **Usuarios online agora**.
- Browser/headless CDP completo nao foi concluido porque a politica do ambiente bloqueou a
  inicializacao de processo auxiliar para Chrome; a validacao local ficou restrita a API real, build
  e bundle servido.

## Execucao complementar - resgate do mapa de localizacao no padrao pacientes (2026-07-27)

- Resgatado para **Acessos por localizacao** de `/trafego` o layout que segue o mesmo padrao do
  card **Localizacao** de `/pacientes`: resumo por cidades/estados/paises, mapa amplo, alternancia
  **Estados/Paises**, ranking lateral com barras, legenda inferior de intensidade e rankings
  secundarios.
- A renderizacao continua usando apenas SVG local versionado em `admin/src/lib/brazil-state-map.ts`
  e `admin/src/lib/world-country-map.ts`, sem package novo de mapa e sem chamada externa em runtime.
- A fonte real segue sendo `visitor_location`; quando houver qualquer agregado real no periodo, o
  layout usa somente `locations.cities`, `locations.states`, `locations.countries` e `locations.total`
  retornados pelo backend.
- Para permitir conferir visualmente o layout em desenvolvimento local quando `visitor_location` vem
  vazio, o Admin exibe um preview visual explicitamente rotulado apenas em `localhost`/`127.0.0.1`.
  O preview nao altera backend, exportacao, banco, captura, API nem a regra de fonte real.
- Nao houve endpoint simulado, seed, backfill, package novo, alteracao em Prisma schema/migrations
  ou dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a imagem local da tela Trafego em `_product/proto/admin/`, o layout ja implementado em
  `admin/src/app/(admin)/pacientes/client.tsx` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK apos reexecucao com timeout ampliado; a primeira tentativa excedeu
  o timeout operacional local sem emitir erro.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - limpeza de copy do online agora (2026-07-27)

- Removidos do bloco **Usuarios online agora** a fonte tecnica visivel
  `visitor_session.last_seen_at` e a faixa de vazio **Nenhum visitante ativo foi encontrado na
  janela movel atual.**
- O texto de contexto foi simplificado para **Visitantes com sessao atualizada nos ultimos 5
  minutos. Atualizado as HH:mm.**
- A leitura continua usando o contrato real `summary.online_now`; nao houve alteracao de backend,
  endpoint, mock, package novo, Prisma schema/migrations ou dado persistido.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a imagem local da tela Trafego em `_product/proto/admin/` e a captura enviada
  pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - conversoes com tabela simples (2026-07-27)

- Removidos os textos explicativos longos das colunas e dos cards de graficos em **Conversoes geradas**.
- Removidas da UI as tags tecnicas de origem (`visitor_id+user+important_action_event`, `user+domain_events`, `visitor_id+user.createdAt`), mantendo essas fontes apenas no contrato/exportacao.
- O periodo analisado passou a aparecer logo abaixo dos titulos **Conversoes para cadastro** e **Conversoes apos cadastro**.
- **Acoes antes do cadastro** foi renomeado para **Conversoes antes do cadastro**.
- **Conversoes por item** foi renomeado para **Conversoes apos o cadastro**.
- As conversoes antes/depois do cadastro deixaram de usar cards com barras e passaram a usar uma tabela simples com conversao, pessoas, eventos e taxa.
- As descricoes individuais das conversoes foram ocultadas na UI para reduzir ruido visual; os dados seguem reais e sem alteracao de backend.
- Nao houve mock, endpoint novo, package novo, alteracao em Prisma schema/migrations ou dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - tabela responsiva e labels de conversao (2026-07-27)

- Reduzido o peso visual dos textos da tabela de conversoes antes/depois do cadastro.
- A tabela passou a usar largura total com colunas fixas e quebras de texto, removendo a necessidade de barra de rolagem horizontal.
- Removido o periodo que aparecia abaixo dos titulos **Conversoes para cadastro** e **Conversoes apos cadastro**; o periodo permanece apenas no cabecalho do bloco **Conversoes geradas**.
- As legendas do grafico de cadastro foram ajustadas para **Se cadastraram** e **Nao se cadastraram**.
- As legendas do grafico geral apos cadastro foram ajustadas para **Se converteram apos o cadastro** e **Nao se converteram apos o cadastro**.
- O card **Conversao geral apos cadastro** passou a explicar que considera usuarios que realizaram pelo menos uma acao apos se cadastrarem.
- Nao houve mock, endpoint novo, package novo, alteracao em Prisma schema/migrations ou dado persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias auditaveis foram `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - quatro contadores em usuarios online agora (2026-07-27)

- Por feedback direto do usuario, o bloco **Usuarios online agora** deixou de exibir os seis
  contadores inferiores anteriores e passou a mostrar somente **Sessoes ativas**, **Pacientes**,
  **Psicologos** e **Nao autenticados**.
- A leitura continua usando o contrato real `summary.online_now`; nao houve alteracao de backend,
  endpoint, mock, package novo, Prisma schema/migrations ou dado persistido.
- O total destacado de visitantes ativos foi mantido como resumo do bloco, e os quatro contadores
  inferiores seguem em grid mobile-first (`1 coluna -> 2 colunas -> 4 colunas`).
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a imagem local da tela Trafego em `_product/proto/admin/` e a captura enviada
  pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).

## Execucao complementar - aviso de visitantes rastreados em conversoes (2026-07-27)

- Adicionado abaixo de **Visitantes para cadastro** um texto curto informando que o grafico considera
  apenas visitantes rastreados e que podem existir outros usuarios cadastrados sem rastreamento
  associado.
- A mudanca evita interpretar o total rastreado como universo absoluto de todos os cadastros do
  periodo, mantendo a leitura honesta sobre limitacoes de atribuicao first-party.
- Nao houve alteracao de backend, endpoint, mock, package novo, Prisma schema/migrations ou dado
  persistido; `db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; as referencias
  auditaveis foram a imagem local da tela Trafego em `_product/proto/admin/` e a captura enviada
  pelo usuario.
- ADR atualizado: `adrs/0230-admin-trafego-agregacoes.md`.

Validacao desta execucao complementar:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/trafego/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- HTTP local `GET http://localhost:3002/trafego` - OK (`200`).
