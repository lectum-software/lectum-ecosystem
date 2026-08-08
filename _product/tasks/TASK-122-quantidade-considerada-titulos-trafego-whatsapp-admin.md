# TASK-122 - Quantidade considerada e carrossel dos donuts no Admin de psicologos

## Status

Completed

## Contexto

Depois das TASK-114 a TASK-121, a tabela **Origem do trafego para psicologos** em `/psicologos` exibe grupos expansivos para **Comunidades**, **Perfil** e **Video de apresentacao**, com medias reais de engajamento nas sublinhas. Em 2026-07-31, o usuario pediu que, na frente dos titulos das categorias (**Posts com video**, **Respostas com video**, **Engajamento dentro do perfil**, **Explorar**, etc.), a tela informe a quantidade considerada nas medias.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando o grupo **Comunidades** expandido em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Exibir a quantidade considerada junto aos titulos das categorias que possuem medias de engajamento na tabela de trafego WhatsApp do Admin de psicologos, preservando dados reais, filtros por plano e responsividade mobile-first.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-75: analytics de conteudo e retencao de video.
- TASK-76: periodo global do Admin.
- TASK-114 a TASK-121: tabela de trafego WhatsApp, grupos expansivos e metricas medias.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Adicionar `considered_count` ao contrato `traffic_sources.sources[]`.
- Preencher `considered_count` das sublinhas de Comunidades com a quantidade real de posts/respostas da categoria usada como denominador das medias.
- Preencher `considered_count` de **Engajamento dentro do perfil** com a quantidade real de perfis de psicologos considerados no segmento.
- Preencher `considered_count` de **Explorar** e **Busca e filtros** com a quantidade real de videos de apresentacao publicados considerados no segmento.
- Renderizar texto simples ao lado dos titulos no desktop e no mobile com copy contextual: conteudos, perfis ou videos considerados, sem fundo ou borda de tag.
- Preservar os calculos, filtros por plano e agrupamentos existentes.
- Substituir, nos donuts do bloco **Visibilidade, engajamento, favoritos e conversao dos psicologos**, o texto fixo **psicologos considerados** pelo valor padrao do item mensurado: faixa padrao de video/comunidade/engajamento/favoritos ou faixa padrao de conversao.
- Transformar os cinco donuts do bloco em carrossel horizontal mobile-first com setas laterais no mesmo padrao do carrossel **Atividade e engajamento** do perfil do psicologo.
- Ajustar largura e espacamento dos cards do carrossel para evitar compressao e tambem evitar grandes vazios entre os blocos: 1 card no mobile, 2 em `sm`, 3 em `xl` e 4 em `2xl`, com gap local menor.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Criar backfill historico, seed, mock ou endpoint simulado.
- Alterar os calculos das medias ja existentes.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.
- Instalar package novo.
- Alterar formulas, percentis ou contratos dos donuts de visibilidade, engajamento, favoritos e conversao.

## Criterios de aceite

- [x] **Posts com video**, **Posts sem video**, **Respostas com video** e **Respostas sem video** exibem a quantidade de conteudos considerados junto ao titulo da categoria.
- [x] **Engajamento dentro do perfil** exibe a quantidade de perfis considerados junto ao titulo.
- [x] **Explorar** e **Busca e filtros** exibem a quantidade de videos considerados junto ao titulo.
- [x] As quantidades respeitam o filtro por plano do bloco.
- [x] As quantidades usam somente dados reais ja usados como denominador das medias; nao ha mock, seed, backfill ou endpoint simulado.
- [x] A exibicao funciona no desktop e no mobile-first (~390px).
- [x] Os donuts nao exibem mais o texto fixo **psicologos considerados** abaixo do total externo do card.
- [x] Cada donut exibe o bloco **Padrao da plataforma** com o valor padrao do item mensurado.
- [x] Os cinco donuts usam carrossel horizontal com setas laterais no modelo de **Atividade e engajamento** do perfil do psicologo.
- [x] A largura e o espacamento dos cards foram ajustados para reduzir distancia excessiva sem voltar ao layout comprimido.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0386-quantidade-considerada-titulos-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.
- [x] Ajuste complementar 2026-08-01: o contador dos donuts removeu o fundo do bloco de padrao, reduziu o peso textual do rotulo e trocou **Padrao da plataforma** por **Padrao**.

## Validacao executada

- `pnpm --dir backend exec biome check --write src/utils/admin-psychologist-analytics.ts src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke de API Admin real em `/api/admin/private/psychologists/dashboard?period=30d`, confirmando `considered_count` em `community_post_video`, `community_reply_video`, `profile`, `explore` e `search_filters`.
- Browser local com Chrome/CDP headless em `http://localhost:3002/psicologos`, desktop 1440x900 e mobile 390x900, validando o texto de quantidade considerada nas categorias expandidas.
- Browser local com Chrome/CDP headless em `http://localhost:3002/psicologos?period=all`, desktop 1366x900 e mobile 390x844, validando o carrossel de donuts com setas laterais, bloco **Padrao da plataforma**, ausencia do texto fixo **psicologos considerados**, ajuste de largura/espacamento e ausencia de overflow horizontal. Screenshots: `.tmp/task122-dashboard-donut-carousel-desktop.png` e `.tmp/task122-dashboard-donut-carousel-mobile.png`.
- Ajuste complementar 2026-08-01:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`;
  - `pnpm --dir admin check`;
  - `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`;
  - `pnpm check`;
  - Browser local Chrome/CDP em `http://localhost:3002/psicologos?period=all`, desktop 1366px e mobile 390px, validando 6 rotulos **Padrao**, 0 rotulos **Padrao da plataforma**, fundo transparente (`rgba(0, 0, 0, 0)`) e peso `600`. Screenshots: `.tmp/standard-counter-desktop.png` e `.tmp/standard-counter-mobile-390.png`.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
