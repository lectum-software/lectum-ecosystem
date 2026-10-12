# ADR-0611 - Previa social e conectores da arvore

## Status

Aceito.

## Contexto

A previa social era montada dentro do card da resposta. Em alguns dispositivos, o
contexto de empilhamento do card deixava o compositor fixo acima da modal. Respostas
profissionais aninhadas tambem podiam montar a previa com o titulo do post porque a
resposta detalhada nao expunha o texto do comentario pai. Na arvore, recuos distintos
entre raiz e niveis internos separavam visualmente alguns trechos dos conectores.

## Decisao

A modal social e montada em `document.body` por portal e ocupa a camada de modais da
aplicacao. O contrato de resposta ganha `parent_content`, calculado pela relacao
existente, e o frontend o envia explicitamente ao alvo social; o servico de render
continua resolvendo o mesmo comentario diretamente no backend.

Os controles de ramo ficam compactos, cinza e semibold. A linha vertical permanece
ativa enquanto houver controle de ramo e recebe uma curva ate abrir, carregar mais ou
ocultar respostas. O deslocamento horizontal da linha passa a acompanhar a densidade
do nivel atual, com pequena sobreposicao entre segmentos para evitar lacunas de pixel.
O coracao favoritado recebe o mesmo escalonamento do selo verificado no comentario.

## Consequencias

O download volta a ser acessivel sobre o compositor e a arte exibida antes de baixar
corresponde ao MP4. A mudanca de API e aditiva, sem schema, migration, env ou nova
dependencia. Rollback por reversao revisada em `homolog`.
