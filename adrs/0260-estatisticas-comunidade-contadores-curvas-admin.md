# ADR-0260: Contadores e curvas de comunidade no detalhe do psicólogo Admin

## Status

Aceita

## Task relacionada

Ajuste visual e contratual avulso do painel Admin, após TASK-57 e ADR-0258.

## Contexto

A seção **Estatísticas de comunidade** no detalhe administrativo do psicólogo
exibia apenas contadores simples e um gráfico de barras para posts, respostas,
salvamentos e comentários recebidos. O produto definiu que gráficos com
contadores devem seguir o padrão do ADR-0258: contadores clicáveis acima do
gráfico, ícone na cor da curva, estado selecionado sem sombra e borda ativa mais
evidente.

Além disso, a seção precisava incluir métricas reais de **Upvotes**,
**Downvotes** e **Compartilhamentos**, usando os dados persistidos do módulo de
comunidades.

## Decisão

Estender o contrato de estatísticas do psicólogo no Admin para incluir, na série
temporal:

- `upvotes`;
- `downvotes`;
- `shares`.

As métricas são derivadas de dados reais:

- `post_vote.value = 1` em posts e respostas do psicólogo para upvotes;
- `post_vote.value = -1` em posts e respostas do psicólogo para downvotes;
- `post_share` em posts e respostas do psicólogo para compartilhamentos.

No frontend Admin, a seção **Estatísticas de comunidade** passa a reutilizar o
mesmo componente de contadores clicáveis e gráfico de curvas usado em
**Estatísticas de negócio**. Os contadores de comunidade controlam
exibição/ocultação de suas curvas e seguem o padrão visual de ícone acima do
texto, cor alinhada à curva, sem sombra no selecionado e com borda ativa
reforçada.

Após revisão visual, o bloco **Comunidades em que participa** foi movido para
baixo do gráfico. Assim, o card do gráfico ocupa a largura total disponível da
seção e aproveita melhor o espaço horizontal para os contadores e curvas.

## Consequências

- A experiência de leitura e comparação das métricas de comunidade fica
  consistente com os demais gráficos do Admin.
- O gráfico de comunidade ganha mais largura no desktop, e a lista de
  comunidades deixa de competir lateralmente com a área principal de análise.
- A API passa a retornar mais campos seguros na série de estatísticas, sem expor
  dados sensíveis de usuários votantes, compartilhamentos ou identificadores
  técnicos desnecessários.
- A implementação adiciona consultas reais em `post_vote` e `post_share`, sem
  mock, seed artificial ou alteração de schema Prisma.
- Não houve instalação de pacotes nem alteração de migrations.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/test-id?tab=estatisticas`
  retornou `200`.

## Pendências

- Nenhuma.
