# TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos

## Status

Completed

## Contexto

O bloco **Conversao x Engajamento** ainda cruzava Conversao com apenas quatro faixas de
engajamento recebido e mantinha contadores laterais de taxa de alta conversao. A leitura desejada
para o funil operacional do Admin e comparar a Conversao contra os dois eixos combinados que ja
existem no topo do dashboard:

- **Engajamento e Favoritos**: 16 combinacoes entre relacionamento comunitario recebido e favoritos.
- **Visibilidade**: 16 combinacoes entre visibilidade comunitaria e video de apresentacao.

A matriz deve continuar sendo uma leitura observacional para o Admin entender fluxo ate WhatsApp,
sem ranking publico, punicao ou mudanca de algoritmo.

## Escopo

- Remover os contadores laterais do bloco antigo **Conversao x Engajamento**.
- Criar contrato real no dashboard para `profile_conversion_engagement_favorites`, com 4 linhas de
  Conversao x 16 colunas de Engajamento/Favoritos.
- Criar contrato real no dashboard para `profile_conversion_visibility`, com 4 linhas de Conversao x
  16 colunas de Visibilidade Comunidade/Video.
- Adicionar seletor no proprio titulo do card para alternar entre **Conversao x Engajamentos e
  Favoritos** e **Conversao x Visibilidade**.
- Manter o filtro por plano no canto direito e preservar a UI mobile-first com rolagem horizontal em
  desktop para as 16 colunas.

## Fora do escopo

- Alterar pesos, percentis ou definicoes dos donuts de Engajamento/Favoritos, Visibilidade ou
  Conversao.
- Criar filtro composto novo na lista Admin para drill-down dos 64 cruzamentos.
- Alterar ranking publico, ordenacao de psicologos, schema Prisma, migration, seed, mock ou package.
- Usar Figma como fonte ativa.

## Criterios de aceite

- [x] O bloco nao exibe mais os cards laterais **Conversao em Alto Engajamento**, **Conversao em
      Engajamento Padrao**, **Conversao em Baixo Engajamento**, **Conversao em Sem Engajamento** ou
      **Diferenca observada**.
- [x] A matriz padrao se chama **Conversao x Engajamentos e Favoritos** e exibe as 16 colunas de
      Engajamento/Favoritos.
- [x] O titulo tem seta/dropdown e permite alternar para **Conversao x Visibilidade**.
- [x] A matriz **Conversao x Visibilidade** exibe as 16 colunas de Visibilidade Comunidade x Video.
- [x] Ambas as matrizes usam dados reais ja rastreados e os mesmos benchmarks do dashboard, sem mock
      ou endpoint simulado.
- [x] A UI continua mobile-first e, em desktop, usa rolagem horizontal controlada para acomodar as
      16 colunas sem quebrar o layout.
- [x] O filtro por plano continua funcionando para Todos, Assinantes, Gratuitos e Cortesia.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Browser local autenticado validou a troca entre as duas matrizes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e o screenshot enviado pelo
  usuario.
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local autenticado em `/psicologos` validou que o bloco nao mostra os contadores laterais,
  inicia em **Conversao x Engajamentos e Favoritos**, alterna para **Conversao x Visibilidade** e
  mantem 16 colunas no payload/renderizacao. Screenshot local: `.tmp/task100-conversion-matrices.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao
  final junto com seus tokens.

## Observacoes

- As matrizes mantem apenas as 16 colunas analiticas solicitadas. Para nao criar uma 17a coluna de
  **Dados Insuficientes**, perfis ainda em adaptacao sao projetados nos mesmos eixos de 16
  combinacoes usando os sinais reais do periodo; os donuts isolados continuam exibindo **Dados
  Insuficientes** quando aplicavel.
- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.

## Complemento 2026-07-30 - separacao dos eixos compostos

### Contexto

Antes de avançar para novas analises de conversao, o produto decidiu separar os blocos compostos ja
existentes:

- Visibilidade passa a aparecer em dois donuts: **Video de apresentacao** e **Visibilidade na
  comunidade**.
- **Engajamento e Favoritos** passa a aparecer em dois donuts: **Engajamento recebido** e
  **Favoritados recebidos**.
- A matriz de origem do funil deixa de alternar apenas entre eixos compostos e passa a oferecer
  quatro leituras separadas contra Conversao.

### Escopo complementar

- Separar os donuts do card executivo sem alterar formulas, pesos, percentis ou fontes reais.
- Derivar as categorias isoladas dos contratos reais `profile_exposure` e
  `profile_engagement_favorites`.
- Derivar as matrizes separadas no Admin a partir de `profile_conversion_visibility` e
  `profile_conversion_engagement_favorites`, agrupando as 16 colunas atuais pelo eixo selecionado.
- Manter a UI mobile-first e a grade desktop com cinco cards somente em telas muito largas.

### Criterios de aceite complementares

- [x] O card executivo exibe donuts separados para **Video de apresentacao** e **Visibilidade na
      comunidade**.
- [x] O card executivo exibe donuts separados para **Engajamento recebido** e **Favoritados
      recebidos**.
- [x] A matriz expandida do funil permite alternar entre **Conversao x Visibilidade na Comunidade**,
      **Conversao x Video de apresentacao**, **Conversao x Engajamento recebido** e **Conversao x
      Favoritados recebidos**.
- [x] Todas as leituras usam os dados reais e as formulas ja existentes, sem mock, endpoint novo,
      package novo, schema Prisma ou migration.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] ADR complementar criado em `adrs/0369-separacao-eixos-funil-psicologos-admin.md`.

### Validacao complementar

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local do Admin e o screenshot enviado pelo
  usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local autenticado em `/psicologos` validou os cinco donuts separados no desktop e em
  viewport mobile de 390px, alem das quatro opcoes da matriz expandida:
  **Conversao x Visibilidade na Comunidade**, **Conversao x Video de apresentacao**,
  **Conversao x Engajamento recebido** e **Conversao x Favoritados recebidos**. Screenshots locais:
  `.tmp/task100-separated-dashboard-desktop.png` e
  `.tmp/task100-separated-dashboard-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao
  final junto com seus tokens.
