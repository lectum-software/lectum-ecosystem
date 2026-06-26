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

## Atualizacao 2026-06-17 - ordenacao por relevancia entre irmaos

- A ordenacao da arvore de comentarios passa a acontecer por grupo de irmaos, preservando integralmente a hierarquia e sem mover respostas para fora do comentario pai.
- Cada grupo de respostas com o mesmo `parent_reply_id` e ordenado por: maior quantidade de upvotes, melhor posicao de mentor/psicologo na comunidade quando houver ranking aplicavel, e comentario mais recente.
- A tela principal do post e a thread isolada usam o mesmo criterio no backend; o frontend replica o criterio para manter reordenacao imediata durante optimistic updates de voto.
- A regra especial de destacar primeiro o comentario de psicologo verificado mais relevante entre os comentarios diretos ao post permanece como excecao de topo, sem afetar a ordenacao dos descendentes dentro de cada arvore.
- A decisao nao altera schema, migrations, contratos de payload, profundidade visual, envio de respostas, votos, salvamento ou regra de permissao.

## Atualizacao 2026-06-17 - header leve na thread de respostas

- O header da tela isolada de thread/respostas deixou de ser sticky e deixou de usar superficie branca com blur, borda e sombra.
- A decisao foi transformar o header em uma area estatica integrada ao fundo da pagina, preservando a navegacao de voltar e a centralizacao do titulo `Respostas`.
- O subtitulo `Continuacao da conversa` recebeu line-height e espacamento vertical maiores para evitar corte visual na base das letras.
- A mudanca e exclusivamente visual/frontend; nao altera contratos, backend, banco, votos, ordenacao, arvore, composer ou navegacao da thread.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em 390px e 1440px validando `position: static`, fundo transparente, ausencia de borda/sombra e deslocamento do header junto com o scroll.

## Atualizacao 2026-06-17 - salvar/compartilhar sem acionar collapse

- Salvar e compartilhar passam a ser tratados como controles interativos formais da arvore de comentarios, em todas as camadas visiveis e tambem na tela isolada de thread.
- O handler de collapse do comentario raiz continua sendo responsavel por ignorar alvos interativos; adicionalmente, as acoes de salvar/compartilhar interrompem propagacao antes de executar suas funcoes.
- A decisao garante que o usuario possa salvar ou compartilhar qualquer comentario/resposta sem recolher ou expandir a arvore acidentalmente.
- Os links de compartilhamento usam ancoras #reply-{id}; na thread isolada, a URL inclui o reply raiz do fio antes da ancora para manter contexto de continuacao.
- Nao ha mudanca na profundidade visual, ordenacao por relevancia, regra de destaque de psicologos, backend, schema, votos ou criacao de respostas.

Validacao complementar:

- pnpm check
- Chrome/CDP autenticado no detalhe do post demo e na thread isolada, confirmando salvar/compartilhar em todos os replies visiveis, toggle de salvo e ausencia de collapse ao clicar nas acoes.

## Atualizacao 2026-06-17 - isolamento definitivo dos controles interativos

- O collapse do comentario raiz permanece amplo no corpo do comentario, mas a linha de acoes inteira passa a ser marcada como area ignorada por `data-comment-collapse-ignore`.
- A deteccao de alvo interativo passa a aceitar `Element`/`Node`, evitando que cliques em elementos internos de icones (`svg`, `path`) escapem da guarda e acionem collapse indevidamente.
- Responder, salvar, compartilhar, votos e links interrompem propagacao no proprio handler, alem da guarda do container raiz, para garantir prioridade absoluta das acoes interativas.
- Menus, itens de menu, composer, botoes de continuacao, midia, WhatsApp e links de perfil de psicologos continuam fora do gesto de collapse.
- A decisao nao altera profundidade visual, ordenacao por relevancia, destaque de psicologos, persistencia de votos/salvos, backend ou contratos de API.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP em 390px no detalhe do post demo validando que clique na barra de acoes e em icone SVG nao recolhe, clique no corpo recolhe e botoes continuam funcionais.

## Atualizacao 2026-06-25 - controle explicito de recolhimento

O recolhimento da arvore deixa de ser acionado pelo clique no bloco superior do comentario raiz. Essa area competia com a leitura do comentario e com interacoes internas, especialmente o `ver mais` do texto expandivel, aumentando o risco de recolhimento acidental.

A arvore agora usa um botao explicito, secundario e posicionado logo abaixo da barra de acoes do primeiro comentario da arvore:

- expandida: `Ocultar respostas` com chevron para cima;
- recolhida: `Ver respostas (N)` com chevron para baixo.

O controle permanece menos importante visualmente que a barra de acoes, por ser uma acao de organizacao/navegacao da conversa, nao uma acao social. Quando recolhida, a arvore nao renderiza os descendentes nem a linha lateral de continuacao; deep links com comentario focado continuam mantendo a arvore aberta para preservar o alvo visivel.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- `git diff --check`
- HTTP local `200` em `http://127.0.0.1:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`

## Atualizacao 2026-06-25 - conectores em L entre pai e respostas

### Contexto

A arvore de comentarios ja usava linhas verticais para indicar profundidade, mas as camadas filhas ainda pareciam guias paralelas soltas. A referencia visual enviada pelo usuario foi o padrao do YouTube, em que cada resposta fica pendurada na linha do comentario pai por um pequeno conector curvo/horizontal.

### Decisao

- Manter a linha vertical existente da arvore como guia principal.
- Adicionar, para cada resposta filha renderizada, um conector visual em `L` (`border-l` + `border-b` arredondado) entre a linha vertical do pai e o inicio do comentario filho.
- Usar cor azul acinzentada suave (`#DCE4EE`) e variante `dark:border-border` para manter a conexao discreta no padrao Lectum.
- Preservar o controle explicito de expandir/recolher, a profundidade maxima, deep links, ordenacao, composer e acoes de cada comentario.

### Consequencias

- A relacao pai-filho fica mais clara em arvores profundas, especialmente em mobile.
- O visual se aproxima do modelo mental conhecido do YouTube sem aumentar muito o ruido visual.
- A alteracao e puramente visual/frontend e nao modifica dados, APIs, backend, Prisma, packages, votos, salvos ou comentarios.

## Atualizacao 2026-06-25 - controle de respostas menos proeminente

### Contexto

Apos tornar o recolhimento da arvore uma acao explicita, o botao `Ver respostas`/`Ocultar respostas` ficou visualmente grande demais em relacao a barra de acoes do comentario e passou a competir por atencao.

### Decisao

- Reduzir apenas a escala visual do controle de expandir/recolher.
- Usar `text-[10px]`, peso `font-semibold`, `leading-none`, padding menor e chevrons menores.
- Manter o controle como botao acessivel, com `aria-expanded`, `aria-controls` e contagem de respostas quando recolhido.
- Nao alterar a posicao, semantica, conectores da arvore, profundidade, ordenacao ou interacoes sociais.

### Consequencias

- O controle volta a parecer uma acao secundaria de organizacao da conversa.
- A barra de acoes e o conteudo do comentario recuperam prioridade visual.
- A alteracao permanece puramente visual/frontend, sem impacto em APIs, backend ou persistencia.

## Atualizacao 2026-06-26 - label ultracompacto do controle de respostas

### Contexto

Mesmo apos reduzir o controle explicito `Ocultar respostas`/`Ver respostas`, o texto continuava parecendo grande na arvore de comentarios. A validacao local tambem mostrou que aplicar tamanho de fonte diretamente no `button` podia ser neutralizado pelo reset/base de botoes, mantendo o texto maior que o pretendido.

### Decisao

- Manter o controle explicito como botao acessivel e secundario, abaixo da barra de acoes do comentario raiz.
- Aplicar as classes tipograficas no `span` do label (`text-[9px]`, `font-medium`, `leading-none`, `whitespace-nowrap`) em vez de depender da fonte do `button`.
- Reduzir gap/padding e chevrons para reforcar que a acao e apenas organizacional da conversa.
- Preservar `aria-expanded`, `aria-controls`, `aria-label`, contagem de respostas ao recolher, deep links e conectores em L.

### Consequencias

- O label fica realmente ultracompacto e deixa de competir visualmente com o conteudo do comentario e a barra de acoes.
- A alteracao continua puramente visual/frontend: nao modifica dados, APIs, backend, Prisma, packages, votos, salvos, ordenacao ou criacao de respostas.
- A tipografia interna no `span` evita regressao causada por resets de `button` em futuras alteracoes de CSS base.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`
- Chrome/CDP local em viewport mobile validando o label com `font-size: 9px`, `font-weight: 500` e `line-height: 9px`.

## Atualizacao 2026-06-26 - controle de respostas no mesmo tamanho de Responder

### Contexto

O ajuste anterior deixou `Ver respostas`/`Ocultar respostas` ultracompacto. A captura do usuario mostrou que o controle passou a ficar pequeno demais quando comparado a acao `Responder`, prejudicando a leitura e a consistencia da barra de comentarios.

### Decisao

- Padronizar a tipografia do label do controle de respostas com a acao `Responder` text-only usada na `CommunityActionBar`: `text-[12px]`, `font-semibold`, `leading-none` e `tracking-[-0.01em]`.
- Manter as classes de fonte no `span` interno do label, nao no `button`, para preservar o tamanho real apesar dos resets/base de botoes.
- Ajustar chevrons, gap e padding para acompanhar o label sem alterar semantica, acessibilidade ou posicao do controle.

### Consequencias

- `Ver respostas` e `Ocultar respostas` voltam a ter a mesma escala textual de `Responder`, melhorando consistencia visual.
- O controle segue secundario por posicao e tratamento de hover, sem competir com votos/responder/salvar/compartilhar.
- A alteracao permanece puramente visual/frontend: nao modifica dados, APIs, backend, Prisma, packages, votos, salvos, ordenacao ou criacao de respostas.

### Validacao

- `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- `git diff --check`
- HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`
- Validacao local de DOM/CSS confirmou o label com `font-size: 12px`, `font-weight: 600` e `line-height: 12px`.

## Atualizacao 2026-06-26 - rolagem infinita no detalhe do post

### Contexto

A navegacao por paginas no fim do detalhe do post interrompia a leitura da conversa no mobile e obrigava o usuario a alternar entre paginas (`Anterior`/`Proxima`) dentro de uma tela que visualmente funciona como thread continua.

### Decisao

- Remover a navegacao visual de paginacao da tela principal do post.
- Manter o contrato paginado existente do backend (`page`/`limit`) para evitar mudanca de API, schema ou migracao.
- No frontend, assinar as paginas carregadas com queries finitas independentes via `usePostRepliesPages`, mantendo a familia de cache `posts/:id/replies` usada pelas mutations existentes.
- Acumular as paginas ja carregadas em uma lista unica e deduplicada, carregando a proxima pagina por `IntersectionObserver` quando o sentinel no fim da discussao entra perto da viewport.
- Preservar o fluxo de `focusReplyId` com uma consulta auxiliar: primeiro descobre-se a pagina real do comentario focado e depois carregam-se as paginas ate esse ponto para manter scroll/highlight sem voltar a exibir paginacao.

### Consequencias

- A experiencia passa a ser de leitura continua/infinita na mesma tela, alinhada ao comportamento esperado para uma thread longa.
- O backend continua paginando respostas diretas ao post, evitando render gigante e mantendo o limite operacional da TASK-26.
- As mutations de voto, salvar, editar/excluir e invalidacao continuam compativeis, porque cada pagina carregada permanece no formato `PostRepliesResponse` do cache existente, sem introduzir `InfiniteData` em uma chave usada por optimistic updates antigos.
- A alteracao e apenas frontend/API caller; nao modifica dados, Prisma, endpoints, packages, ordenacao, profundidade visual ou regras de permissao.

### Validacao

- `pnpm.cmd --dir frontend exec biome check --write "src/api/callers/posts/index.tsx" "src/app/app/community/[slug]/post/[id]/logic.tsx"`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- `git diff --check`
- HTTP local `200` em `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`
- Chrome headless local em viewport mobile 390x844 validando ausencia de `Anterior`, `Proxima` e contador de paginas no DOM renderizado.
