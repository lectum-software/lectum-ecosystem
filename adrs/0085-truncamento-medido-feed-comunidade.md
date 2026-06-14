# ADR-0085 - Truncamento medido e identidade compacta no feed de comunidade

## Status

Accepted

## Contexto

O feed de comunidade (`/app/community/feed`) ja havia recebido um `ver mais` inline, mas a pre-visualizacao ainda usava limites fixos de caracteres. Em larguras maiores isso truncava cedo demais, sem aproveitar 100% da largura util; em larguras menores podia deixar a leitura do post ou da resposta com quebra visual pouco natural.

Na mesma tela, os botoes de interacao tinham recebido a mesma superficie cinza, mas a direcao de produto definiu que essa superficie deve existir apenas no grupo de upvote/downvote. Comentarios, salvar e compartilhar devem manter a escala do componente de comentarios, sem parecerem chips cinza equivalentes ao grupo de votos.

A linha de identificacao do psicologo tambem seguia visualmente aberta demais porque o nome/selo verificado e o selo `TOP #1 Mentor` eram renderizados como itens de flex diferentes, com wrappers intermediarios e `flex-wrap` separados em `PostCard` e `ProfessionalReplyPreview`.

## Decisao

- Substituir o truncamento por numero fixo de caracteres por medicao real do paragrafo no cliente.
- Medir a largura disponivel do container e buscar, por binary search, o maior prefixo textual que caiba em ate 2 linhas junto do sufixo inline `... ver mais`.
- Manter `... ver mais` e `ver menos` no fluxo do mesmo paragrafo, herdando fonte e line-height do texto.
- Manter a superficie cinza apenas no wrapper do grupo upvote/downvote e ajustar o wrapper para `h-8`, preservando a escala visual do componente de comentarios.
- Remover a superficie cinza base de comentarios, salvar e compartilhar; estes controles permanecem com hover discreto e a mesma escala de icone, fonte, altura e padding.
- Criar `AuthorIdentityLine` para renderizar nome, selo verificado e `MentorBadge` como uma unica linha estrutural, com `gap-1`, removendo os wrappers flex separados dos cards.

## Consequencias

- O texto do post e da resposta profissional usa a largura real do card antes de truncar, tanto no mobile quanto no desktop.
- O `ver mais` deixa de depender de uma constante arbitraria de caracteres e passa a se comportar de forma mais proxima a feeds como Instagram, LinkedIn, Reddit e X.
- O grupo de votos continua distinguivel por superficie propria, mas comentarios/salvar/compartilhar deixam de competir visualmente com ele.
- Nome, selo verificado e `TOP #1 Mentor` passam a ser percebidos como uma unica identidade compacta do autor.
- Nao houve mudanca de contratos de API, backend, Prisma, packages ou estrutura geral dos posts.

## Task relacionada

Ajuste complementar de UX visual da TASK-23 em `/app/community/feed`.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local em `http://127.0.0.1:3000/app/community/feed`
