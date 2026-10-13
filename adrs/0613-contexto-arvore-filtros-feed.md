# ADR-0613: Controles de ramos focados e filtro ativo visivel

## Status

Accepted

## Task relacionada

TASK-251

## Contexto

ReplyCard removia a acao de ramo quando continha a resposta focada e forcava seus
filhos abertos a cada render. Minhas Publicacoes usa esse foco por link direto.
O carrossel compartilhado mantinha sort/periodo na URL, mas nao revelava o chip
selecionado depois da remontagem ao voltar de um post.

## Decisao

Usar estado de visibilidade local por ramo e identidade do foco. Antes de uma acao
manual, revelar o caminho focado; depois, respeitar ocultar/reabrir ate mudar o foco.
Aplicar as mesmas regras de expandir, mais e ocultar das entradas comuns.

CommunityPostSortChips revela o botao selecionado em layout effect e observa as
dimensoes do viewport, lista e chip. Rolar somente no eixo horizontal, pelo menor
deslocamento necessario, sem scrollIntoView, foco de teclado ou armazenamento novo.
Reutilizar o componente no feed e comunidade; manter intactas as URLs e periodos.

## Consequencias e riscos

Ramos focados podem ser recolhidos intencionalmente. Novo alvo reabre seu caminho.
O carrossel conserva a selecao visivel ao montar e redimensionar, mas nao tenta
memorizar uma posicao manual que deixava o filtro ativo fora da tela.
Sem contrato, banco, env ou dependencia nova. Apenas frontend; rollback por versao
anterior. Checks e limites de QA constam na task. Sem publicacao automatica.
