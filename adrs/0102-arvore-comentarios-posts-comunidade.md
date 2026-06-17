# ADR 0102 — Árvore de comentários em posts da comunidade

## Status

Aceito

## Contexto

A tela interna de post precisa permitir discussões mais profundas sem poluir a leitura principal no mobile. O backend também bloqueava respostas a respostas aninhadas, gerando erro ao tentar responder comentários que já eram filhos de outro comentário.

## Decisão

- Permitir respostas a comentários próprios e de outros usuários, desde que o comentário exista no post e não esteja removido.
- Manter a tela principal do post com até cinco camadas visuais por árvore: comentário raiz mais quatro níveis de respostas aninhadas.
- Quando houver respostas abaixo do quinto nível visual, exibir "Ver mais X respostas" alinhado à camada onde as próximas respostas existiriam e navegar para uma tela focada naquele fio.
- Adicionar suporte a denúncia de comentário usando o mesmo fluxo de moderação de posts, com vínculo opcional ao `reply_id`.
- Preservar o composer fixo único no mobile, alternando o contexto de resposta em vez de abrir múltiplos campos inline.
- Tratar “Discussão” como cabeçalho independente da seção, sem linha azul lateral e sem parecer parte do primeiro comentário.
- Renderizar cada comentário direto ao post como uma árvore própria de primeira camada; apenas respostas a comentários entram aninhadas na árvore daquele comentário.
- Definir o fundo da árvore pelo autor do comentário raiz: branco para paciente e azul claro para psicólogo verificado, sem fundo esverdeado e sem alterar a regra de ordenação/prioridade do primeiro psicólogo verificado mais votado.
- Compactar os recuos da árvore e manter apenas linhas finas cinza de hierarquia, limitando cada tela a cinco níveis visuais para preservar leitura em mobile e desktop.

## Consequências

- O backend usa uma hidratação hierárquica limitada (`INLINE_REPLY_DESCENDANT_DEPTH`) para entregar descendentes suficientes à visualização principal sem transformar comentários diretos ao post em filhos de outra árvore.
- A tabela `post_reports` passa a aceitar denúncias associadas a comentários.
- A listagem principal continua paginada por comentários diretos ao post e hidrata somente descendentes dos comentários raiz exibidos, com profundidade limitada para evitar renderização gigante.
- Fios mais profundos ficam isolados em tela dedicada, reduzindo ruído visual no post principal. A tela de fio exibe o post original no topo e, abaixo dele, o comentário raiz do fio selecionado antes da continuação da conversa.
- O backend permanece responsável por validar existência, vínculo ao post e estado removido/moderado antes de aceitar respostas ou denúncias.
- A aparência da árvore passa a depender apenas do comentário raiz, evitando que respostas de psicólogos dentro de uma árvore de paciente mudem o fundo inteiro para azul.
- Comentários diretos novos permanecem alinhados ao primeiro nível da discussão, enquanto o botão “Ver mais respostas” fica alinhado ao nível que será expandido.

## Atualização 2026-06-16

- Cada árvore de comentários passa a controlar localmente o estado recolhido/expandido a partir do comentário raiz.
- Apenas o container do comentário raiz (`depth=0`) recolhe/expande a árvore; comentários aninhados não disparam esse comportamento.
- Ações internas como responder, salvar, compartilhar, upvote/downvote, links de perfil, menu, mídia e campos de formulário são ignoradas pelo gesto de recolhimento.
- Ao recolher, a árvore exibe uma indicação alinhada à primeira camada de respostas com `Ver X resposta(s)`, permitindo expandir novamente sem afetar comentários diretos de outras árvores.

## Atualizacao 2026-06-16 - header premium da thread isolada

- A tela dedicada de thread/respostas mantem o post original no topo do conteudo, mas o header de navegacao foi refinado para atuar como barra sticky independente.
- A composicao usa grid de tres colunas: voltar a esquerda, titulo `Respostas` centralizado e coluna espelho a direita, evitando desalinhamento em mobile.
- O header usa superficie branca translucida com blur, borda inferior sutil e sombra muito leve para criar continuidade com o post sem parecer um bloco plano ou card solto.
- A decisao nao altera profundidade, ordenacao, destaque de psicologos verificados, payloads ou persistencia; e apenas refinamento visual da navegacao da thread isolada.

## Atualizacao 2026-06-16 - areas seguras para recolher/expandir

- O recolhimento da arvore deixa de estar preso ao container completo do comentario raiz e passa a existir apenas em regioes explicitamente marcadas como areas de toggle.
- Para raizes de pacientes, avatar, cabecalho/autor/horario e conteudo textual podem recolher/expandir a arvore; para raizes de psicologos, links de avatar/nome/informacoes/selo preservam prioridade de navegacao ao perfil e nao acionam collapse.
- A linha de acoes (`upvote`, `downvote`, contador, responder, salvar, compartilhar), menu, midia, WhatsApp, composer e botoes de continuacao bloqueiam propagacao para impedir recolhimento acidental.
- A decisao preserva o estado local independente de cada arvore, a profundidade visual, a ordenacao e a regra do primeiro comentario de psicologo verificado mais votado.

## Atualizacao 2026-06-16 - area total do comentario raiz

- O primeiro comentario de cada arvore passa a usar todo o bloco superior como area de recolher/expandir: avatar, cabecalho, corpo, conteudo textual e espacos internos.
- A decisao substitui a marcacao fragmentada por regioes por um handler unico no bloco raiz, mas com guarda explicita para qualquer alvo interativo.
- Upvote, downvote, contador, responder, salvar, compartilhar, menu, midia, WhatsApp, composer, links e botoes de continuacao continuam fora do gesto de collapse por deteccao de alvo interativo e `data-comment-collapse-ignore`.
- Em comentarios raiz de psicologos, avatar, nome, selo e dados profissionais mantem prioridade de navegacao para o perfil; o collapse permanece disponivel apenas nas areas nao interativas restantes do comentario.
- Comentarios aninhados nao recebem o handler e cada arvore conserva estado independente, sem alterar profundidade, ordenacao, regra de destaque profissional, backend ou persistencia.
