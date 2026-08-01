# TASK-138 - Range de posição do vídeo na tabela comportamental Admin

## Status

Completed

## Contexto

A tabela **Analise comportamental por conversao** do dashboard Admin de Psicologos em
`/psicologos` exibe, na coluna **Video de apresentacao**, uma tag de posicao media do video na
listagem publica. O produto pediu que essa leitura passe a responder diretamente em qual range se
encontram os videos dos psicologos de cada faixa de conversao, mantendo o nome da tag como
`Posição`.

Ranges definidos pelo produto:

- `Top 10`: posicoes 1 a 10;
- `Top 30`: posicoes 11 a 30;
- `Top 50`: posicoes 31 a 50;
- `50+`: posicoes acima de 50 ou video sem posicao confiavel na lista publica ranqueada.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como fallback local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela em
  `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta
execucao, o Builder CLI respondeu `Not Authenticated to Builder.io` e nao havia ferramenta
Builder/Quick Copy callable no cliente; a implementacao usa imagem local e screenshot do usuario,
registrando esta limitacao.

## Objetivo

Trocar a tag visual `Posição média: Xª` da coluna **Video de apresentacao** por uma leitura por
range predominante, preservando o label visivel `Posição`, por exemplo:

```txt
Posição: Top 10
```

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-103: funil comportamental por conversao.
- TASK-125: tabela comportamental por conversao.
- TASK-126: tags na tabela comportamental por conversao.
- TASK-132: tags medias e cores na tabela comportamental.
- TASK-136: ajustes finais da tabela comportamental Admin.

Todas as dependencias acima estao concluidas.

## Escopo

### Backend

- Calcular, para cada faixa de conversao, a faixa predominante da posicao dos profissionais com
  video publicado.
- Manter a metrica tecnica existente `presentation_video_average_ranking_position` com o valor
  numerico da media para compatibilidade, mas adicionar `display_value` com o range predominante e
  label visivel `Posição`.
- Classificar videos sem posicao confiavel como `50+`.
- Em caso de empate entre ranges, escolher a pior faixa para evitar superestimar posicionamento.

### Admin frontend

- Sem alteracao estrutural de componente: a tabela continua usando o `display_value` retornado pelo
  backend para renderizar a tag.

## Fora do escopo

- Alterar banco, Prisma schema ou migrations.
- Criar novos trackings, seeds, mocks, backfills ou endpoints simulados.
- Alterar origem, persistencia, eventos ou endpoint das metricas.
- Instalar package novo.
- Remover a media tecnica do payload.

## Criterios de aceite

- [x] A tag visivel da coluna **Video de apresentacao** aparece como `Posição: Top 10`, `Posição: Top 30`, `Posição: Top 50` ou `Posição: 50+`.
- [x] A tag nao aparece mais como `Posição média: Xª` na tabela comportamental.
- [x] A faixa e calculada com base nos profissionais com video publicado da propria categoria de conversao.
- [x] Videos sem posicao confiavel na lista publica ranqueada entram em `50+`.
- [x] Em empate entre faixas, a pior faixa e selecionada para evitar superestimar o posicionamento.
- [x] O payload preserva `presentation_video_average_ranking_position.value` como media numerica quando houver posicoes reais.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable/autenticado; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0402-range-posicao-video-tabela-comportamental-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `npx "@builder.io/dev-tools@latest" auth status` (retornou `Not Authenticated to Builder.io`; usado fallback local).
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos?period=all` via Chrome/CDP:
  - desktop `1440x1000`, validando tags `Posição: Top 10` e ausencia de `Posição média:`;
  - mobile `390x900`, validando as mesmas tags e ausencia de overflow horizontal.

## Observacoes

- A mudanca e de leitura operacional e compatibilidade de contrato: o numero medio continua no
  campo tecnico `value`, enquanto a tag visual passa a usar `display_value`.
- O admin temporario `codex-task138-range-20260801@lectum.local`, criado via bootstrap oficial para
  validacao local autenticada, foi removido apos a validacao junto aos tokens.
