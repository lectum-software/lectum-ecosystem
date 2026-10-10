# ADR-0582 - Retorno canonico ao compositor apos editar perfil

## Status

Aceito.

## Contexto

A modal de criar post pode ser aberta por estado local, sem alterar a URL da pagina.
Nesse caso, a TASK-241 guardava como retorno a rota do feed. Depois de salvar o nome,
o paciente voltava ao feed com a modal fechada, embora o rascunho estivesse salvo.
A edicao do paciente tambem ainda apresentava a acao de salvar no fim do formulario
e as opcoes do avatar como uma folha fixa distante do botao que as acionava.

## Decisao

Derivar uma rota canonica de criacao para o retorno ao perfil: preservar a propria
rota quando o compositor ja estiver na URL; usar a comunidade atual quando houver;
e usar o compositor do feed como fallback. O rascunho passa a ser vinculado a essa
mesma rota. Depois de salvar o perfil, usar navegacao por substituicao para abrir o
compositor e evitar que o botao voltar retorne novamente a edicao.

Na tela do paciente, reutilizar o rodape sticky do perfil profissional e ancorar o
menu de avatar ao botao de lapis. A copy de anonimato permanece em um unico bloco
compacto com quebra simples. Anonimato e midia continuam fora do rascunho.

## Consequencias

O paciente retorna diretamente ao post identificado, com comunidade, titulo e texto
restaurados, e ao fechar a modal volta para a pagina anterior. As mudancas ficam no
frontend e nao alteram API, banco, dependencias ou outros ambientes. Relacionado a
TASK-242.
