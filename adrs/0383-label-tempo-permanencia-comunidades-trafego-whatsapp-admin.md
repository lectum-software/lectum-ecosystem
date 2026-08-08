# ADR-0383 - Label Tempo de permanencia nas metricas de Comunidades do trafego WhatsApp Admin

## Status

Accepted

## Contexto

As sublinhas de Comunidades da tabela de trafego WhatsApp do Admin exibem metricas reais medias por conteudo. A metrica tecnica `average_visibility` soma segundos de atencao/permanencia em `content_attention_session` e divide pela quantidade de conteudos da categoria. O usuario validou que, para posts e respostas sem video, essa leitura equivale a tempo de permanencia, enquanto `Retenção` continua fazendo sentido apenas para video.

## Decisao

1. Manter o id tecnico `average_visibility` no contrato da API para preservar compatibilidade e semantica interna.
2. Alterar apenas o label de exibicao dessa metrica, nas sublinhas de Comunidades, para `Tempo de permanência`.
3. Nao alterar os cards/matrizes gerais de `Visibilidade` do dashboard, porque eles representam uma dimensao mais ampla e historica de classificacao do funil.
4. Manter `Retenção` somente nas categorias com video.

## Consequencias

- A tabela usa uma nomenclatura mais literal para o usuario administrativo.
- O contrato tecnico e os calculos reais permanecem estaveis.
- A distincao entre `Retenção` de video e tempo de permanencia/atencao por conteudo fica mais clara.
- Nao ha mudanca de banco, migration ou dependencia.

## Task relacionada

- `_product/tasks/TASK-119-label-tempo-permanencia-comunidades-trafego-whatsapp-admin.md`

## Validacoes

- `pnpm --dir backend biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Script API via `node --input-type=module -` para validar labels de `average_visibility` e `average_retention`.
- `pnpm check`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`.
