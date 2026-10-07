# ADR-0570 - Navegacao desktop nos carrosseis horizontais

## Status

Aceito.

## Contexto

Scroll horizontal de conteudo nao e facilmente descoberto no desktop. O usuario
pediu setas discretas como a do menu lateral, somente nas direcoes com itens ocultos.

## Decisao

Adicionar HorizontalScrollControls em ui, envolvendo um unico viewport existente.
Mantem semantica, refs, snap e scroll nativo dos consumidores. Mede scrollWidth,
clientWidth e scrollLeft com tolerancia de 1px, clamp para overscroll e nenhuma
seta inicial antes da medicao. ResizeObserver e MutationObserver acompanham o
viewport e filhos; scroll/load agendam uma unica medicao por frame, com cleanup.

Setas somente lg, 24px e chevrons Lucide de 12px, borda/fundo/texto/sombra do menu
lateral. Clique avanca 80% da largura ou uma imagem inteira no carrossel de midia.
Respeitar reduced motion e parar propagacao para nao abrir posts ou enviar forms.
Imagens deixam de circular no inicio/fim; indicadores e swipe continuam existentes.
Publica em usa justify-center-safe para nao tornar o primeiro item inacessivel.

## Consequencias

Um mesmo comportamento cobre recomendacoes, participacoes, populares e anexos sem
duplicar listeners. Nao altera bancos nem integracoes. A grade desktop de populares
permanece uma grade; sem overflow, nao ha setas. Filtros especializados com controles
existentes permanecem inalterados. Testes de geometria, suites e browser real;
build final depende de espaco local. Sem deploy remoto como substituto.
