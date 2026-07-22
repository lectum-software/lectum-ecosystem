# ADR-0307: Integrar filtros ao bloco Visão geral do dashboard de psicólogos

## Status

Accepted

## Task relacionada

TASK-53

## Contexto

No dashboard Admin de psicólogos, a tela `/psicologos` exibia os filtros de período no card de topo, enquanto o título **Visão geral** ficava fora do bloco branco que continha contadores e gráfico. Em 2026-07-22, o usuário solicitou que a seção **Visão geral** ficasse dentro do mesmo bloco dos contadores/gráfico e que **Período**, **De** e **Até** fossem movidos para a mesma linha desse título, deixando o texto informativo do período abaixo.

O ajuste é apenas de composição visual no Admin. Não altera contrato HTTP, agregações, filtros reais, backend, banco ou dependências.

## Decisão

- Manter o card superior somente com contexto executivo: rótulo **Psicólogos**, título **Dashboard de Psicólogos** e subtítulo.
- Criar um cabeçalho interno no card de contadores/gráfico com:
  - **Visão geral** como título do bloco;
  - texto do período consultado logo abaixo do título;
  - controles **Período**, **De** e **Até** alinhados à direita no desktop.
- Preservar mobile-first: em viewports estreitos, título, texto do período e filtros empilham antes dos contadores; em desktop, ficam na mesma linha.
- Preservar a regra da TASK-76: `Personalizado` continua apenas como estado interno/`option disabled hidden` quando datas manuais são digitadas.

## Consequências

- O agrupamento visual passa a refletir melhor a relação entre período, contadores e gráfico.
- O card de topo fica mais limpo e focado no contexto da página.
- O ajuste não cria nova fonte de dados, mock, pacote, endpoint ou cálculo paralelo.
- A validação visual autenticada continua dependendo de uma sessão Admin real no navegador do operador; o código foi validado com build e smoke local.

## Validação

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke local: `http://localhost:3002/psicologos` retornou 200 após reiniciar o dev server Admin.
- Referência visual: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e screenshot enviado pelo usuário.

## Pendências

- Nenhuma pendência funcional.
- Builder/Quick Copy não estava exposto como ferramenta callable neste ambiente; por isso a referência auditável foi a imagem local e o screenshot do usuário.
