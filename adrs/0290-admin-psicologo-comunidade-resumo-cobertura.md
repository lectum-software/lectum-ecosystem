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



## Atualização 2026-07-20: tabela e filtro próprio de Comunidades ativas

O bloco **Comunidades ativas** deve ser lido como uma lista operacional, não como cards promocionais. Por isso, a UI passa a usar uma tabela sóbria com colunas de comunidade, interações, posts, respostas, status, ranking e cobertura.

Decisão complementar:

- Manter a origem de dados no endpoint real `GET /api/admin/private/psychologists/:id/statistics`, sem endpoint paralelo.
- Criar uma query separada no frontend para o bloco **Comunidades ativas**, usando os filtros próprios de **Período**, **De** e **Até**.
- Não herdar o filtro de comunidade do gráfico de **Estatísticas de comunidade**; a lista continua comparando todas as comunidades ativas no período escolhido no próprio bloco.
- Preservar `placeholderData` do hook existente para manter a tabela visível durante refetch e exibir apenas o indicador contextual **Atualizando**.
- Usar tabela com rolagem horizontal no mobile (~390px) e largura completa no desktop, sem trocar `next/image` por `<img>`.

Consequência: administradores conseguem mudar período e datas de **Comunidades ativas** sem deslocar ou alterar os demais blocos de estatísticas, mantendo dados reais e leitura mais compacta.

Validação do ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless via Chrome/CDP em desktop 1365px e mobile 390px, confirmando filtro `active-communities-statistics-*`, tabela com 7 colunas e rolagem horizontal mobile controlada.

## Atualizacao 2026-07-20: densidade da tabela de Comunidades ativas

Apos validacao visual do bloco **Comunidades ativas**, o produto solicitou reduzir redundancia da tabela e tornar a leitura das colunas mais direta.

Decisao complementar:

- Remover a coluna **Interacoes**, porque o mesmo total ja e melhor lido como contexto da comunidade.
- Exibir abaixo do nome da comunidade o total real de **acoes no periodo**, calculado como `posts + respostas` do psicologo no recorte filtrado.
- Nao exibir o slug da comunidade nesse bloco, pois a prioridade operacional e comparar atividade real no periodo, nao metadado tecnico.
- Centralizar os dados das colunas **Posts**, **Respostas**, **Status**, **Ranking** e **Cobertura**, preservando a primeira coluna alinhada a esquerda para identidade da comunidade.

Consequencia: a tabela fica com menos colunas, evita duplicar o total de acoes e melhora a varredura visual em desktop sem alterar backend, endpoint, schema, mocks ou dependencias. No mobile, a rolagem horizontal controlada permanece.

Validacao do ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless via Chrome/CDP em desktop 1365px e mobile 390px, confirmando a ausencia da coluna **Interacoes**, a sublinha **1 acao no periodo** abaixo do nome e as colunas de dados centralizadas.
