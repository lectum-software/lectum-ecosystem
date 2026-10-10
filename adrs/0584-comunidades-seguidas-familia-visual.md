# ADR-0584 - Comunidades seguidas na familia visual da Lectum

## Status

Aceito.

## Contexto

A tela de comunidades seguidas ainda reproduzia o prototipo historico `Seguindo.jpg`:
card de metricas, banner de destaque e grade de cards altos. O restante da Lectum
evoluiu para cabecalhos compactos, superficies brancas, tipografia Manrope mais
contida e componentes compartilhados. O banner tambem repetia uma comunidade que
aparecia imediatamente na lista.

## Decisao

Manter `AppPageHeader`, usado por Salvos, e apresentar contagem e novidades como
texto secundario do titulo da secao. Renderizar comunidades seguidas em linhas
compactas, com avatar real, fallback de iniciais, atividade e chevron. Usar o
`CommunityRecommendationsCarousel` do Inicio para recomendacoes, incluindo seus
controles de seguir, responsividade e acessibilidade. Remover os componentes
locais de metricas, destaque e recomendacao duplicada. Centralizar o avatar de
comunidade em `CommunityAvatar`, que preserva a imagem real e usa iniciais quando
a URL estiver ausente ou falhar no carregamento.

## Consequencias

A tela passa a compartilhar tipografia, superficies e interacoes com o produto
atual, reduzindo altura e duplicacao. A ordem, os dados, a paginacao infinita e os
estados de erro/vazio permanecem. Nao ha mudanca de API, dependencia ou persistencia.
Relacionado a TASK-241.
