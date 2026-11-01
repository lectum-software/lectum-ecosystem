# ADR-0669 - Foco e rascunho independentes na navegacao dos reels

Data: 2026-11-01. Status: aceito. TASK-308.

## Decisao

Rascunho local nao e uma operacao pendente. O compositor dos reels informa
ocupacao por foco, seletor/modal de midia, preparacao e envio, mas nao apenas
por texto ou anexo. Desfocar libera a navegacao; o limite ativo por video
desmonta o compositor e descarta seu rascunho ao trocar de video, sem dialogo.
Isso preserva o texto enquanto o usuario permanece no mesmo video, inclusive
apos modal de conversao ou erro de envio, sem prender a navegacao.

Um hook restrito ao compositor de reels desfoca ao toque externo e ao fechamento
do teclado observado pelo VisualViewport, mesmo se iOS mantiver activeElement.
So reconhece fechamento depois de observar teclado aberto; ignora zoom e reseta
na mudanca de orientacao. Seletor de arquivo, upgrade, preparacao e envio ficam
fora desse descarte de foco. Eventos internos nao sao interceptados. Nos botoes
externos, a perda de foco aguarda o click: recolher o rodape no pointerdown
deslocava o alvo no mobile de 320 px antes de o toque terminar. Gestos na
superficie do video continuam desfocando no inicio para liberar a rolagem.

Fechar a folha de comentarios, pelo X, Escape, backdrop ou gesto, desfoca
explicitamente o descendente ativo antes de desmontar. Nao confirma rascunho;
continua impedindo fechamento durante preparacao/envio. A confirmacao dos
compositores fora desse contexto permanece habilitada por padrao.

## Consequencias

Nao altera comentarios publicados nem contratos. Rascunhos dos reels sao
efemeros por escolha do usuario. Rollback apenas de frontend; sem migracao.
QA em Chrome local nao substitui validacao do teclado em iPhone fisico.
