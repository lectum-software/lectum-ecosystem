# ADR-0388 - Reposicionamento da matriz no dashboard Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos tinha duas camadas complementares:

- o bloco **Funil comportamental por conversao**, que sintetiza a sequencia Visibilidade -> Interesse -> Conversao;
- o bloco de sinais agregados, que apos a TASK-123 concentra **Atividade**, **Visibilidade**, **Engajamento**, **Favoritos** e **Conversao** em donuts.

A matriz detalhada de Conversao estava anexada ao funil como **Matriz de origem**, mas o usuario solicitou move-la para o bloco de sinais agregados. A matriz detalha justamente os eixos dos donuts e deve ficar no mesmo contexto visual dos sinais, nao dentro da narrativa sintetica do funil.

## Decisao

1. Remover o expansivo **Matriz de origem** do bloco **Funil comportamental por conversao**.
2. Criar no bloco de sinais agregados o expansivo **Matriz de conversao**, abaixo do carrossel de donuts.
3. Reutilizar o componente e a derivacao existentes das quatro matrizes separadas:
   - Conversao x Visibilidade na Comunidade;
   - Conversao x Video de apresentacao;
   - Conversao x Engajamento recebido;
   - Conversao x Favoritados recebidos.
4. Fazer a matriz reposicionada respeitar o filtro de plano do bloco de sinais agregados.
5. Manter o funil usando a visao agregada para sua sintese comportamental, mas sem carregar a auditoria expandida.
6. Nao alterar contratos, pesos, percentis, persistencia, migrations, query keys ou fontes first-party.

## Consequencias

- A hierarquia visual fica mais clara: donuts e matriz ficam juntos; o funil fica apenas como sintese.
- O administrador passa a ver a matriz no mesmo recorte de plano escolhido para os donuts.
- A matriz continua frontend-only e derivada de dados reais ja existentes, sem endpoint paralelo.
- Nao ha impacto em ranking publico, lista Admin ou detalhe individual do psicologo.

## Task relacionada

- `_product/tasks/TASK-124-reposicionamento-matriz-dashboard-psicologos-admin.md`

## Validacoes

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local Chrome/CDP autenticado em `/psicologos`, desktop e mobile 390px.

## Pendencias

- Nenhuma pendencia externa.
