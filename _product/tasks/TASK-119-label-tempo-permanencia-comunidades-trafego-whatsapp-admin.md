# TASK-119 - Label Tempo de permanencia nas metricas de Comunidades do trafego WhatsApp Admin

## Status

Completed

## Contexto

A TASK-117 passou a exibir metricas reais medias por conteudo nas sublinhas de Comunidades da tabela **Origem do trafego para psicologos** em `/psicologos`. A TASK-118 refinou a copy e manteve o label `Visibilidade` para a metrica tecnica `average_visibility`. Apos alinhar o conceito com o usuario, ficou claro que essa metrica representa tempo medio de permanencia/atencao do conteudo, inclusive para posts e respostas sem video.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psic?logos/Psic?logos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando as sublinhas de Comunidades expandidas em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao esta callable no ambiente via MCP/tooling disponivel; a implementacao usa as referencias locais e o screenshot enviado, registrando esta limitacao.

## Objetivo

Trocar o label exibido nos chips da metrica `average_visibility` de `Visibilidade` para `Tempo de perman?ncia` nas sublinhas de Comunidades, sem alterar calculos, ids tecnicos ou demais cards de Visibilidade do dashboard.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-114: tabela de trafego WhatsApp.
- TASK-115: grupo Comunidades.
- TASK-116: grupos expansivos.
- TASK-117: metricas reais medias de Comunidades.
- TASK-118: copy de medias de engajamento nas sublinhas.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Alterar somente o label de exibicao das metricas `average_visibility` retornadas pelo backend para `Tempo de perman?ncia`.
- Preservar o id tecnico `average_visibility`, o calculo por media de `visibilitySeconds` e a unidade em segundos.
- Validar a renderizacao desktop e mobile ~390px no browser local.

## Fora do escopo

- Alterar calculo das metricas.
- Renomear ids tecnicos do contrato de API.
- Alterar cards/matrizes gerais de Visibilidade do dashboard fora da tabela de trafego WhatsApp.
- Alterar Prisma schema ou migrations.
- Criar mocks, seeds ou backfill.
- Instalar package novo.

## Criterios de aceite

- [x] Os chips `average_visibility` das quatro sublinhas de conteudo de Comunidades aparecem como `Tempo de perman?ncia`.
- [x] O label `Visibilidade` nao aparece mais como chip nessas sublinhas de Comunidades.
- [x] Os ids tecnicos `average_visibility` e os calculos existentes permanecem inalterados.
- [x] O label `Reten??o` continua exclusivo de posts/respostas com video.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0383-label-tempo-permanencia-comunidades-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Script API via `node --input-type=module -` validando `average_visibility` com label `Tempo de perman?ncia`, `Reten??o` apenas em fontes com video e ausencia do label antigo nos chips.
- `pnpm check`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`, com screenshots temporarios em `.tmp/task119-admin-psicologos-desktop.png` e `.tmp/task119-admin-psicologos-mobile.png`.

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- O usuario de validacao `codex-task119-validation@lectum.local` foi removido apos a validacao local.
