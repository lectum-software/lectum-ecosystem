# ADR-0360 - Matrizes de Conversao x Engajamentos/Favoritos e Visibilidade no Admin

## Status

Accepted

## Contexto

O dashboard Admin de psicologos passou a tratar o funil executivo como:
**Visibilidade** -> **Engajamento e Favoritos** -> **Conversao**. O comparativo existente
**Conversao x Engajamento** ainda tinha apenas quatro colunas de engajamento recebido e cards
laterais de taxa de alta conversao, o que nao respondia a pergunta operacional de onde existe mais
fluxo ate WhatsApp entre as 16 combinacoes de Engajamento/Favoritos e as 16 combinacoes de
Visibilidade Comunidade/Video.

## Decisao

- Adicionar ao contrato real do dashboard dois resultados novos por segmento de plano e no agregado:
  - `profile_conversion_engagement_favorites`: 4 linhas de Conversao x 16 colunas de
    Engajamento/Favoritos.
  - `profile_conversion_visibility`: 4 linhas de Conversao x 16 colunas de Visibilidade.
- Manter `profile_conversion_engagement` legado por compatibilidade, mas a tela passa a renderizar
  o novo seletor no titulo do bloco.
- Remover os cards laterais de comparacao agregada para reduzir ruido visual e deixar a matriz ocupar
  toda a largura do card.
- Usar as mesmas fontes reais e benchmarks ja definidos para Conversao, Engajamento/Favoritos e
  Visibilidade; nenhum novo tracking, ranking, mock, seed, schema Prisma ou package foi criado.
- Para manter exatamente 16 colunas, perfis em adaptacao sao projetados nos mesmos eixos analiticos
  das matrizes usando sinais reais do periodo. Os donuts isolados continuam responsaveis por mostrar
  **Dados Insuficientes** quando a comparacao isolada ainda nao deve ser lida como benchmark.
- Renomear apenas o label de `no_video` para **Vídeo sem view**, preservando o id tecnico e a
  semantica de 0 tempo assistido no video de apresentacao no periodo selecionado.

## Consequencias

- O Admin passa a comparar Conversao contra Engajamento/Favoritos ou Visibilidade sem trocar de
  bloco, preservando a ideia de funil unico.
- A matriz com 16 colunas exige rolagem horizontal controlada em desktop e grade mobile empilhada;
  isso evita cards gigantes e preserva os tres donuts do funil no topo.
- As celulas da nova matriz nao adicionam filtro composto na lista Admin nesta task; o foco e leitura
  agregada. Drill-down dos 64 cruzamentos fica como melhoria futura se necessario.
- A decisao nao altera algoritmo de ranqueamento publico, punicao de psicologos ou criterios dos
  donuts existentes.

## Task relacionada

- TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos.
- TASK-101 - Label Video sem view na matriz Conversao x Visibilidade do Admin.

## Validacoes

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md` e o screenshot fornecido pelo usuario.
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local autenticado em `/psicologos` validou a matriz padrao, a alternancia para
  **Conversao x Visibilidade**, a ausencia dos contadores laterais e a manutencao das 16 colunas por
  matriz. Screenshot local: `.tmp/task100-conversion-matrices.png`.
- Em TASK-101, API/browser locais validaram o label **Vídeo sem view** para a coluna `no_video`.
