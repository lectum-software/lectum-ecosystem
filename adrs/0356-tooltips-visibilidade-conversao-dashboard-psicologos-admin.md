# ADR-0356 - Tooltips de Visibilidade e Conversao no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O bloco executivo de psicologos no Admin reune **Visibilidade**, **Engajamento e Favoritos** e **Conversao**. A leitura anterior exibia cards brancos separados para as faixas padrao de Visibilidade e Conversao e repetia tooltips em cada opcao do donut, deixando o painel mais denso do que o necessario para uma decisao operacional.

O produto decidiu que a explicacao metodologica principal deve ficar no nome de cada bloco. As opcoes dos donuts de Visibilidade e Conversao devem funcionar como legenda simples, sem competir com a tooltip conceitual do bloco.

## Decisao

- Remover as tooltips das opcoes dos donuts de **Visibilidade** e **Conversao**.
- Manter tooltips apenas nos nomes dos blocos para explicar o conceito e a faixa padrao do periodo.
- A tooltip de **Visibilidade** explicita tempo real de atencao recebido no video de apresentacao, visita ao perfil e conteudo da comunidade, destacando a faixa padrao em negrito.
- A tooltip de **Conversao** explicita cliques para o WhatsApp recebidos, destacando a faixa padrao em negrito e mantendo o vocabulario de cliques no WhatsApp.
- Remover os cards brancos **Visibilidade padrao do periodo** e **Conversao padrao do periodo** da leitura principal, porque a mesma informacao passa a morar nas tooltips dos titulos.
- Preservar tooltips das demais leituras que ainda dependem de descricao por categoria, sem criar componente global, portal ou dependencia nova.

## Consequencias

- O topo do dashboard fica mais leve e mais proximo da leitura executiva solicitada.
- A faixa padrao continua disponivel sem ocupar espaco visual fixo em cada bloco.
- A legenda de Visibilidade e Conversao fica mais limpa para leitura rapida no desktop e no mobile.
- A mudanca e somente de UI/copy no Admin; nao altera contrato de API, banco, tracking, calculo de metricas, ranking publico ou ordenacao de psicologos.

## Task relacionada

- TASK-96 - Engajamento e Favoritos no dashboard Admin de psicologos.

## Validacoes

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou `_product/tasks/PROTO-INVENTORY.md`, a imagem local exportada correspondente ao dashboard Admin de Psicologos e os screenshots fornecidos pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado validou `/psicologos` em desktop e mobile 390px, confirmando as duas tooltips de bloco, a ausencia de tooltips nas opcoes de Visibilidade/Conversao e a remocao dos cards brancos de faixa padrao.
