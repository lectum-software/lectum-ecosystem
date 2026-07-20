# ADR-0289: Cobertura de acolhimento nas estatísticas da comunidade

## Status

Aceita

## Task relacionada

Ajuste complementar da TASK-71 para a aba **Estatísticas** do detalhe administrativo de comunidade.

## Contexto

O Admin já exibe **Estatísticas de conteúdo** com posts de pacientes, posts de psicólogos, respostas verificadas/não verificadas, comentários e denúncias. O produto pediu um bloco logo abaixo dessa seção para consolidar a leitura administrativa de **Cobertura de acolhimento**, restrita a administradores, sem expor esses indicadores ao público ou aos psicólogos.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual usada foi a captura enviada pelo usuário, o layout atual da aba **Estatísticas** da comunidade e `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`.

## Decisão

Estender o contrato real `GET /api/admin/private/communities/:id/statistics` com `counters.care_coverage`, calculado a partir de `community_post` e `post_reply` reais, sem mock, seed ou backfill.

O novo grupo retorna:

- `patient_posts_responded_by_verified_psychologists`: posts de pacientes no período que receberam pelo menos uma resposta de psicólogo verificado até o fim do período filtrado;
- `patient_posts_awaiting_verified_psychologist_response`: posts de pacientes no período que ainda não receberam resposta verificada até o fim do período;
- `patient_posts_with_any_response`: posts de pacientes com qualquer resposta até o fim do período, para diferenciar resposta geral de acolhimento verificado;
- `patient_posts_verified_response_breakdown`: total e quantidade respondida por psicólogos verificados para todos os posts de pacientes, posts anônimos e posts identificados;
- `average_first_verified_response_minutes`: média, em minutos, do tempo entre a criação do post de paciente e a primeira resposta de psicólogo verificado.

A UI Admin renderiza o bloco **Cobertura de acolhimento** abaixo de **Estatísticas de conteúdo**, com filtro próprio de **Período**, **De** e **Até**. O bloco mostra:

- posts de pacientes;
- posts anônimos;
- posts identificados;
- aguardando acolhimento;
- tempo médio até a primeira resposta verificada;
- barra de taxa de cobertura por psicólogos verificados.

Os indicadores **Posts de pacientes**, **Anônimos** e **Identificados** são apresentados como uma única análise visual: um card principal de base de posts de pacientes contém a distribuição por anonimato/identificação, a quantidade total e, dentro de cada segmento, a quantidade e taxa respondida por psicólogos verificados. O card separado **Respondidos por psicólogos verificados** foi removido para evitar duplicidade visual.

A regra operacional de **Aguardando acolhimento** é intencionalmente mais rígida do que “sem qualquer resposta”: um post deixa a fila de acolhimento somente quando recebe resposta de psicólogo verificado. Isso preserva a aba **Oportunidades** dos psicólogos para atuação operacional e mantém esta visão como métrica administrativa agregada.

## Consequências

- Administradores conseguem avaliar rapidamente a cobertura qualificada de posts de pacientes por comunidade e período.
- A análise de cobertura pode usar período próprio, sem alterar os filtros de **Estatísticas de conteúdo**, **Estatísticas de pessoas** ou **Horários de maior atividade**.
- Posts com comentários comuns, mas sem resposta verificada, continuam visíveis como demanda de acolhimento.
- O tempo médio de primeira resposta verificada passa a depender apenas de eventos reais existentes no período selecionado.
- Não houve alteração em Prisma schema/migrations, pacote novo, endpoint paralelo, mock, seed ou exposição pública desses indicadores.

## Validação

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx" "src/api/req/communities/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/communities/manage/DTOs/IAdminCommunityManageDTO.ts" "src/modules/api/admin/private/communities/manage/use-cases/services.ts"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke real do service `showStatistics` para
  `ansiedade-em-equilibrio?period=week`, retornando `status=200`, `period=Esta
  semana`, `patientPosts=0`, `respondedByVerified=0`, `awaitingVerified=0`,
  `anyResponse=0` e `avgFirstVerifiedMinutes=null`.
- Smoke HTTP local
  `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas`
  retornando 200. Chrome headless sem sessão administrativa confirmou o guard de
  login; a validação visual autenticada ficou limitada à captura enviada pelo
  usuário, ao protótipo local e aos checks/builds.
