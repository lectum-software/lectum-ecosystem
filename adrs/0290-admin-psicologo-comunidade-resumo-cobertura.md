# ADR-0290: Comunidades ativas no detalhe Admin do psicólogo

## Status

Accepted

## Task relacionada

Complemento da TASK-57.

## Contexto

A aba **Estatísticas** do detalhe administrativo do psicólogo já exibia contadores e gráfico de comunidade. O produto solicitou retirar do bloco principal os contadores contextuais que não devem desenhar curva no gráfico (**Ranking**, **Segue a comunidade**, **Cobertura** e **Comunidades mais ativas**) e mover essas informações para um bloco próprio de **Comunidades ativas**.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual usada foi a captura enviada pelo usuário, além do layout atual da aba **Estatísticas** e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.

## Decisão

- `community.cards` passa a retornar somente contadores plotáveis no gráfico: posts, respostas, upvotes, downvotes, salvamentos, compartilhamentos e comentários recebidos.
- `community.communities[]` continua vindo de dados reais de `community_post`, `post_reply` e `community_member`, enriquecido com `following`, `ranking` e `coverage` por comunidade.
- O novo bloco **Comunidades ativas** fica entre **Estatísticas de comunidade** e **Horários mais ativos**, com layout mobile-first em cards/lista.
- A ordenação usa `posts + replies` do psicólogo no período filtrado, da comunidade mais ativa para a menos ativa; empates usam nome em `pt-BR`.
- A identificação visual usa `avatar_url` real quando renderizável e fallback por iniciais/cor real da comunidade, sempre com `next/image` para imagens.
- A taxa de cobertura considera, no período selecionado, posts publicados por pacientes na comunidade e quantos desses posts receberam ao menos uma resposta do psicólogo. Múltiplas respostas do mesmo psicólogo no mesmo post contam uma única cobertura.
- Quando não há base de posts de pacientes no período, a UI exibe **Sem base** em vez de estimar percentual.

## Consequências

- Ranking, segue/não segue, cobertura e comunidades mais ativas deixam de aparecer como contadores do bloco principal e não podem ativar curva no gráfico.
- Administradores conseguem comparar comunidades ativas sem trocar o filtro de comunidade do gráfico.
- A cobertura evita dupla contagem de respostas no mesmo post e evita percentual quando o denominador real é zero.
- Não houve alteração em Prisma schema/migrations, package novo, mock, seed ou endpoint paralelo.

## Validação

- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir admin build`
- `pnpm --dir admin check` e `pnpm check` foram tentados, mas ficaram bloqueados por alterações paralelas não relacionadas em pacientes.
- Chamada direta do service `showAdminPsychologistStatistics` com psicólogo real confirmou que `community.cards` não contém `ranking`/`coverage` e que `community.communities[]` retorna `following`, `ranking` e `coverage`.
- Smoke HTTP local em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.

## Observação sobre workspace

Durante a validação final havia alterações paralelas não relacionadas em arquivos de pacientes (`admin/src/app/(admin)/pacientes/[id]/client.tsx` e `backend/src/modules/api/admin/private/patients/*`). Essas alterações não fazem parte deste ADR nem do commit deste ajuste.

