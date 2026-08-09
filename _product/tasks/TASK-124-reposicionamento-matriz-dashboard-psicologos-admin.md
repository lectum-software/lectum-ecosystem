# TASK-124 - Reposicionar matriz de conversao no dashboard Admin de psicologos

## Status

Completed

## Contexto

No dashboard Admin `/psicologos`, a matriz detalhada estava anexada ao bloco **Funil comportamental por conversao**. O usuario solicitou mover essa matriz para o bloco de sinais agregados dos psicologos, que apos a TASK-123 se chama **Atividade, visibilidade, engajamento, favoritos e conversao dos psicologos**.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando a matriz vinculada ao funil.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Mover o expansivo da matriz detalhada para junto dos donuts de sinais agregados, mantendo o funil apenas como sintese comportamental.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-100: matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
- TASK-101A: centralizacao das celulas da matriz.
- TASK-103: funil comportamental por conversao.
- TASK-123: donut de Atividade no bloco de sinais agregados.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Remover do bloco **Funil comportamental por conversao** o expansivo **Matriz de origem**.
- Inserir no bloco **Atividade, visibilidade, engajamento, favoritos e conversao dos psicologos** o expansivo **Matriz de conversao**, abaixo do carrossel de donuts.
- Reutilizar as quatro leituras ja existentes:
  - Conversao x Visibilidade na Comunidade;
  - Conversao x Video de apresentacao;
  - Conversao x Engajamento recebido;
  - Conversao x Favoritados recebidos.
- Fazer a matriz acompanhar o filtro de plano do proprio bloco (`Todos`, `Assinantes`, `Gratuitos` ou `Cortesia`).
- Atualizar o subtitulo do funil para **leitura comportamental por conversao**, sem comunicar que a matriz esta anexada ao funil.

## Fora do escopo

- Alterar calculos, pesos, percentis, categorias, query keys ou contrato da API.
- Criar matriz Conversao x Atividade.
- Criar endpoint, mock, seed, schema Prisma, migration ou package novo.
- Alterar ranking publico, lista de psicologos ou detalhe individual do psicologo.

## Criterios de aceite

- [x] O bloco **Funil comportamental por conversao** nao exibe mais o expansivo **Matriz de origem**.
- [x] O bloco de sinais agregados dos psicologos exibe o expansivo **Matriz de conversao** abaixo dos donuts.
- [x] A matriz mantem as quatro opcoes de cruzamento separadas contra Conversao.
- [x] A matriz usa os contratos reais ja existentes (`profile_conversion_visibility` e `profile_conversion_engagement_favorites`), sem mock ou endpoint novo.
- [x] O filtro de plano do bloco tambem define a base exibida na matriz.
- [x] A UI segue mobile-first e nao cria overflow horizontal em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0388-reposicionamento-matriz-dashboard-psicologos-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos` validou desktop e mobile 390px apos reiniciar o servidor Admin local na porta 3002 para refletir o HEAD atual. Screenshots locais: `.tmp/matrix-moved-desktop.png` e `.tmp/matrix-moved-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task e frontend-only na aplicacao `admin/`.
- Como nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`, `pnpm --dir backend db:migrate` nao se aplica.
