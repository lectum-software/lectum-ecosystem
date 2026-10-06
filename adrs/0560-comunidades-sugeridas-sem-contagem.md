# ADR-0560 - Comunidades sugeridas sem contagem

Data: 2026-10-06.
Status: Aceito.

## Contexto

O usuario pediu titulo unico, cards sem quantidade de posts e sugestoes ao final
das comunidades. O componente e a integracao final ja existem.

## Decisao

Atualizar o componente compartilhado e remover o titulo alternativo no detalhe
da comunidade. Retirar apenas a apresentacao da contagem; manter posts_count
na ordenacao das recomendacoes. Reduzir a altura fixa em 24px, correspondente
a linha e seu espacamento, preservando o hint de rolagem e o botao Seguir.
Nao duplicar o carrossel existente no fim da lista nem alterar a paginacao.
Por confirmacao explicita do usuario, incluir tambem Oportunidades: o psicologo
pode explorar outras comunidades apos esgotar essa lista. Remover apenas a
exclusao por sort, preservando os bloqueios de busca, erro e carregamento.

## Consequencias

Inicio e comunidades usam a mesma identidade, sem contrato de API novo.
Estados de carregamento, erro, busca e fim da paginacao continuam protegidos.
Sem dados persistentes alterados, dependencia ou migration. Rollback por reversao.
