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

## Complemento 2026-08-12 - selo verificado unificado e autoria compacta

### Contexto

A identificacao de psicologos nos cards e telas de comunidade ainda usava duas variacoes visuais para o selo verificado: em alguns pontos `BadgeCheck` do Lucide preenchido, em outros `VerifiedBadgeIcon`, que ja e o componente do perfil publico. Alem disso, a combinacao de `gap-1`, `gap-[5px]` e line-height padrao deixava a metadata profissional (`Psicologo • ha 5d`) afastada do nome em telas mobile.

### Decisao

- Usar `VerifiedBadgeIcon` nas superficies de comunidade em que o autor/mentor profissional e identificado: feed, cards compartilhados, resposta profissional destacada, detalhe do post, thread/continuacao, replies e Top Mentores.
- Reduzir a distancia horizontal nome/selo para `gap-0.5`.
- Reduzir a distancia vertical nome/metadata para `gap-0.5` e aplicar `leading-tight` nos textos de autoria e metadata.
- Nao alterar regras de verificacao, ranking, featured badges, links para perfil, conteudo textual ou contratos de API.

### Consequencias

- A comunidade e o perfil publico passam a compartilhar o mesmo desenho de selo verificado.
- A autoria do psicologo fica mais compacta e proxima do padrao visual solicitado no mobile, sem criar componente paralelo nem mudar dados.
- Mantem-se compatibilidade total com backend antigo/novo porque o ajuste e apenas de apresentacao frontend.

### Validacoes

- `pnpm --dir frontend biome:check`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build` antes e apos o bump para `0.1.81`.
- Next local buildado em `http://127.0.0.1:3057` e depois em `http://127.0.0.1:3058`, com HTTP 200 nas rotas de comunidade e perfil publico usadas para comparacao visual e `/version` em `0.1.81` apos o bump.

- `pnpm check`, `git diff --check`, `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks`, `pnpm version:bump` para `0.1.81` e `pnpm check:version`.

## Complemento 2026-08-20 - proporcao do selo verificado e metadata profissional

### Contexto

A compactacao de 2026-08-12 aproximou nome, metadata e selo verificado nas superficies de comunidade. No screenshot validado pelo usuario em 2026-08-20, essa compactacao deixou o selo verificado maior/colado demais em relacao ao nome do psicologo e a metadata `Psicologo • tempo` ainda competia com a linha principal.

Builder/Quick Copy nao estava autenticado no ambiente local, portanto a decisao foi guiada pelo screenshot do usuario e pelas referencias locais `_product/proto/Feed Comunidade.jpg` e `_product/proto/Dentro do Post.jpg`.

### Decisao

- Manter `VerifiedBadgeIcon` como fonte unica do selo verificado em comunidade.
- Reduzir o selo de `h-4 w-4` para `h-3.5 w-3.5` nos headers de autoria dos cards de comunidade e no `ProfessionalReplyPreview`.
- Aumentar apenas o respiro horizontal nome/selo de `gap-0.5` para `gap-1`, evitando que o selo pareca anexado ao texto.
- Reduzir o peso visual da metadata profissional de `font-semibold leading-tight` para `font-medium leading-[1.15]`, preservando `text-[11px]` e tokens de cor.

### Consequencias

- O nome continua sendo o ponto focal do header, enquanto o selo confirma status sem competir visualmente.
- A linha de funcao/tempo passa a ler como informacao secundaria, mais coerente com o card mobile-first.
- A mudanca e somente de apresentacao frontend: nao altera backend, Prisma, contratos de API, ranking, votos, salvos, WhatsApp, dados persistidos, packages ou envs.

### Validacao

- `pnpm --dir frontend exec biome check --write -- "src/components/community/community-post-card-reply-preview.tsx" "src/components/community/community-post-card.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` antes e apos o bump para `0.1.153`
- `pnpm check:version`
- `pnpm check`
- `git diff --check`
- Browser local mobile-first em `http://127.0.0.1:3062/app/comunidades/feed`
