# TASK-130: Eixos adicionais na matriz de cruzamento de dados Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-130 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin - Psicólogos |
| Status | Completed |
| Dependências | TASK-53, TASK-100, TASK-123, TASK-125, TASK-127, TASK-128, TASK-129 |
| ADR alvo | ADR-0394 |

## Contexto

A matriz de cruzamento de dados do dashboard Admin de Psicólogos passou a ter seletores independentes de **Linha** e **Coluna** na TASK-129. O pedido desta task ajusta o catálogo desses seletores para refletir nomes mais explícitos e novos eixos operacionais: formato de conteúdo, abertura de perfil, avaliações e posição do vídeo de apresentação na página pública de psicólogos.

Referência visual ativa consultada: `_product/tasks/PROTO-INVENTORY.md`, com tela Admin `Psicólogos - Dashboard` em `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`. O Builder/Quick Copy ativo não estava exposto como ferramenta callable neste ambiente; a limitação foi registrada e a validação visual foi feita por browser local.

## Objetivo

Permitir que o administrador cruze qualquer eixo da matriz usando os seletores **Linha** e **Coluna**, incluindo:

- `Atividade comunidade`;
- `Engajamento comunidade`;
- `Formato de conteúdo`, com categorias de posts e respostas com/sem vídeo;
- `Abertura de perfil`;
- `Avaliações`;
- `Posição vídeo de apresentação`, com Top 10, Top 30, Top 50 e 50+.

## Pré-requisitos e bloqueios

- Dados reais já existentes de comunidades, perfil, avaliações, retenção e ranking público.
- Nenhuma credencial externa nova é necessária.
- Nenhuma alteração de `schema.prisma` ou migration.
- Sem novos packages.

## Escopo frontend

- Atualizar o contrato TypeScript do Admin para aceitar os novos ids de eixo.
- Manter a UI mobile-first dos seletores de **Linha** e **Coluna**.
- Ajustar a largura desktop dos seletores para comportar rótulos longos, especialmente `Posição vídeo de apresentação`.

## Escopo backend

- Atualizar o catálogo de `profile_cross_matrix.axes`.
- Renomear os eixos:
  - `Atividade` -> `Atividade comunidade`;
  - `Engajamento` -> `Engajamento comunidade`;
  - `Posts com vídeo` -> `Formato de conteúdo`.
- Adicionar categorias reais para `Formato de conteúdo`: `Posts com vídeo`, `Posts sem vídeo`, `Respostas com vídeo`, `Respostas sem vídeo` e `Sem conteúdo`.
- Adicionar eixos derivados de dados reais:
  - `Abertura de perfil`, por contagem de `profile_view_event.source=profile_page`;
  - `Avaliações`, por `professional_review.status=publicada`;
  - `Posição vídeo de apresentação`, por posição no helper de ranking público compartilhado.

## Fora do escopo

- Criar novas tabelas, migrations ou backfill.
- Alterar ranking público, tracking de analytics ou semântica de conversão.
- Adicionar filtros avançados ou formulários.

## Contrato técnico detalhado

- Backend mantém a resposta `profile_cross_matrix` agregada no dashboard Admin de psicólogos.
- O eixo `Formato de conteúdo` é exclusivo por psicólogo no período: usa o formato predominante entre posts/respostas; empates priorizam posts com vídeo, respostas com vídeo, posts sem vídeo e respostas sem vídeo.
- `Abertura de perfil` e `Avaliações` usam faixas por percentis 25/75 entre valores positivos, preservando categoria `Sem ...` quando a contagem é zero.
- `Posição vídeo de apresentação` usa a posição 1-based calculada pelo ranking público: `Top 10`, `Top 30`, `Top 50` e `50+` para posição acima de 50 ou ausência no ranking.
- Não houve mudança de banco; `pnpm --dir backend db:migrate` não se aplica.

## Critérios de aceite

- [x] Seletores **Linha** e **Coluna** exibem `Formato de conteúdo` no lugar do eixo antigo `Posts com vídeo`.
- [x] `Formato de conteúdo` possui categorias `Posts com vídeo`, `Posts sem vídeo`, `Respostas com vídeo`, `Respostas sem vídeo` e `Sem conteúdo`.
- [x] Seletores exibem `Atividade comunidade` e `Engajamento comunidade`.
- [x] Seletores incluem `Abertura de perfil` e `Avaliações`.
- [x] Seletores incluem `Posição vídeo de apresentação` com categorias `Top 10`, `Top 30`, `Top 50` e `50+`.
- [x] As matrizes são geradas para combinações distintas de linha x coluna sem mock.
- [x] UI mobile-first validada em 390px; nenhum `<img>` cru foi introduzido.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos da TASK-02 não se aplicam porque a mudança usa selects existentes sem submit.
- [x] Builder/Quick Copy não estava callable; imagem local do inventário e browser local foram usados.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0394-eixos-adicionais-matriz-cruzamento-dados-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- `node .tmp/validate-task130.mjs`

## Notas de execução

- Screenshots de validação local:
  - `.tmp/task130-cross-matrix-axis-options-desktop.png`;
  - `.tmp/task130-cross-matrix-axis-options-mobile-390.png`.
- Um admin temporário de validação (`codex-validation-task130@lectum.local`) foi criado por `admin:bootstrap` e removido ao final por `backend/.tmp/cleanup-task130-admin.ts`.
