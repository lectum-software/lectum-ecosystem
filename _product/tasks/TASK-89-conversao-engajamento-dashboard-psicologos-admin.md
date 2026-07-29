# TASK-89 - Comparativo Conversão x Engajamento no dashboard Admin de psicologos

## Status

Completed

## Contexto

O dashboard Admin de psicologos em `/psicologos` ja possui a leitura agregada **Conversão**, calculada com sinais reais de WhatsApp, perfil e favoritos. O produto agora precisa entender, de forma interna e observacional, se o envolvimento dos psicologos nas comunidades acompanha melhores resultados de conversão.

A leitura deve ser agregada, nao publica e nao punitiva. Ela deve cruzar sinais reais ja persistidos:

- conversão: `profile_view_event.source="profile_page"`, `contact_request.channel="whatsapp"` e `psychologist_favorite`;
- engajamento comunitario: posts publicados por psicologos em `community_post`, respostas em `post_reply` e votos/reacoes por psicologos em `post_vote`.

## Escopo

- Estender o contrato real `GET /api/admin/private/psychologists/dashboard` com `profile_conversion_engagement`.
- Calcular quadrantes agregados por psicologo ativo no fim do periodo selecionado:
  - **Conversão forte + alto engajamento**;
  - **Alto engajamento + baixa conversão**;
  - **Conversão forte + baixo engajamento**;
  - **Baixa conversão + baixo engajamento**;
  - **Dados insuficientes** para perfis com menos de 7 dias ativos sem sinal forte.
- Usar o mesmo filtro por periodo e o mesmo filtro por plano dos blocos analiticos do dashboard: **Todos**, **Assinantes**, **Gratuitos** e **Cortesia**.
- Renderizar o bloco **Conversão x Engajamento** logo abaixo de **Conversão** e antes de **Origem do trafego para psicologos**.
- Comunicar a leitura como relacao observacional, sem afirmar causalidade.

## Fora do escopo

- Ranking individual de psicologos.
- Lista nominal de psicologos por quadrante.
- Criar tracking novo, migration, seed, mock ou backfill.
- Usar metricas de consultas, sessoes clinicas, mensagens ou conteudo de WhatsApp.
- Expor o comparativo em perfil publico ou na area do psicologo.

## Criterios de aceite

- [x] O backend retorna `profile_conversion_engagement` no dashboard Admin de psicologos usando apenas dados reais de conversão e comunidade.
- [x] A classificacao respeita o periodo selecionado, normaliza engajamento por dias ativos para 30 dias e trata perfis com menos de 7 dias como dados insuficientes quando nao houver sinal forte.
- [x] `plan_segments` tambem retorna `profile_conversion_engagement` para Todos, Assinantes, Gratuitos e Cortesia.
- [x] O Admin exibe o bloco **Conversão x Engajamento** abaixo de **Conversão** e antes de **Origem do trafego para psicologos**, com matriz mobile-first, filtro por plano e resumo comparando taxa de conversão entre engajados e pouco engajados.
- [x] A UI explicita que a leitura e observacional e nao causal, e nao usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao estava disponivel como ferramenta callable; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a imagem local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura fornecida pelo usuario.
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real via `buildPsychologistsDashboard({ period: "all" })`: retornou `profile_conversion_engagement`, os cinco quadrantes, `source` real e `plan_segments` com `profile_conversion_engagement` para `all`, `subscribers`, `free` e `courtesy`.
- HTTP local em `http://localhost:3002/psicologos`: rota respondeu 200 apos recompilar o Admin dev server.
- Validacao estatica do bundle local: `admin/.next/dev/static/chunks/app/(admin)/psicologos/page.js` contem **Conversão x Engajamento** e `profile-conversion-engagement-plan-segment`.
- Tentativa de validacao headless autenticada foi limitada pela hidratacao de sessao no Chrome efemero; token administrativo transitorio criado para a tentativa foi removido ao final. A validacao funcional da API foi feita diretamente contra o endpoint real e contra o use case.
- `pnpm --dir backend db:migrate` nao se aplica: nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`.

## Observacoes

- Referencia visual local: `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` (arquivo real no workspace: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`).
- Builder/Quick Copy deve ser usado se estiver disponivel como ferramenta callable; caso contrario, registrar a limitacao e usar a captura/proto local.
- Nao ha alteracao planejada em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica salvo mudanca de escopo.

## Execucao complementar: quadrantes acionaveis para lista filtrada (2026-07-28)

- Pedido do usuario: transformar os quatro blocos dos quadrantes em botoes que navegam para a lista Admin de psicologos com o filtro do quadrante selecionado e trocar as descricoes por uma orientacao de clique.
- Frontend Admin: os quatro quadrantes da matriz **Conversão x Engajamento** em `/psicologos` agora sao links/botoes para `/psicologos/lista?profile_conversion_engagement=...`, mantendo contagem, percentual e sinais agregados.
- Frontend Admin: o filtro por plano selecionado no bloco tambem e levado para a lista como `plan=professional`, `plan=free` ou `plan=courtesy` quando aplicavel.
- Lista Admin: o filtro composto **Quadrante** (`profile_conversion_engagement`) e aceito no contrato e nos search params para links profundos vindos do dashboard; a modal principal da lista permanece sem reintroduzir o campo **Quadrante**, conforme decisao complementar registrada na TASK-54.
- Backend Admin: `GET /api/admin/private/psychologists` valida e aplica `profile_conversion_engagement` apos calcular conversão/engajamento reais por psicologo, sem mock, seed, endpoint paralelo, package novo ou migration.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0333-quadrantes-conversao-engajamento-lista-filtrada.md`.

### Criterios complementares

- [x] Os quatro blocos dos quadrantes sao botoes/links para a lista Admin de psicologos.
- [x] Cada botao leva a lista com o filtro composto do quadrante selecionado.
- [x] Quando o bloco esta segmentado por plano, a navegacao preserva o plano na lista.
- [x] As descricoes dos quatro quadrantes foram substituidas por orientacao para clicar e ver a lista de profissionais.
- [x] O filtro composto usa dados reais ja calculados na lista, sem mock, endpoint simulado, package novo ou migration.
- [x] A UI permanece mobile-first e nao usa `<img>` cru.

### Validacao complementar

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/repositories/interfaces/IAdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/repositories/AdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/validator/index.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` retornou 200 e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=strong_conversion_high_engagement` retornou 200.

## Execucao complementar: detalhamento de engajamento (2026-07-28)

- Pedido do usuario: detalhar o bloco **Engajamento** entre **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**; aplicar o mesmo detalhamento no bloco **Conversão x Engajamento**.
- Backend Admin: `GET /api/admin/private/psychologists/dashboard` passou a retornar `profile_conversion_engagement` com totais e comparacoes separados para `very_engaged`, `engaged` e `low_engaged`, mantendo os agregados `high_engagement` e `low_engagement` por compatibilidade.
- Backend Admin: os quadrantes do dashboard foram expandidos para seis recortes reais de conversão forte/sem conversão forte cruzados com **muito engajado**, **engajado** e **pouco engajado**, mais **Dados insuficientes**.
- Lista Admin: o filtro composto `profile_conversion_engagement` passou a aceitar os novos ids granulares para manter os links do dashboard para `/psicologos/lista`.
- Frontend Admin: o donut de **Engajamento** exibe quatro categorias: **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**.
- Frontend Admin: a matriz **Conversão x Engajamento** agora tem tres colunas de engajamento e card separado para **Dados insuficientes**, preservando layout mobile-first e links para lista.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0337-detalhamento-engajamento-conversao-dashboard-psicologos.md`.

### Criterios complementares

- [x] O bloco **Engajamento** detalha os psicologos entre **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**.
- [x] O bloco **Conversão x Engajamento** cruza conversão com **Muito engajado**, **Engajado**, **Pouco engajado** e exibe **Dados insuficientes**.
- [x] Os links da matriz usam filtro real `profile_conversion_engagement` na lista Admin com os novos recortes.
- [x] A leitura continua observacional, mobile-first e sem `<img>` cru.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=strong_conversion_very_engaged` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem `strong_conversion_very_engaged`, `low_conversion_engaged` e **Muito engajado**.
- Tentativa de smoke direto do use case foi limitada pelo banco de desenvolvimento com `EMAXCONNSESSION`; nao houve reset nem comando destrutivo.

## Execucao complementar: Sem engajamento para psicologos (2026-07-28)

- Pedido do usuario: assim como pacientes exibem a categoria **Sem engajamento**, psicologos tambem precisam separar aqueles que nunca engajaram.
- Backend Admin: `GET /api/admin/private/psychologists/dashboard` passou a retornar `no_engagement` em `profile_conversion_engagement.comparison` e `no_engagement_psychologists` em `totals`, separando psicologos com 0 interacoes reais em comunidades no periodo.
- Backend Admin: **Pouco engajado** passou a representar psicologos com ao menos 1 interacao real, mas abaixo do corte normalizado de **Engajado**; **Sem engajamento** representa 0 interacoes, preservando **Dados insuficientes** para perfis com menos de 7 dias ativos sem sinal forte.
- Backend Admin: os quadrantes do dashboard foram expandidos para oito recortes reais de conversão forte/sem conversão forte cruzados com **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**, mais **Dados insuficientes**.
- Lista Admin: o filtro composto `profile_conversion_engagement` passou a aceitar `strong_conversion_no_engagement` e `low_conversion_no_engagement`, mantendo os links reais do dashboard para `/psicologos/lista`.
- Lista Admin: a coluna **Engajamento** passa a exibir **Sem engajamento** quando o psicologo tem 0 interacoes reais em comunidades, evitando que os links do dashboard cheguem a uma lista com badge **Sem base** para esses casos.
- Frontend Admin: o donut de **Engajamento** e a matriz **Conversão x Engajamento** exibem a nova categoria **Sem engajamento**, preservando layout mobile-first e links para lista.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0337-detalhamento-engajamento-conversao-dashboard-psicologos.md`.

### Criterios complementares

- [x] O bloco **Engajamento** detalha os psicologos entre **Muito engajado**, **Engajado**, **Pouco engajado**, **Sem engajamento** e **Dados insuficientes**.
- [x] O bloco **Conversão x Engajamento** cruza conversão com **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**, mantendo **Dados insuficientes** separado.
- [x] Psicologos com 0 interacoes reais em comunidades no periodo entram em **Sem engajamento** quando nao forem **Dados insuficientes**.
- [x] Os links da matriz usam filtro real `profile_conversion_engagement` na lista Admin com os novos recortes `*_no_engagement`.
- [x] A leitura continua observacional, mobile-first e sem `<img>` cru.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=low_conversion_no_engagement` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem **Sem engajamento**, `strong_conversion_no_engagement` e `low_conversion_no_engagement`.

## Execucao complementar: layout dos quadrantes alinhado a Pacientes (2026-07-28)

- Pedido do usuario: replicar o layout dos quadrantes de **Intencao x Engajamento** de pacientes no bloco **Conversão x Engajamento** de psicologos.
- Frontend Admin: a matriz de **Conversão x Engajamento** deixou de usar cards altos com texto de instrucao e CTA visual, passando a usar o mesmo padrao visual compacto de pacientes: cabecalhos neutros, labels de linha neutros, cards com contagem, percentual da base e percentual dentro da linha.
- Frontend Admin: no mobile, os quadrantes passam a ser agrupados por linha de conversão em secoes responsivas, como acontece em pacientes; no desktop, a matriz usa `lg:grid` com label lateral e quatro colunas de engajamento.
- Frontend Admin: os quadrantes continuam sendo links reais para `/psicologos/lista?profile_conversion_engagement=...`, mas a chamada visual **Ver lista** foi removida para preservar o layout espelhado de pacientes.
- Frontend Admin: **Dados insuficientes** permanece exibido em card compacto separado, porque nao faz parte dos eixos de conversão e engajamento.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0337-detalhamento-engajamento-conversao-dashboard-psicologos.md`.

### Criterios complementares

- [x] A matriz **Conversão x Engajamento** de psicologos usa o mesmo layout visual compacto da matriz **Intencao x Engajamento** de pacientes.
- [x] Os cards dos quadrantes mostram contagem, percentual da base e percentual dentro da linha, sem CTA visual alto.
- [x] O layout mobile agrupa quadrantes por linha de conversão, como em pacientes.
- [x] Os links reais para a lista filtrada continuam funcionando.
- [x] A UI permanece mobile-first e sem `<img>` cru.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=strong_conversion_no_engagement` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem `lg:grid-cols-[104px_repeat(4,minmax(0,1fr))]`, **Dados insuficientes** e **Sem engajamento**.

## Execucao complementar: remover Dados insuficientes do engajamento (2026-07-28)

- Pedido do usuario: em psicologos, remover **Dados insuficientes** como opcao de **Engajamento**; se nao houver engajamento no periodo, o psicologo deve entrar em **Sem engajamento**.
- Backend Admin: `profile_conversion_engagement` do dashboard nao retorna mais o quadrante `insufficient_data`; perfis com 0 interacoes reais em comunidades entram em `*_no_engagement`, mesmo quando possuem menos de 7 dias ativos.
- Backend Admin: `insufficient_data_psychologists` permanece no payload de totais apenas por compatibilidade e fica em 0 nessa leitura composta; a categoria **Dados Insuficientes** continua existindo somente na analise isolada de **Conversão**.
- Lista Admin: o filtro composto `profile_conversion_engagement` removeu `insufficient_data` das opcoes e a resolucao backend da lista passou a devolver sempre um dos oito cruzamentos reais de conversão forte/sem conversão forte x engajamento.
- Frontend Admin: o donut de **Engajamento** e a matriz **Conversão x Engajamento** exibem apenas **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**; o card separado de **Dados insuficientes** foi removido.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0338-engajamento-comunitario-pacientes-e-sem-dados-insuficientes-psicologos.md`.

### Criterios complementares

- [x] O bloco **Engajamento** de psicologos nao exibe mais **Dados insuficientes**.
- [x] A matriz **Conversão x Engajamento** nao exibe card/filtro para `insufficient_data`.
- [x] Psicologos com 0 interacoes reais em comunidades no periodo entram em **Sem engajamento**.
- [x] Os links reais da matriz continuam usando os oito quadrantes `strong_conversion_*` e `low_conversion_*`.
- [x] A categoria **Dados Insuficientes** permanece apenas na leitura isolada de **Conversão**.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/dashboard/DTOs/IAdminPatientsDashboardDTO.ts" "src/modules/api/admin/private/patients/dashboard/repositories/AdminPatientsDashboardRepository.ts" "src/modules/api/admin/private/patients/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de servico local `buildPsychologistsDashboard({ period: "all" })` retornou 8 quadrantes sem `insufficient_data`, totais `no_engagement_psychologists=9`, `low_engaged_psychologists=5`, `very_engaged_psychologists=1`, `insufficient_data_psychologists=0` e soma igual a 15 psicologos reais.
- Smoke HTTP local retornou 200 para `http://localhost:3002/psicologos`, `http://localhost:3002/pacientes`, `http://localhost:3002/psicologos/lista?profile_conversion_engagement=low_conversion_no_engagement` e `http://localhost:3002/pacientes/lista`.
- Browser local/headless autenticado em `http://localhost:3002/psicologos` e `http://localhost:3002/psicologos/lista?profile_conversion_engagement=low_conversion_no_engagement` validou mobile `390x844`, `scrollWidth=390`, **Sem engajamento** presente, nenhum link `profile_conversion_engagement=insufficient_data` e ausencia do texto de criterio `Dados insuficientes = menos de`. Screenshots salvos em `.tmp/admin-psychologists-engagement-mobile.png` e `.tmp/admin-psychologists-list-no-engagement-mobile.png`.

## Execucao complementar: categorias nao convertidas na matriz Conversão x Engajamento (2026-07-28)

- Pedido do usuario: em **Conversão x Engajamento**, adicionar **Interesse Nao Convertido** e **Trafego Nao Convertido** na parte de conversão.
- Backend Admin: `GET /api/admin/private/psychologists/dashboard` passou a retornar 16 quadrantes em `profile_conversion_engagement`, cruzando **Conversão forte**, **Interesse Nao Convertido**, **Trafego Nao Convertido** e **Baixa Conversão** com **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**.
- Backend Admin: a classificacao isolada `insufficient_data` continua fora do eixo composto, conforme ADR-0338, e permanece mapeada operacionalmente para **Baixa Conversão** na matriz para nao reintroduzir **Dados Insuficientes** em `profile_conversion_engagement`.
- Lista Admin: o filtro composto `profile_conversion_engagement` passou a aceitar os novos recortes `unconverted_interest_*` e `unconverted_traffic_*`, mantendo links reais da matriz para `/psicologos/lista`.
- Frontend Admin: a matriz em `/psicologos` agora exibe as linhas **Conversão forte**, **Interesse Nao Convertido**, **Trafego Nao Convertido** e **Baixa Conversão**, com layout mobile-first e grade desktop compacta.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0339-conversao-engajamento-categorias-nao-convertidas.md`.

### Criterios complementares

- [x] A matriz **Conversão x Engajamento** exibe **Interesse Nao Convertido** e **Trafego Nao Convertido** como linhas de conversão.
- [x] Os novos cruzamentos usam dados reais ja calculados de conversão e engajamento, sem mock, seed, endpoint simulado, package novo ou migration.
- [x] Os links da matriz para a lista Admin preservam o filtro composto com `unconverted_interest_*` e `unconverted_traffic_*`.
- [x] **Dados Insuficientes** permanece fora da matriz composta, restrito a analise isolada de **Conversão**.
- [x] A UI permanece mobile-first e sem `<img>` cru.

### Validacao complementar

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de servico local `buildPsychologistsDashboard({ period: "all" })`: retornou 16 quadrantes, incluindo `unconverted_interest_very_engaged` e `unconverted_traffic_no_engagement`, com 15 psicologos reais no total.
- HTTP local no Admin dev server: `GET http://localhost:3002/psicologos`, `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=unconverted_interest_no_engagement` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=unconverted_traffic_engaged` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos`/`/psicologos/lista` contem **Interesse Nao Convertido**, **Trafego Nao Convertido**, `unconverted_interest_very_engaged`, `unconverted_traffic_no_engagement` e `lg:grid-cols-[132px_repeat(4,minmax(0,1fr))]`.
- Browser local/headless autenticado em 390x844 validou `/psicologos` e `/psicologos/lista?engagement=sem_base`, com `scrollWidth=390` e screenshots em `.tmp/admin-psychologists-weighted-engagement-mobile.png` e `.tmp/admin-psychologists-list-weighted-engagement-mobile.png`.
