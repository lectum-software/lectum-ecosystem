# ADR-0389 - Tabela comportamental por conversao no Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos ja possuia matrizes reais para Conversao x Visibilidade e Conversao x Engajamento/Favoritos. A TASK-103 sintetizou essas leituras em um funil com dropdown por categoria de conversao, mas o usuario solicitou comparar todas as categorias simultaneamente em uma tabela, com linhas de conversao e colunas de comportamento.

A solicitacao tambem inclui **Atividades** como coluna. Antes desta decisao, o bloco tinha Atividade como donut agregado, mas nao havia um contrato Conversao x Atividade no dashboard para preencher a celula da tabela sem mock.

## Decisao

1. Substituir a visualizacao do funil comportamental por uma tabela com quatro linhas fixas de conversao:
   - Alta Conversao;
   - Conversao Padrao;
   - Baixa Conversao;
   - Sem Conversao.
2. Preencher as colunas da tabela com o comportamento predominante de cada linha:
   - Video de apresentacao e Comunidades a partir de `profile_conversion_visibility`;
   - Engajamento e Favoritado a partir de `profile_conversion_engagement_favorites`;
   - Atividades a partir de um contrato real novo `profile_conversion_activity`.
3. Calcular `profile_conversion_activity` no backend com os mesmos perfis e periodo do dashboard, cruzando a categoria de Conversao com a categoria de Atividade autoral baseada em posts e respostas de psicologos em comunidades.
4. Manter a leitura observacional: a tabela descreve padroes predominantes por segmento, nao causalidade nem ranking individual.
5. Nao criar schema Prisma, migration, seed, package novo, endpoint simulado ou dado fake.
6. Preservar a matriz detalhada do bloco de sinais agregados da TASK-124; a nova tabela substitui apenas a visualizacao sintetica do funil.

## Consequencias

- O Admin consegue comparar os quatro segmentos de conversao ao mesmo tempo, reduzindo a interacao exigida pelo dropdown anterior.
- Atividades passa a ter cruzamento real com Conversao, sem depender de inferencia visual ou mock.
- O payload do dashboard cresce com `profile_conversion_activity`, mas reutiliza queries e datasets ja carregados pelo service, sem nova persistencia.
- A tabela precisa de rolagem horizontal interna em mobile para preservar legibilidade das cinco colunas, sem gerar overflow global da pagina.
- A leitura continua agregada e observacional; qualquer decisao operacional individual deve usar telas de detalhe/listagem apropriadas.

## Task relacionada

- `_product/tasks/TASK-125-tabela-comportamental-conversao-admin-psicologos.md`

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px.

## Pendencias

- Nenhuma pendencia externa.