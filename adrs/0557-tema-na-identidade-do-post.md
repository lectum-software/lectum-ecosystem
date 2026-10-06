# ADR-0557 - Tema na identidade do post original

## Status

Aceita em 2026-10-06. TASK-217.

## Contexto

A faixa Postado em repete contexto e ocupa espaco antes do autor. O usuario
aprovou autor, chevron e tema numa linha, com nome truncavel e selo preservado.
Esse tratamento nao se aplica a respostas ou comentarios profissionais.

## Decisao

Reutilizar category, a mesma origem do tema exibido nos metadados de mentores;
sem abreviar por heuristica o nome completo. Fallback para name quando ausente.
Extrair somente o link de contexto compartilhado OriginalPostCommunityLink.
O link usa chevron Lucide, tokens existentes, destino original, nome acessivel
completo e title. Sua largura e limitada para temas/fallbacks extensos.

O nome do autor tem piso de 4ch e reticencias; o tema tambem pode encolher em
telas estreitas para nao apagar o nome. Selo e reserva do Favoritar
continuam sem encolher. Favoritar permanece junto ao selo. Abaixo permanecem
os metadados/data. Remover faixa e divisor antigos apenas onde a comunidade
passa para a identidade. Na comunidade que ja suprime esse contexto, manter
a opcao showCommunityHeader. No resumo Post original de uma thread, mover
o contexto para o autor, preservando o rotulo que distingue o resumo.

O card compartilhado exige post original, autor visivel e contexto habilitado;
contribuicoes de respostas nao recebem chevron. Formatar Membro Anonimo #0000
como Anonimo #0000 somente no post original anonimo, sem mudar API, ID ou dados.

## Consequencias

Cabecalho compacto e consistente entre feed e detalhe. Em telas estreitas,
nomes longos cedem espaco ao contexto e acoes; temas excepcionalmente longos
tambem recebem reticencias, com nome completo acessivel. Testes de integracao
protegem respostas, anonimos, fallback e navegacao. Validar 320/390px e desktop.
