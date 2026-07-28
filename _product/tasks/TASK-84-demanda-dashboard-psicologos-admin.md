# TASK-84 - Demanda no dashboard Admin de psicologos

## Status

Completed

## Contexto

O Admin ja possui o dashboard de psicologos em `/psicologos`, com visao geral, origem de trafego e metricas de uso. O produto precisa de uma leitura agregada e interna de **Demanda** para entender quantos psicologos estao tendo resultados de negocio na plataforma, sem expor publicamente, ranquear ou punir profissionais.

A classificacao deve respeitar o filtro de periodo do dashboard e usar somente sinais reais ja persistidos:

- cliques de WhatsApp em `contact_request.channel=whatsapp`;
- aberturas reais do perfil em `profile_view_event.source=profile_page`;
- favoritos em `psychologist_favorite`.

## Escopo

- Adicionar ao contrato do dashboard Admin de psicologos um bloco agregado `demand`.
- Classificar cada psicologo ativo no fim da janela selecionada em uma das categorias:
  - **Demanda Forte**;
  - **Trafego Nao Convertido**;
  - **Interesse Nao Convertido**;
  - **Baixa Demanda**;
  - **Dados Insuficientes**.
- Renderizar no Admin, abaixo do grafico de visao geral e antes de **Origem do trafego**, um bloco **Demanda** com grafico de pizza, quantidades e taxas de psicologos por categoria.
- Manter a leitura agregada e nao publica, sem lista individual, ranking ou mecanismo punitivo.

## Regras de classificacao V1

As metricas sao calculadas dentro da janela temporal selecionada e normalizadas para 30 dias pelo numero de dias em que o perfil estava ativo dentro da janela.

- **Demanda Forte**: WhatsApp e o sinal mais forte. Entra quando ha pelo menos 5 cliques normalizados/30d, ou pelo menos 3 cliques normalizados/30d com 2+ cliques reais e taxa WhatsApp/perfil de 5% ou mais.
- **Trafego Nao Convertido**: 60+ aberturas de perfil normalizadas/30d, WhatsApp abaixo do corte forte e conversao WhatsApp/perfil abaixo de 5% ou sem base de perfil.
- **Interesse Nao Convertido**: 5+ favoritos normalizados/30d e WhatsApp abaixo do corte forte.
- **Baixa Demanda**: abaixo dos cortes de WhatsApp, perfil e favoritos.
- **Dados Insuficientes**: menos de 7 dias ativos dentro da janela, salvo quando o volume de WhatsApp ja caracteriza Demanda Forte.

## Criterios de aceite

- [x] O backend retorna `demand` no `GET /api/admin/private/psychologists/dashboard` usando apenas dados reais de `profile_view_event`, `contact_request` e `psychologist_favorite`.
- [x] As categorias usam os nomes finais definidos pelo produto e percentuais em relacao ao total de psicologos analisados.
- [x] A classificacao respeita o filtro de periodo, inclusive `Todo o periodo`, `Este ano` e intervalos customizados, com normalizacao para 30 dias.
- [x] O Admin exibe o bloco **Demanda** logo abaixo da visao geral, antes de **Origem do trafego**, com grafico de pizza e legenda com quantidades/taxas.
- [x] A UI e mobile-first e nao usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy: ferramenta nao disponivel no ambiente; usei a referencia local do inventario `Admin | Psicologos - Dashboard` e mantive o padrao visual dos cards/graficos existentes do Admin.
- `pnpm --dir backend exec biome check src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`
- `pnpm --dir admin exec biome check src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- Smoke local do service `buildPsychologistsDashboard({ period: "all" })`: `status=200`, `hasDemand=true`, categorias retornadas e totais reais preenchidos.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` passou na segunda execucao; a primeira falhou por erro transitorio do `prisma generate` no Windows (`EEXIST ... generated/prisma/internal`) e `pnpm --dir backend exec prisma generate` isolado passou antes da repeticao.
- Servidor local: backend recompilado reiniciado em `localhost:3001`; Admin reiniciado em `localhost:3002`.
- HTTP local `GET http://localhost:3002/psicologos`: `200 OK`.
- Bundle gerado em `admin/.next/static/chunks/app/(admin)/psicologos` contem o bloco de Demanda e as categorias, confirmando que a porta 3002 esta servindo build com a alteracao.
- Refinamento visual de Demanda em 2026-07-25 removeu o texto introdutorio, contadores agregados, totais por categoria e faixa tecnica dos cortes; a legenda passou a ficar em duas colunas no desktop, com Demanda Forte ao lado de Interesse Nao Convertido, Trafego Nao Convertido ao lado de Baixa Demanda e Dados Insuficientes ocupando linha propria; o bloco tambem ganhou filtro por plano (Todos, Gratuitos, Assinantes e Cortesia) com dados reais por segmento.
- Refinamento de UI solicitado em 2026-07-25 validado com `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local de `buildPsychologistsDashboard({ period: "all" })` confirmando ordem/copies e `plan_segments.*.demand`, bundle com `demand-plan-segment` e HTTP local `GET http://localhost:3002/psicologos` retornando 200.
- Refinamento compacto solicitado em 2026-07-26: a legenda de Demanda deixou de exibir a linha `N psicologo(s)` e passou a reunir quantidade e taxa no topo do card, no formato `1 (6,7%)`, com o percentual em menor peso textual. Validado com `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e HTTP local `GET http://localhost:3002/psicologos` retornando 200. Builder/Quick Copy nao estava exposto como ferramenta no ambiente; a alteracao usou a referencia local `Admin | Psicologos - Dashboard` e a captura fornecida pelo usuario.

## Observacoes

- Nao houve alteracao de `backend/prisma/schema.prisma` nem de `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica.
- A classificacao e agregada e operacional. Nao deve ser exibida em perfil publico nem usada como ranking.
- A interface da Demanda deve priorizar leitura executiva: pizza + categorias com quantidade, percentual e descricao curta, sem exibir totais tecnicos ou criterios de corte no card.

## Ajuste pos-feedback 2026-07-28 - Demanda e engajamento em duas colunas

- Pedido do usuario: transformar o bloco superior **Demanda** em duas colunas, **Demanda** e **Engajamento**, semelhante ao bloco **Intencao e engajamento dos pacientes** do dashboard `/pacientes`.
- O card superior de `/psicologos` passou a se chamar **Demanda e engajamento dos psicologos** e manteve o periodo logo abaixo do titulo.
- A coluna **Demanda** usa o contrato real `demand` ja existente, com donut e legenda focados na distribuicao por categoria.
- A coluna **Engajamento** deriva os buckets **Alto engajamento**, **Baixo engajamento** e **Dados insuficientes** dos totais reais de `demand_engagement`, sem alterar backend, contrato HTTP, endpoint, migration, seed, mock ou backfill.
- O filtro por plano do card continua unico e agora aplica o mesmo segmento as duas colunas.
- O bloco detalhado **Demanda x Engajamento** permanece abaixo para manter a matriz observacional e a navegacao por quadrantes para a lista filtrada.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`, o padrao real de `/pacientes` e a captura enviada pelo usuario.
- ADR criado: `adrs/0335-demanda-engajamento-duas-colunas-dashboard-psicologos.md`.

### Criterios de aceite do ajuste

- [x] O card superior de demanda foi reorganizado como **Demanda e engajamento dos psicologos**.
- [x] Em desktop amplo, o layout progride para duas colunas: **Demanda** e **Engajamento**.
- [x] Em telas estreitas, as colunas empilham em abordagem mobile-first.
- [x] A coluna **Demanda** continua usando dados reais de `demand`.
- [x] A coluna **Engajamento** usa dados reais de `demand_engagement.totals`, sem mock ou endpoint paralelo.
- [x] O filtro por plano permanece real e segmenta as duas colunas.
- [x] Nenhum package novo, schema Prisma, migration, seed, mock, dado artificial ou `<img>` foi adicionado.

### Validacao complementar executada

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke local de `http://localhost:3002/psicologos` no Admin dev server.
