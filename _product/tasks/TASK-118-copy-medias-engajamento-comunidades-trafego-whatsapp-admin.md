# TASK-118 - Copy de medias de engajamento nas sublinhas de Comunidades do trafego WhatsApp Admin

## Status

Completed

## Contexto

A TASK-117 passou a exibir, nas sublinhas de Comunidades da tabela **Origem do trafego para psicologos** em `/psicologos`, metricas reais calculadas como medias por conteudo da categoria. Apos validar a leitura, o usuario pediu para evitar repetir o termo "medio" em cada chip, explicando a regra uma vez abaixo dos titulos **Posts com video**, **Posts sem video**, **Respostas com video** e **Respostas sem video**. O usuario tambem pediu remover "media" dos chips **Retencao media** e **Visibilidade media**.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando Comunidades expandida em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao esta callable no ambiente via MCP/tooling disponivel; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Refinar a copy das metricas de Comunidades para deixar claro que os chips representam medias sem poluir cada label:

- adicionar abaixo de cada titulo de detalhe com metricas a frase: `Valores médios de engajamento da categoria.`;
- trocar o chip `Retenção média` para `Retenção`;
- trocar o chip `Visibilidade média` para `Visibilidade`;
- preservar os valores reais, calculos e estrutura expansiva existentes.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-114: tabela de trafego WhatsApp.
- TASK-115: grupo Comunidades.
- TASK-116: grupos expansivos.
- TASK-117: metricas reais medias de Comunidades.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Alterar os labels retornados pelo backend para `Retenção` e `Visibilidade`, mantendo os ids tecnicos `average_retention` e `average_visibility`.
- Adicionar uma descricao curta nas sublinhas com `platform_metrics` para explicar que os valores sao medias de engajamento da categoria.
- Validar a renderizacao desktop e mobile ~390px no browser local.

## Fora do escopo

- Alterar calculo das metricas.
- Alterar Prisma schema ou migrations.
- Criar mocks, seeds ou backfill.
- Alterar Ranking Top Mentores, Video de apresentacao ou demais linhas sem `platform_metrics`.
- Instalar package novo.

## Criterios de aceite

- [x] As quatro sublinhas de conteudo de Comunidades exibem a frase `Valores médios de engajamento da categoria.` abaixo do titulo.
- [x] O chip `Retenção média` passa a aparecer como `Retenção`.
- [x] O chip `Visibilidade média` passa a aparecer como `Visibilidade`.
- [x] Os termos `Retenção média`, `Visibilidade média` e `Tempo total assistido` nao aparecem mais nessas sublinhas.
- [x] Valores reais e calculos de media da TASK-117 permanecem inalterados.
- [x] Ranking Top Mentores preserva sua descricao textual.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0382-copy-medias-engajamento-comunidades-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend biome:fix`
- `pnpm --dir admin biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Script backend `pnpm --dir backend exec tsx` validando labels `Retenção`/`Visibilidade` e ausencia dos labels antigos.
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`, com screenshots temporarios em `.tmp/task118-admin-psicologos-desktop.png` e `.tmp/task118-admin-psicologos-mobile.png`.
- `pnpm check`

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- O usuario de validacao `codex-task118-validation@lectum.local` foi removido apos a validacao local.
