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
