# TASK-134 - Cobertura no dashboard e matriz Admin de psicologos

## Status

Completed

## Contexto

O dashboard Admin de Psicologos em `/psicologos` ja consolidava sinais de atividade,
visibilidade, engajamento, favoritos e conversao. O produto pediu uma metrica mais
simples de **Cobertura** para responder: quantos posts diferentes de pacientes, em
media, cada psicologo responde, e quais faixas ficam acima ou abaixo dessa media.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como fallback local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando o bloco de cards e a matriz em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a
implementacao usou a imagem local e o screenshot do usuario, registrando esta limitacao.

## Objetivo

Adicionar Cobertura ao dashboard Admin de Psicologos com:

- calculo agregado da media de posts unicos de pacientes respondidos por psicologo;
- classificacao dos psicologos em acima da media, na media, abaixo da media e sem cobertura;
- novo card/grafico de Cobertura no bloco de sinais;
- nova opcao **Cobertura** nos eixos Linha/Coluna da matriz de cruzamento de dados.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-123: analiticos reais do dashboard.
- TASK-129: matriz de cruzamento de dados.
- TASK-130: eixos adicionais da matriz.
- TASK-132: consistencia visual de tags/cores do dashboard.

Todas as dependencias acima estao concluidas.

## Escopo executado

### Backend

- Adicionado `profile_coverage` ao payload do dashboard Admin.
- Cobertura passou a contar `distinct(post_id)` em respostas do psicologo a posts cujo autor tem papel `paciente`.
- A media da plataforma/segmento e `posts_unicos_respondidos / total_de_psicologos` no periodo selecionado.
- Categorias agregadas:
  - `above_average_coverage`: Alta cobertura;
  - `average_coverage`: Cobertura padrão;
  - `below_average_coverage`: Baixa cobertura;
  - `no_coverage`: nenhum post de paciente respondido.
- A matriz de cruzamento recebeu o eixo `coverage`, permitindo combinacoes como `Conversao x Cobertura`.

### Admin frontend

- Adicionado card **Cobertura** no bloco "Atividade, cobertura, visibilidade, engajamento, favoritos e conversao dos psicologos".
- Card exibe donut com as categorias retornadas pelo backend e padrao em posts por psicologo.
- Os seletores da matriz passam a receber **Cobertura** diretamente do payload da API.
- Validacao mobile-first contemplou viewport base de 390px sem overflow global.

## Fora do escopo

- Criar regra de responsabilidade por comunidade ou denominador de posts elegiveis por comunidade.
- Exibir lista nominativa de psicologos acima/abaixo da media.
- Navegacao por quadrante da matriz.
- Criar tracking, seed, backfill, mock, endpoint simulado, package novo ou migration.

## Criterios de aceite

- [x] API retorna `profile_coverage` no resumo principal e nos segmentos de plano.
- [x] A media de cobertura usa posts unicos de pacientes respondidos por psicologo no periodo.
- [x] Múltiplas respostas do mesmo psicologo no mesmo post contam uma unica vez.
- [x] Psicologos sao classificados em Alta cobertura, Cobertura padrão, Baixa cobertura e Sem cobertura.
- [x] O dashboard exibe um grafico/card **Cobertura** junto aos demais sinais.
- [x] A matriz de cruzamento exibe a opcao **Cobertura** e gera combinacoes com esse eixo.
- [x] UI mobile-first preservada em 390px e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes e validacao browser local foram executados.
- [x] ADR criado em `adrs/0398-cobertura-dashboard-matriz-admin-psicologos.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Validacao de API local em `/api/admin/private/psychologists/dashboard?period=all`.
- Validacao browser local em `http://localhost:3002/psicologos`, incluindo desktop e viewport mobile 390px.

## Observacoes

- A metrica e deliberadamente simples, conforme decisao do produto: media de posts diferentes de pacientes que os psicologos respondem.
- A task nao alterou o banco nem criou novos eventos; a cobertura e derivada das respostas e posts ja persistidos.
- Havia alteracoes concorrentes de documentacao/codigo da TASK-133 no workspace. Elas foram preservadas e nao definem a arquitetura desta task.
