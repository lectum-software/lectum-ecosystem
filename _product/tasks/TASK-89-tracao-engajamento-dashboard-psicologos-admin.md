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
