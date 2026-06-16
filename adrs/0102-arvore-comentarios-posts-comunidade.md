# ADR 0102 — Árvore de comentários em posts da comunidade

## Status

Aceito

## Contexto

A tela interna de post precisa permitir discussões mais profundas sem poluir a leitura principal no mobile. O backend também bloqueava respostas a respostas aninhadas, gerando erro ao tentar responder comentários que já eram filhos de outro comentário.

## Decisão

- Permitir respostas a comentários próprios e de outros usuários, desde que o comentário exista no post e não esteja removido.
- Manter a tela principal do post com no máximo duas camadas visíveis de comentários.
- Quando houver mais respostas abaixo de um comentário, exibir “Ver mais X respostas” e navegar para uma tela focada naquele fio.
- Adicionar suporte a denúncia de comentário usando o mesmo fluxo de moderação de posts, com vínculo opcional ao `reply_id`.
- Preservar o composer fixo único no mobile, alternando o contexto de resposta em vez de abrir múltiplos campos inline.

## Consequências

- A tabela `post_reports` passa a aceitar denúncias associadas a comentários.
- A listagem principal continua leve e escalável.
- Fios mais profundos ficam isolados em tela dedicada, reduzindo ruído visual no post principal.
- O backend permanece responsável por validar existência, vínculo ao post e estado removido/moderado antes de aceitar respostas ou denúncias.
