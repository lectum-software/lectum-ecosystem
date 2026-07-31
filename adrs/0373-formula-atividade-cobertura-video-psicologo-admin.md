# ADR-0373: Formula de atividade por cobertura e video no psicologo Admin

## Status

Accepted

## Task relacionada

TASK-110

## Contexto

O score **Atividade (score)** do detalhe administrativo do psicologo era derivado no Admin como
`posts + replies * 3`. Essa leitura media volume bruto de respostas, mas nao distinguia cobertura de
pacientes: duas respostas no mesmo post tinham o mesmo valor de duas respostas em posts de pacientes
diferentes. O produto tambem decidiu que respostas em video devem valer mais no eixo de atividade, por
representarem maior esforco do psicologo e maior potencial de confianca.

O score de Engajamento recebido permanece separado: ele mede a reacao do publico ao conteudo. Atividade
mede a acao autoral do psicologo.

## Decisao

O score de Atividade passa a ser:

```txt
activity_score =
  posts_criados
  + posts_de_pacientes_respondidos_sem_video * 3
  + posts_de_pacientes_respondidos_com_video * 5
```

A cobertura e derivada de respostas reais em `post_reply` feitas pelo psicologo em posts raiz de pacientes.
Cada `community_post` de paciente conta no maximo uma vez no periodo selecionado. Se houver pelo menos uma
resposta em video nesse post durante o periodo, a cobertura usa peso 5; caso contrario, usa peso 3.

O backend passa a incluir no contrato de estatisticas:

- `patient_post_reply_coverage`;
- `patient_post_text_reply_coverage`;
- `patient_post_video_reply_coverage`;
- card `activity_score` com comparativo ja calculado pela nova formula;
- cards auxiliares de cobertura em `community.cards` para manter compatibilidade de comparativo.

O frontend usa esses campos na serie e mantem fallback para o contrato antigo `posts + replies * 3`, porque
Admin e backend sao aplicacoes separadas em producao e podem ser implantados em momentos diferentes.

## Consequencias

- O score deixa de incentivar multiplas respostas no mesmo post apenas para aumentar volume.
- A atividade passa a premiar alcance/cobertura de demandas de pacientes diferentes.
- Respostas em video ganham peso moderado sem substituir o eixo de Engajamento recebido.
- Nao ha migration, backfill, seed, mock, package novo ou endpoint paralelo.
- A matriz Conversao x Atividade fica preparada para usar um sinal mais fiel em task futura, mas nao foi
  criada nesta decisao.

## Validacao

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts" "src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/[id]/client.tsx"`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.

## Pendencias

- Nenhuma pendencia externa.
