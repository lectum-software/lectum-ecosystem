# ADR-0327: Dashboard Admin enxuto sem blocos analíticos secundários

## Status

Accepted

## Task relacionada

TASK-48

## Contexto

Após o complemento visual de 2026-07-27 do Dashboard Admin, a tela passou a exibir blocos secundários de **Faturamento**, **Acessos por localização**, **Atividade por dispositivo** e a faixa **Métricas indisponíveis ou estimadas**. O usuário solicitou a remoção desses blocos na rota `/dashboard`, mantendo a visão principal, a atividade das comunidades e denúncias pendentes.

Builder/Quick Copy não está exposto como ferramenta MCP neste ambiente. A execução usou `_product/tasks/PROTO-INVENTORY.md`, a referência local `_product/proto/admin/Dashboard.png` e as capturas fornecidas pelo usuário como evidência visual.

## Decisão

Remover somente os blocos visuais secundários do Dashboard Admin:

- ocultar o card/gráfico **Faturamento** da área analítica inferior;
- ocultar o card **Acessos por localização**;
- ocultar o card **Atividade por dispositivo**;
- não renderizar a faixa **Métricas indisponíveis ou estimadas**;
- omitir, nos cards contadores da **Visão geral**, a tag técnica de origem (`visitor_session`, `user.role=...`) e a descrição operacional da métrica;
- manter o contrato `GET /api/admin/private/dashboard/summary` e as agregações backend intactos;
- manter o card resumido de receita/MRR na visão geral, pois ele faz parte dos cards principais e continua com label honesto.

## Consequências

- A tela fica mais enxuta e prioriza os blocos que o usuário quer manter no dashboard.
- Nenhum dado real é removido do backend; futuras telas podem continuar consumindo financeiro, localização, dispositivos e indisponibilidades se necessário.
- O estado vazio passa a considerar apenas métricas visíveis no dashboard enxuto.
- Os contadores ficam orientados a leitura executiva, sem expor detalhes técnicos internos no card.
- Não houve instalação de pacote novo, alteração Prisma ou mudança de contrato de API.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação local/headless em `/dashboard` com admin real transitório, removido ao final da validação:
  - mobile 390px: `.tmp/dashboard-slim-validation/mobile-390.png`;
  - desktop 1440px: `.tmp/dashboard-slim-validation/desktop-1440.png`;
  - revalidação adicional confirmou ausência das tags técnicas e descrições dentro dos contadores.

## Pendências

- Nenhuma decisão externa pendente.
