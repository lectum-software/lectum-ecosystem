# ADR-0086 - Fullscreen vertical dos videos do feed de comunidade

## Status

Accepted

## Contexto

No feed de comunidade (`/app/community/feed`), os videos de posts e de respostas profissionais usam o player nativo do navegador dentro do card. No desktop, ao acionar o fullscreen nativo, o video herdava uma experiencia de tela cheia ampla demais para midias verticais, ficando visualmente esticado ou cortado de forma agressiva.

A regra de produto pede que apenas o modo expandido/fullscreen seja ajustado no desktop; o player embutido no card deve permanecer igual e o mobile pode manter o comportamento responsivo atual.

## Decisao

- Marcar os videos de post e resposta profissional com a classe `lectum-community-feed-video`.
- Adicionar regra CSS apenas em desktop (`min-width: 1024px`) para o estado nativo `:fullscreen` e o fallback WebKit `:-webkit-full-screen`.
- No fullscreen desktop, limitar o box do video a proporcao vertical `9 / 16`, centralizado, com `object-fit: contain`, fundo preto e backdrop escuro.
- Manter as classes originais de card (`object-cover`, proporcoes e bordas) sem alteracao fora do estado fullscreen.

## Consequencias

- Videos verticais expandidos no desktop deixam de preencher agressivamente toda a largura da tela.
- O conteudo principal do video fica preservado em 9:16 com fundo escuro ao redor.
- Mobile permanece sem nova regra de fullscreen desktop.
- Nao houve mudanca de backend, contratos de API, Prisma, packages ou comportamento do player embutido no feed.

## Task relacionada

Ajuste complementar de UX visual da TASK-23 em `/app/community/feed`.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local em `http://127.0.0.1:3000/app/community/feed`
