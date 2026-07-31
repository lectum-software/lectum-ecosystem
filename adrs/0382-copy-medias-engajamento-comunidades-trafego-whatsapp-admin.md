# ADR-0382 - Copy de medias de engajamento nas sublinhas de Comunidades do trafego WhatsApp Admin

## Status

Accepted

## Contexto

A TASK-117 introduziu metricas reais medias por conteudo nas sublinhas de Comunidades da tabela de trafego WhatsApp do Admin. Na leitura visual, repetir "media" em chips especificos poderia sugerir que apenas Retencao/Visibilidade sao medias, enquanto todos os valores dos chips representam medias da categoria. O usuario pediu uma explicacao unica abaixo do titulo de cada sublinha e labels mais enxutos para Retencao e Visibilidade.

## Decisao

1. Manter os ids tecnicos `average_retention` e `average_visibility` no contrato da API, pois eles documentam a semantica para consumidores e testes.
2. Alterar apenas os labels de exibicao para `Retenção` e `Visibilidade`.
3. Explicar a regra de media no nivel da sublinha com a frase `Valores médios de engajamento da categoria.`.
4. Renderizar essa frase somente quando a sublinha possui `platform_metrics`; linhas textuais como Ranking Top Mentores preservam sua descricao original.

## Consequencias

- A tabela fica mais limpa visualmente sem perder clareza operacional.
- A semantica tecnica do contrato permanece compativel com a TASK-117.
- A copy reforca que todos os chips daquele bloco sao medias de engajamento da categoria.
- Nao ha mudanca de calculo, banco, migration ou dependencia.

## Task relacionada

- `_product/tasks/TASK-118-copy-medias-engajamento-comunidades-trafego-whatsapp-admin.md`

## Validacoes

- `pnpm --dir backend biome:fix`
- `pnpm --dir admin biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Script backend `pnpm --dir backend exec tsx` para validar labels novos e ausencia dos antigos.
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`.
- `pnpm check`
