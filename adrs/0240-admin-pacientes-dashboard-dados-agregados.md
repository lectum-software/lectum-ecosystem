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

## Complemento 2026-07-19 - Uso da plataforma de pacientes no dashboard

Por feedback direto de produto, o dashboard Admin de pacientes passa a reutilizar a leitura de **Uso da plataforma** criada para Psicologos, mas aplicada somente a usuarios `role="paciente"`.

Decisoes:

- Expandir `platform_usage` em `GET /api/admin/private/patients/dashboard` com pacientes ativos por uso no periodo, taxa ativa, PWA instalado, dias/sessoes medias, tempo medio confiavel, serie diaria e paginas mais acessadas.
- Usar exclusivamente `page_view_event` autenticado e `important_action_event.action_type="pwa_installed"` reais, sem criar evento fake, seed, backfill ou endpoint paralelo.
- Calcular taxa ativa contra pacientes elegiveis existentes ate o fim do periodo consultado, mantendo a distincao entre **status da conta** (`user.active`) e **uso da plataforma**.
- Manter indisponibilidade honesta quando nao houver pageviews autenticados ou duracao confiavel.
- Alinhar os graficos de **Genero** e **Forma de cadastro** ao layout em pizza com legenda lateral do **Modo de cadastro** dos psicologos, sem package novo.

Consequencia: Pacientes passa a ter a mesma leitura operacional de uso first-party que Psicologos, preservando privacidade e dados reais; nao houve schema Prisma, migration, package novo, mock ou alteracao de dados sensiveis.

## Complemento 2026-07-19 - Localiza��o como mapa e rankings agregados

Por feedback direto de produto, o card **Localiza��o** de `/pacientes` passa a ser uma leitura visual com mapa e rankings, inspirada no padr�o de tr�fego, mas preservando minimiza��o de dados.

Decis�es:

- Calcular localiza��es de pacientes a partir de capturas reais de `visitor_location` vinculadas a `user.role="paciente"` no per�odo selecionado.
- Usar `visitor_location` como fonte coarse de acesso/localiza��o agregada; n�o persistir nem retornar IP, coordenadas, endere�o ou localiza��o precisa.
- Renderizar mapa SVG simplificado de UFs brasileiras no frontend Admin, sem instalar pacote de mapa e sem usar imagem de prot�tipo como gr�fico final.
- Exibir **Top estados** e **Top cidades** com contagens agregadas. Cidades com frequ�ncia menor que 2 capturas s�o agrupadas em **Outras cidades** para reduzir risco de reidentifica��o geogr�fica em contexto de sa�de.
- Manter locais fora do Brasil nas listagens; o mapa informa quando n�o h� UF brasileira identificada.

Consequ�ncia: o Admin ganha leitura geogr�fica mais �til sem ampliar coleta, sem schema Prisma/migration, sem package novo, sem mock e sem backfill artificial.

## Complemento 2026-07-19 - Preview local de layout para localizacao vazia

- Decisao: permitir dados de exemplo somente no cliente Admin local quando o agregado real de localizacao de pacientes vier vazio (`locations.total=0`).
- Motivacao: o usuario precisa validar visualmente o mapa/rankings em localhost antes de haver captura real suficiente em `visitor_location`.
- Guarda de seguranca: o preview depende do hostname local (`localhost`, `127.0.0.1`, `::1`), mostra badge **exemplo local** e aviso textual; nao altera backend, schema, seed, migration, contrato ou ambiente de producao.
- Consequencia: a UI deixa claro que os numeros nao sao reais e troca automaticamente para `visitor_location` real assim que existir qualquer captura agregada no periodo.

## Complemento 2026-07-19 - Devices dos pacientes no dashboard

Por feedback direto de produto, o dashboard Admin de pacientes passa a exibir um gráfico **Devices dos pacientes** seguindo o padrão visual já adotado em Psicólogos.

Decisões:

- Adicionar `device_usage` ao contrato `GET /api/admin/private/patients/dashboard`, calculado somente a partir de `visitor_session` real vinculada a usuários `role="paciente"` e não deletados, com sessão intersectando o período selecionado.
- Calcular percentuais por quantidade de sessões, não por pacientes únicos, porque a pergunta é sobre uso de devices; um mesmo paciente pode usar mais de um device no período.
- Retornar também `active_patients_count` por device como leitura complementar de pacientes únicos com sessão naquele device.
- Manter sessões sem tipo confiável em **Não identificado** em vez de ocultá-las.
- Implementar o gráfico no Admin com SVG/CSS local, sem pacote novo de charts.
- Remover apenas o título visual **Estatísticas simples** da tela, preservando a seção com `aria-label` para acessibilidade.

Consequência: Pacientes ganha paridade visual com o dashboard de Psicólogos para leitura de devices, sem schema Prisma, migration, package novo, seed, mock, endpoint paralelo ou inferência cross-device.

## Complemento 2026-07-19 - Ordem dos blocos agregados de pacientes

Por feedback direto de produto, a leitura agregada do dashboard Admin de pacientes deve priorizar comparação rápida na primeira linha e deixar blocos mais densos na segunda linha.

Decisão:

- Renderizar a primeira linha em desktop como **Gênero**, **Devices dos pacientes** e **Forma de cadastro**.
- Renderizar a segunda linha em desktop como **Localização** e **Uso da plataforma**.
- Preservar mobile-first: em telas estreitas, os blocos permanecem empilhados na mesma ordem lógica.
- Manter o contrato `device_usage`, `platform_usage`, localizações e demografia sem alteração; a mudança é apenas de composição visual.

Consequência: o dashboard fica alinhado à ordem solicitada pelo produto sem novos dados, packages, migrations, mocks ou endpoints.

## Complemento 2026-07-19 - Preview local de layout para devices vazios

- Decisao: permitir dados de exemplo somente no cliente Admin local quando o agregado real de devices de pacientes vier vazio (`device_usage.total_sessions=0`).
- Motivacao: o usuario precisa visualizar a composicao do grafico **Devices dos pacientes** em localhost antes de haver sessoes autenticadas suficientes em `visitor_session`.
- Guarda de seguranca: o preview depende do hostname local (`localhost`, `127.0.0.1`, `::1`), mostra badge **exemplo local** e aviso textual; nao altera backend, schema, seed, migration, contrato ou ambiente de producao.
- Consequencia: a UI deixa claro que os numeros nao sao reais e troca automaticamente para `visitor_session` real assim que existir qualquer sessao agregada no periodo.

## Complemento 2026-07-19 - Demografia e forma de cadastro filtradas pelo periodo

Por feedback direto de produto, os blocos **Genero** e **Forma de cadastro** do dashboard Admin de pacientes passam a ter a mesma semantica temporal de **Novos cadastros**: a distribuicao considera somente pacientes criados no periodo selecionado.

Decisoes:

- Usar `user.createdAt` como fronteira temporal de coorte para `demographics.gender` e `demographics.signup_sources`.
- Manter **Todo o periodo** como base completa real, porque o preset ja resolve o inicio no primeiro cadastro real de paciente.
- Manter **Localizacao** filtrada por `visitor_location.createdAt` no periodo selecionado, sem misturar coorte de cadastro com capturas geograficas antigas.
- Quando a coorte do periodo nao tiver pacientes, retornar totais zerados e indisponibilidade honesta em vez de reaproveitar distribuicao historica.

Consequencia: o Admin passa a comparar genero, via de cadastro e localizacao dentro do recorte escolhido, sem schema Prisma, migration, package novo, mock, seed, backfill ou endpoint paralelo.

## Complemento 2026-07-19 - Periodo visivel nos blocos agregados de pacientes

Por feedback direto de produto, os blocos agregados de `/pacientes` devem explicitar o recorte temporal logo abaixo do titulo para evitar ambiguidade quando o filtro de periodo muda.

Decisao:

- Reutilizar o helper `formatSelectedPeriod(summary.period)` nos blocos **Genero**, **Forma de cadastro** e **Localizacao**.
- Manter o mesmo estilo visual usado em **Devices dos pacientes** e **Uso da plataforma**.
- Nao alterar contrato, calculo, backend, schema, migration ou fonte de dados; a mudanca apenas torna a semantica temporal visivel em todos os blocos agregados relevantes.

Consequencia: o Admin passa a deixar explicito que genero, forma de cadastro e localizacao acompanham o periodo selecionado, sem adicionar dados, mocks, packages ou endpoints.

## Complemento 2026-07-19 - Mapa de localizacao no padrao Wix

Por feedback direto de produto, o card **Localizacao** de `/pacientes` passa a abandonar o cartograma de tiles e a usar uma composicao mais proxima dos paineis do Wix: mapa amplo, ranking lateral com barras e legenda inferior de intensidade.

Decisoes:

- Renderizar **Estados** como choropleth SVG de UFs brasileiras, usando paths locais derivados de TopoJSON simplificado com licenca MIT, sem package novo de mapa e sem chamada externa em runtime.
- Manter a fonte de dados como `visitor_location` agregada/coarse, sem IP, coordenadas, endereco ou localizacao precisa.
- Adicionar alternador **Estados / Paises** para suportar a leitura de paises da referencia Wix; a aba **Paises** usa malha SVG mundial local derivada de world-atlas 110m/Natural Earth, com paises destacados por intensidade e sem desenho manual aproximado.
- Preservar rankings de cidades/estados/paises como agregados e manter agrupamento de baixa frequencia definido anteriormente para reduzir risco de reidentificacao geografica.
- Preferir dados SVG locais a um pacote de mapa nesta iteracao para evitar dependency nova; as fontes cartograficas ficam versionadas em `admin/src/lib/brazil-state-map.ts` e `admin/src/lib/world-country-map.ts`. Se o Admin precisar de drilldown geografico completo no futuro, uma nova task deve avaliar package/licenca/acessibilidade e registrar ADR especifico.

Consequencia: o card fica visualmente mais proximo da referencia de analytics do Wix, segue mobile-first, nao altera contrato/backend/schema/migration e nao amplia a coleta de dados sensiveis.

## Complemento 2026-07-21 - Dashboard sem faixa de ausencia de novos cadastros

Por feedback direto de produto, a faixa informativa **Periodo sem cadastros de pacientes** nao deve ser renderizada em `/pacientes` quando o card **Novos cadastros** estiver zerado.

Decisao:

- Remover o empty state visual especifico de ausencia de novos cadastros do dashboard Admin de pacientes.
- Manter o card **Novos cadastros** como a fonte suficiente para comunicar o valor `0` no periodo selecionado.
- Nao alterar o contrato `GET /api/admin/private/patients/dashboard`, os calculos, o backend, schema Prisma, migrations ou fontes de dados.

Consequencia: a visao geral fica mais compacta e evita duplicar a informacao ja presente nos cards, sem mock, pacote novo, endpoint paralelo ou mudanca de regra de dominio.

Validacao do ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, smoke HTTP local `GET http://localhost:3002/pacientes` retornando `200` e screenshot headless local em `.tmp/admin-pacientes-validation.png`. Em perfil headless sem sessao administrativa, a rota permaneceu no estado de hidratacao/autenticacao; a conferencia visual autenticada ficou limitada ao codigo, build e ao dev server local aberto pelo usuario.