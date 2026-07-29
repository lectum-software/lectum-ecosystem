# TASK-84 - Conversão no dashboard Admin de psicologos

## Status

Completed

## Contexto

O Admin ja possui o dashboard de psicologos em `/psicologos`, com visao geral, origem de trafego e metricas de uso. O produto precisa de uma leitura agregada e interna de **Conversão** para entender quantos psicologos estao tendo resultados de negocio na plataforma, sem expor publicamente, ranquear ou punir profissionais.

A classificacao deve respeitar o filtro de periodo do dashboard e usar somente sinais reais ja persistidos:

- exposicao real por abertura do perfil em `profile_view_event.source=profile_page`;
- exposicao real por impressao de busca em `profile_view_event.source=search_result`;
- exposicao real por visualizacao qualificada de video em `profile_video_watch_session` com 3s ou mais;
- exposicao real por visualizacao de posts/respostas autorais em `page_view_event`;
- cliques de WhatsApp em `contact_request.channel=whatsapp`;
- favoritos em `psychologist_favorite`.

## Escopo

- Adicionar ao contrato do dashboard Admin de psicologos um bloco agregado `profile_conversion`.
- Classificar cada psicologo ativo no fim da janela selecionada em uma das categorias:
  - **Alta Conversão**;
  - **Exposicao Nao Convertida**;
  - **Interesse Nao Convertido**;
  - **Baixa Conversão**;
  - **Dados Insuficientes**.
- Renderizar no Admin, abaixo do grafico de visao geral e antes de **Origem do trafego**, um bloco **Conversão** com grafico de pizza, quantidades e taxas de psicologos por categoria.
- Manter a leitura agregada e nao publica, sem lista individual, ranking ou mecanismo punitivo.

## Regras de classificacao atuais

As metricas sao calculadas dentro da janela temporal selecionada. Para Conversao, nao ha normalizacao por 30 dias: a taxa operacional e `cliques WhatsApp / exposicao`.

- **Exposicao**: soma, com peso 1 por evento, de abertura do perfil, impressao de busca, visualizacao qualificada de video e views de posts/respostas autorais em comunidades.
- **Alta Conversao**: pelo menos 50 exposicoes, pelo menos 3 cliques WhatsApp e taxa de conversao igual ou superior a 5%.
- **Exposicao Nao Convertida**: pelo menos 60 exposicoes e taxa abaixo de 2% ou nenhum clique WhatsApp.
- **Interesse Nao Convertido**: 5+ favoritos e sem taxa/volume para Alta Conversao.
- **Baixa Conversao**: exposicao suficiente, mas fora dos cortes de Alta Conversao, Exposicao Nao Convertida e Interesse Nao Convertido.
- **Dados Insuficientes**: exposicao abaixo de 50 sem sinal suficiente para outro bucket.

## Criterios de aceite

- [x] O backend retorna `profile_conversion` no `GET /api/admin/private/psychologists/dashboard` usando apenas dados reais de exposicao, `contact_request` e `psychologist_favorite`.
- [x] As categorias usam os nomes finais definidos pelo produto e percentuais em relacao ao total de psicologos analisados.
- [x] A classificacao respeita o filtro de periodo, inclusive `Todo o periodo`, `Este ano` e intervalos customizados, sem normalizacao por 30 dias na Conversao.
- [x] O Admin exibe o bloco **Conversão** logo abaixo da visao geral, antes de **Origem do trafego**, com grafico de pizza e legenda com quantidades/taxas.
- [x] A UI e mobile-first e nao usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy: ferramenta nao disponivel no ambiente; usei a referencia local do inventario `Admin | Psicologos - Dashboard` e mantive o padrao visual dos cards/graficos existentes do Admin.
- `pnpm --dir backend exec biome check src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`
- `pnpm --dir admin exec biome check src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- Smoke local do service `buildPsychologistsDashboard({ period: "all" })`: `status=200`, `hasProfileConversion=true`, categorias retornadas e totais reais preenchidos.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` passou na segunda execucao; a primeira falhou por erro transitorio do `prisma generate` no Windows (`EEXIST ... generated/prisma/internal`) e `pnpm --dir backend exec prisma generate` isolado passou antes da repeticao.
- Servidor local: backend recompilado reiniciado em `localhost:3001`; Admin reiniciado em `localhost:3002`.
- HTTP local `GET http://localhost:3002/psicologos`: `200 OK`.
- Bundle gerado em `admin/.next/static/chunks/app/(admin)/psicologos` contem o bloco de Conversão e as categorias, confirmando que a porta 3002 esta servindo build com a alteracao.
- Refinamento visual de Conversão em 2026-07-25 removeu o texto introdutorio, contadores agregados, totais por categoria e faixa tecnica dos cortes; a legenda passou a ficar em duas colunas no desktop, com Alta Conversão ao lado de Interesse Nao Convertido, Exposicao Nao Convertida ao lado de Baixa Conversão e Dados Insuficientes ocupando linha propria; o bloco tambem ganhou filtro por plano (Todos, Gratuitos, Assinantes e Cortesia) com dados reais por segmento.
- Refinamento de UI solicitado em 2026-07-25 validado com `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local de `buildPsychologistsDashboard({ period: "all" })` confirmando ordem/copies e `plan_segments.*.profile_conversion`, bundle com `profile-conversion-plan-segment` e HTTP local `GET http://localhost:3002/psicologos` retornando 200.
- Refinamento compacto solicitado em 2026-07-26: a legenda de Conversão deixou de exibir a linha `N psicologo(s)` e passou a reunir quantidade e taxa no topo do card, no formato `1 (6,7%)`, com o percentual em menor peso textual. Validado com `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e HTTP local `GET http://localhost:3002/psicologos` retornando 200. Builder/Quick Copy nao estava exposto como ferramenta no ambiente; a alteracao usou a referencia local `Admin | Psicologos - Dashboard` e a captura fornecida pelo usuario.

## Observacoes

- Nao houve alteracao de `backend/prisma/schema.prisma` nem de `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica.
- A classificacao e agregada e operacional. Nao deve ser exibida em perfil publico nem usada como ranking.
- A interface da Conversão deve priorizar leitura executiva: pizza + categorias com quantidade, percentual e descricao curta, sem exibir totais tecnicos ou criterios de corte no card.

## Ajuste pos-feedback 2026-07-28 - Conversão e engajamento em duas colunas

- Pedido do usuario: transformar o bloco superior **Conversão** em duas colunas, **Conversão** e **Engajamento**, semelhante ao bloco **Intencao e engajamento dos pacientes** do dashboard `/pacientes`.
- O card superior de `/psicologos` passou a se chamar **Conversão e engajamento dos psicologos** e manteve o periodo logo abaixo do titulo.
- A coluna **Conversão** usa o contrato real `profile_conversion` ja existente, com donut e legenda focados na distribuicao por categoria.
- A coluna **Engajamento** deriva os buckets **Alto engajamento**, **Baixo engajamento** e **Dados insuficientes** dos totais reais de `profile_conversion_engagement`, sem alterar backend, contrato HTTP, endpoint, migration, seed, mock ou backfill.
- O filtro por plano do card continua unico e agora aplica o mesmo segmento as duas colunas.
- O bloco detalhado **Conversão x Engajamento** permanece abaixo para manter a matriz observacional e a navegacao por quadrantes para a lista filtrada.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`, o padrao real de `/pacientes` e a captura enviada pelo usuario.
- ADR criado: `adrs/0335-conversao-engajamento-duas-colunas-dashboard-psicologos.md`.

### Criterios de aceite do ajuste

- [x] O card superior de conversão foi reorganizado como **Conversão e engajamento dos psicologos**.
- [x] Em desktop amplo, o layout progride para duas colunas: **Conversão** e **Engajamento**.
- [x] Em telas estreitas, as colunas empilham em abordagem mobile-first.
- [x] A coluna **Conversão** continua usando dados reais de `profile_conversion`.
- [x] A coluna **Engajamento** usa dados reais de `profile_conversion_engagement.totals`, sem mock ou endpoint paralelo.
- [x] O filtro por plano permanece real e segmenta as duas colunas.
- [x] Nenhum package novo, schema Prisma, migration, seed, mock, dado artificial ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke local de `http://localhost:3002/psicologos` no Admin dev server.

## Ajuste pós-feedback 2026-07-29 - Vocabulário Conversão

- Pedido do usuário: substituir o termo da leitura administrativa de resultado por **Conversão**, inclusive contratos internos que ainda usavam o vocabulário anterior.
- Backend/Admin API: a leitura de resultado do perfil passou a usar `profile_conversion` e `profile_conversion_engagement`, evitando colisão com a trilha já existente de conversão de cadastro até assinatura (`conversion`).
- Frontend Admin: dashboard, lista, detalhe do psicólogo, filtros, query keys e links profundos passaram a exibir **Conversão** e a enviar `profile_conversion`/`profile_conversion_engagement`.
- Moderação: o alerta operacional de psicólogos sem resultado após adaptação passou a usar **Sem conversão** e `psychologist_no_conversion`.
- O bloco **Comparativo de oferta e demanda** permaneceu inalterado, porque ali demanda representa buscas reais de mercado por filtros do diretório público.
- Nenhuma alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` não se aplica.
- ADR criado: `adrs/0343-vocabulario-conversao-admin.md`.

### Critérios complementares

- [x] A UI Admin não exibe mais o vocabulário anterior na leitura de resultado dos psicólogos.
- [x] O contrato de dashboard/lista/detalhe usa `profile_conversion` e `profile_conversion_engagement` para a leitura de resultado do perfil.
- [x] Links profundos da lista usam `profile_conversion_engagement=...` com categorias `strong_conversion` e `low_conversion`.
- [x] O alerta operacional usa `psychologist_no_conversion` e copy **Sem conversão**.
- [x] **Comparativo de oferta e demanda** permanece com esse nome por representar busca/oferta de mercado.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validação complementar

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/validator/index.ts"`
- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts" "src/api/req/moderation/index.ts" "src/api/req/psychologists/index.ts" "src/app/(admin)/moderacao/operational-category-client.tsx" "src/app/(admin)/moderacao/overview-charts.tsx" "src/app/(admin)/psicologos/[id]/client.tsx" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- HTTP local: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=strong_conversion_very_engaged` retornaram 200.
- Validação estática do build: `admin/.next/static` e `admin/.next/server` não contêm os identificadores e copies anteriores da leitura de resultado dos psicólogos.


## Ajuste pós-feedback 2026-07-29 - Alta Conversão

- Pedido do usuário: renomear a categoria exibida para **Alta Conversão** em todos os locais do painel Admin.
- Backend Admin: labels e descrições retornados por dashboard, lista, detalhe de estatísticas do psicólogo, engajamento e fluxo cruzado de intenção/conversão passaram a exibir **Alta Conversão**.
- Frontend Admin: filtros, tags, matriz **Conversão x Engajamento**, resumo observacional e type unions passaram a exibir **Alta Conversão** ou **Alta conversão** conforme contexto textual.
- O identificador interno `strong_conversion` permaneceu inalterado por compatibilidade de contrato, URL e agregados; não houve mudança de regra de classificação.
- Nenhuma alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` não se aplica.
- ADR atualizado: `adrs/0343-vocabulario-conversao-admin.md`.

### Critérios complementares

- [x] A UI Admin exibe **Alta Conversão** no badge do detalhe do psicólogo quando a categoria `strong_conversion` vem da API.
- [x] Dashboard, lista, filtros e matriz de conversão/engajamento exibem **Alta Conversão** ou **Alta conversão** no contexto correto.
- [x] Backend retorna a nova label em todos os contratos Admin que expõem a categoria `strong_conversion`.
- [x] O ID interno `strong_conversion` e os links profundos existentes foram preservados.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validação complementar

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/dashboard/summary/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- HTTP local: `GET http://localhost:3002/psicologos`, `GET http://localhost:3002/psicologos/lista?profile_conversion=strong_conversion` e `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornaram 200.
- Validação estática: `admin/src`, `backend/src`, `_product/tasks`, `adrs`, `admin/.next/static` e `admin/.next/server` não contêm a copy anterior da categoria `strong_conversion`.

## Ajuste pos-feedback 2026-07-29 - Conversao por exposicao e tooltips

- Pedido do usuario: alterar a categoria exibida **Trafego Nao Convertido** para **Exposicao Nao Convertida**, adicionar tooltips nas cinco opcoes de Conversao e aplicar a nova regra `taxa = cliques WhatsApp / exposicao`.
- Backend Admin: dashboard, lista, detalhe de estatisticas do psicologo e fluxo cruzado de intencao/conversao passaram a usar exposicao como denominador, sem normalizacao por 30 dias para Conversao.
- A exposicao usa apenas eventos reais existentes: visualizacao de perfil, impressao em busca, visualizacao qualificada de video do perfil e views de posts/respostas autorais em comunidades. Cada exposicao registrada tem peso 1 nesta versao.
- `contact_request.channel=whatsapp` continua sendo o numerador dos cliques WhatsApp, cobrindo cliques vindos de perfil, video ou comunidade quando a acao cria contact_request.
- O identificador interno `unconverted_traffic` foi preservado por compatibilidade; apenas label, descricao e filtros exibem **Exposicao Nao Convertida**.
- Frontend Admin: donut de Conversao em `/psicologos` exibe tooltip nas cinco categorias usando a descricao real da API; lista, filtros e matriz usam a nova copy.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0347-conversao-por-exposicao-admin-psicologos.md`.

### Criterios complementares

- [x] A UI Admin exibe **Exposicao Nao Convertida** no lugar de **Trafego Nao Convertido** nas telas e filtros de psicologos.
- [x] O donut de Conversao possui tooltip para Alta Conversao, Exposicao Nao Convertida, Interesse Nao Convertido, Baixa Conversao e Dados Insuficientes.
- [x] A taxa de Conversao usa `cliques WhatsApp / exposicao`, sem normalizacao por 30 dias.
- [x] A exposicao considera somente eventos reais ja instrumentados, sem mocks, seeds ou dados artificiais.
- [x] O ID interno `unconverted_traffic` e os links profundos existentes foram preservados.
- [x] Nenhum package novo, schema Prisma, migration, seed, mock ou endpoint simulado foi criado.

### Validacao complementar

- `pnpm --dir backend exec biome check --write "src/utils/admin-profile-conversion.ts" "src/modules/api/admin/private/dashboard/summary/DTOs/IAdminDashboardSummaryDTO.ts" "src/modules/api/admin/private/dashboard/summary/repositories/AdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/repositories/interfaces/IAdminDashboardRepository.ts" "src/modules/api/admin/private/dashboard/summary/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/repositories/AdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/repositories/interfaces/IAdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/dashboard/index.ts" "src/api/req/psychologists/index.ts" "src/app/(admin)/dashboard/client.tsx" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke backend com `buildPsychologistsDashboard({ period: "all" })`: retornou status 200, labels `Alta Conversão`, `Interesse Não Convertido`, `Exposição Não Convertida`, `Baixa Conversão`, `Dados Insuficientes`, totals com `exposures=440` e thresholds novos.
- HTTP local: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion=unconverted_traffic` retornaram 200.
