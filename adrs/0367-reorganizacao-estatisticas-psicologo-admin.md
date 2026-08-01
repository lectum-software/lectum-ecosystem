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

## Ajuste aceito em 2026-08-01

A narrativa da aba foi refinada sem alterar contratos ou calculos:

- **Origem do trafego** passa a abrir a leitura apos o filtro global de periodo, antes de
  **Conversao**, para deixar a origem dos cliques de WhatsApp visivel antes da leitura de conversao.
- **Analise do video de apresentacao** passa a ficar imediatamente abaixo de **Visibilidade**, pois
  o video e um dos sinais de atencao/visibilidade do perfil.

A decisao continua frontend-only e reaproveita os componentes existentes
`PsychologistTrafficSourcesCard` e `StatisticsVideoCard`. Nao houve endpoint novo, migration,
package, mock, seed ou regra de calculo nova.

Validacao: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`,
`pnpm check` e browser local/headless em desktop 1365px e mobile 390px confirmando a nova ordem sem
overflow horizontal no mobile.

## Ajuste aceito em 2026-08-01 - Origem do trafego expansiva no detalhe

A tabela **Origem do trafego** do detalhe Admin do psicologo passa a compartilhar o mesmo contrato e o mesmo padrao visual da tabela do dashboard Admin de psicologos: linhas principais expansivas para **Comunidades**, **Perfil** e **Video de apresentacao**, cabecalho desktop reduzido para **Fonte** e **WhatsApp** e cards expansivos mobile-first.

Diferenca deliberada em relacao ao dashboard: no detalhe do psicologo, os chips de engajamento/conversao exibem **somatorias do proprio psicologo** no periodo, nao medias por psicologo da plataforma. O backend monta essas somatorias a partir dos eventos first-party reais ja existentes e escopa as atribuicoes ao `psychologist_id` aberto, sem mock, backfill, migration ou endpoint simulado.

Consequencias:

- a leitura de origem de WhatsApp fica consistente entre dashboard e detalhe;
- o detalhe deixa de exibir a coluna antiga **Perfil** como metrica paralela e passa a tratar **Perfil** como origem expansiva;
- a API do detalhe fica alinhada ao DTO `PsychologistsDashboardTrafficSources`, reduzindo duplicidade de contrato;
- a manutencao futura deve preservar a diferenca semantica: dashboard pode mostrar medias agregadas, detalhe mostra somatorias do psicologo selecionado.

Validacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke API real da rota de estatisticas do psicologo e browser local/headless em desktop 1365px/mobile 390px com screenshots em `.tmp/admin-psychologist-traffic-detail-desktop.png` e `.tmp/admin-psychologist-traffic-detail-mobile.png`.

## Ajuste aceito em 2026-08-01 - Chips comparativas por media em Origem do trafego

A tabela **Origem do trafego** do detalhe Admin do psicologo deixa de usar as chips de
engajamento/conversao como leitura de somatoria visual e passa a apresentar medias do psicologo por
base considerada, comparadas com a media global do dashboard Admin no mesmo periodo.

Decisoes:

- manter o backend do detalhe como fonte das somatorias reais e fazer a conversao para media na UI,
  preservando compatibilidade com o contrato ja usado pela tabela expansiva;
- buscar a media global pelo endpoint real do dashboard de psicologos com `period=custom`,
  `from=statistics.period.from` e `to=statistics.period.to`;
- usar tolerancia de 15% para classificar **na media**, reduzindo oscilacao visual por arredondamento
  ou amostra pequena;
- manter cinza para bases com menos de 2 itens considerados, mesmo quando o valor bruto for zero;
- documentar as cores em legenda no cabecalho: verde acima, azul na media, amarelo abaixo, vermelho
  zero e cinza base pequena/sem base comparavel.

Consequencias:

- a tabela passa a cumprir a funcao comparativa solicitada sem criar endpoint novo;
- as somatorias continuam disponiveis para diagnosticos futuros, mas deixam de ser o valor principal
  das chips nesta tabela;
- leituras de **Perfil** e **Video de apresentacao** tendem a ficar cinza quando houver apenas uma
  unidade considerada, evitando superinterpretar base pequena;
- se a comparacao por media se tornar regra compartilhada entre telas, uma task futura pode mover a
  classificacao para um helper/contrato backend dedicado.
