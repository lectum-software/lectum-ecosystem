# ADR-0107: Conteúdo visual centralizado para Explorar Comunidades

## Status

Accepted

## Task relacionada

Ajuste visual da tela Explorar Comunidades.

## Contexto

A tela de Explorar Comunidades precisava se aproximar da referência visual enviada, usando imagens nos cards e mantendo nome, imagem e descrição das comunidades preparados para futura edição via banco de dados/Supabase.

Também era necessário evitar que textos, imagens e descrições dos cards ficassem espalhados diretamente no JSX da tela.

## Decisão

Centralizar os metadados visuais dos cards de exploração em `frontend/src/app/app/community/explore-content.ts`, por slug de comunidade, usando uma estrutura com:

- `id`
- `name`
- `imageUrl`
- `description`
- `category`
- `isFeatured`
- `isPopular`
- `growthLabel`

A tela continua consumindo a lista real de comunidades via API e mescla os dados reais com essa camada visual temporária. As imagens anexadas foram copiadas para `frontend/public/images/community/explore/` e renderizadas com `next/image`.

## Consequências

- A tela fica pronta para substituir a camada visual local por campos vindos do banco sem alterar o layout.
- Os cards deixam de depender de conteúdo solto no JSX.
- As imagens ficam versionadas junto ao frontend enquanto não houver upload/edição administrativa de comunidades.
- Futuramente, moderadores poderão editar os mesmos campos no backend e o mapeamento local poderá ser removido.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local em `/app/community` retornando HTTP 200.

## Pendências

- Substituir `explore-content.ts` por campos persistidos no banco quando a edição de comunidades por moderadores for implementada.

## Atualizacao 2026-06-17 - fundo branco e escala da exploracao

- A tela de Explorar Comunidades deixa de parecer um frame centralizado em fundo cinza: o `PageShell` recebe conteudo em `max-w-none`, `min-h-screen`, fundo branco e padding horizontal zerado no wrapper externo.
- A largura de leitura continua controlada por uma `section` interna centralizada; assim a pagina fica totalmente branca sem perder proporcao e alinhamento nos breakpoints mobile e desktop.
- A escala visual dos elementos foi reduzida: busca, voltar, titulo principal, subtitulo, titulos de secao, card de tendencia, cards populares, chips e botoes.
- O carrossel de comunidades populares ganhou um controle de seta discreto no desktop, baseado no estado real de overflow/scroll; em mobile o comportamento horizontal por gesto permanece inalterado.
- A decisao e exclusivamente visual/frontend e nao altera dados, API, filtros, sugestoes, comunidades, persistencia ou packages.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em 390px e desktop validando ausencia de faixas cinzas, card de tendencia menor e seta desktop somente com overflow horizontal.

## Atualizacao 2026-06-17 - responsividade mobile do carrossel

- O carrossel `Mais Populares` passa a respeitar a largura util do conteudo no mobile, removendo o full-bleed lateral que podia causar percepcao de card cortado.
- Os cards populares usam largura maxima baseada no viewport (`min(calc(100vw - 2.5rem), 212px)`) antes dos breakpoints maiores, garantindo que o card ativo caiba inteiro dentro da tela.
- A rolagem horizontal fica confinada ao proprio carrossel com `overscroll-x-contain`; o wrapper da pagina usa apenas bloqueio de overflow horizontal indesejado, sem impedir a rolagem local.
- A barra de busca deixa de ter borda inferior no header sticky, mantendo a tela mais limpa e integrada ao fundo branco.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile 390x844 em `/app/community`: `documentElement.scrollWidth=390`, `body.scrollWidth=390`, `searchBorderBottom=0px`, carrossel com `clientWidth=353`, `scrollWidth=887` e primeiro card totalmente dentro do viewport.

## Atualizacao 2026-06-17 - limpeza de profundidade visual

- Os cards de `Tendencia Hoje` e `Mais Populares` deixam de usar sombras e hover de flutuacao; a hierarquia visual passa a vir de imagem de capa, overlay, contraste, tipografia e espacamento.
- Badges sobre as imagens usam `border` translucida em vez de `ring`, mantendo contorno sutil sem gerar `box-shadow` computado.
- O botao de voltar, a seta desktop do carrossel, o estado de loading e o bloco `Sugira uma Comunidade` tambem foram alinhados ao mesmo criterio: borda/radius e contraste, sem efeito de cartao flutuante.
- A decisao permanece exclusivamente visual/frontend e nao altera listagem, filtros, ordenacao, APIs, dados, persistencia, Prisma ou packages.

Validacao complementar:

- `pnpm --dir frontend exec biome check --write src/app/app/community/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP em `/app/community` com viewport mobile 390x844 e desktop 1440x900 validando ausencia de overflow horizontal e `box-shadow` sem profundidade real nos cards, containers auxiliares, botao de voltar e seta do carrossel.

## Atualizacao 2026-06-26 - background branco restaurado

### Contexto

A rota `/app/community` voltou a exibir o fundo estrutural cinza do token `bg-background`, contrariando a decisao anterior de deixar a exploracao de comunidades integrada a uma pagina branca. O usuario pediu explicitamente que o background desta pagina fosse branco.

### Decisao

- Usar `bg-surface` no wrapper de conteudo da tela, em vez de `bg-background`, para obter branco no tema claro sem hardcode de cor e mantendo compatibilidade com tema escuro.
- Aplicar o mesmo token `bg-surface` no header sticky da busca para que o topo nao forme uma faixa cinza durante a rolagem.
- Nao alterar componentes internos, cards, carrossel, dados, chamadas de API ou navegacao.

### Consequencias

- A tela `/app/community` volta a parecer uma superficie branca unica no tema claro, alinhada ao refinamento visual aprovado em 2026-06-17.
- A mudanca permanece puramente visual/frontend e nao afeta backend, Prisma, endpoints, payloads, dados, ordenacao ou packages.
- O uso de token preserva suporte a dark mode sem introduzir valor hardcoded de branco.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `/app/community`
- Chrome/CDP local validando `contentBackground` e `stickyBackground` como `rgb(255, 255, 255)`.

## Atualizacao 2026-07-01 - legibilidade dos cards e clique da seta

### Contexto

Na rota publica `/community`, a comunidade em destaque exibida em `Tendencia Hoje` mostrava duas tags visuais (`Destaque` e `Autocuidado`), deixando o card mais carregado do que o necessario. Alem disso, os textos sobre as imagens dos cards ainda competiam com trechos claros dos assets, e a seta desktop do carrossel `Mais Populares` podia receber o clique de forma ambigua, abrindo a comunidade posicionada abaixo em vez de apenas rolar horizontalmente.

### Decisao

- O card de tendencia renderiza somente a tag de destaque/crescimento; categorias continuam visiveis nos cards populares.
- Os overlays dos cards foram reforcados de maneira consistente do topo ao rodape, mantendo a mesma estrutura de imagem, CTA e link.
- A seta desktop do carrossel ganhou `z-index` dedicado e o handler do botao cancela `preventDefault`/`stopPropagation` antes de executar `scrollBy`.

### Consequencias

- A hierarquia do card em destaque fica mais limpa e menos redundante.
- A legibilidade dos textos dos cards melhora sem trocar assets, dados ou arquitetura.
- O controle do carrossel passa a ter comportamento previsivel: clique na seta rola o carrossel e nao navega para a comunidade.
- A mudanca permanece exclusivamente frontend/visual e nao altera backend, Prisma, endpoints, payloads, ordenacao, persistencia ou packages.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- HTTP local `200` em `/community`
- Screenshot local desktop/mobile
- Chrome/CDP em `/community`: tag `Autocuidado` ausente no card `Tendencia Hoje`, `documentWidth=390` no mobile e clique da seta mantendo `href` em `/community` enquanto altera `scrollLeft`.

## Atualizacao 2026-07-01 - grid desktop e seguidores

### Contexto

A iteracao visual seguinte identificou tres ajustes na mesma superficie `/community`: a camada radial adicional do card `Tendencia Hoje` criava uma linha horizontal perceptivel no overlay; no desktop, os cards de `Mais Populares` ainda se comportavam como carrossel e podiam iniciar parcialmente deslocados; e a contagem de comunidades deveria usar linguagem de acompanhamento social (`seguidores`) em vez de `membros`.

### Decisao

- Remover a segunda camada radial do card de destaque e usar um unico gradiente vertical continuo para preservar legibilidade sem uma marcacao horizontal visivel.
- Manter o comportamento mobile-first de rolagem horizontal para `Mais Populares`, mas trocar para uma grade de quatro colunas em `lg`, fazendo os quatro cards caberem na largura util da pagina sem seta/scroll horizontal.
- Alterar apenas a copy exibida da contagem para `seguidor/seguidores`, sem alterar o contrato de API nem o campo real `members_count`.

### Consequencias

- O card em destaque fica visualmente mais suave e sem corte perceptivel no overlay.
- No desktop, a secao `Mais Populares` deixa de depender do controle de carrossel quando os quatro cards ativos estao presentes.
- A linguagem fica mais alinhada ao comportamento esperado de acompanhar comunidades, mantendo compatibilidade com os dados persistidos atuais.
- A mudanca permanece exclusivamente frontend/visual e nao altera backend, Prisma, endpoints, payloads, ordenacao, persistencia ou packages.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `200` em `/community`
- Screenshot local desktop/mobile
- Chrome/CDP em `/community`: desktop com bloco de populares sem overflow horizontal, mobile com `documentWidth=390`, card de destaque sem segunda camada radial e copy `seguidores` nos cards.

## Atualizacao 2026-07-01 - cards populares com titulo como texto principal

### Contexto

Na rota publica `/community`, os cards de `Mais Populares` exibiam titulo, descricao, contagem e CTA dentro de uma area visual compacta. A descricao concorria com o titulo e, por causa do `line-clamp` com `leading` muito justo, descendentes de algumas letras podiam parecer cortados na base, como o `Q` em `Ansiedade em Equilibrio`.

### Decisao

- Remover a renderizacao da descricao nos cards populares, mantendo o titulo como texto principal do card.
- Preservar categoria, contagem real de seguidores e CTA para nao alterar navegacao, dados ou intencao de acao.
- Remover `line-clamp` do titulo e aumentar o `line-height` para `leading-[1.12]`, com `text-wrap: balance`, evitando overflow oculto no texto do titulo.

### Consequencias

- O card fica mais limpo e com hierarquia mais direta para a leitura do titulo.
- Titulos longos podem ocupar ate tres linhas naturais nos cards atuais, mas sem corte vertical por overflow oculto.
- A mudanca permanece exclusivamente visual/frontend e nao altera backend, Prisma, endpoints, payloads, ordenacao, persistencia ou packages.

### Validacao

- `pnpm --dir frontend exec biome check --write "src/app/app/community/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- HTTP local `200` em `/community`
- Chrome/CDP em `/community`: desktop 1440x900 e mobile 390x844 com 4 cards populares sem descricoes, apenas contagem em `p`, titulo com `overflowY=visible` e mobile sem overflow horizontal (`documentWidth=390`).
