# ADR-0574 - Capa e sticky da comunidade na mesma celula

## Status

Aceito.

## Contexto

Um item sticky de altura zero ainda cria uma linha no grid da comunidade.
O gap entre essa linha e a capa gera a faixa vazia observada no PWA. Margem
inferior negativa nao remove o gap porque a linha e limitada a altura zero.

## Decisao

Posicionar os dois headers na primeira linha e coluna do grid existente.
O sticky segue com altura zero, alinhado ao inicio e z-index superior. A capa
define a altura da linha e as regras/feed mantem o gap original. O sticky continua
filho direto do grid, sem wrapper curto que limite sua area de aderencia.

## Consequencias

Sem alteracao global de safe-area, padding, navegacao ou direcao do scroll.
Validar geometria real e sticky apos ultrapassar a capa, alem do teste de markup.
Sem env, pacote, API ou migration. Rollback somente nas classes dos headers.
