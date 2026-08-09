# ADR-0273: Cor unica para identidade visual de comunidades

## Status

Accepted - 2026-07-15

## Task relacionada

TASK-72 (ajuste complementar solicitado durante a trilha Admin/Comunidades)

## Contexto

A edicao administrativa de comunidades expunha cinco campos independentes de cor: principal, escura, suave, texto e gradiente. Isso dava liberdade operacional, mas aumentava a chance de combinacoes incoerentes e deixava a configuracao mais complexa do que o necessario para a V1.

O pedido de produto foi simplificar a configuracao para uma unica cor, aproveitando a cor principal associada ao avatar e usando uma versao mais suave no header publico da comunidade.

Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente. A referencia visual usada foi a captura enviada pelo usuario, `_product/proto/Dentro da Comunidade.jpg` e `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`.

## Decisao

- O Admin passa a expor somente `visual_primary_color` como campo editavel, rotulado como `Cor da comunidade`.
- As telas Admin de criacao e edicao mostram uma previa do header suave derivado automaticamente dessa cor.
- O backend continua mantendo os campos existentes `visual_primary_dark_color`, `visual_soft_color`, `visual_text_color` e `visual_gradient_color` por compatibilidade de schema/contrato, mas deriva seus valores a partir de `visual_primary_color` no create/update administrativo.
- A tela publica de comunidade deixa de usar overrides antigos dos tons derivados e sempre calcula o header a partir da cor principal ou, quando ausente, da cor extraida do avatar/fallback.
- Nao remover colunas Prisma nesta etapa para evitar migration destrutiva e quebra de contratos ja consumidos por frontend/admin/backend.

## Consequencias

- A operacao configura uma unica cor, reduzindo erro visual e retrabalho.
- Headers de comunidade ficam mais consistentes: a cor principal continua forte no avatar, enquanto o header usa tons claros da mesma cor.
- Registros existentes nao precisam de backfill imediato; a UI publica ja ignora tons derivados antigos, e novos salvamentos administrativos passam a recalcular os campos derivados.
- Os campos derivados permanecem retornando em APIs por compatibilidade ate uma task futura decidir remover ou migrar o contrato.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=dados`, `GET http://localhost:3002/comunidades/nova` e `GET http://localhost:3000/community/ansiedade-em-equilibrio` retornaram 200.

## Pendencias

- Nenhuma decisao externa pendente.
