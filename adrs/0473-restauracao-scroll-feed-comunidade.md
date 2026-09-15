# ADR-0473: Restauracao de scroll no feed de comunidade

## Status

Accepted

## Task relacionada

TASK-23

## Contexto

Ao abrir um post a partir do feed geral ou da pagina interna de uma comunidade e depois sair do detalhe, a navegacao podia voltar para o topo do feed. Isso quebrava a continuidade de leitura, especialmente no mobile, onde a lista e longa e usa rolagem infinita.

A decisao precisa respeitar a arquitetura atual: Next App Router, TanStack Query, rotas publicas canonicas em PT-BR, sem backend novo, sem mocks e sem alterar contratos de posts/comunidades.

## Decisao

Guardar, em `sessionStorage`, um snapshot efemero da posicao do feed imediatamente antes de navegar para o detalhe do post. O snapshot contem apenas dados tecnicos publicos e temporarios: rota de origem, `scrollY`, id do post clicado, posicao visual do card no viewport e timestamp.

Ao remontar o feed geral ou a pagina da comunidade, o frontend tenta restaurar o mesmo ponto. Quando a altura carregada ainda nao e suficiente para alcancar a posicao salva, a tela usa o proprio `fetchNextPage` do feed infinito ate haver conteudo suficiente ou ate acabar a paginacao. Se o card do post ainda estiver presente, a restauracao usa o card como ancora e preserva o deslocamento visual dele no viewport; caso contrario, usa `scrollY` como fallback.

As rotas publicas de detalhe que forcam retorno ao feed passam a preferir a origem salva quando ela existe. Sem snapshot valido, o fallback continua sendo o feed publico canonico.

## Consequencias

- O usuario retorna ao mesmo ponto do feed/comunidade apos abrir e fechar um post.
- A solucao reaproveita cache e paginacao real do TanStack Query, sem endpoint novo.
- A memoria e limitada a uma aba/sessao e expira em 30 minutos.
- Se o ranking ou os dados mudarem enquanto o usuario estiver no post, a ancora do card reduz deslocamentos; se o card nao estiver mais carregado, o fallback por pixel mantem uma restauracao aproximada.
- O detalhe continua abrindo no topo, porque a restauracao acontece somente na volta para a lista.

## Producao e rollout

- Compatibilidade com dados existentes: sem alteracao de dados persistidos.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada.
- Backend/API/Admin: sem alteracao de contrato.
- Compatibilidade entre versoes: frontend novo segue consumindo os mesmos endpoints; backend antigo/novo permanecem compativeis.
- Deploy: frontend em `homolog`; rollback e reverter o commit, voltando ao comportamento anterior.

## Validacao

- `pnpm --dir frontend exec biome check --write -- ...` - OK.
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK antes do bump (`0.1.219`) e apos o bump para `0.1.220`.
- `pnpm version:bump` - OK, `0.1.219 -> 0.1.220`.
- `pnpm check:version` - OK.
- `pnpm check` - OK.
- Browser local mobile-first: frontend buildado em `http://127.0.0.1:3063`, `/version` com `0.1.220`, `/app/comunidades/feed` HTTP 200 e Chrome headless 390x844 abriu a rota; o fluxo real de clicar post no local ficou limitado pela API local/ngrok indisponivel, sem mocks/seeds.
- `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check` apos docs finais - OK.

## Pendencias

- Sem decisao externa pendente.

## Complemento em 2026-08-29 - retorno de perfil indisponivel para origem persistida

O video anexado em 2026-08-29 mostrou um desvio de fluxo: a partir de uma publicacao/comunidade, o usuario abriu um perfil publico de psicologo indisponivel e o CTA de retorno enviou para `/psicologos`, perdendo a continuidade do feed.

Decisao complementar:

- extrair a memoria efemera do feed para `frontend/src/utils/community-feed-scroll-memory.ts`, mantendo o mesmo `sessionStorage`, expiracao curta e ausencia de dados sensiveis;
- criar `navigateBackToPersistedOrigin` para priorizar a origem comunitaria salva quando a origem imediata do perfil indisponivel vem de rota de comunidade;
- manter `/psicologos` apenas como fallback quando nao existir snapshot comunitario valido ou quando a origem imediata for a propria busca de psicologos;
- salvar o snapshot tambem nos links de autor profissional do feed, alem da navegacao para detalhe do post, para cobrir clique direto em perfil a partir do card;
- aplicar o mesmo retorno persistido ao estado de contato indisponivel para evitar um segundo caminho com link fixo para a busca.

Consequencias:

- O usuario que sai do feed/comunidade para um perfil indisponivel volta direto para a lista na posicao salva, sem precisar passar pela busca de psicologos.
- A regra evita usar snapshot antigo quando a origem imediata do perfil e `/psicologos`, preservando a expectativa do diretorio de profissionais.
- Nao ha endpoint, banco, env, provider, package, seed, reset ou dado persistido novo; o rollout e somente frontend e compativel com backend antigo/novo.

Validacao complementar:

- `pnpm --dir frontend exec biome check --write "package.json" "src/utils/community-feed-scroll-memory.ts" "src/utils/navigation-history.ts" "src/utils/persisted-origin-navigation.ts" "src/utils/persisted-origin-navigation.test.mjs" "src/app/app/community/[slug]/hooks/use-community-feed-scroll-restoration.ts" "src/app/app/community/[slug]/components/post-card.tsx" "src/app/app/psychologist/[id]/psychologist-profile.tsx" "src/app/app/psychologist/[id]/contact/logic.tsx"` - OK.
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/persisted-origin-navigation.test.mjs` - OK.
- `pnpm --dir frontend typecheck` - OK.
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` apos bump para `0.1.240` - OK.
- `pnpm version:bump` para `0.1.240` - OK.
- `pnpm check:version` - OK.
- `pnpm check` - OK.
- Browser local mobile-first no frontend buildado: `/version` respondeu `0.1.240`; rotas relacionadas responderam sem mock.
- `pnpm check:encoding`, `pnpm check:adrs`, `pnpm check:tasks` e `git diff --check` - OK.
