# ADR-0581 - Rascunho temporario ao editar nome na publicacao

## Status

Aceito.

## Contexto

A orientacao de anonimato passou a oferecer edicao direta do nome do paciente.
Navegar para o perfil desmonta a modal de criacao e perderia o texto ja digitado.
Uma area permanente de rascunhos ampliaria desnecessariamente o produto, o contrato
e a persistencia para resolver uma interrupcao curta e especifica.

## Decisao

Antes de navegar para a edicao do perfil, salvar em `sessionStorage` somente a
comunidade, o titulo e o conteudo do post, vinculados ao usuario e a rota de retorno.
A tela de perfil recebe um `returnTo` interno validado e usa esse destino tanto na
seta de voltar quanto depois de salvar. Ao remontar a modal, o formulario restaura
os campos textuais com `anonymous=false`.

O rascunho expira em 12 horas e e removido quando nao corresponde ao usuario ou a
rota, quando o post e publicado ou quando a composicao e descartada. Midia e o valor
de anonimato nao sao serializados. Nao existe nova pagina de rascunhos.

## Consequencias

O paciente pode ajustar seu nome sem perder o que escreveu e volta pronto para uma
publicacao identificada. Os dados ficam limitados a sessao da aba e nao chegam ao
backend. O fluxo nao altera API, banco, dependencias ou outras aplicacoes. Relacionado
a TASK-241.
