# ADR-0355 - Engajamento e Favoritos no dashboard Admin de psicólogos

## Status

Accepted

## Contexto

O Admin precisa analisar o funil dos psicólogos em três camadas: Visibilidade
(`vídeo de apresentação + perfil + comunidade`), Engajamento e Favoritos, e Conversão no WhatsApp.

Apesar de o termo Engajamento remeter à comunidade, favoritar é um sinal forte de intenção do
paciente e pode acontecer em superfícies diferentes do mesmo perfil. Separar o bloco em dois
caminhos prejudicaria a leitura sequencial do funil; misturar favoritos em um único score também
apagaria a diferença entre relacionamento comunitário e intenção mais próxima de conversão.

## Decisão

- Criar um único contrato agregado `profile_engagement_favorites` no dashboard Admin de psicólogos.
- Classificar cada psicólogo em uma combinação entre:
  - **Alto Engajamento**, **Engajamento Padrão**, **Baixo Engajamento**, **Sem Engajamento**;
  - **Muito favoritado**, **Favoritado padrão**, **Pouco favoritado**, **Sem favoritos**.
- Manter **Dados Insuficientes** para psicólogos com menos de 30 dias desde o cadastro até o fim do
  período analisado.
- Favoritos usam benchmark por P25/P75 dos não-zero elegíveis, como as leituras agregadas de
  Visibilidade e Conversão.
- Relacionamento comunitário usa score ponderado antes do benchmark:
  - comentário/resposta recebida: peso `5`;
  - compartilhamento recebido: peso `3`;
  - salvamento recebido: peso `2`;
  - voto positivo recebido: peso `1`.
- O novo bloco usa ações recebidas de pacientes. Seguidores não entram no cálculo porque não existe
  ação de seguir ativa para esta leitura de produto.
- A origem visual do favorito não é separada; `psychologist_favorite` representa o sinal agregado
  recebido no vídeo de apresentação e/ou no perfil.
- O donut mostra as maiores combinações por quantidade, agrega o restante em **Outras combinações**
  e permite expandir para auditar todas as categorias.
- A métrica é apenas analítica para o Admin e não altera ranking público, ordenação, recomendação ou
  punição de psicólogos.

## Consequências

- O Admin consegue ver o volume de psicólogos em todas as 16 combinações sem poluir a leitura
  executiva inicial.
- O produto preserva o funil único: Visibilidade → Engajamento e Favoritos → Conversão.
- A futura matriz com Conversão poderá cruzar a nova dimensão composta sem precisar recalcular a
  origem do favorito.
- Psicólogos novos podem concentrar sinais reais em **Dados Insuficientes** até saírem da adaptação,
  evitando comparação injusta contra a plataforma.
- A comparação é observacional; ela ajuda a entender correlação com WhatsApp, mas não prova
  causalidade.

## Task relacionada

- TASK-96 - Engajamento e Favoritos no dashboard Admin de psicólogos.

## Validações

- Builder/Quick Copy não esteve disponível como ferramenta callable; a execução usou
  `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`
  e os screenshots fornecidos pelo usuário.
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto do helper de cálculo confirmou pesos, P25/P75 e período de adaptação.
- HTTP local do Admin retornou `200` em `/psicologos`.
