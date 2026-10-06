# ADR-0558 - Chevron junto ao coracao

## Status

Aceita em 2026-10-06. TASK-218.

## Contexto

O botao de favoritar ja anima de 66px para 24px, mas o slot no cabecalho
permanece com 66px. Isso deixa um vao entre o coracao e o chevron do tema.

## Decisao

Estilizar o slot somente quando contiver favorite-toggle e for imediatamente
seguido de data-original-post-community. O seletor :has le aria-pressed do
botao real; nao duplicar estado de favoritos em pais nem alterar mutations.

Quando ativo, slot usa 24px e transicao de 260ms, igual ao botao. Ajustar a
reserva maxima do tema de 124px para 82px (diferenca de 42px) com a mesma
transicao, preservando espaco para o nome e selo durante a animacao.
Desativar ambas as transicoes quando prefers-reduced-motion estiver ativo.

## Consequencias

Feed, detalhe, resumo de post original e card compartilhado recebem a correcao
sem duplicar componentes. Respostas nao satisfazem o seletor, mantendo layout
anterior. Testar estados iniciais e transicoes nos dois sentidos em 320/390px
e desktop, inclusive nomes longos e movimento reduzido.
