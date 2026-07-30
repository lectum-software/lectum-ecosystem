# TASK-96 - Engajamento e Favoritos no dashboard Admin de psicólogos

## Status

Completed

## Contexto

O dashboard Admin de psicólogos em `/psicologos` já apresenta o funil executivo de
**Visibilidade**, **Engajamento** e **Conversão**. Após a revisão de produto, o bloco intermediário
precisa representar melhor a leitura do funil: o Admin quer entender a quantidade de psicólogos em
combinações de relacionamento recebido na comunidade e favoritos recebidos, para comparar depois
com a matriz de alta conversão no WhatsApp.

Favoritar é tratado como um sinal forte de intenção porque aproxima o paciente de uma conversão
futura, mas não deve ser misturado no mesmo score da comunidade. A tela deve manter um único bloco
executivo, chamado **Engajamento e Favoritos**, com 16 combinações internas.

## Escopo

- Criar cálculo backend real para `profile_engagement_favorites` no contrato de
  `GET /api/admin/private/psychologists/dashboard`.
- Classificar cada psicólogo ativo no fim do período em uma das 16 combinações entre:
  - **Alto Engajamento**, **Engajamento Padrão**, **Baixo Engajamento**, **Sem Engajamento**;
  - **Muito favoritado**, **Favoritado padrão**, **Pouco favoritado**, **Sem favoritos**.
- Manter **Dados Insuficientes** para psicólogos dentro do período de adaptação de 30 dias.
- Atualizar a UI do Admin em `/psicologos` para trocar o donut simples de Engajamento pelo bloco
  **Engajamento e Favoritos**.
- Exibir no donut apenas as combinações com maior volume e agregar as demais em
  **Outras combinações**, com opção de expandir para ver todas as categorias.
- Atualizar o contrato TypeScript do Admin e as labels da matriz **Conversão x Engajamento** para a
  nomenclatura padronizada.

## Regras de classificação

- Favoritos usam a mesma lógica de mediana/percentis da plataforma já adotada em Visibilidade e
  Conversão:
  - psicólogos com menos de 30 dias entram em **Dados Insuficientes**;
  - psicólogos elegíveis sem favoritos entram em **Sem favoritos**;
  - psicólogos elegíveis com favoritos são comparados contra P25/P75 dos não-zero do período.
- Engajamento comunitário usa primeiro um score ponderado apenas com ações recebidas de pacientes:
  - comentários/respostas recebidos: peso `5`;
  - compartilhamentos recebidos: peso `3`;
  - salvamentos recebidos: peso `2`;
  - votos positivos recebidos: peso `1`.
- O score comunitário segue a mesma lógica de benchmark por P25/P75 dos não-zero:
  - score `0`: **Sem Engajamento**;
  - abaixo de P25: **Baixo Engajamento**;
  - entre P25 e P75: **Engajamento Padrão**;
  - acima de P75: **Alto Engajamento**.
- A origem do favorito não é separada: o mesmo evento real de favorito cobre vídeo de apresentação e
  perfil.
- Não existe ação de seguir no produto para este bloco; seguidores não entram no novo cálculo.

## Fora do escopo

- Alterar ranking público, algoritmo de recomendação ou ordenação dos psicólogos.
- Criar matriz nova de Conversão x Engajamento e Favoritos; a matriz combinada será tratada depois.
- Criar mock, seed artificial, endpoint paralelo, migration, schema Prisma ou novo package.
- Separar favorito por origem visual.

## Critérios de aceite

- [x] `profile_engagement_favorites` é retornado no dashboard Admin e nos segmentos de plano.
- [x] Cada psicólogo é classificado em uma das 16 combinações ou em **Dados Insuficientes**.
- [x] Favoritos usam benchmark de plataforma por P25/P75 dos não-zero fora da adaptação.
- [x] Engajamento comunitário usa pesos `comentário=5`, `compartilhamento=3`, `salvamento=2` e
      `voto positivo=1`, depois benchmark por P25/P75.
- [x] O novo cálculo usa apenas eventos reais e prioriza ações recebidas de pacientes.
- [x] O bloco da UI passa a se chamar **Engajamento e Favoritos**, mostra donut resumido por volume
      e permite expandir as combinações escondidas.
- [x] A matriz existente **Conversão x Engajamento** usa labels padronizadas:
      **Alto Engajamento**, **Engajamento Padrão**, **Baixo Engajamento** e **Sem Engajamento**.
- [x] A UI permanece mobile-first e não usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema Prisma ou migration foi
      criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit próprio criado e push executado.

## Validação

- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a execução usa
  `_product/tasks/PROTO-INVENTORY.md`, a referência local
  `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e os screenshots enviados pelo
  usuário.
- `pnpm --dir backend exec biome check --write src/utils/admin-profile-engagement-favorites.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/list/repositories/AdminPsychologistsListRepository.ts`
- `pnpm --dir admin exec biome check --write src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do helper `admin-profile-engagement-favorites` confirmou score `19` para
  `2 comentários`, `1 salvamento`, `1 compartilhamento` e `4 votos positivos`, além de P25/P75,
  `high_engagement`, `standard_favorites` e `insufficient_data` para adaptação.
- HTTP local no Admin dev server retornou `200` para `http://localhost:3002/psicologos`.
- Smoke direto de `buildPsychologistsDashboard({ period: "all" })` não foi usado como aceite porque
  o banco local retornou `EMAXCONNSESSION` por excesso de clientes na sessão; não houve reset nem
  comando destrutivo.

## Observações

- Não há alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` não se aplica à execução desta task.

## Ajuste pos-feedback - tooltips de Visibilidade e Conversao

- [x] Tooltips das opcoes dos donuts de **Visibilidade** e **Conversao** removidas; a tooltip permanece apenas nos nomes dos blocos.
- [x] Tooltip de **Visibilidade** atualizada para explicar tempo real de atencao em video de apresentacao, visita ao perfil e conteudo da comunidade, com a faixa padrao do periodo em negrito.
- [x] Tooltip de **Conversao** adicionada para explicar cliques no WhatsApp recebidos, com a faixa padrao do periodo em negrito.
- [x] Cards brancos **Visibilidade padrao do periodo** e **Conversao padrao do periodo** removidos da leitura principal.
- [x] Ajuste mantido no Admin mobile-first, sem `<img>`, sem mocks, sem package novo, sem endpoint paralelo, sem schema Prisma e sem migration.

## Validacao complementar do ajuste pos-feedback

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a validacao usou `_product/tasks/PROTO-INVENTORY.md`, a imagem local exportada correspondente ao dashboard Admin de Psicologos e os screenshots enviados pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado em `/psicologos` validou desktop e mobile 390px: tooltip de **Visibilidade** presente, tooltip de **Conversao** presente, nenhuma tooltip nas opcoes desses donuts e ausencia dos cards brancos de faixa padrao.
- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica a este ajuste.
