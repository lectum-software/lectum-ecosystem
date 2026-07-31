# TASK-105 - Seletor global de periodo nas estatisticas do psicologo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-105 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Admin - Psicologos |
| Status | Completed |
| Dependencias | TASK-57, TASK-76, TASK-104 |
| ADR alvo | ADR-0368 |

## Contexto

A aba `/psicologos/[id]?tab=estatisticas` do Admin foi reorganizada na TASK-104 para iniciar pelo
bloco **Conversao, visibilidade, engajamento e atividade**. A tela ainda mantinha seletores de periodo
por bloco, o que permitia comparar secoes em janelas diferentes e aumentava a carga operacional para o
administrador.

Pedido de produto desta execucao: antes do bloco **Conversao, visibilidade, engajamento e atividade**,
adicionar um bloco branco com um seletor de data que seja aplicado a todos os blocos de estatisticas do
psicologo.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- screenshot de contexto enviado na conversa para a rota local do Admin.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao,
a descoberta de ferramenta nao retornou ferramenta Builder/Quick Copy callable no ambiente Codex; a
validacao visual usou a imagem local exportada e a rota local do Admin.

## Objetivo

Exibir um bloco branco de filtro de periodo no topo da aba Estatisticas e fazer com que a janela de
datas escolhida seja a unica fonte de periodo para todos os blocos estatisticos do detalhe do
psicologo.

## Pre-requisitos e bloqueios

- Nao ha requisito externo novo.
- Nao ha package novo.
- Nao ha schema Prisma, migration ou endpoint novo.
- A tela reutiliza o contrato real existente de `GET /api/admin/private/psychologists/:id/statistics`.

## Escopo frontend

- Rota Admin: `admin/src/app/(admin)/psicologos/[id]/client.tsx`.
- Adicionar um `CardShell` antes do bloco principal com o seletor de periodo existente e copy
  "Selecione o periodo de analise.".
- Trocar os filtros independentes por um unico `useStatisticsPeriodFilter` compartilhado.
- Aplicar `statisticsPeriodFilter.periodQuery` aos blocos de negocio, video, origem do trafego, uso da
  plataforma, horarios, comunidades ativas e distribuicao de formato.
- Manter apenas o seletor local de comunidade no bloco **Atividade e engajamento**, combinando-o com o
  periodo global.

## Escopo backend

- Sem alteracao backend.

## Fora do escopo

- Criar endpoint novo.
- Criar banco/migration.
- Instalar package.
- Redesenhar os cards/graficos existentes.
- Alterar regras de calculo das metricas.

## Contrato tecnico detalhado

Frontend esperado:

- Reutilizar `CardShell`, `StatisticsPeriodControls` e os componentes existentes da aba.
- Usar um unico hook de periodo para a aba Estatisticas.
- Manter o filtro de comunidade como dimensao adicional somente para o grafico de Atividade e
  engajamento, sem virar filtro de data independente.
- Mobile-first preservado por grid de uma coluna no mobile e progressao para duas colunas em desktop.
- Nenhum `<img>` cru adicionado.

Packages usados:

- Nenhum package novo.

## Criterios de aceite

- [x] Um bloco branco de periodo aparece antes de **Conversao, visibilidade, engajamento e atividade**.
- [x] O seletor global permite escolher preset, data inicial e data final reutilizando os controles existentes.
- [x] O texto auxiliar do bloco e "Selecione o periodo de analise.".
- [x] Os controles de preset, data inicial e data final ficaram mais compactos no desktop sem perder comportamento mobile-first.
- [x] O resumo textual do periodo no bloco principal usa meses abreviados em PT-BR e separador "a" (ex.: "Todo o periodo · 16 de mai. a 30 de jul."), preservando as datas reais vindas do contrato de estatisticas.
- [x] A query de periodo global e aplicada aos blocos de negocio, video, trafego, uso da plataforma,
      horarios, comunidades ativas e distribuicao de formato.
- [x] O bloco **Atividade e engajamento** manteve apenas o seletor local de comunidade, combinado com o
      periodo global.
- [x] Seletores independentes de periodo foram removidos dos blocos estatisticos para evitar janelas
      divergentes.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi criado.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Builder/Quick Copy foi tentado via descoberta de ferramenta; como nao estava callable, a imagem local
      de `_product/proto` foi usada e a limitacao foi registrada.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0368-seletor-global-periodo-estatisticas-psicologo-admin.md`.
- [x] Commit criado com mensagem convencional.

## Validacao minima

- `pnpm --dir admin exec biome check --write --files-ignore-unknown=true "src/app/(admin)/psicologos/[id]/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` - HTTP 200.

Complemento 2026-07-30 (refino de copy, largura e formato do periodo):

- `pnpm --dir admin exec biome check --write --files-ignore-unknown=true "src/app/(admin)/psicologos/[id]/client.tsx"` - OK.
- `pnpm --dir admin check` - OK.
- `pnpm --dir admin build` - OK.
- `pnpm check` - OK.
- `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` - HTTP 200.

## Notas de execucao

A mudanca permanece frontend-only e reduz chamadas duplicadas ao endpoint de estatisticas: a aba passa
a usar uma leitura global para todos os blocos e uma leitura adicional apenas quando o seletor de
comunidade precisa filtrar a serie de Atividade e engajamento.

Complemento 2026-07-30: o texto auxiliar foi encurtado para "Selecione o periodo de analise.", os controles
de periodo foram reduzidos em largura no desktop e o resumo do periodo no bloco principal passou a usar
formato curto com mes abreviado em PT-BR, sem hardcode de datas.
