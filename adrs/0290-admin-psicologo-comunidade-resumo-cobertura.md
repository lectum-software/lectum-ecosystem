# ADR-0290: Resumo nao plotavel de comunidade no detalhe Admin do psicologo

## Status

Accepted

## Task relacionada

Complemento da TASK-57.

## Contexto

A aba **Estatisticas** do detalhe administrativo do psicologo ja exibia contadores de comunidade e grafico de evolucao. O produto solicitou que informacoes que nao devem ativar curva no grafico ficassem separadas dos contadores plotaveis: ranking, se o psicologo segue a comunidade, cobertura de posts de pacientes e comunidades mais ativas.

Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente. A referencia visual usada foi a captura enviada pelo usuario, alem do layout atual da aba **Estatisticas** e `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.

## Decisao

O contrato real `GET /api/admin/private/psychologists/:id/statistics` passa a tratar a lista de comunidades da secao como comunidades em que o psicologo teve participacao real por **post** ou **resposta**. Um vinculo de `community_member` sem post/resposta nao cria opcao no dropdown; quando existir participacao, o vinculo ativo e usado apenas para informar `following` e `member_since`.

A metrica **Cobertura** foi adicionada como indicador nao plotavel: para uma comunidade selecionada, conta a quantidade distinta de posts de pacientes (`community_post.author.role="paciente"`) em que o psicologo publicou ao menos uma resposta no periodo filtrado. Multiplas respostas do mesmo psicologo no mesmo post contam como uma unica cobertura.

A UI Admin insere, entre titulo/filtros e contadores plotaveis, uma linha mobile-first de resumo em cards cinza com:

- **Ranking** da comunidade selecionada;
- **Segue a comunidade** com base em `community_member` real;
- **Cobertura** da comunidade selecionada;
- **Comunidades mais ativas** por soma de posts e respostas reais do psicologo no periodo.

Ranking e Cobertura continuam fora de `COMMUNITY_CHART_METRICS`, portanto nao sao ativaveis no grafico. Os cards cinza deixam claro que sao leitura contextual, nao series plotaveis.

## Consequencias

- O dropdown deixa de listar comunidades onde o psicologo apenas segue sem nunca ter publicado ou respondido.
- A cobertura evita dupla contagem quando ha mais de uma resposta do psicologo no mesmo post de paciente.
- Administradores conseguem ler contexto de participacao antes dos contadores que afetam o grafico.
- Ranking e cobertura ficam indisponiveis em **Todas** porque dependem de uma comunidade especifica.
- Nao houve alteracao em Prisma schema/migrations, package novo, mock, seed ou endpoint paralelo.

## Validacao

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/[id]/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`
- `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir admin build`
- Smoke real do use case `showAdminPsychologistStatistics`: em **Todas**, `ranking` e `coverage` retornam indisponiveis com motivo `Selecione uma comunidade`; em comunidade selecionada, `ranking` e `coverage` retornam metricas reais, e as opcoes de comunidade vem apenas de participacao por post/resposta.
- Browser local/headless em `localhost:3002`: a rota protegida abriu a tela de login em perfil sem sessao; nao houve validacao visual autenticada porque o ambiente headless nao possuia credencial/sessao admin reutilizavel.

## Bloqueios fora do escopo

- `pnpm --dir admin check` e `pnpm check` falham por alteracoes paralelas/preexistentes em `admin/src/app/(admin)/pacientes/[id]/client.tsx` e arquivos de pacientes relacionados.
- `pnpm --dir backend check` e TypeScript/backend emit falham por alteracoes paralelas/preexistentes em `backend/src/modules/api/admin/private/patients/account/`.

## Pendencias

- Validar visualmente a tela autenticada no navegador do usuario/sessao admin real, se necessario, para conferir o espacamento final da linha de resumo em dados reais.
