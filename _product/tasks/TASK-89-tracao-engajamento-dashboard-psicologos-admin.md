# TASK-89 - Comparativo Tracao x Engajamento no dashboard Admin de psicologos

## Status

Completed

## Contexto

O dashboard Admin de psicologos em `/psicologos` ja possui a leitura agregada **Tracao**, calculada com sinais reais de WhatsApp, perfil e favoritos. O produto agora precisa entender, de forma interna e observacional, se o envolvimento dos psicologos nas comunidades acompanha melhores resultados de tracao.

A leitura deve ser agregada, nao publica e nao punitiva. Ela deve cruzar sinais reais ja persistidos:

- tracao: `profile_view_event.source="profile_page"`, `contact_request.channel="whatsapp"` e `psychologist_favorite`;
- engajamento comunitario: posts publicados por psicologos em `community_post`, respostas em `post_reply` e votos/reacoes por psicologos em `post_vote`.

## Escopo

- Estender o contrato real `GET /api/admin/private/psychologists/dashboard` com `traction_engagement`.
- Calcular quadrantes agregados por psicologo ativo no fim do periodo selecionado:
  - **Tracao forte + alto engajamento**;
  - **Alto engajamento + baixa tracao**;
  - **Tracao forte + baixo engajamento**;
  - **Baixa tracao + baixo engajamento**;
  - **Dados insuficientes** para perfis com menos de 7 dias ativos sem sinal forte.
- Usar o mesmo filtro por periodo e o mesmo filtro por plano dos blocos analiticos do dashboard: **Todos**, **Assinantes**, **Gratuitos** e **Cortesia**.
- Renderizar o bloco **Tracao x Engajamento** logo abaixo de **Tracao** e antes de **Origem do trafego para psicologos**.
- Comunicar a leitura como relacao observacional, sem afirmar causalidade.

## Fora do escopo

- Ranking individual de psicologos.
- Lista nominal de psicologos por quadrante.
- Criar tracking novo, migration, seed, mock ou backfill.
- Usar metricas de consultas, sessoes clinicas, mensagens ou conteudo de WhatsApp.
- Expor o comparativo em perfil publico ou na area do psicologo.

## Criterios de aceite

- [x] O backend retorna `traction_engagement` no dashboard Admin de psicologos usando apenas dados reais de tracao e comunidade.
- [x] A classificacao respeita o periodo selecionado, normaliza engajamento por dias ativos para 30 dias e trata perfis com menos de 7 dias como dados insuficientes quando nao houver sinal forte.
- [x] `plan_segments` tambem retorna `traction_engagement` para Todos, Assinantes, Gratuitos e Cortesia.
- [x] O Admin exibe o bloco **Tracao x Engajamento** abaixo de **Tracao** e antes de **Origem do trafego para psicologos**, com matriz mobile-first, filtro por plano e resumo comparando taxa de tracao entre engajados e pouco engajados.
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
- Smoke real via `buildPsychologistsDashboard({ period: "all" })`: retornou `traction_engagement`, os cinco quadrantes, `source` real e `plan_segments` com `traction_engagement` para `all`, `subscribers`, `free` e `courtesy`.
- HTTP local em `http://localhost:3002/psicologos`: rota respondeu 200 apos recompilar o Admin dev server.
- Validacao estatica do bundle local: `admin/.next/dev/static/chunks/app/(admin)/psicologos/page.js` contem **Tracao x Engajamento** e `traction-engagement-plan-segment`.
- Tentativa de validacao headless autenticada foi limitada pela hidratacao de sessao no Chrome efemero; token administrativo transitorio criado para a tentativa foi removido ao final. A validacao funcional da API foi feita diretamente contra o endpoint real e contra o use case.
- `pnpm --dir backend db:migrate` nao se aplica: nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`.

## Observacoes

- Referencia visual local: `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` (arquivo real no workspace: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`).
- Builder/Quick Copy deve ser usado se estiver disponivel como ferramenta callable; caso contrario, registrar a limitacao e usar a captura/proto local.
- Nao ha alteracao planejada em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica salvo mudanca de escopo.

## Execucao complementar: quadrantes acionaveis para lista filtrada (2026-07-28)

- Pedido do usuario: transformar os quatro blocos dos quadrantes em botoes que navegam para a lista Admin de psicologos com o filtro do quadrante selecionado e trocar as descricoes por uma orientacao de clique.
- Frontend Admin: os quatro quadrantes da matriz **Tracao x Engajamento** em `/psicologos` agora sao links/botoes para `/psicologos/lista?traction_engagement=...`, mantendo contagem, percentual e sinais agregados.
- Frontend Admin: o filtro por plano selecionado no bloco tambem e levado para a lista como `plan=professional`, `plan=free` ou `plan=courtesy` quando aplicavel.
- Lista Admin: o filtro composto **Quadrante** (`traction_engagement`) e aceito no contrato e nos search params para links profundos vindos do dashboard; a modal principal da lista permanece sem reintroduzir o campo **Quadrante**, conforme decisao complementar registrada na TASK-54.
- Backend Admin: `GET /api/admin/private/psychologists` valida e aplica `traction_engagement` apos calcular tracao/engajamento reais por psicologo, sem mock, seed, endpoint paralelo, package novo ou migration.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0333-quadrantes-tracao-engajamento-lista-filtrada.md`.

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
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` retornou 200 e `GET http://localhost:3002/psicologos/lista?traction_engagement=strong_traction_high_engagement` retornou 200.

## Execucao complementar: detalhamento de engajamento (2026-07-28)

- Pedido do usuario: detalhar o bloco **Engajamento** entre **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**; aplicar o mesmo detalhamento no bloco **Tracao x Engajamento**.
- Backend Admin: `GET /api/admin/private/psychologists/dashboard` passou a retornar `traction_engagement` com totais e comparacoes separados para `very_engaged`, `engaged` e `low_engaged`, mantendo os agregados `high_engagement` e `low_engagement` por compatibilidade.
- Backend Admin: os quadrantes do dashboard foram expandidos para seis recortes reais de tracao forte/sem tracao forte cruzados com **muito engajado**, **engajado** e **pouco engajado**, mais **Dados insuficientes**.
- Lista Admin: o filtro composto `traction_engagement` passou a aceitar os novos ids granulares para manter os links do dashboard para `/psicologos/lista`.
- Frontend Admin: o donut de **Engajamento** exibe quatro categorias: **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**.
- Frontend Admin: a matriz **Tracao x Engajamento** agora tem tres colunas de engajamento e card separado para **Dados insuficientes**, preservando layout mobile-first e links para lista.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0337-detalhamento-engajamento-tracao-dashboard-psicologos.md`.

### Criterios complementares

- [x] O bloco **Engajamento** detalha os psicologos entre **Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**.
- [x] O bloco **Tracao x Engajamento** cruza tracao com **Muito engajado**, **Engajado**, **Pouco engajado** e exibe **Dados insuficientes**.
- [x] Os links da matriz usam filtro real `traction_engagement` na lista Admin com os novos recortes.
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
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?traction_engagement=strong_traction_very_engaged` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem `strong_traction_very_engaged`, `low_traction_engaged` e **Muito engajado**.
- Tentativa de smoke direto do use case foi limitada pelo banco de desenvolvimento com `EMAXCONNSESSION`; nao houve reset nem comando destrutivo.

## Execucao complementar: Sem engajamento para psicologos (2026-07-28)

- Pedido do usuario: assim como pacientes exibem a categoria **Sem engajamento**, psicologos tambem precisam separar aqueles que nunca engajaram.
- Backend Admin: `GET /api/admin/private/psychologists/dashboard` passou a retornar `no_engagement` em `traction_engagement.comparison` e `no_engagement_psychologists` em `totals`, separando psicologos com 0 interacoes reais em comunidades no periodo.
- Backend Admin: **Pouco engajado** passou a representar psicologos com ao menos 1 interacao real, mas abaixo do corte normalizado de **Engajado**; **Sem engajamento** representa 0 interacoes, preservando **Dados insuficientes** para perfis com menos de 7 dias ativos sem sinal forte.
- Backend Admin: os quadrantes do dashboard foram expandidos para oito recortes reais de tracao forte/sem tracao forte cruzados com **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**, mais **Dados insuficientes**.
- Lista Admin: o filtro composto `traction_engagement` passou a aceitar `strong_traction_no_engagement` e `low_traction_no_engagement`, mantendo os links reais do dashboard para `/psicologos/lista`.
- Lista Admin: a coluna **Engajamento** passa a exibir **Sem engajamento** quando o psicologo tem 0 interacoes reais em comunidades, evitando que os links do dashboard cheguem a uma lista com badge **Sem base** para esses casos.
- Frontend Admin: o donut de **Engajamento** e a matriz **Tracao x Engajamento** exibem a nova categoria **Sem engajamento**, preservando layout mobile-first e links para lista.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0337-detalhamento-engajamento-tracao-dashboard-psicologos.md`.

### Criterios complementares

- [x] O bloco **Engajamento** detalha os psicologos entre **Muito engajado**, **Engajado**, **Pouco engajado**, **Sem engajamento** e **Dados insuficientes**.
- [x] O bloco **Tracao x Engajamento** cruza tracao com **Muito engajado**, **Engajado**, **Pouco engajado** e **Sem engajamento**, mantendo **Dados insuficientes** separado.
- [x] Psicologos com 0 interacoes reais em comunidades no periodo entram em **Sem engajamento** quando nao forem **Dados insuficientes**.
- [x] Os links da matriz usam filtro real `traction_engagement` na lista Admin com os novos recortes `*_no_engagement`.
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
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?traction_engagement=low_traction_no_engagement` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem **Sem engajamento**, `strong_traction_no_engagement` e `low_traction_no_engagement`.

## Execucao complementar: layout dos quadrantes alinhado a Pacientes (2026-07-28)

- Pedido do usuario: replicar o layout dos quadrantes de **Intencao x Engajamento** de pacientes no bloco **Tracao x Engajamento** de psicologos.
- Frontend Admin: a matriz de **Tracao x Engajamento** deixou de usar cards altos com texto de instrucao e CTA visual, passando a usar o mesmo padrao visual compacto de pacientes: cabecalhos neutros, labels de linha neutros, cards com contagem, percentual da base e percentual dentro da linha.
- Frontend Admin: no mobile, os quadrantes passam a ser agrupados por linha de tracao em secoes responsivas, como acontece em pacientes; no desktop, a matriz usa `lg:grid` com label lateral e quatro colunas de engajamento.
- Frontend Admin: os quadrantes continuam sendo links reais para `/psicologos/lista?traction_engagement=...`, mas a chamada visual **Ver lista** foi removida para preservar o layout espelhado de pacientes.
- Frontend Admin: **Dados insuficientes** permanece exibido em card compacto separado, porque nao faz parte dos eixos de tracao e engajamento.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a referencia local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e as capturas enviadas pelo usuario.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0337-detalhamento-engajamento-tracao-dashboard-psicologos.md`.

### Criterios complementares

- [x] A matriz **Tracao x Engajamento** de psicologos usa o mesmo layout visual compacto da matriz **Intencao x Engajamento** de pacientes.
- [x] Os cards dos quadrantes mostram contagem, percentual da base e percentual dentro da linha, sem CTA visual alto.
- [x] O layout mobile agrupa quadrantes por linha de tracao, como em pacientes.
- [x] Os links reais para a lista filtrada continuam funcionando.
- [x] A UI permanece mobile-first e sem `<img>` cru.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.

### Validacao complementar

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?traction_engagement=strong_traction_no_engagement` retornaram 200.
- Validacao estatica do build: bundle de `/psicologos` contem `lg:grid-cols-[104px_repeat(4,minmax(0,1fr))]`, **Dados insuficientes** e **Sem engajamento**.
