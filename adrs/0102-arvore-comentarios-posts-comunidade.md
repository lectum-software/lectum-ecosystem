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
- Tratar “Discussão” como cabeçalho independente da seção, sem linha azul lateral e sem parecer parte do primeiro comentário.
- Renderizar cada comentário direto ao post como uma árvore própria de primeira camada; apenas respostas a comentários entram aninhadas na árvore daquele comentário.
- Definir o fundo da árvore pelo autor do comentário raiz: branco para paciente e azul claro para psicólogo verificado, sem fundo esverdeado e sem alterar a regra de ordenação/prioridade do primeiro psicólogo verificado mais votado.
- Compactar os recuos da árvore e manter apenas linhas finas cinza de hierarquia, limitando a visualização principal a três níveis visuais.

## Consequências

- A tabela `post_reports` passa a aceitar denúncias associadas a comentários.
- A listagem principal continua leve e escalável.
- Fios mais profundos ficam isolados em tela dedicada, reduzindo ruído visual no post principal.
- O backend permanece responsável por validar existência, vínculo ao post e estado removido/moderado antes de aceitar respostas ou denúncias.
- A aparência da árvore passa a depender apenas do comentário raiz, evitando que respostas de psicólogos dentro de uma árvore de paciente mudem o fundo inteiro para azul.
- Comentários diretos novos permanecem alinhados ao primeiro nível da discussão, enquanto o botão “Ver mais respostas” fica alinhado ao nível que será expandido.
