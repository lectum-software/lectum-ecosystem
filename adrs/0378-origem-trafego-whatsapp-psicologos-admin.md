# ADR-0378 - Origem do trafego por WhatsApp no Admin de psicologos

## Status

Accepted

## Contexto

A tabela **Origem do trafego para psicologos** em `/psicologos` exibia uma coluna **Perfil** com visualizacoes de perfil e outra coluna **WhatsApp** ainda sem atribuicao por origem. O usuario pediu uma leitura operacional centrada em cliques de WhatsApp: **Perfil** deve virar uma origem/linha, **Link direto** deve sair, Comunidades deve ser detalhada e as linhas devem ser ordenadas por maior volume de WhatsApp.

O produto ja possui tracking first-party em `important_action_event` para `whatsapp_click` e `psychologist_video_whatsapp_click`. `contact_request` continua sendo a fonte canonica do total de contatos por WhatsApp, mas nao possui campos de origem/superficie suficientes para distribuir os cliques na tabela sem criar migration ou backfill.

## Decisao

Para o dashboard Admin de psicologos, a tabela `traffic_sources` passa a representar **origem dos cliques de WhatsApp atribuiveis por evento first-party**, usando `important_action_event` real como fonte de distribuicao por superficie.

A distribuicao canonica do bloco fica:

- **Perfil**: CTA de WhatsApp em perfil publico de psicologo.
- **Explorar**: CTA no feed/listagem de psicologos, incluindo `psychologist_video_whatsapp_click`.
- **Busca e filtros**: mantida como categoria operacional sem simulacao quando nao houver sinal atribuivel.
- **Favoritos**: CTA acionado na area de favoritos.
- **Comunidades · Posts com video**.
- **Comunidades · Posts sem video**.
- **Comunidades · Respostas com video**.
- **Comunidades · Respostas sem video**.
- **Comunidades · Ranking Top Mentores**.

A origem **Link direto** deixa de ser exibida nessa tabela porque nao ha superficie interna acionavel a otimizar e porque a nova leitura e focada em cliques de WhatsApp dentro da Lectum.

Para melhorar a atribuicao futura sem migration:

- CTAs de WhatsApp do perfil passam a enviar `target_type="psychologist"` e `target_id` explicitamente.
- CTAs de favoritos passam a enviar `target_id` do psicologo e `path="/app/favorites"`.
- Links do Ranking Top Mentores passam a carregar `traffic_origin=community_top_mentors`; o CTA do perfil usa esse contexto para atribuir o clique ao ranking quando aplicavel.

## Consequencias

- A tabela passa a ordenar as linhas por `whatsapp_clicks` decrescente e remove a coluna de visualizacoes **Perfil**.
- Os totais por origem podem ser menores que o total canonico de `contact_request` quando o browser nao conseguir registrar `important_action_event`; essa diferenca e honesta e nao e preenchida por mock/backfill.
- Segmentos por plano continuam filtrando acoes atribuiveis ao psicologo-alvo; eventos historicos sem `target_id` suficiente podem aparecer apenas em **Todos** ou ficar sem atribuicao segmentada.
- Nao ha alteracao de Prisma schema, migrations, pacotes ou endpoints paralelos.

## Task relacionada

- `_product/tasks/TASK-114-tabela-trafego-whatsapp-dashboard-psicologos-admin.md`

## Validacoes

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir frontend check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do use case `buildPsychologistsDashboard({ period: "all" })`: `important_action_event` como fonte, sem `direct_link`, linhas ordenadas por WhatsApp e Comunidades detalhadas.
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos`: desktop sem coluna **Perfil** e mobile 390px com a mesma ordenacao por WhatsApp.
