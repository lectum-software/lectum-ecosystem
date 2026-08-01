# ADR-0398: Cobertura por posts unicos de pacientes no Admin de psicologos

## Status

Accepted

## Task relacionada

TASK-134

## Contexto

O produto precisava de uma leitura simples de Cobertura no dashboard Admin de
Psicologos: a media de posts diferentes de pacientes que cada psicologo responde,
com comparacao para identificar faixas acima e abaixo da media.

## Decisao

- Cobertura e calculada a partir de respostas em posts de pacientes:
  - o autor da resposta precisa ser psicologo analisado no periodo;
  - o post respondido precisa ter autor com papel `paciente`;
  - cada `post_id` conta no maximo uma vez por psicologo, mesmo que ele responda mais de uma vez no mesmo post.
- A media de cobertura e:
  - `total de posts unicos de pacientes respondidos pelos psicologos / total de psicologos do segmento`.
- O dashboard retorna `profile_coverage` no resumo principal e nos segmentos de plano.
- As categorias agregadas sao:
  - acima da media;
  - na media;
  - abaixo da media;
  - sem cobertura.
- A matriz de cruzamento recebe `coverage` como eixo proprio, reutilizando o contrato dinamico existente de Linha/Coluna.
- Nao criar schema, migration, tracking, backfill, seed, mock ou package novo.

## Consequencias

- O Admin passa a ter uma leitura direta de quantos posts de pacientes estao recebendo participacao dos psicologos.
- A metrica evita inflar cobertura por multiplas respostas do mesmo profissional no mesmo post.
- A classificacao e relativa ao periodo/segmento selecionado, portanto pode mudar conforme filtro.
- A decisao nao mede ainda responsabilidade por comunidade nem taxa contra um denominador de posts elegiveis por comunidade; isso fica fora desta task.

## Validacao

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Validacao de API local em `/api/admin/private/psychologists/dashboard?period=all`.
- Validacao browser local em `http://localhost:3002/psicologos`, desktop e mobile 390px.

## Pendencias

- Nenhuma pendencia externa para esta definicao simplificada de Cobertura.
