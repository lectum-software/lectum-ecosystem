# TASK-116 - Grupos expansiveis na tabela de trafego WhatsApp do Admin de psicologos

## Status

Completed

## Contexto

A TASK-115 agrupou **Comunidades** em um bloco visual com somatorio e detalhes sempre visiveis na tabela **Origem do trafego para psicologos** em `/psicologos`. O usuario pediu o refinamento seguinte em 2026-07-31: transformar os detalhes de Comunidades em um menu expansivel com seta de dropdown alinhada a direita e criar tambem uma linha agregada **Video de apresentacao** com menu expansivel contendo **Explorar** e **Busca e filtros**.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`;
- screenshot enviado pelo usuario em 2026-07-31 mostrando a tabela atual em `http://localhost:3002/psicologos` com Comunidades expandida e Explorar/Busca e filtros como linhas planas.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao esta callable no ambiente via MCP/tooling disponivel; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Refinar a tabela de trafego WhatsApp do dashboard Admin de psicologos para que:

- **Comunidades** seja um grupo recolhivel/expansivel com seta alinhada a direita e detalhes subordinados.
- **Video de apresentacao** seja uma nova linha agregada, tambem recolhivel/expansivel, somando e detalhando **Explorar** e **Busca e filtros**.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-76: periodo global do Admin.
- TASK-114: origem de trafego por WhatsApp com subcategorias reais.
- TASK-115: grupo visual Comunidades.

## Escopo

- Alterar somente a composicao visual da tabela de trafego em `admin/src/app/(admin)/psicologos/client.tsx`.
- Derivar no Admin dois grupos visuais a partir das fontes ja retornadas pelo backend:
  - **Comunidades**: cinco subcategorias de comunidades.
  - **Video de apresentacao**: Explorar e Busca e filtros.
- Manter a ordenacao das linhas principais por maior WhatsApp primeiro, considerando os somatorios dos grupos.
- Renderizar os detalhes apenas ao expandir o grupo, em desktop e mobile-first.
- Manter os dados reais do backend, sem criar mock, backfill, seed, migration ou endpoint paralelo.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Alterar o contrato publico persistido da API Admin.
- Alterar a tela Admin global `/trafego` ou o detalhe individual do psicologo.
- Criar package novo ou biblioteca de tabela.

## Criterios de aceite

- [x] A linha **Comunidades** mostra seta de dropdown alinhada a direita e controla a exibicao dos detalhes.
- [x] As subcategorias de Comunidades ficam ocultas inicialmente e aparecem somente ao expandir o grupo.
- [x] A tabela cria uma linha principal **Video de apresentacao** com somatorio de **Explorar** e **Busca e filtros**.
- [x] **Video de apresentacao** mostra seta de dropdown alinhada a direita e exibe **Explorar** e **Busca e filtros** somente ao expandir.
- [x] **Explorar** e **Busca e filtros** deixam de aparecer como linhas principais soltas.
- [x] As linhas principais continuam ordenadas por maior WhatsApp primeiro, considerando os somatorios dos grupos.
- [x] O selo **Principal origem** aparece na linha agregada correta quando um grupo for a maior origem.
- [x] A UI mobile-first mostra os grupos e menus expansivos de forma legivel em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0380-grupos-expansiveis-trafego-whatsapp-admin.md`.
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
- Browser local via Chrome/CDP em `http://localhost:3002/psicologos` - sucesso em desktop 1440px e mobile 390px. A validacao confirmou detalhes recolhidos inicialmente, expansao ao clicar no texto da linha, seta sem fundo/borda e alinhada a direita do numero de WhatsApp, com evidencias em `.tmp/task116-admin-psicologos-desktop.png` e `.tmp/task116-admin-psicologos-mobile.png`.

## Observacoes

- Nao ha alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
