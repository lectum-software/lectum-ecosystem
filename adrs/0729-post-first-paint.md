# ADR-0729 - Texto inicial estavel no post

Status: Aceita
Data: 2026-11-24

## Contexto

InlineExpandableText renderizava todo o texto antes de medir e truncar no cliente.
O relatorio aponta o paragrafo como LCP e deslocamento da discussao. Avatares do
post ignoravam o otimizador apesar de ja declararem sizes.

## Decisao

Aplicar line clamp ao texto recolhido desde SSR e manter medicao para o botao
inline existente. Calcular altura de linha uma vez por medicao, nao por tentativa.
Usar o otimizador nos avatares HTTPS, preservando fallback HTTP local e sizes.
Nao modificar cores ou dimensoes finais. Preservar controles de expansao.

## Consequencias

O componente compartilhado tambem evita expansao transitoria no feed e respostas.
Validar textos curtos/longos e expansao. Ganho PageSpeed depende de publicacao e
nova medicao; contraste nao sera corrigido por alteracoes visuais nao aprovadas.
