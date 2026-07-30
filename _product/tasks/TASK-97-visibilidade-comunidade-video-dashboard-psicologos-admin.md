# TASK-97 - Visibilidade Comunidade x Video no dashboard Admin de psicologos

## Status

Completed

## Contexto

O dashboard Admin de psicologos em `/psicologos` ja apresenta o funil executivo de
**Visibilidade**, **Engajamento e Favoritos** e **Conversao**. A leitura de produto evoluiu para
entender se a conversao no WhatsApp se comporta melhor quando o psicologo tem visibilidade forte no
video de apresentacao, nas comunidades, ou nos dois eixos ao mesmo tempo.

A Visibilidade deixa de ser apenas uma categoria agregada e passa a cruzar dois eixos analiticos:

- **Visibilidade na Comunidade**: tempo real de atencao em conteudo autoral do psicologo nas
  comunidades.
- **Visibilidade no Video**: tempo assistido no video de apresentacao do perfil publico.

## Escopo

- Atualizar o helper de dominio `admin-profile-exposure` para classificar cada psicologo ativo em uma
  das 16 combinacoes entre comunidade e video.
- Calcular benchmarks separados por P25/P75 dos nao-zero fora da adaptacao para:
  - atencao comunitaria;
  - tempo assistido no video de apresentacao.
- Manter **Dados Insuficientes** para psicologos dentro dos primeiros 30 dias de adaptacao.
- Atualizar o contrato backend e o contrato TypeScript do Admin para retornar `community_id`,
  `community_label`, `video_id`, `video_label`, benchmarks separados e totais de psicologos com sinal
  em comunidade/video.
- Atualizar o donut de **Visibilidade** no Admin para resumir as combinacoes com maior volume,
  agregar o restante em **Outras combinacoes** e permitir expandir para visualizar todas as 16
  combinacoes.
- Atualizar tooltip/copy do bloco para deixar claro que comunidade inclui feed, comunidades e
  detalhes, com conteudo de texto, imagem ou video.

## Definicoes de produto

- **Visibilidade na Comunidade** soma `content_attention_session.attention_seconds` de posts e
  respostas autorais do psicologo.
- Como o tracking de atencao esta acoplado aos cards reais de comunidade, a medicao cobre os locais
  onde esses cards sao renderizados: feed, pagina interna da comunidade e detalhe do conteudo.
- O conteudo comunitario nao e limitado a video: texto, imagem e video pontuam quando geram atencao
  registrada pelo tracker real.
- **Visibilidade no Video** usa `profile_video_watch_session.watched_seconds` do video de
  apresentacao.
- Visita generica ao perfil publico permanece disponivel nos totais legados do dashboard, mas nao
  classifica as 16 combinacoes desta leitura. A pergunta de produto aqui e especificamente
  **comunidade x video de apresentacao**.
- O calculo e observacional para analise do Admin e nao altera ranking publico, recomendacao ou
  ordenacao dos psicologos.

## Regras de classificacao

Para cada eixo:

- psicologos com menos de 30 dias entram em **Dados Insuficientes**;
- psicologos elegiveis sem sinal entram em **Sem Comunidade** ou **Sem Video**;
- psicologos elegiveis com sinal sao comparados contra P25/P75 dos nao-zero do proprio eixo:
  - acima de P75: **Alta Comunidade** ou **Alto Video**;
  - entre P25 e P75: **Comunidade Padrao** ou **Video Padrao**;
  - abaixo de P25: **Baixa Comunidade** ou **Baixo Video**.

As combinacoes finais seguem a matriz 4x4:

- Alta Comunidade / Comunidade Padrao / Baixa Comunidade / Sem Comunidade;
- Alto Video / Video Padrao / Baixo Video / Sem Video.

## Fora do escopo

- Criar a matriz Conversao x Visibilidade Comunidade x Video; ela sera tratada posteriormente.
- Alterar ranking, algoritmo de recomendacao, ordenacao publica ou regra de exibicao dos psicologos.
- Criar mock, seed artificial, endpoint paralelo, migration, schema Prisma ou novo package.
- Separar visibilidade por origem de tela alem da cobertura real do tracker existente.

## Criterios de aceite

- [x] `profile_exposure.categories` passa a expor 16 combinacoes de comunidade x video mais
      **Dados Insuficientes**.
- [x] Cada combinacao retorna ids e labels dos dois eixos para consumo da UI e futura matriz.
- [x] Benchmarks separados de comunidade e video usam P25/P75 dos nao-zero fora da adaptacao.
- [x] Visibilidade comunitaria usa eventos reais de `content_attention_session` em posts/respostas e
      cobre feed, comunidades e detalhes por reaproveitamento do card rastreado.
- [x] Visibilidade comunitaria contempla conteudo de texto, imagem e video.
- [x] Visibilidade no video usa eventos reais de `profile_video_watch_session`.
- [x] Donut de Visibilidade mostra as combinacoes de maior volume, agrega demais em **Outras
      combinacoes** e permite expandir para ver todas as combinacoes.
- [x] Tooltip do bloco explica comunidade x video e deixa claro que listagem/WhatsApp nao pontuam
      como Visibilidade.
- [x] A UI permanece mobile-first e nao usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema Prisma ou migration foi
      criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a referencia local
  `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` quando disponivel via inventario e os
  screenshots enviados pelo usuario.
- `pnpm --dir backend exec biome check --write src/utils/admin-profile-exposure.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`
- `pnpm --dir admin exec biome check --write src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do helper `admin-profile-exposure` confirmou score comunidade+video, benchmarks
  separados, `high_community`, `standard_video` e `insufficient_data` para adaptacao.
- HTTP local no Admin dev server retornou `200` para `http://localhost:3002/psicologos`.
- Browser local autenticado em `/psicologos` validou o donut de Visibilidade com as 16 combinacoes
  Comunidade x Video e **Dados Insuficientes** na legenda.

## Observacoes

- Nao ha alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica a execucao desta task.
- O campo legado `profile_attention_seconds` continua nos totais para diagnostico historico, mas nao
  participa da classificacao Comunidade x Video.
