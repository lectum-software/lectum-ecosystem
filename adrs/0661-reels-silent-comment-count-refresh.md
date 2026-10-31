# ADR-0661 - Revalidacao silenciosa apos comentario nos reels

Status: aceito.
Data: 2026-10-30.
Task: TASK-297.

## Contexto

O envio pode persistir com sucesso e a consulta posterior de contagem falhar.
O composer mostrava um aviso e uma acao de atualizar que ocupavam a base do
video. O usuario solicitou remover ambos.

## Decisao

Remover o estado e a UI exclusivos desse aviso. Manter onSubmitted apos o
envio, com rejeicao tratada silenciosamente e separada da publicacao. Nao
ocultar erros reais de envio ou carregamento, nem alterar o mecanismo de
revalidacao existente no viewer.

## Consequencias

O campo nao cresce por falha de contagem e um comentario confirmado nao pode
ser reenviado por esse motivo. A contagem pode continuar antiga ate a proxima
revalidacao bem-sucedida. Sem nova dependencia, migration ou configuracao.
Escopo somente frontend; rollback por versao anterior do frontend.

## Refinamentos aprovados na mesma rodada

ReviewsIcon passa a compor MessageCircle e Star do Lucide existente, com
estrela cheia em currentColor. Mantem o contrato SVG, dimensoes e cores dos
consumidores, sem novo pacote ou desenho de paths proprietarios. A estrela
interna tem dimensoes explicitas para nao herdar tamanhos de botoes externos.
As acoes de editar/excluir resposta ficam no header da resposta, ao lado da
identidade profissional, mantendo a arvore e os handlers de edicao/exclusao.

Manter Manrope e os papeis tipograficos existentes do feed/comentarios. Como o
reset global font:inherit prevalece sobre utilitarios de botoes, aplicar pesos
e tamanhos diretamente aos rotulos internos nos controles alterados. Nao mudar
o reset global. CTA Fale com usa semibold 600. Contadores do perfil usam tokens
neutros existentes, sem alterar quantidade ou destaque de aba.

O convite de perfil tem fundo azul com 32px de altura visual em pseudo-elemento
e area interativa de 44px, preservando acessibilidade. Estado vazio e um bloco
branco com convite contextual; a mesma acao sai do cabecalho nesse estado.
Reutilizar TestimonialInvitation preserva login e elegibilidade existentes.
Loading/erro nao produzem convite de primeiro relato; readOnly nao tem acao.
