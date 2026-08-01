# ADR-0390 - Tags na tabela comportamental por conversao no Admin de psicologos

## Status

Accepted

## Contexto

A tabela criada na TASK-125 exibia metric cards dentro de cada celula para detalhar o comportamento por faixa de conversao. O usuario esclareceu que o objetivo da tabela e explicar o comportamento predominante da categoria em tags, e nao transformar cada celula em um bloco de metricas.

O usuario tambem pediu para unificar **Atividades** e **Engajamento** dentro de **Comunidade**, pois ambos descrevem comportamento comunitario dos psicologos.

Durante o refinamento, o usuario pediu incluir **Perfil** para explicar o comportamento predominante dos usuarios dentro do perfil publico daquela categoria de profissionais.

Na validacao visual seguinte, o usuario pediu reduzir o peso visual das celulas: texto normal, sem bolinha indicadora, sem borda/cartao interno e sem o label auxiliar de leitura em tags.

Por fim, o usuario esclareceu que a coluna antes chamada **Favoritado** deve representar a **Tela de favoritos** como origem de navegacao, mostrando somente a media de cliques de WhatsApp por psicologo daquela categoria.

## Decisao

1. Manter a tabela Conversao x comportamento, mas reduzir as colunas para:
   - Video de apresentacao;
   - Perfil;
   - Comunidade;
   - Tela de favoritos.
2. Consolidar, no backend, os sinais antes separados em Atividades e Engajamento dentro da celula `communities`.
3. Gerar a celula `profile` a partir de eventos reais de `profile_view_event`, `page_view_event`, abertura das abas Publicacoes/Avaliacoes, favoritos recebidos e cliques de WhatsApp classificados como `profile`.
4. Renderizar `profile_conversion_behavior.cells[].metrics` como tags com os sinais reais agregados predominantes da faixa.
5. Preservar `metrics` no payload como base tecnica auditavel, mas nao renderizar metric cards na UI.
6. Renderizar as celulas como tags simples dentro da tabela, sem icone/bolinha, sem borda/cartao interno e sem subtitulo auxiliar.
7. Restringir a celula `favorite` a uma unica tag: media de cliques de WhatsApp por psicologo originados da tela de favoritos (`favorites`).
8. Manter estados vazios e sem base como texto honesto, sem fallback fake, backfill, seed ou inferencia individual.

## Consequencias

- A tabela fica mais executiva e alinhada ao objetivo de leitura comportamental, evitando excesso de blocos internos.
- O Admin passa a comparar Video, Perfil, Comunidade e Tela de favoritos com maior clareza, enquanto Atividade/Engajamento continuam disponiveis na narrativa de Comunidade.
- O contrato `profile_conversion_behavior` fica menor em colunas, mas mais rico em texto de negocio.
- A rastreabilidade dos numeros permanece no payload `metrics`, mesmo quando a UI mostra apenas tags simples.
- Favoritos recebidos continuam aparecendo em Perfil e nas leituras especificas de Engajamento/Favoritos; a coluna Tela de favoritos deixa de medir favoritos recebidos e passa a medir somente WhatsApp originado dessa tela.
- Nao houve alteracao de schema Prisma, migrations, packages ou algoritmos de classificacao existentes.

## Task relacionada

- `_product/tasks/TASK-126-tags-tabela-comportamental-conversao-admin-psicologos.md`

## Validacoes

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Endpoint real `/api/admin/private/psychologists/dashboard` validado com quatro colunas em `profile_conversion_behavior` e tags por celula.
- Endpoint real revalidado com a coluna `Tela de favoritos` contendo somente a metrica `favorites_screen_whatsapp_clicks_per_psychologist`.
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px.
- Browser local revalidado com header `Tela de favoritos`, tag `Cliques WhatsApp/psicologo`, ausencia de colunas Atividades/Engajamento e rolagem horizontal interna no mobile.

## Pendencias

- Nenhuma pendencia externa.
