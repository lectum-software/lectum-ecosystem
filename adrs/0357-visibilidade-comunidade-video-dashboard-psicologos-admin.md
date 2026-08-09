# ADR-0357 - Visibilidade Comunidade x Video no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O bloco de Visibilidade do dashboard Admin de psicologos era uma leitura agregada de atencao. A
analise de produto agora precisa responder uma pergunta mais especifica do funil: quando um
psicologo converte melhor para WhatsApp, isso parece vir de um video de apresentacao forte, de alta
visibilidade nos conteudos da comunidade, ou da combinacao dos dois.

Separar isso em blocos independentes quebraria a leitura sequencial do funil. A decisao foi manter um
unico bloco de Visibilidade, mas transformar a categoria do donut em uma matriz 4x4 entre os eixos
**Comunidade** e **Video de apresentacao**.

## Decisao

- O `profile_exposure` passa a classificar cada psicologo em 16 combinacoes de:
  - **Alta Comunidade**, **Comunidade Padrao**, **Baixa Comunidade**, **Sem Comunidade**;
  - **Alto Video**, **Video Padrao**, **Baixo Video**, **Sem Video**.
- **Dados Insuficientes** continua existindo para psicologos dentro dos primeiros 30 dias de
  adaptacao.
- Comunidade usa `content_attention_session.attention_seconds` de posts e respostas autorais do
  psicologo. Essa fonte cobre feed, paginas internas de comunidade e detalhes sempre que o mesmo card
  rastreado e renderizado, e nao depende do formato do conteudo: texto, imagem e video pontuam.
- Video usa `profile_video_watch_session.watched_seconds` do video de apresentacao.
- Os benchmarks sao separados por eixo, usando P25/P75 dos valores nao-zero de psicologos fora da
  adaptacao.
- O score agregado de Visibilidade desta leitura passa a somar comunidade + video de apresentacao;
  a visita generica ao perfil fica apenas como total diagnostico legado e nao classifica a matriz.
- O donut mostra as combinacoes com maior volume, agrupa o restante em **Outras combinacoes** e
  oferece expansao para visualizar todas as combinacoes.

## Consequencias

- O Admin consegue ver distribuicao de psicologos no funil de Visibilidade sem perder a leitura em um
  unico bloco.
- A futura matriz contra Alta Conversao podera usar os ids dos dois eixos (`community_id` e
  `video_id`) sem inferir labels no frontend.
- Psicologos com video forte, comunidade forte ou ambos passam a ser diferenciados sem alterar
  ranking publico, recomendacao ou ordenacao.
- `profile_attention_seconds` permanece no payload para compatibilidade/diagnostico historico, mas
  nao influencia a classificacao Comunidade x Video.
- Nao ha schema Prisma, migration, mock, endpoint paralelo ou package novo.

## Task relacionada

- TASK-97 - Visibilidade Comunidade x Video no dashboard Admin de psicologos.

## Validacoes

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, a imagem local exportada do dashboard Admin de Psicologos e os
  screenshots fornecidos pelo usuario.
- `pnpm --dir backend exec biome check --write src/utils/admin-profile-exposure.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`
- `pnpm --dir admin exec biome check --write src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do helper `admin-profile-exposure` para score, benchmarks separados e classificacoes.
- HTTP local retornou `200` para `/psicologos` e browser local autenticado validou o donut com as 16
  combinacoes Comunidade x Video e **Dados Insuficientes** na legenda.
