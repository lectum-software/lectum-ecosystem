# ADR 0104 — Barra de ações unificada para posts e comentários

## Status

Aceita

## Contexto

As ações de posts e comentários da comunidade eram renderizadas por implementações diferentes no feed, página de comunidade, detalhe do post e cards reutilizados. Isso gerava diferenças visuais perceptíveis em ícones, contadores, altura, padding e alinhamento entre `Útil`, downvote, comentários, salvar, compartilhar e responder.

## Decisão

Centralizar a composição da barra de ações no componente `CommunityActionBar`, reutilizando os blocos de base `PostActionButton`, `PostActionLink`, `PostActionMetric` e `VoteActionButton`.

A barra passa a padronizar:

- ícones com a mesma dimensão visual (`h-4 w-4`) e stroke;
- texto e contadores com a mesma escala (`text-[12px]`, semibold e tabular numbers);
- cluster de votação como unidade única (`Útil`, contador e downvote);
- ações secundárias com altura, área clicável, gap e padding consistentes;
- comportamento responsivo com linha única e overflow horizontal oculto visualmente quando necessário.
- variante compacta `xs` para comentários, reduzindo upvote/downvote e o texto "Responder" sem adicionar ícone ao responder;
- apresentação `votePresentation="inline"` para comentários, removendo cápsula/fundo cinza do grupo de upvote/downvote e mantendo ações leves com ícones e contador;
- reutilização das mesmas primitivas de ícone/texto/contador também no `VoteActionButton`, garantindo que “Útil” tenha a mesma escala visual dos demais controles no feed, na comunidade e no post.

## Consequências

- Feed, páginas de comunidade, detalhe do post, comentários, respostas e cards reutilizados devem usar `CommunityActionBar`.
- Novas ações de posts/comentários devem ser adicionadas ao componente compartilhado ou às primitivas existentes, evitando implementações locais.
- A alteração é visual/estrutural no frontend e não altera regra de votação, salvamento, compartilhamento ou comentários.
- Comentários devem solicitar `size="xs"` e, quando precisarem de ações sem cápsula, `votePresentation="inline"`, mantendo as barras de posts em `sm` por padrão.

## Atualização 2026-06-16

- A variante `xs` passa a manter `upvote`, `downvote`, contador, `Responder`, salvar e compartilhar sempre em uma única linha, inclusive nas camadas profundas da árvore de comentários.
- O texto `Responder` fica em um `span` interno dedicado para preservar a escala compacta apesar do reset global `button { font: inherit; }`, mantendo o botão discreto sem ícone.
- Salvar e compartilhar permanecem como ações de ícone em todas as camadas de resposta, sem alterar mutations, ordenação, destaque de psicólogos verificados ou contratos de API.

## Atualizacao 2026-06-16 - ajuste fino dos controles de comentarios

- A variante compacta `xs` da `CommunityActionBar` foi refinada para dividir a barra em dois grupos: upvote/downvote/`Responder` a esquerda e salvar/compartilhar a direita.
- Salvar e compartilhar voltaram a usar `ml-auto` tambem em comentarios, mantendo coluna visual fixa a direita do comentario mesmo em respostas aninhadas.
- O grupo esquerdo agora pode encolher sem quebrar linha; `Responder` usa `text-[10px] font-semibold`, igual a escala do contador de upvotes, e aplica `truncate`/ellipsis quando o espaco fica insuficiente.
- A barra continua com `white-space: nowrap`, sem capsula cinza nos votos inline e sem alterar mutations, ordenacao, destaque de psicologos verificados, backend, Prisma, contratos ou packages.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local autenticado via Chrome headless/CDP em 390px na rota do detalhe do post demo, confirmando barras `xs` com `Responder` em `10px`, salvar/compartilhar na direita, `topSpread=0` e `white-space: nowrap`.
