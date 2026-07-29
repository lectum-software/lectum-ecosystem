# ADR-0345: Simplificação do fluxo de intenção e conversão no Dashboard Admin

## Status

Accepted

## Data

2026-07-29

## Tasks relacionadas

TASK-92

## Contexto

A primeira versão do bloco **Fluxo de intenção e conversão** cumpriu a intenção de cruzar pacientes e psicólogos, mas ficou visualmente pesada: cards de insights, cards laterais e lista textual de caminhos observados criaram redundância e exigiam leitura demais para uma métrica executiva.

O produto pediu um desenho mais simples: quatro categorias de pacientes no lado esquerdo, quatro categorias de psicólogos no lado direito e setas entre todos os cruzamentos, variando espessura conforme a intensidade do fluxo.

## Decisão

- Substituir a composição de insights + lista de caminhos por um diagrama único 4x4.
- Exibir **Frios**, **Curiosos**, **Interessados** e **Qualificados** à esquerda.
- Exibir **Alta Conversão**, **Interesse Não Convertido**, **Tráfego Não Convertido** e **Baixa Conversão** à direita.
- Desenhar uma seta para cada cruzamento paciente → psicólogo.
- Usar espessura e opacidade das setas para indicar intensidade real do cruzamento.
- Preencher cruzamentos ausentes com zero visual discreto, sem criar dados ou redistribuir fluxo.
- Remover os números visuais locais de exemplo do Dashboard para preservar a regra de não usar mocks.
- Manter a categoria **Frios** como nó visual simétrico, mas sem fluxo quando não houver vínculo real paciente-psicólogo.

## Consequências

- O Dashboard fica mais rápido de interpretar: o Admin lê padrões pelo desenho das setas, não por uma tabela/lista.
- A métrica permanece baseada no contrato real `intent_conversion_flow`.
- A categoria **Frios** fica visível no vocabulário do bloco sem violar a regra de não inventar associação com psicólogos.
- O bloco continua Admin-only e não altera ranking público, descoberta ou regras de negócio.
- Não houve package novo, migration, mock, seed, backfill ou endpoint paralelo.

## Validação

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local autenticado em `http://localhost:3002/dashboard`: 16 setas SVG no diagrama 4x4, sem `Números de exemplo`, sem `Caminhos observados`, sem overflow horizontal em 390px e 1366px.
- Capturas de validação: `.tmp/admin-dashboard-intent-flow-simple-mobile.png` e `.tmp/admin-dashboard-intent-flow-simple-desktop.png`.

## Pendências

- Nenhuma pendência externa.
