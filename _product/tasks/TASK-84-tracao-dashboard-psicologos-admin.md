# TASK-84 - Tracao no dashboard Admin de psicologos

## Status

Completed

## Contexto

O Admin ja possui o dashboard de psicologos em `/psicologos`, com visao geral, origem de trafego e metricas de uso. O produto precisa de uma leitura agregada e interna de **Tracao** para entender quantos psicologos estao tendo resultados de negocio na plataforma, sem expor publicamente, ranquear ou punir profissionais.

A classificacao deve respeitar o filtro de periodo do dashboard e usar somente sinais reais ja persistidos:

- cliques de WhatsApp em `contact_request.channel=whatsapp`;
- aberturas reais do perfil em `profile_view_event.source=profile_page`;
- favoritos em `psychologist_favorite`.

## Escopo

- Adicionar ao contrato do dashboard Admin de psicologos um bloco agregado `traction`.
- Classificar cada psicologo ativo no fim da janela selecionada em uma das categorias:
  - **Tracao Forte**;
  - **Trafego Nao Convertido**;
  - **Interesse Nao Convertido**;
  - **Baixa Tracao**;
  - **Dados Insuficientes**.
- Renderizar no Admin, abaixo do grafico de visao geral e antes de **Origem do trafego**, um bloco **Tracao** com grafico de pizza, quantidades e taxas de psicologos por categoria.
- Manter a leitura agregada e nao publica, sem lista individual, ranking ou mecanismo punitivo.

## Regras de classificacao V1

As metricas sao calculadas dentro da janela temporal selecionada e normalizadas para 30 dias pelo numero de dias em que o perfil estava ativo dentro da janela.

- **Tracao Forte**: WhatsApp e o sinal mais forte. Entra quando ha pelo menos 5 cliques normalizados/30d, ou pelo menos 3 cliques normalizados/30d com 2+ cliques reais e taxa WhatsApp/perfil de 5% ou mais.
- **Trafego Nao Convertido**: 60+ aberturas de perfil normalizadas/30d, WhatsApp abaixo do corte forte e conversao WhatsApp/perfil abaixo de 5% ou sem base de perfil.
- **Interesse Nao Convertido**: 5+ favoritos normalizados/30d e WhatsApp abaixo do corte forte.
- **Baixa Tracao**: abaixo dos cortes de WhatsApp, perfil e favoritos.
- **Dados Insuficientes**: menos de 7 dias ativos dentro da janela, salvo quando o volume de WhatsApp ja caracteriza Tracao Forte.

## Criterios de aceite

- [x] O backend retorna `traction` no `GET /api/admin/private/psychologists/dashboard` usando apenas dados reais de `profile_view_event`, `contact_request` e `psychologist_favorite`.
- [x] As categorias usam os nomes finais definidos pelo produto e percentuais em relacao ao total de psicologos analisados.
- [x] A classificacao respeita o filtro de periodo, inclusive `Todo o periodo`, `Este ano` e intervalos customizados, com normalizacao para 30 dias.
- [x] O Admin exibe o bloco **Tracao** logo abaixo da visao geral, antes de **Origem do trafego**, com grafico de pizza e legenda com quantidades/taxas.
- [x] A UI e mobile-first e nao usa `<img>`.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou migration foi criado.
- [x] ADR relevante registrado.
- [x] Checks/builds relevantes executados e verdes.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy: ferramenta nao disponivel no ambiente; usei a referencia local do inventario `Admin | Psicologos - Dashboard` e mantive o padrao visual dos cards/graficos existentes do Admin.
- `pnpm --dir backend exec biome check src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts`
- `pnpm --dir admin exec biome check src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/client.tsx"`
- Smoke local do service `buildPsychologistsDashboard({ period: "all" })`: `status=200`, `hasTraction=true`, categorias retornadas e totais reais preenchidos.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` passou na segunda execucao; a primeira falhou por erro transitorio do `prisma generate` no Windows (`EEXIST ... generated/prisma/internal`) e `pnpm --dir backend exec prisma generate` isolado passou antes da repeticao.
- Servidor local: backend recompilado reiniciado em `localhost:3001`; Admin reiniciado em `localhost:3002`.
- HTTP local `GET http://localhost:3002/psicologos`: `200 OK`.
- Bundle gerado em `admin/.next/static/chunks/app/(admin)/psicologos` contem o bloco de Tracao e as categorias, confirmando que a porta 3002 esta servindo build com a alteracao.

## Observacoes

- Nao houve alteracao de `backend/prisma/schema.prisma` nem de `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica.
- A classificacao e agregada e operacional. Nao deve ser exibida em perfil publico nem usada como ranking.
