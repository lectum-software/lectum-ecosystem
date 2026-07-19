# ADR-0240: Dashboard Admin de pacientes com dados agregados e sem reten√ß√£o V1

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-60: Dashboard administrativo de pacientes.

## Contexto

A se√ß√£o **Pacientes** do painel Admin precisa exibir uma vis√£o simples de crescimento, status de conta, cadastros recentes e estat√≠sticas b√°sicas. A decis√£o de produto para a V1 exclui status de bloqueio/silenciamento, taxa de reten√ß√£o e a√ß√µes administrativas destrutivas.

O schema atual j√° possui fontes reais para contas de pacientes (`user.role="paciente"`), status de conta (`user.active`), perfil (`patient_profile`), origem de cadastro (`user.provider`), localiza√ß√£o coarse (`visitor_location`) e atividades de comunidade. N√£o h√° fonte real modelada para cohort retention nem fluxo administrativo seguro para exporta√ß√£o de pacientes nesta task.

## Decis√£o

- Criar o endpoint privado Admin `GET /api/admin/private/patients/dashboard` com autentica√ß√£o admin obrigat√≥ria.
- Calcular **total**, **ativos**, **inativos** e **novos cadastros** somente a partir de `user.role="paciente"`, `user.deleted=false`, `user.active` e `user.createdAt`.
- Tratar ativo/inativo como **status da conta** (`user.active`), n√£o como engajamento recente.
- Montar a atividade recente da lista resumida a partir de eventos reais j√° existentes: entrada em comunidade, posts, respostas, votos e salvamentos.
- Expor localiza√ß√£o somente de forma agregada/coarse via `visitor_location`, sem IP, coordenadas, endere√ßo ou localiza√ß√£o precisa.
- Omitir reten√ß√£o, bloqueio, silenciamento e a√ß√µes administrativas de paciente nesta V1.
- Retornar `coverage_notes`, `unavailable` e `export.available=false` para declarar lacunas sem inventar m√©tricas ou habilitar exporta√ß√£o sem endpoint real.
- Usar SVG/CSS locais para gr√°ficos no Admin, sem pacote novo.

## Consequ√™ncias

- O dashboard √© honesto e audit√°vel: n√£o h√° mocks, seeds permanentes nem infer√™ncias de dados n√£o existentes.
- A UI mostra apenas m√©tricas suportadas por fontes reais e explica lacunas de cobertura.
- Uma vers√£o futura de reten√ß√£o exigir√° modelagem espec√≠fica de cohort/atividade e nova decis√£o de produto.
- A exporta√ß√£o de pacientes fica bloqueada at√© existir endpoint real com escopo, privacidade e autoriza√ß√£o definidos.
- A localiza√ß√£o administrativa permanece minimizada, reduzindo exposi√ß√£o indevida de dados sens√≠veis.

## Valida√ß√£o

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Servi√ßo local `buildPatientsDashboard({})` retornou dados reais do banco local: `total_patients=8`, `active_patients=8`, `inactive_patients=0`, `new_signups=8`, `recent=5`, `export.available=false` e localiza√ß√£o indispon√≠vel por aus√™ncia de `visitor_location` real.
- Servi√ßo local rejeitou per√≠odo maior que 90 dias com `status=400` e `invalid_analytics_date_range`.
- Rota local em backend rec√©m-iniciado em `http://localhost:3101/api/admin/private/patients/dashboard` respondeu `401` sem token admin, confirmando prote√ß√£o do endpoint.
- Rota Admin local `http://localhost:3002/pacientes` respondeu `200` no servidor local; a prote√ß√£o visual segue o layout admin autenticado criado na TASK-46.

## Limita√ß√µes da execu√ß√£o

- Builder/Quick Copy n√£o estava dispon√≠vel como ferramenta no ambiente; a implementa√ß√£o visual foi guiada pelo PNG local `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- N√£o foi criada exporta√ß√£o de pacientes porque n√£o h√° endpoint real neste escopo.
- N√£o foi executada migration Prisma porque a task n√£o alterou `backend/prisma/schema.prisma` nem `backend/prisma/migrations`.

## Complemento 2026-07-14 - Tempo mÈdio do paciente por pageview autenticado

O dashboard Admin de pacientes passa a exibir **Tempo mÈdio do paciente** a partir de `page_view_event.duration_seconds` filtrado por `user.role="paciente"` e pelo perÌodo selecionado. A mÈtrica usa apenas pageviews autenticados, n„o inclui navegaÁ„o anÙnima nem dados de conte˙do, e sÛ È exibida quando ao menos 50% dos pageviews do recorte possuem duraÁ„o positiva. Caso contr·rio, o contrato retorna motivo de indisponibilidade.

A decis„o mantÈm a V1 sem retenÁ„o/cohort retention: o novo dado mede permanÍncia mÈdia por pageview confi·vel, n„o retenÁ„o, engajamento clÌnico ou sess„o terapÍutica. N„o h· alteraÁ„o de schema, migration, package ou exportaÁ„o.

## Complemento 2026-07-19 - Forma de cadastro como categoria de produto

O grafico **Forma de cadastro** do dashboard Admin de pacientes deve representar as duas vias reais do produto: **E-mail e senha** e **Google**. O campo bruto `user.provider` continua sendo a fonte auditavel, mas valores diferentes de `google` nao devem virar categorias visuais do produto; eles sao agrupados em **E-mail e senha** para evitar expor marcadores operacionais/legados como `admin_preview`.

Consequencia: o Admin passa a comparar apenas as duas formas de cadastro esperadas, preservando o provider bruto nos contratos quando necessario para auditoria e sem schema Prisma, migration, endpoint novo, mock, seed ou backfill artificial.

## Complemento 2026-07-19 - Dashboard sem lista resumida nem cobertura visivel

Por feedback direto de produto, o dashboard Admin de pacientes deve focar somente na leitura agregada: **Visao Geral** e **Estatisticas simples**. A lista resumida de pacientes e o bloco visual **Cobertura dos dados** deixam de ser exibidos em `/pacientes`.

Decisoes:

- Remover a lista resumida da UI do dashboard para reduzir densidade visual e evitar expor nomes/e-mails logo na visao geral.
- Remover o bloco de cobertura da UI, mantendo as lacunas de dados fora da tela principal nesta iteracao.
- Nao alterar o endpoint `GET /api/admin/private/patients/dashboard` neste ajuste, para evitar mudanca de contrato sem task dedicada; `recent_patients`, `coverage_notes`, `unavailable` e `export` seguem disponiveis no payload Admin existente.
- Se o produto quiser minimizacao tambem no contrato HTTP, uma proxima task deve ajustar DTO/backend/frontend com validacao especifica.

Consequencia: a tela fica mais curta e objetiva, preservando dados reais e sem mock, schema Prisma, migration, endpoint novo ou package novo.

## Complemento 2026-07-19 - Uso da plataforma de pacientes no dashboard

Por feedback direto de produto, o dashboard Admin de pacientes passa a reutilizar a leitura de **Uso da plataforma** criada para Psicologos, mas aplicada somente a usuarios `role="paciente"`.

Decisoes:

- Expandir `platform_usage` em `GET /api/admin/private/patients/dashboard` com pacientes ativos por uso no periodo, taxa ativa, PWA instalado, dias/sessoes medias, tempo medio confiavel, serie diaria e paginas mais acessadas.
- Usar exclusivamente `page_view_event` autenticado e `important_action_event.action_type="pwa_installed"` reais, sem criar evento fake, seed, backfill ou endpoint paralelo.
- Calcular taxa ativa contra pacientes elegiveis existentes ate o fim do periodo consultado, mantendo a distincao entre **status da conta** (`user.active`) e **uso da plataforma**.
- Manter indisponibilidade honesta quando nao houver pageviews autenticados ou duracao confiavel.
- Alinhar os graficos de **Genero** e **Forma de cadastro** ao layout em pizza com legenda lateral do **Modo de cadastro** dos psicologos, sem package novo.

Consequencia: Pacientes passa a ter a mesma leitura operacional de uso first-party que Psicologos, preservando privacidade e dados reais; nao houve schema Prisma, migration, package novo, mock ou alteracao de dados sensiveis.

## Complemento 2026-07-19 - LocalizaÁ„o como mapa e rankings agregados

Por feedback direto de produto, o card **LocalizaÁ„o** de `/pacientes` passa a ser uma leitura visual com mapa e rankings, inspirada no padr„o de tr·fego, mas preservando minimizaÁ„o de dados.

Decisıes:

- Calcular localizaÁıes de pacientes a partir de capturas reais de `visitor_location` vinculadas a `user.role="paciente"` no perÌodo selecionado.
- Usar `visitor_location` como fonte coarse de acesso/localizaÁ„o agregada; n„o persistir nem retornar IP, coordenadas, endereÁo ou localizaÁ„o precisa.
- Renderizar mapa SVG simplificado de UFs brasileiras no frontend Admin, sem instalar pacote de mapa e sem usar imagem de protÛtipo como gr·fico final.
- Exibir **Top estados** e **Top cidades** com contagens agregadas. Cidades com frequÍncia menor que 2 capturas s„o agrupadas em **Outras cidades** para reduzir risco de reidentificaÁ„o geogr·fica em contexto de sa˙de.
- Manter locais fora do Brasil nas listagens; o mapa informa quando n„o h· UF brasileira identificada.

ConsequÍncia: o Admin ganha leitura geogr·fica mais ˙til sem ampliar coleta, sem schema Prisma/migration, sem package novo, sem mock e sem backfill artificial.

## Complemento 2026-07-19 - Preview local de layout para localizacao vazia

- Decisao: permitir dados de exemplo somente no cliente Admin local quando o agregado real de localizacao de pacientes vier vazio (`locations.total=0`).
- Motivacao: o usuario precisa validar visualmente o mapa/rankings em localhost antes de haver captura real suficiente em `visitor_location`.
- Guarda de seguranca: o preview depende do hostname local (`localhost`, `127.0.0.1`, `::1`), mostra badge **exemplo local** e aviso textual; nao altera backend, schema, seed, migration, contrato ou ambiente de producao.
- Consequencia: a UI deixa claro que os numeros nao sao reais e troca automaticamente para `visitor_location` real assim que existir qualquer captura agregada no periodo.
