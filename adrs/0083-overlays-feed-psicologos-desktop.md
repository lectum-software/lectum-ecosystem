# ADR-0083 - Confinamento de overlays no feed desktop de Psicologos

## Status

Accepted

## Contexto

O feed `/app/psychologists` usa scroll-snap vertical e, no desktop, mostra uma pre-visualizacao parcial do proximo card. Durante a transicao entre slides, as camadas de legibilidade de um card inativo podiam continuar visiveis enquanto o card seguinte ja aparecia, criando a percepcao de uma sombra/gradiente herdado do card anterior.

A investigacao confirmou dois pontos sensiveis:

- o topo `Explorar / Minha Busca` tinha um gradiente global absoluto fora dos cards no desktop, funcionando como camada compartilhada do feed;
- overlays, texto, selos e trilha de progresso continuavam renderizados tambem em slides inativos no desktop.

## Decisao

No desktop, a camada visual de cada slide passa a ser considerada parte do chrome do card ativo.

A implementacao adotada foi:

- remover o background de gradiente do controle global `Explorar / Minha Busca` somente em `lg`, evitando uma camada compartilhada fixa sobre a area do feed;
- manter o comportamento mobile inalterado;
- esconder, no desktop, os overlays de legibilidade, badges, textos, botoes internos e trilha de progresso dos slides que nao sao o psicologo ativo;
- manter o overlay inferior dentro dos limites do proprio card ativo, sem usar `fixed`, `sticky`, pseudo-elementos ou wrapper compartilhado para sombreamento.

## Consequencias

- O topo do proximo card aparece limpo durante a navegacao desktop, sem gradiente global residual.
- O ultimo card nao herda sombra do card anterior quando se torna ativo.
- A pre-visualizacao do proximo card continua existindo, mas sem chrome/overlay de cards inativos competindo visualmente.
- A UI interna do card ativo, o scroll-snap, dados, API, backend, Prisma, migrations e packages nao foram alterados.
- A experiencia mobile preserva o padrao anterior, incluindo o gradiente mobile do topo.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/psychologists`

## Task relacionada

Ajuste complementar de UX desktop da TASK-13, solicitado pelo usuario para corrigir sombra/overlay residual no feed de psicologos.
