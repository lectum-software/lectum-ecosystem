# ADR-0619 - Recolhimento unico por arvore

- Status: Accepted
- Data: 2026-10-13
- Task: TASK-257

## Contexto

Controles de recolhimento em cada ancestral repetiam o mesmo texto no rodape das
conversas profundas. O usuario aprovou uma acao por arvore, nao por post inteiro.

## Decisao

Manter o estado progressivo por ramo, mas renderizar Ocultar respostas somente
na raiz visual (depth 0) quando existem filhos visiveis. A acao fica ao final da
arvore mesmo quando ainda ha Ver mais respostas. Ramos internos exibem somente
abertura ou link de continuacao; ReplyBranchFooter centraliza esse contrato visual.

Recolher define zero filhos visiveis na raiz e desmonta seus descendentes, sem
alterar outras raizes. Guardar o foco descartado nessa raiz e propagar a supressao
da abertura inicial ao reabrir. Acoes manuais dos ramos continuam funcionando.
Um focusReplyId diferente reabilita abertura automatica para a nova navegacao.
O comentario principal da pagina de continuacao segue a mesma regra de raiz.

Apos o commit do DOM, useLayoutEffect retorna foco programatico ao cabecalho da
resposta e reutiliza a compensacao do cabecalho flutuante ja usada no composer.
Rolagem instantanea evita animar por conteudo removido. Nenhum rewrite da URL.
Total do rotulo Ver X respostas permanece baseado em descendants_count existente.

## Consequencias

Menos repeticao visual e uma acao previsivel por conversa. Nao ha mais recolhimento
individual de ramos internos; e o trade-off aprovado. Os caminhos de abertura,
contadores, foco profundo, controle de largura e outras arvores sao preservados.
Sem alteracao de backend, persistencia, contratos ou dependencias.
Cobertura com componentes reais e testes de estado; QA visual depende do navegador.
