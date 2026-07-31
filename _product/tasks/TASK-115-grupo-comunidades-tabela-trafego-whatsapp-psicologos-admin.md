# TASK-115 - Grupo Comunidades na tabela de trafego WhatsApp do Admin de psicologos

## Status

Completed

## Contexto

A TASK-114 transformou a tabela **Origem do trafego para psicologos** em `/psicologos` para leitura de cliques de WhatsApp por superficie e detalhou Comunidades em linhas separadas. O usuario pediu o refinamento visual seguinte: manter **Comunidades** como um unico bloco da tabela, com a linha superior exibindo o somatorio dos cliques e as linhas abaixo exibindo os detalhes de comunidades.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`;
- screenshot enviado pelo usuario em 2026-07-31 mostrando a tabela atual em `http://localhost:3002/psicologos` com as linhas de Comunidades dispersas.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao esta callable no ambiente; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Agrupar as origens de **Comunidades** em um bloco unico da tabela Admin de trafego para psicologos: uma linha superior **Comunidades** mostra o total de WhatsApp do grupo e as linhas subordinadas mostram Posts com video, Posts sem video, Respostas com video, Respostas sem video e Ranking Top Mentores.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.
- TASK-114: origem de trafego por WhatsApp com subcategorias reais de Comunidades.

## Escopo

- Alterar somente a composicao visual da tabela de trafego em `admin/src/app/(admin)/psicologos/client.tsx`.
- Derivar no Admin um grupo visual **Comunidades** a partir das cinco subcategorias ja retornadas pelo backend.
- Ordenar as linhas principais por WhatsApp considerando o somatorio de Comunidades.
- Renderizar detalhes de Comunidades imediatamente abaixo da linha superior, com indentacao e sem quebrar mobile-first.
- Manter os dados reais do backend, sem criar mock, backfill, seed, migration ou endpoint paralelo.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Alterar o contrato publico persistido da API Admin.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.
- Criar package novo ou biblioteca de tabela.

## Criterios de aceite

- [x] A tabela em `/psicologos` exibe uma linha principal **Comunidades** com o somatorio dos cliques de WhatsApp das subcategorias.
- [x] As subcategorias de Comunidades aparecem imediatamente abaixo da linha **Comunidades** como detalhes do mesmo bloco.
- [x] As linhas principais continuam ordenadas por maior WhatsApp primeiro, considerando o somatorio de Comunidades.
- [x] O selo **Principal origem** aparece na linha agregada correta, nao disperso em uma subcategoria quando o grupo Comunidades for a maior origem.
- [x] A UI mobile-first mostra o bloco Comunidades com total e detalhes de forma legivel em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0379-grupo-comunidades-tabela-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao planejada

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos` desktop e mobile.

Validacao executada:

- `pnpm --dir admin check` - sucesso.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` - sucesso.
- `pnpm check` - sucesso.
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos` - sucesso em desktop 1440px e mobile 390px, com evidencias em `.tmp/task115-admin-psicologos-desktop.png` e `.tmp/task115-admin-psicologos-mobile.png`.

## Observacoes

- Nao ha alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
