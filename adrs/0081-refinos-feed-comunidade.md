# ADR-0081 - Refinos discretos no feed de comunidade

## Status

Accepted

## Contexto

O feed de comunidade (`/app/community/feed`, servido pela rota dinâmica `/app/community/[slug]` quando o slug é `feed`) precisava de ajustes finos sem alterar estrutura de post, conteúdo textual ou responsividade geral.

O feedback de seguir/deixar de seguir comunidade vinha do `handleReq` com `showSuccess` nas chamadas de membership, gerando toast verde global. Visualmente, o cabeçalho do autor ainda separava demais nome, selo verificado e selo de Top Mentor. A barra de interações também misturava ações com larguras e superfícies diferentes, principalmente compartilhar em formato menor que comentar/salvar e o grupo de votos.

Em 2026-06-14, o produto também pediu que a resposta destacada do psicólogo fosse identificável rapidamente no feed, com sinal visual leve de resposta profissional.

## Decisão

- Remover `showSuccess` de `followCommunity` e `unfollowCommunity`, mantendo a mutation, invalidação de cache, estado otimista e feedback de erro existentes.
- Reduzir o gap horizontal no bloco de autor do `PostCard`, aproximando nome, selo verificado e `TOP #1 Mentor` sem alterar texto nem hierarquia do post.
- Padronizar a escala de ações do post com `min-w` consistente nos componentes `PostActionButton`, `PostActionLink` e `VoteActionButton`.
- Aplicar a mesma superfície visual neutra para comentar, salvar e compartilhar no feed; upvote/downvote permanecem agrupados, mas usam a mesma altura, fonte, ícone e espaçamento base.
- Destacar apenas `ProfessionalReplyPreview` com fundo azul extremamente suave, borda azul sutil, `border-radius` de 16px, padding interno e linha lateral azul clara, sem sombra e sem fundo cinza.

## Consequências

- Seguir/deixar de seguir continua funcionando normalmente, porém sem toast verde de sucesso.
- Erros de follow/unfollow continuam aparecendo pelo fluxo atual de erro.
- A mudança de escala dos botões usa os componentes existentes, sem criar novo design system ou alterar contratos de API.
- A resposta profissional ganha diferenciação visual sem virar um card pesado ou alterar conteúdo/navegação do post.
- Nenhum backend, Prisma, migration, pacote ou schema foi alterado.

## Validações

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/community/feed`
- Destaque leve da resposta profissional: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP 200 em `http://localhost:3000/app/community/feed` com cookie de sessão de desenvolvimento. Observação: a primeira tentativa de `pnpm --dir frontend check` excedeu o timeout local de 120s; repetida com timeout maior e concluída com sucesso.

## Task relacionada

Ajuste complementar de UX visual da TASK-23 em `/app/community/feed`.

## Atualizacao em 2026-06-14: campos clicaveis sem aparencia de link

### Contexto

No desktop, o titulo do post e outros campos clicaveis do card apareciam com comportamento visual de link tradicional no hover, mudando para azul e/ou sublinhado. Alem disso, o texto do post nao abria o detalhe, embora o titulo abrisse.

### Decisao

- Reutilizar `communityPostDetailHref(post)` como destino unico do card.
- Adicionar uma camada de `Link` sobre o texto do post apenas no breakpoint desktop/tablet largo, preservando o comportamento mobile atual.
- Manter o botao inline `... ver mais` acima dessa camada clicavel, parando a propagacao do clique para continuar expandindo/recolhendo o texto.
- Remover dos campos textuais clicaveis do card (`titulo`, `comunidade`, `nome/metadados do psicologo` e `resposta profissional`) as classes de hover que aplicavam azul, sublinhado ou mudanca de fundo, deixando apenas `cursor: pointer`.

### Consequencias

- O usuario pode abrir o detalhe pelo texto do post no desktop, com o mesmo destino do titulo.
- O feed deixa de parecer uma pagina de links tradicionais e preserva hierarquia visual limpa.
- A resposta profissional continua clicavel para o detalhe do post, mas sem flicker ou mudanca de cor/fundo no hover.
- Nenhum contrato de API, schema, pacote, backend ou conteudo textual foi alterado.

### Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/community/feed` com cookie de sessao de desenvolvimento.
