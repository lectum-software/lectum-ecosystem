# TASK-114 - Tabela de trafego por WhatsApp no dashboard Admin de psicologos

## Status

Completed

## Contexto

O usuario solicitou aprimorar a tabela **Origem do trafego para psicologos** no dashboard Admin `/psicologos` para que a leitura deixe de misturar visualizacoes de perfil com cliques de WhatsApp.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`;
- screenshot enviado pelo usuario em 2026-07-31 mostrando a tabela atual em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, nao ha ferramenta Builder/Quick Copy callable no ambiente; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Transformar a tabela de origem do trafego em uma leitura de **origem dos cliques de WhatsApp**, removendo a coluna **Perfil**, incluindo **Perfil** como linha de origem, removendo **Link direto**, ordenando por maior WhatsApp e detalhando as origens de Comunidades.

## Dependencias

- TASK-16: contato por WhatsApp persistido e CTA real.
- TASK-27: Ranking Top Mentores real.
- TASK-49: analytics first-party com `important_action_event`.
- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.

## Escopo

- Atualizar a agregacao real de `traffic_sources` do dashboard Admin de psicologos para usar `important_action_event.action_type in ("whatsapp_click", "psychologist_video_whatsapp_click")` como fonte dos cliques por origem.
- Manter os filtros por plano do bloco usando os psicologos-alvo quando a acao possui `target_id` atribuivel ao profissional.
- Remover a linha/opcao **Link direto** da tabela do dashboard `/psicologos`.
- Adicionar a origem **Perfil** como linha, contando cliques no WhatsApp feitos no perfil publico.
- Separar Comunidades em:
  - Posts com video;
  - Posts sem video;
  - Respostas com video;
  - Respostas sem video;
  - Ranking Top Mentores.
- Ordenar as linhas por cliques de WhatsApp em ordem decrescente.
- Atualizar tracking frontend para melhorar atribuicao futura em Perfil, Favoritos e Ranking Top Mentores, sem migration.

## Fora do escopo

- Criar nova tabela, migration, seed, mock ou backfill.
- Atribuir cliques historicos sem `important_action_event`.
- Alterar a tela Admin global `/trafego` ou a tabela de trafego do detalhe individual do psicologo.
- Criar biblioteca de tabela/grafico ou package novo.

## Criterios de aceite

- [x] A tabela em `/psicologos` nao exibe mais a coluna **Perfil**.
- [x] A origem **Perfil** aparece como linha e conta cliques reais de WhatsApp feitos no perfil publico.
- [x] As linhas sao ordenadas por maior quantidade de WhatsApp primeiro.
- [x] **Link direto** nao aparece como linha/opcao nessa tabela.
- [x] Comunidades aparece detalhada em Posts com video, Posts sem video, Respostas com video, Respostas sem video e Ranking Top Mentores.
- [x] O backend usa eventos first-party reais de WhatsApp e nao usa mock, seed, endpoint simulado ou dado fake permanente.
- [x] O filtro local por plano do bloco continua funcionando com os segmentos Todos, Assinantes, Gratuitos e Cortesia.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0378-origem-trafego-whatsapp-psicologos-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/utils/admin-psychologist-analytics.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/interfaces/IAdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/repositories/AdminPsychologistsDashboardRepository.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir frontend exec biome check --write "src/app/app/psychologist/[id]/logic.tsx" "src/components/psychologists/psychologist-relation-list.tsx" "src/app/app/community/top-mentors/logic.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm --dir frontend check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do use case `buildPsychologistsDashboard({ period: "all" })`: `source` novo de `important_action_event`, sem `direct_link`, linhas ordenadas por `whatsapp_clicks` e subcategorias de Comunidades presentes.
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos`: desktop confirmou cabecalho `Fonte` + `WhatsApp` sem coluna `Perfil`; desktop e mobile 390px confirmaram primeira linha por maior WhatsApp e presenca de `Perfil`, `Favoritos`, `Busca e filtros` e das cinco subcategorias de Comunidades.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- A validacao de browser criou e removeu um admin temporario `codex-task114-validation@lectum.local`, sem manter seed ou mock.
