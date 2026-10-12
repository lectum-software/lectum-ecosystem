# ADR-0610 - Abertura progressiva por ramificacao

## Status

Aceito.

## Contexto

Arvores com muitos comentarios, especialmente quando incluem video-respostas, exibiam
todo o conteudo hidratado de uma vez. A hierarquia permanecia correta, mas a conversa
ficava longa e os controles de abrir ou ocultar eram limitados ao comentario raiz.

## Decisao

Cada comentario controla independentemente a visibilidade de suas respostas diretas.
O ramo inicia recolhido, revela ate tres respostas na primeira abertura e mais cinco
por acao seguinte. Um unico controle ocupa o final do ramo: abrir, carregar o proximo
lote ou ocultar, conforme o estado. O recuo continua recursivo em todos os niveis.

Quando um foco por URL precisa alcançar um descendente, o caminho hidratado permanece
aberto para preservar a navegacao. Quando a API atingiu o limite de profundidade, o
controle final continua levando a pagina dedicada da conversa. A identificacao de
respostas aninhadas fica mais compacta, sem reduzir o texto da contribuicao nem mudar
a aparencia dos cards e midias.

## Consequencias

A tela renderiza menos respostas e menos players simultaneamente, reduzindo a poluicao
visual e mantendo a hierarquia compreensivel. A melhoria e de interacao no cliente; os
descendentes dentro do limite atual ainda chegam na resposta da API. Nao ha migration,
env, dependencia nova, alteracao de contrato ou ordem especial de deploy. Rollback por
reversao revisada em `homolog`.
