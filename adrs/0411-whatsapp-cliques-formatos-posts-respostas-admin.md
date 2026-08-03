# ADR-0411: Cliques WhatsApp por formato em Posts e Respostas no Admin

Status: Accepted
Data: 2026-08-03

## Contexto

Na aba Admin **Estatisticas** do psicologo, o bloco **Posts**/**Respostas** ja mostrava a distribuicao por formato de conteudo, mas nao conectava essa distribuicao ao resultado de conversao por WhatsApp. O usuario pediu que cada formato exibisse os cliques WhatsApp associados e que a tag superior do card de Posts deixasse de repetir a quantidade de posts para mostrar o total de cliques somando Posts e Respostas.

## Decisao

1. O contrato real `GET /api/admin/private/psychologists/:id/statistics` passa a incluir, em `community.content_distribution.posts|replies`, `items[].whatsapp_clicks` e `total_whatsapp_clicks`.
2. Os cliques sao contados por `important_action_event.action_type="whatsapp_click"`, no mesmo periodo selecionado, vinculados aos ids reais de `community_post` ou `post_reply` autorais do psicologo e ao mesmo filtro de comunidade aplicado ao bloco.
3. A classificacao de formato permanece a mesma: texto, video, imagem e carrossel. Apenas a leitura de conversao por formato foi adicionada.
4. A UI Admin mostra `N posts/respostas · N cliques WhatsApp` em cada linha de formato e substitui a badge superior do card **Posts** por `N cliques WhatsApp`, somando Posts e Respostas.

## Consequencias

- O Admin passa a comparar volume de producao e resultado de WhatsApp por formato sem endpoint novo, mock, seed ou backfill.
- Cliques historicos sem `important_action_event` rastreavel continuam fora da distribuicao por formato; isso preserva a atribuicao honesta ja adotada para origens de trafego.
- `contact_request` continua sendo o total geral canonico de conversoes WhatsApp; este bloco usa somente eventos first-party rastreaveis ate o conteudo.
- Nao houve migration nem package novo.

## Validacao

- `pnpm --dir backend exec biome check src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts src/modules/api/admin/private/psychologists/engagement/repositories/AdminPsychologistEngagementRepository.ts src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts`
- `pnpm --dir admin exec biome check src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build` (primeira tentativa bloqueada por outro `next build` em andamento; repeticao passou)
- `pnpm check`
- Smoke direto do service confirmou, para `cmrgztri7000tn0uh1q4n8vxf` em `period=all`, `posts.total=20`, `replies.total=2`, `posts.total_whatsapp_clicks=11`, `replies.total_whatsapp_clicks=0` e `items[].whatsapp_clicks` preenchido.
- Browser local/headless autenticado em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`: desktop 1350px e mobile 390px confirmaram `11 cliques WhatsApp`, `19 posts · 0 cliques WhatsApp`, ausencia de `20 posts` na badge do card **Posts** e ausencia de overflow horizontal no viewport mobile. Evidencias: `.tmp/admin-psychologist-whatsapp-formats-desktop.png` e `.tmp/admin-psychologist-whatsapp-formats-mobile.png`.

## Pendencias

- Nenhuma pendencia externa. Eventos antigos sem alvo rastreavel em `important_action_event` permanecem sem atribuicao por formato.
