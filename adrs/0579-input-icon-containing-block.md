# ADR-0579 - Icones ancorados somente ao controle de entrada

## Contexto

A lupa dos filtros de psicologos usa top-1/2 no InputController. O mesmo bloco
relativo inclui o slot after (sugestoes) e o contador; seu crescimento desloca
a lupa para fora do input, como na captura mobile enviada pelo usuario.

## Decisao

Limitar o bloco relativo ao Input e seus adornos: lupa e botao de senha. Manter
contador e after no fluxo, abaixo desse bloco, dentro de um div externo. Divs
evitam aninhar o painel de sugestoes em um span. Sem offsets especificos por
viewport, alturas fixas no painel ou nova fundacao de formulario.

## Consequencias e validacao

Correcao compartilhada para os consumidores do InputController, preservando
React Hook Form, estilos, associacao de label, aria-describedby e slot de erro.
Nao altera query, dados, API, debounce, ranking, packages ou env.
Testar estrutura renderizada e geometria no browser local com resultados reais
em 390px e desktop; referencia ativa inventario/proto e captura do usuario.
Builder indisponivel. Sem deploy de backend/admin/video; rollback frontend.

Check/build frontend 0.1.613, 22 testes focais e geometria em browser local
aprovados: delta vertical da lupa 0px com/sem sugestoes em 390/1440px.
Teste usa componentes e resultados reais, sem escrita; limites do harness e da
navegacao integral registrados na TASK-238.
