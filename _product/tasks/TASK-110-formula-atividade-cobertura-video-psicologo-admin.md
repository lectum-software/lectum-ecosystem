# TASK-110 - Formula de atividade por cobertura e video no psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-110 |
| Prioridade | P1 |
| Esforco | P |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-104, TASK-105, TASK-107, TASK-108, TASK-109 |
| ADR alvo | ADR-0373 |

## Contexto

O card **Atividade (score)** da aba `/psicologos/[id]?tab=estatisticas` usava a formula simples
`posts + replies * 3`. O produto decidiu que a atividade deve medir melhor a cobertura real de pacientes:
vale mais responder posts de pacientes diferentes do que concentrar varias respostas no mesmo post. Tambem
foi decidido que respostas em video devem ter peso maior, porque exigem mais esforco e tendem a gerar mais
confianca, enquanto o engajamento recebido continua sendo um eixo separado de resultado.

Referencias consultadas:

- `_product/tasks/README.md`;
- `_product/tasks/ARCHITECTURE.md`;
- `_product/tasks/DATA-MODEL.md`, secoes `community_post`, `post_reply` e complemento de `reply_coverage_count`;
- `_product/tasks/PACKAGES.md`;
- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png` como fallback visual.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, nao ha
ferramenta Builder/Quick Copy callable no ambiente Codex; a validacao visual usa a imagem local, o screenshot
e a rota local do Admin quando aplicavel.

## Objetivo

Alterar o score de Atividade para valorizar cobertura de posts de pacientes e respostas em video, sem criar
mock, endpoint paralelo, package, schema Prisma ou migration.

## Formula vigente apos a task

```txt
activity_score =
  posts_criados
  + posts_de_pacientes_respondidos_sem_video * 3
  + posts_de_pacientes_respondidos_com_video * 5
```

Regras:

- Um post de paciente conta no maximo uma vez no periodo selecionado.
- Se houver ao menos uma resposta em video no post de paciente, a cobertura desse post usa peso 5.
- Respostas extras no mesmo post nao aumentam o score.
- Respostas sem video em posts de pacientes usam peso 3.
- Posts criados pelo psicologo continuam valendo 1.
- Respostas brutas continuam existindo como metrica de auditoria, mas nao multiplicam diretamente o score.

## Escopo backend

- Estender `AdminPsychologistStatisticsSeriesPoint` com:
  - `patient_post_reply_coverage`;
  - `patient_post_text_reply_coverage`;
  - `patient_post_video_reply_coverage`.
- Derivar cobertura a partir de `post_reply.author_id`, `post_reply.post.author.role=paciente` e
  `post_reply.media_type`.
- Retornar `activity_score` em `business.cards` com comparativo contra periodo anterior.
- Retornar cards auxiliares de cobertura em `community.cards` apenas para comparativo/derivacao, sem mudar a
  UI do bloco de comunidade.

## Escopo frontend/Admin

- Aplicacao Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Trocar `getValue` de **Atividade (score)** para usar cobertura de posts de pacientes com peso 3/5.
- Manter fallback defensivo para o contrato antigo `posts + replies * 3` durante deploys separados de
  backend/admin.
- Atualizar comparativo derivado para usar cobertura quando os novos cards auxiliares estiverem presentes.

## Fora do escopo

- Alterar score de Engajamento recebido.
- Alterar ranking publico ou ranking Top Mentor.
- Criar matriz Conversao x Atividade no dashboard `/psicologos`.
- Criar endpoint novo, mock, seed, backfill, package, schema Prisma ou migration.

## Criterios de aceite

- [x] O score de Atividade usa posts criados mais cobertura de posts de pacientes respondidos.
- [x] Um mesmo post de paciente respondido varias vezes conta apenas uma vez no score.
- [x] Cobertura com resposta em video usa peso 5.
- [x] Cobertura sem video usa peso 3.
- [x] Posts criados pelo psicologo continuam com peso 1.
- [x] Comparativo de **Atividade (score)** usa a mesma formula no periodo anterior.
- [x] O contrato preserva compatibilidade defensiva no frontend para deploy separado.
- [x] Nenhum mock, endpoint paralelo, package novo, schema Prisma ou migration foi criado.
- [x] ADR criado em `adrs/0373-formula-atividade-cobertura-video-psicologo-admin.md`.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx"`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.

## Notas de execucao

- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`,
  `pnpm --dir backend db:migrate` nao se aplica.
