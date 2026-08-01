# TASK-133 - Tags de Perfil na tabela comportamental Admin

## Status

Completed

## Contexto

Na tabela comportamental por Conversao do dashboard Admin de Psicologos em `/psicologos`, a coluna **Perfil** ainda exibia a tag de aba predominante e nao mostrava todos os sinais de consumo pedidos pelo produto. O usuario pediu que a coluna passasse a explicitar permanencia, aberturas das abas Avaliacoes e Conteudo, views do video e retencao do video, removendo a tag de aba predominante.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como fallback local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Ajustar a coluna **Perfil** da tabela comportamental para que:

- adicione as tags `Permanencia`, `Aba Avaliacoes`, `Aba Conteudo`, `Views video` e `Retencao video`;
- remova a tag visivel `Aba predominante`;
- mantenha `Cliques WhatsApp` como primeira tag, em negrito, com a media por psicologo da faixa;
- preserve a regra de cores por `tone` definida na TASK-132.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-103: funil comportamental por conversao.
- TASK-126: tags na tabela comportamental.
- TASK-128: largura/copy da tabela.
- TASK-132: tags medias, destaque WhatsApp e cores por desempenho.

Todas as dependencias acima estao concluidas.

## Escopo executado

### Backend

- Adicionar metricas medias por psicologo para aberturas da aba Avaliacoes e da aba Conteudo dentro do perfil.
- Adicionar metricas de Perfil para views medias do video por psicologo e retencao media do video de apresentacao.
- Garantir que `Permanencia` tenha valor de exibicao `0s` quando nao houver duracao real, preservando `tone=zero`.
- Manter a metrica tecnica de aba predominante no payload para auditoria, mas fora do conjunto curado renderizado na tabela.

### Admin frontend

- Atualizar a prioridade de tags da coluna **Perfil** para incluir os novos sinais e remover `profile_dominant_tab`.
- Manter a renderizacao mobile-first existente, as cores por `tone` e o destaque de `Cliques WhatsApp`.

## Fora do escopo

- Alterar banco, Prisma schema ou migrations.
- Criar novos trackings, seeds, mocks, backfills ou endpoints simulados.
- Alterar os calculos de conversao, ranking publico ou origem de WhatsApp.
- Instalar package novo.
- Alterar as colunas Video, Comunidade ou Tela de favoritos alem de preservar comportamento existente.

## Criterios de aceite

- [x] A coluna **Perfil** exibe `Cliques WhatsApp` como primeira tag e em negrito.
- [x] A coluna **Perfil** exibe as tags `Permanencia`, `Aba Avaliacoes`, `Aba Conteudo`, `Views video` e `Retencao video`.
- [x] A tag `Aba predominante` nao aparece mais na coluna **Perfil**.
- [x] As novas tags resumem medias por psicologo ou retencao media, sem somatoria visivel como indicador principal.
- [x] As cores continuam vindo de `tone`: azul para padrao, verde para acima, amarelo para abaixo e vermelho para zero.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0397-tags-perfil-tabela-comportamental-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos`.

## Observacoes

- A mudanca e de contrato agregado/API e composicao visual; nao altera persistencia.
- A aba tecnica `psychologist_profile_publications_tab_open` e apresentada como **Aba Conteudo** para alinhar a copy solicitada pelo produto.
