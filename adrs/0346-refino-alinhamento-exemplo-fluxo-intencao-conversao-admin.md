# ADR-0346: Refinamento visual local do fluxo de intencao e conversao no Dashboard Admin

## Status

Accepted

## Data

2026-07-29

## Tasks relacionadas

TASK-93

## Contexto

O diagrama 4x4 da TASK-92 deixou o bloco mais simples, mas a validacao visual em localhost mostrou tres problemas de leitura: a coluna de pacientes estava invertida em relacao a intensidade esperada, as setas nao pareciam sair/entrar exatamente nos blocos laterais e, sem pares reais no periodo, a tela nao permitia avaliar a espessura relativa das linhas.

Ao mesmo tempo, a regra do projeto continua proibindo mocks, seeds, endpoints simulados ou dados fake permanentes para concluir tasks. A necessidade aqui e apenas visual: permitir ao fundador enxergar como a composicao se comporta ate haver dados reais suficientes.

## Decisao

- Ordenar a coluna de pacientes por sinal mais forte para mais fraco: **Qualificados**, **Interessados**, **Curiosos**, **Frios**.
- Manter a coluna de psicologos na ordem operacional atual: **Alta Conversao**, **Interesse Nao Convertido**, **Trafego Nao Convertido**, **Baixa Conversao**.
- Calcular as coordenadas verticais das setas pelo centro de cada linha/categoria e desenhar os caminhos da borda esquerda ate a borda direita do palco SVG.
- Adicionar pequenos marcadores visuais nos blocos laterais como portas de saida/entrada, alinhados aos mesmos centros usados no SVG.
- Permitir uma matriz de exemplo somente no frontend, apenas em `localhost`/`127.0.0.1` e somente quando `intent_conversion_flow` nao retorna pares reais.
- Rotular esse estado como **Exemplo visual local** e deixar claro que os numeros nao representam sinais reais.
- Nao alterar backend, contrato de API, banco, migrations ou packages.

## Consequencias

- O diagrama fica mais intuitivo: o olhar vai de pacientes mais qualificados para menos qualificados e as linhas se conectam visualmente aos blocos.
- A espessura das setas pode ser revisada em ambiente local mesmo quando o banco de desenvolvimento esta vazio para esse recorte.
- Em ambiente com qualquer par real, inclusive localhost, a matriz de exemplo e desativada e o bloco volta a usar exclusivamente dados reais.
- Em producao publica/admin, o bloco continua dependente de `intent_conversion_flow` e nao exibe numeros de exemplo em dominios diferentes de localhost.
- A solucao preserva a regra de nao criar endpoint simulado, seed ou dado fake persistente.

## Validacao

- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Browser local autenticado em `http://localhost:3002/dashboard`: ordem dos pacientes, 16 setas SVG, `data-dashboard-intent-matrix-mode="local-example"`, texto **Exemplo visual local**, trajetos iniciando na borda esquerda e chegando a borda direita do SVG, sem overflow horizontal em 390px e 1366px.
- Capturas de validacao: `.tmp/admin-dashboard-intent-flow-task93-mobile.png` e `.tmp/admin-dashboard-intent-flow-task93-desktop.png`.

## Pendencias

- Nenhuma pendencia externa.
