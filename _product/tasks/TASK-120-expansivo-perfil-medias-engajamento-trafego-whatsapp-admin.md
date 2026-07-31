# TASK-120 - Expansivo de Perfil com medias de engajamento no trafego WhatsApp Admin

## Status

Completed

## Contexto

Depois das TASK-114 a TASK-119, a tabela **Origem do trafego para psicologos** em `/psicologos` passou a usar cliques reais de WhatsApp por superficie, com grupos expansivos para Comunidades e Video de apresentacao. O usuario solicitou que a linha **Perfil** tambem tenha um expansivo para exibir medias de engajamento medio dentro do perfil publico:

- Aberturas de perfil;
- Tempo de permanencia;
- Views do video de apresentacao;
- Retencao;
- Favoritado;
- Abertura da aba Publicacoes;
- Abertura da aba Avaliacoes.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a descoberta de ferramentas nao retornou Builder/Quick Copy callable no ambiente; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Transformar a linha **Perfil** da tabela de trafego WhatsApp do Admin de psicologos em um grupo expansivo que exibe chips com medias reais de engajamento dentro do perfil publico, preservando o total de cliques WhatsApp da linha principal e sem criar mocks, seeds, backfill, package novo ou migration.

## Dependencias

- TASK-16: contato por WhatsApp real.
- TASK-20: analytics do psicologo.
- TASK-47: captura de sessao/pageviews.
- TASK-49: tracking de pageviews e origem de trafego.
- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.
- TASK-114 a TASK-119: tabela de trafego WhatsApp, grupos expansivos e metricas medias.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Estender o contrato `traffic_sources.sources[].platform_metrics` tambem para a fonte `profile`.
- Calcular metricas reais do perfil a partir de `profile_view_event`, `page_view_event.duration_seconds`, `profile_video_watch_session`, `psychologist_favorite` e `important_action_event`.
- Adicionar tracking first-party para abertura das abas `Publicacoes` e `Avaliacoes` no perfil publico, usando `important_action_event` com novos `action_type` permitidos.
- No Admin, renderizar **Perfil** com seta de expansao alinhada ao padrao existente; ao expandir, mostrar os chips de engajamento dentro do perfil.
- Preservar o agrupamento de Comunidades e Video de apresentacao.

## Regras de calculo

- `Aberturas de perfil`, `Views do video de apresentacao`, `Favoritado`, `Abertura da aba Publicacoes` e `Abertura da aba Avaliacoes` sao medias por psicologo do segmento selecionado no fim do periodo.
- `Tempo de permanencia` e a media de `page_view_event.duration_seconds` em pageviews reais de perfil, excluindo autovisitas quando identificadas.
- `Retencao` e a media percentual de `watched_seconds / duration_seconds` em sessoes reais do video de apresentacao com duracao positiva.
- Aberturas das abas Publicacoes/Avaliacoes nao recebem backfill: eventos antigos aparecem como `0` ate que o novo tracking gere eventos reais.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Criar backfill historico, seed, mock ou endpoint simulado.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.
- Instalar package novo.
- Alterar outros calculos das metricas de Comunidades ou Video de apresentacao.

## Criterios de aceite

- [x] A linha **Perfil** aparece como expansiva na tabela `/psicologos`, com seta de dropdown no mesmo padrao de Comunidades e Video de apresentacao.
- [x] Ao expandir **Perfil**, aparecem os chips: Aberturas de perfil, Tempo de permanencia, Views do video de apresentacao, Retencao, Favoritado, Abertura da aba Publicacoes e Abertura da aba Avaliacoes.
- [x] As metricas usam somente eventos first-party reais e mostram `Sem dados` quando a base temporal nao existe.
- [x] Aberturas das abas Publicacoes/Avaliacoes passam a ser rastreadas por `important_action_event`, sem backfill.
- [x] O filtro por plano do bloco continua filtrando tambem as metricas do Perfil.
- [x] Comunidades e Video de apresentacao preservam seus expansivos e metricas existentes.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0384-expansivo-perfil-medias-engajamento-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir frontend build`
- `pnpm check`
- Smoke backend com `buildPsychologistsDashboard({ period: "30d" })`, confirmando `profile.platform_metrics` com os 7 ids esperados.
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos`, desktop 1440px e mobile 390px, expandindo **Perfil** e confirmando os sete chips.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- Os administradores temporarios usados nos smokes de browser foram removidos apos a validacao local.