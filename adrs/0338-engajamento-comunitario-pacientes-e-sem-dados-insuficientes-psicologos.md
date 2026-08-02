# ADR-0338: Engajamento comunitario de pacientes e sem dados insuficientes em psicologos

## Status

Accepted

## Tasks relacionadas

TASK-60, TASK-89

## Contexto

O Admin exibia **Engajamento dos pacientes** usando os mesmos sinais de **Intencao**: abertura de perfil, favorito, clique no WhatsApp e retorno ao mesmo perfil. O produto definiu que esses sinais representam intencao de busca/contato, nao engajamento. Para pacientes, engajamento deve considerar somente acoes reais em comunidades.

No dashboard de psicologos, o bloco de engajamento ainda mantinha **Dados insuficientes** como categoria no donut e em **Conversão x Engajamento**. O produto definiu que, se nao houver engajamento no periodo, o psicologo deve entrar em **Sem engajamento**. **Dados Insuficientes** pode continuar existindo na analise isolada de **Conversão**, pois ali representa base temporal para avaliar conversão.

Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente. A execucao usou `_product/tasks/PROTO-INVENTORY.md`, as imagens locais de pacientes/psicologos em `_product/proto/admin` e as capturas enviadas pelo usuario.

## Decisao

- Separar definitivamente os sinais de pacientes:
  - **Intencao**: `profile_view_event`, `psychologist_favorite`, `contact_request` e retorno derivado de aberturas repetidas do mesmo perfil.
  - **Engajamento**: somente `community_post`, `post_reply`, `post_vote`, `post_save` e `post_reply_save`.
- Reaproveitar a fundacao de diagnostico comunitario ja usada no produto para classificar pacientes:
  - 0 interacoes reais em comunidades -> **Sem engajamento**;
  - interacoes reais abaixo do corte normalizado -> **Pouco engajado**;
  - cortes normalizados superiores -> **Engajado** e **Muito engajado**.
- Aplicar a mesma fonte comunitaria no dashboard de pacientes e na lista `/pacientes/lista`, evitando que WhatsApp, perfil e favorito afetem a coluna de engajamento.
- Em psicologos, remover `insufficient_data` dos quadrantes de `profile_conversion_engagement` e das opcoes de filtro composto da lista.
- Manter `insufficient_data_psychologists` no payload de totais de `profile_conversion_engagement` apenas como compatibilidade, sempre 0 nesse calculo composto.
- Manter **Dados Insuficientes** na analise isolada de **Conversão**, porque essa regra ainda expressa baixa base temporal para conversão e nao conflita com a regra de engajamento.

## Consequencias

- O dashboard de pacientes passa a responder duas perguntas diferentes: intencao de busca/contato e participacao comunitaria.
- A matriz **Intencao x Engajamento** de pacientes cruza duas classificacoes independentes, reduzindo falso engajamento por clique de WhatsApp ou abertura de perfil.
- A lista de pacientes fica consistente com o dashboard e deixa de chamar sinais de intencao de engajamento.
- Psicologos com 0 interacoes reais em comunidades no periodo entram em **Sem engajamento**, inclusive quando tem poucos dias ativos.
- Os links de **Conversão x Engajamento** continuam navegando para oito quadrantes reais (`strong_conversion_*` e `low_conversion_*`), sem card ou filtro de `insufficient_data`.
- Nao houve schema Prisma, migration, package novo, endpoint simulado, seed, mock ou backfill.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/list/DTOs/IAdminPatientsListDTO.ts" "src/modules/api/admin/private/patients/list/repositories/AdminPatientsListRepository.ts" "src/modules/api/admin/private/patients/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/api/req/patients/list.ts" "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Service smoke: `buildPatientsDashboard({ period: "all" })`, `listAdminPatients({ limit: 5 })` e `buildPsychologistsDashboard({ period: "all" })` retornaram dados reais sem mocks.
- Browser local/headless autenticado validou `/pacientes`, `/pacientes/lista`, `/psicologos` e `/psicologos/lista?profile_conversion_engagement=low_conversion_no_engagement` em mobile 390px, sem overflow horizontal.


## Atualizacao 2026-08-02 - Nomenclatura Atividade na lista de pacientes

Novo feedback de produto pediu que a coluna **Engajamento** de `/pacientes/lista` fosse apresentada como **Atividade**, pois a classificacao mostrada ali representa padrao de atividade comunitaria do paciente.

Decisao:

- Manter o calculo existente e as fontes reais ja definidas nesta ADR: `community_post`, `post_reply`, `post_vote`, `post_save` e `post_reply_save`.
- Confirmar que posts e comentarios/respostas ja participam do score: posts tem peso maior que comentarios/respostas, e votos/salvamentos continuam como sinais leves de atividade comunitaria.
- Alterar somente a nomenclatura visivel da lista Admin para **Atividade**, com labels **Sem atividade**, **Pouco ativo**, **Ativo** e **Muito ativo**.
- Preservar ids e nomes internos do contrato (`engagement`, `intent_engagement`) para evitar migracao desnecessaria de API/query params e manter compatibilidade com os filtros da matriz.

Consequencias:

- A lista passa a comunicar melhor que a coluna mede atividade comunitaria do paciente, nao intencao de busca/contato.
- Dashboards, filtros compostos e contratos permanecem estaveis.
- Nao houve schema Prisma, migration, package novo, endpoint simulado, seed, mock ou backfill.

Validacao:

- `pnpm --dir admin exec biome check --write "src/app/(admin)/pacientes/lista/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de servico local `listAdminPatients({ limit: 1 })` retornou source com `community_post+post_reply+post_vote+post_save+post_reply_save`.
- Browser local/headless em `/pacientes/lista`, viewport 390px, validou **Atividade**, **Sem atividade**, ausencia de **Engajamento** na lista e ausencia de overflow horizontal; admin temporario de validacao removido ao final.

## Pendencias

- Nenhuma pendencia externa.
