# ADR-0367: Reorganizacao incremental da aba Estatisticas do psicologo no Admin

## Status

Accepted

## Task relacionada

TASK-104

## Contexto

A aba Estatisticas do detalhe administrativo do psicologo ja possuia blocos funcionais e visualmente
aprovados. O risco do pedido era redesenhar muitos blocos ao mesmo tempo e desconfigurar partes que
ja estavam boas, especialmente video de apresentacao, origem do trafego, uso da plataforma, posts por
formato e horarios de maior atividade.

Tambem havia uma expectativa de novos eixos de leitura: Conversao, Visibilidade, Engajamento e
Atividade. Parte desses eixos ja podia ser lida a partir da serie real retornada pelo endpoint de
estatisticas; entretanto, tempo real de visibilidade em perfil/conteudos ainda nao esta consolidado
como contrato deste bloco.

## Decisao

Adotar uma mudanca incremental e frontend-only:

- preservar os componentes existentes e alterar somente sua ordem na aba;
- manter o layout de cards + grafico para o bloco principal;
- trocar as opcoes principais para Cliques no WhatsApp, Visibilidade, Engajamento (score) e
  Atividade (score), com valores lidos ou derivados da serie real existente;
- renomear e reordenar as opcoes de Atividade e Engajamento sem mudar o endpoint;
- nao criar mock, endpoint, migration, package ou estrutura paralela.

Os scores derivados sao leitura operacional interna do Admin, nao ranking publico nem nova regra de
produto exposta para pacientes/psicologos. A opcao Visibilidade nesta entrega representa sinais reais
de perfil e busca; a versao explicitamente baseada em tempo deve aguardar contrato de dados proprio.

## Consequencias

- Reduz risco de regressao visual e funcional.
- Permite revisar a nova narrativa da tela antes de investir em backend novo.
- Mantem os blocos existentes reaproveitados como fonte de estabilidade.
- A leitura de Visibilidade ainda nao e uma metrica de tempo; isso fica como follow-up explicito.
- Scores derivados precisam ser revisitados se o produto decidir padronizar pesos em contrato
  backend/API.

## Validacao

- `pnpm --dir admin biome:fix`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Rota local `GET /psicologos/cmrgrztri7000tn0uh1q4n8xf?tab=estatisticas` respondeu HTTP 200 no dev
  server Admin temporario.
- Builder/Quick Copy nao estava callable no ambiente; foi usada a imagem local
  `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- Chrome headless local nao produziu evidencia visual autenticada da aba por falta de sessao admin e
  limitacao de persistencia de screenshot.

## Pendencias

- Criar task futura para contrato de **Visibilidade (tempo)** caso o produto queira medir tempo no
  perfil, tempo no video e tempo em conteudos de comunidade no mesmo bloco principal.

## Ajuste aceito em 2026-07-30

O bloco principal da aba Estatisticas do psicologo no Admin foi simplificado visualmente sem novo
backend: o titulo exibido passa a ser apenas **Conversao**, a linha de apoio mostra o periodo
selecionado (`label · from - to`) e a faixa textual de diagnostico de conversao foi removida.

Mantemos o badge de qualidade individual no cabecalho e adicionamos **Avaliacoes** como quinto
contador, logo apos **Atividade**, usando o campo real `reviews` da serie ja retornada pelo endpoint
de estatisticas. A decisao continua frontend-only, sem mock, migration, package ou contrato HTTP
novo.
