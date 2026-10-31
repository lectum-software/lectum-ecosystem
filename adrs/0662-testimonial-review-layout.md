# ADR-0662 - Apresentacao de reviews sem arvore de comentarios

Status: aceito.
Data: 2026-10-31.
Task: TASK-298.
Complemento: TASK-299.

## Contexto

O usuario mudou a direcao visual dos depoimentos apos aprovar a rodada anterior.
A nova referencia apresenta uma lista de reviews com identidade, estrelas,
data e texto. Nota media foi explicitamente excluida.

## Decisao

Reutilizar TestimonialCard como item de review nos quatro consumidores, sem
renomear contratos ou criar nova implementacao paralela. Remover conectores.
Listas usam superficie branca e divisorias, nao cards independentes.
Resposta do profissional fica identificada abaixo do relato, em area cinza
suave sem borda/sombra, recuada ate a coluna de texto do relato e com controles
laterais preservados. Apos comparar variantes, o usuario restaurou o modelo
inicial com recuo e texto interno alinhado ao inicio da identidade/avatar.
Divisorias ficam somente entre reviews. Na modal, identidade do destinatario
aparece apenas ao escrever/editar, nao acima da lista de depoimentos.

Manter Manrope e tokens existentes. O usuario solicitou autores identificados e
confirmou que ainda nao existem depoimentos publicados. Serializers retornam
nome completo e avatar do perfil, sem id, email ou outros dados da conta.
Avatar opcional permite rollout misto; sem foto, manter iniciais e nome completo.
Formulario informa a identificacao publica antes do envio. Sem backfill.
Estrelas pertencem a cada depoimento. Nao incluir media nem distribuicao.
O convite compacto da TASK-297 continua. O estado vazio reutiliza EmptyState,
como Salvos/Favoritos, com ReviewsIcon, sem altura minima extra no perfil.
O formulario de resposta acompanha o recuo do bloco. Regras de dados e
autorizacao, paginacao e foco das modais nao mudam.
Posts/Respostas e Visiveis/Ocultos/Todos usam os mesmos estilos das abas do perfil:
44px, indicador inferior escuro, Manrope semibold e contadores neutros.
Compartilhar estilos, preservando estado, filtros e navegacao de cada pagina.

Auditoria tipografica: herdar Manrope global tambem nos menus/controles, sem
fonte independente. Relato e resposta usam text-sm leading-6 como o feed e
comentarios. Manter a hierarquia de review: autor semibold e identidade compacta
do profissional text-xs font-bold, como comentarios aninhados. EmptyState fornece
o titulo text-base semibold da familia de estados vazios.

Na TASK-299, a identificacao principal do destinatario ao escrever/editar passa
de semibold (600) para font-black (900), igual ao nome no feed, por aprovacao
explicita. Cargo/data e identificacao compacta das respostas nao mudam.

Meus Depoimentos do paciente reutiliza a mesma lista e TestimonialCard, incluindo
recuo e fundo cinza da resposta. Preserva a identificacao do destinatario por
relato e as acoes laterais de editar/excluir; o vazio passa a usar EmptyState,
assim como o perfil. Nao adiciona filtros de visibilidade exclusivos do psicologo.
Por solicitacao explicita, o formulario deixa de exibir o aviso de nome/foto;
a autoria identificada permanece inalterada.

## Consequencias

Perfil, modal e gestao seguem o mesmo padrao. Esta decisao substitui a parte
visual de arvore da ADR-0660/0661, sem desfazer outros ajustes da TASK-297.
Contrato aditivo, sem migration ou dependencia nova. Preservar exclusao de autores
inativos/excluidos e visibilidade de depoimentos; anonimato de posts nao muda.
