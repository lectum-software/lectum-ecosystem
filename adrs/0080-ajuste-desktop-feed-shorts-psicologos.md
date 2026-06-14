# ADR-0080 - Ajuste desktop limpo do feed Shorts de psicologos

## Status

Accepted

## Contexto

A versao desktop de `/app/psychologists` ja usava feed vertical com `scroll-snap`, card 9:16 e previa parcial do proximo psicologo. Depois do primeiro ajuste, foram identificados tres problemas visuais: uma faixa residual perto da sidebar quando ela estava recolhida, sombras/gradientes externos criando separacoes no feed e setas de navegacao ainda ligadas demais ao card.

O pedido foi corrigir somente desktop, preservar mobile, nao alterar a UI interna do card, nao criar scroll no `body` e manter o comportamento de `scroll-snap`.

## Decisao

A causa raiz da faixa residual na rota era o `contentClassName` de `/app/psychologists` forcar `lg:pl-[240px]`, mesmo quando a sidebar desktop estava recolhida em 88px. A rota deixou de sobrescrever esse padding e voltou a respeitar o padding dinamico do `PrivateTemplate`.

Para a mesma rota, o `PrivateTemplate` recebeu a opcao `desktopSidebarSurface="flat"`, que remove somente a sombra projetada da sidebar desktop sem alterar sua navegacao, largura, estado recolhido/expandido ou mobile.

No feed desktop:

- a sombra externa do card foi removida, mantendo apenas o fundo limpo e continuo da area principal;
- as variaveis de layout aumentaram levemente o card 9:16 e reduziram o intervalo ate a previa do proximo card;
- os botoes de navegacao anterior/proximo passaram a usar posicionamento fixo na lateral direita da viewport, separados do card, no padrao de Shorts.

## Consequencias

- O mobile permanece inalterado porque as mudancas de tamanho/posicionamento usam `@media (min-width: 1024px)` ou props da sidebar desktop.
- O scroll global continua bloqueado em desktop para esta rota; a area rolavel segue sendo o container interno `.psychologists-video-feed`.
- A coluna do feed passa a ser centralizada pela area util real a direita da sidebar, inclusive quando a sidebar esta recolhida.
- Nenhum contrato de API, Prisma, migration, dado ou package foi alterado.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/psychologists`

## Task relacionada

Ajuste complementar de UX desktop da TASK-13 em `/app/psychologists`.
