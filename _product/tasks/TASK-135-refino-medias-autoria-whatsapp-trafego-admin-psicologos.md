# TASK-135 - Refino de medias e autoria nos cliques WhatsApp do trafego Admin

## Status

Completed

## Contexto

Na tabela **Origem do trafego para psicologos** em `/psicologos`, a TASK-131 havia adicionado a media de cliques WhatsApp abaixo do total da coluna. O usuario pediu um ajuste de leitura: a media deve ficar junto da base considerada da linha, as linhas macro nao devem exibir media e as linhas de posts/respostas precisam discriminar se o clique foi feito pelo autor do conteudo ou por outros usuarios.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como fallback local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa a imagem local e o screenshot do usuario, registrando esta limitacao.

## Objetivo

Ajustar a tabela de origem do trafego para:

- mover a media de WhatsApp para a area textual da linha, logo depois de `X conteudos/perfis/videos considerados` quando essa base existir;
- remover a media da coluna WhatsApp nas linhas macro **Comunidades**, **Perfil** e **Video de apresentacao**;
- exibir, em posts e respostas, abaixo do total de WhatsApp, a quantidade e a taxa de cliques do autor do conteudo e de outros usuarios.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.
- TASK-114 a TASK-121: tabela de trafego WhatsApp, grupos expansivos e contagens consideradas reais.
- TASK-131: media de WhatsApp por linha.
- TASK-134: base sequencial atual do dashboard Admin.

Todas as dependencias acima estao concluidas.

## Escopo executado

### Backend

- Estender `AdminPsychologistWhatsappTrafficAction`/record com `user_id` vindo de `important_action_event`.
- Calcular `whatsapp_click_actor_breakdown` apenas para origens de conteudo de comunidade:
  - posts com video;
  - posts sem video;
  - respostas com video;
  - respostas sem video.
- Classificar como **autor do conteudo** quando `important_action_event.user_id` coincide com `community_post.author_id` ou `post_reply.author_id`.
- Classificar como **outros usuarios** quando o clique nao tem usuario autenticado, nao resolve autor ou foi feito por qualquer usuario diferente do autor.

### Admin frontend

- Remover a media secundaria da celula WhatsApp.
- Renderizar a media como badge textual ao lado da base considerada nas linhas detalhadas/nao macro.
- Renderizar o breakdown `Autor do conteudo X (Y%)` e `Outros usuarios X (Y%)` abaixo do total de WhatsApp nas linhas de posts/respostas.
- Preservar a experiencia mobile-first e ampliar a largura da coluna WhatsApp no desktop para acomodar as duas linhas de breakdown.

## Fora do escopo

- Alterar banco, Prisma schema ou migrations.
- Criar novos eventos, seeds, mocks, backfills ou endpoints simulados.
- Alterar os totais/percentuais ja existentes da coluna WhatsApp.
- Alterar a ordenacao das origens de trafego.
- Instalar package novo.

## Regras de calculo

- Media = `whatsapp_clicks / denominador`, arredondada para uma casa decimal.
- O denominador continua vindo de `considered_count` quando existir; para leituras por psicologo sem `considered_count`, usa `trafficSegmentSummary.psychologists_count`.
- O breakdown autor/outros usa somente cliques first-party de `important_action_event` ja considerados na linha.
- Taxa do autor = `author_clicks / whatsapp_clicks * 100`.
- Taxa de outros usuarios = `other_users_clicks / whatsapp_clicks * 100`.
- Para linhas de posts/respostas sem cliques, ambas as taxas aparecem como `0%` quando o backend retorna o breakdown.
- Linhas macro nao exibem media nem breakdown.

## Criterios de aceite

- [x] A coluna **WhatsApp** continua exibindo total e percentual por linha.
- [x] A media de cliques WhatsApp nao aparece mais abaixo do total nas linhas macro **Comunidades**, **Perfil** e **Video de apresentacao**.
- [x] A media aparece depois do badge `X conteudos/perfis/videos considerados` nas linhas detalhadas com base considerada.
- [x] Linhas de posts e respostas exibem abaixo do total de WhatsApp a quantidade/taxa de cliques do autor do conteudo.
- [x] Linhas de posts e respostas exibem abaixo do total de WhatsApp a quantidade/taxa de cliques de outros usuarios.
- [x] O backend calcula o breakdown com dados reais de `important_action_event.user_id` e autores reais de posts/respostas.
- [x] UI mobile-first preservada em ~390px e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes e validacao browser local foram executados.
- [x] ADR criado em `adrs/0399-refino-medias-autoria-whatsapp-trafego-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/utils/admin-psychologist-analytics.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Validacao de API local em `/api/admin/private/psychologists/dashboard?period=all`, conferindo `whatsapp_click_actor_breakdown` nas linhas de posts/respostas.
- Browser local em `http://localhost:3002/psicologos`, desktop e mobile 390px.

## Observacoes

- A task altera contrato agregado/API e composicao visual, mas nao altera persistencia.
- Cliques anonimos ou sem autor resolvido sao classificados como **outros usuarios** para manter a soma do breakdown igual ao total da linha.
