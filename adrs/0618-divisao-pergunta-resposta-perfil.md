# ADR-0618 - Divisao entre pergunta e resposta no perfil

- Status: Accepted
- Data: 2026-10-13
- Task: TASK-256

## Contexto

A pergunta acima de videos-resposta tornou o perfil consistente com texto, mas
o bloco de descricao e a resposta pareciam continuos na captura do usuario.
Favoritar duplicado no card tambem disputava espaco com o nome profissional.
O usuario pediu expressamente para nao alterar o botao de WhatsApp.

## Decisao

Usar o contexto existente profilePublicationMode para omitir somente o Favoritar
da autoria dos cards do perfil. Preservar a acao no topo e em outros contextos.
Pergunta permanece branca. Autoria, texto, midia e acoes da resposta ficam numa
faixa bg-primary-soft/50, sem nova borda, sombra ou arredondamento interno.
Nao acrescentar etiquetas nem duplicar a identidade do profissional.
Aplicar a separacao em texto, video e imagem; Salvos permanece sem alteracao.
Nao tocar nos componentes, estilos, handlers ou posicao do WhatsApp.

Reutilizar ReplyMenuSurface nos menus de autor e visitante. Portal no body, acima
do composer e abaixo dos dialogs de confirmacao. Medir visualViewport e o composer
fixo; inverter abertura ou limitar altura com rolagem. Camada de descarte impede
clique atravessado. Escape, Tab e setas controlam foco; permissoes ficam nos chamadores.

Em texto profissional, mover Salvar/Compartilhar ao menu e preservar WhatsApp.
Com midia, manter as duas acoes visiveis. Compartilhar a regra entre menu,
toolbar e calculo de largura.
Medir a lista com ResizeObserver e reservar a largura da barra mais completa
realmente presente em cada camada. Aplicar profundidade uniforme aos irmaos e seguir a
continuacao antes de mostrar uma camada estreita. Recalcular foco profundo com
router.replace e a mesma profundidade; nunca forcar a arvore estreita para achar o alvo.
Preservar ao menos um nivel para cada continuacao avancar. Em telas extremas ou
zoom, a barra pode rolar horizontalmente como ultima defesa, sem reduzir alvos
nem quebrar linha. A folga cresce para contadores longos. Nao reduzir icones ou
recuos neste lote; a remocao das duas acoes ja permite manter uma camada adicional
nos cenarios de texto testados em larguras mobile de 360/390px.

## Consequencias

Pergunta e resposta ficam agrupadas visualmente sem afetar expansao, navegacao,
midia, acoes ou dados. Testes cobrem isolamento perfil/feed, menu e limite uniforme.
Sem dependencia, migration, API ou configuracao nova. Rollback de frontend.
Conferencia visual autenticada permanece pendente se o navegador nao for acessivel.
