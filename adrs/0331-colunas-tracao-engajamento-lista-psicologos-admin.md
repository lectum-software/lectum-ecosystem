# ADR-0331 - Colunas de Tracao e Engajamento na lista Admin de psicologos

## Status

Accepted

## Contexto

A lista administrativa de psicologos em `/psicologos/lista` ja exibia ranking, plano, status de perfil, registro e acoes por profissional, mas nao mostrava rapidamente a leitura operacional de **Tracao** e **Engajamento**. Essas duas leituras ja eram relevantes no Admin e precisam aparecer diretamente na tabela para evitar que o time entre no detalhe de cada psicologo para comparar sinais.

A listagem possui fontes reais para calcular esses sinais individualmente:

- tracao: `profile_view_event` de pagina de perfil, `contact_request` com canal WhatsApp e `psychologist_favorite`;
- engajamento: `community_post`, `post_reply` e `post_vote` de usuarios psicologos em comunidades publicas e conteudo nao deletado.

## Decisao

A resposta de `GET /api/admin/private/psychologists` passa a incluir dois objetos por item: `traction` e `engagement`.

- `traction` classifica o profissional em `strong_traction`, `unconverted_traffic`, `unconverted_interest`, `low_traction` ou `insufficient_data`, usando sinais reais acumulados ate a consulta e normalizados para 30 dias conforme dias ativos desde o cadastro.
- `engagement` classifica o profissional em `muito_ativo`, `ativo`, `pouco_ativo` ou `sem_base`, reutilizando o diagnostico canonico de engajamento comunitario para a contagem normalizada de posts, respostas e votos.
- A lista Admin renderiza as colunas **Tracao** e **Engajamento** no desktop e os mesmos rótulos nos cards mobile-first.
- O endpoint tambem aceita os parametros opcionais `traction`, `engagement` e `traction_engagement` para recorte por URL/modal, aplicando-os somente depois de calcular as classificacoes reais de cada psicologo. O recorte `traction_engagement` combina tracao forte/baixa com engajamento alto/baixo sem persistir dado derivado.

## Consequencias

- A triagem administrativa passa a comparar qualidade de aquisicao e participacao comunitaria diretamente na lista.
- O Admin nao recalcula categorias no cliente; a UI apenas mostra os rótulos retornados pelo backend.
- Nao ha schema Prisma, migration, package novo, seed, mock, backfill ou endpoint paralelo.
- Como a lista nao possui filtro de periodo, as classificacoes seguem o recorte operacional vigente da propria lista: sinais reais acumulados ate o momento da consulta, normalizados por dias ativos.

## Task relacionada

TASK-54 - Lista administrativa de psicologos.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/repositories/AdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/repositories/interfaces/IAdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/validator/index.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/lista/client.tsx"`
- Validacoes completas registradas na TASK-54.
