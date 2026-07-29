# ADR-0330: Comparativo Conversão x Engajamento no dashboard Admin de psicologos

## Status

Accepted

## Task relacionada

TASK-89

## Contexto

O dashboard Admin de psicologos ja possui a classificacao agregada **Conversão**, baseada em sinais reais de abertura de perfil, cliques no WhatsApp e favoritos. A nova leitura solicitada deve ajudar o time interno a observar se o envolvimento dos psicologos nas comunidades acompanha melhores resultados de conversão, sem virar ranking, julgamento individual ou promessa de causalidade.

Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente. A execucao usou `_product/tasks/PROTO-INVENTORY.md`, a imagem local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuario como referencia visual.

## Decisao

- Estender o contrato existente `GET /api/admin/private/psychologists/dashboard` com o objeto `profile_conversion_engagement`, sem endpoint paralelo.
- Calcular a matriz por psicologo ativo no fim do periodo selecionado e reaproveitar a mesma base de segmentos por plano: **Todos**, **Assinantes**, **Gratuitos** e **Cortesia**.
- Considerar **conversão forte** quando a classificacao canônica de conversão do dashboard for `strong_profile_conversion`.
- Considerar **alto engajamento** quando posts publicados, respostas e votos/reacoes do psicologo em comunidades atingirem pelo menos 6 interacoes normalizadas para 30 dias, reaproveitando `diagnoseAdminCommunityEngagement`.
- Tratar como **Dados Insuficientes** perfis com menos de 7 dias ativos no periodo quando nao houver conversão forte nem alto engajamento.
- Exibir a leitura como matriz agregada mobile-first logo abaixo do bloco **Conversão** e antes de **Origem do trafego para psicologos**.
- Incluir comparacao agregada da taxa de conversão forte entre psicologos engajados e pouco engajados, com copy objetiva de **impacto observado** que destaca a diferenca em pontos percentuais sem tratar a relacao como causal.

## Consequencias

- O Admin passa a cruzar sinais reais de conversão e comunidade sem criar tracking novo, migration, seed, mock ou backfill.
- A classificacao permanece agregada; nenhuma lista nominal ou ranking individual e exposta.
- A normalizacao por 30 dias evita favorecer automaticamente perfis mais antigos.
- Perfis recentes continuam protegidos contra conclusoes precipitadas por meio do quadrante **Dados Insuficientes**.
- A metrica e adequada para exploracao de produto e operacao interna, mas nao deve ser usada como regra punitiva, promessa comercial ou ordenacao publica de psicologos.

## Validacao

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real do use case `buildPsychologistsDashboard({ period: "all" })` confirmou `profile_conversion_engagement`, quadrantes e segmentos por plano.
- `Invoke-WebRequest -UseBasicParsing http://localhost:3002/psicologos` retornou HTTP 200 e o bundle gerado contem **Conversão x Engajamento** e `profile-conversion-engagement-plan-segment`.

## Pendencias

- Nenhuma decisao externa pendente.
