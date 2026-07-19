# ADR-0240: Dashboard Admin de pacientes com dados agregados e sem retenção V1

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-60: Dashboard administrativo de pacientes.

## Contexto

A seção **Pacientes** do painel Admin precisa exibir uma visão simples de crescimento, status de conta, cadastros recentes e estatísticas básicas. A decisão de produto para a V1 exclui status de bloqueio/silenciamento, taxa de retenção e ações administrativas destrutivas.

O schema atual já possui fontes reais para contas de pacientes (`user.role="paciente"`), status de conta (`user.active`), perfil (`patient_profile`), origem de cadastro (`user.provider`), localização coarse (`visitor_location`) e atividades de comunidade. Não há fonte real modelada para cohort retention nem fluxo administrativo seguro para exportação de pacientes nesta task.

## Decisão

- Criar o endpoint privado Admin `GET /api/admin/private/patients/dashboard` com autenticação admin obrigatória.
- Calcular **total**, **ativos**, **inativos** e **novos cadastros** somente a partir de `user.role="paciente"`, `user.deleted=false`, `user.active` e `user.createdAt`.
- Tratar ativo/inativo como **status da conta** (`user.active`), não como engajamento recente.
- Montar a atividade recente da lista resumida a partir de eventos reais já existentes: entrada em comunidade, posts, respostas, votos e salvamentos.
- Expor localização somente de forma agregada/coarse via `visitor_location`, sem IP, coordenadas, endereço ou localização precisa.
- Omitir retenção, bloqueio, silenciamento e ações administrativas de paciente nesta V1.
- Retornar `coverage_notes`, `unavailable` e `export.available=false` para declarar lacunas sem inventar métricas ou habilitar exportação sem endpoint real.
- Usar SVG/CSS locais para gráficos no Admin, sem pacote novo.

## Consequências

- O dashboard é honesto e auditável: não há mocks, seeds permanentes nem inferências de dados não existentes.
- A UI mostra apenas métricas suportadas por fontes reais e explica lacunas de cobertura.
- Uma versão futura de retenção exigirá modelagem específica de cohort/atividade e nova decisão de produto.
- A exportação de pacientes fica bloqueada até existir endpoint real com escopo, privacidade e autorização definidos.
- A localização administrativa permanece minimizada, reduzindo exposição indevida de dados sensíveis.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Serviço local `buildPatientsDashboard({})` retornou dados reais do banco local: `total_patients=8`, `active_patients=8`, `inactive_patients=0`, `new_signups=8`, `recent=5`, `export.available=false` e localização indisponível por ausência de `visitor_location` real.
- Serviço local rejeitou período maior que 90 dias com `status=400` e `invalid_analytics_date_range`.
- Rota local em backend recém-iniciado em `http://localhost:3101/api/admin/private/patients/dashboard` respondeu `401` sem token admin, confirmando proteção do endpoint.
- Rota Admin local `http://localhost:3002/pacientes` respondeu `200` no servidor local; a proteção visual segue o layout admin autenticado criado na TASK-46.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelo PNG local `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- Não foi criada exportação de pacientes porque não há endpoint real neste escopo.
- Não foi executada migration Prisma porque a task não alterou `backend/prisma/schema.prisma` nem `backend/prisma/migrations`.

## Complemento 2026-07-14 - Tempo m�dio do paciente por pageview autenticado

O dashboard Admin de pacientes passa a exibir **Tempo m�dio do paciente** a partir de `page_view_event.duration_seconds` filtrado por `user.role="paciente"` e pelo per�odo selecionado. A m�trica usa apenas pageviews autenticados, n�o inclui navega��o an�nima nem dados de conte�do, e s� � exibida quando ao menos 50% dos pageviews do recorte possuem dura��o positiva. Caso contr�rio, o contrato retorna motivo de indisponibilidade.

A decis�o mant�m a V1 sem reten��o/cohort retention: o novo dado mede perman�ncia m�dia por pageview confi�vel, n�o reten��o, engajamento cl�nico ou sess�o terap�utica. N�o h� altera��o de schema, migration, package ou exporta��o.

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
