# ADR-0034: Paridade visual mobile de analytics e avaliações do psicólogo

## Status

Accepted

## Task relacionada

TASK-19 e TASK-20 (ajuste complementar solicitado em 2026-06-09)

## Contexto

As telas privadas `/app/professional/reviews` e `/app/professional/analytics` já estavam funcionais, mas o layout precisava ficar mais fiel às imagens de referência `Minhas Avaliações - Psicólogo.jpg` e `Meus Analytics - Psicólogo.jpg`.

A regra de domínio permanece: não simular dados. Portanto, a paridade visual não pode criar percentuais, ranking de busca, views de vídeo, favoritos ou abertura de perfil sem evento persistido.

## Decisão

- As duas telas passam a renderizar como uma superfície mobile-first de 390px, sem navegação inferior, com header branco fixo visualmente alinhado ao protótipo.
- `Minhas Avaliações` remove os filtros visíveis do primeiro corte visual e prioriza o card de resumo, barras de distribuição, seção `Depoimentos Recentes`, cards brancos, resposta destacada e botão pontilhado de carregar anteriores.
- O formulário de resposta continua usando React Hook Form/Zod via `useReviewResponseForm`, mas foi estilizado para se aproximar do textarea e botão do protótipo.
- `Meus Analytics` passa a usar tabs e cards no grid 2x3 do protótipo. Métricas não rastreadas aparecem como `—` com indicação discreta de ausência de evento, em vez de números fabricados.
- O card de link de avaliações e a dica Pro seguem a composição visual da referência; a seção de busca por especialidades mantém a área do layout, mas informa que percentuais dependem de evento persistido futuro.

## Consequências

- A UI fica mais próxima das referências fornecidas sem violar a política de não usar mocks ou dados fake.
- O contrato de dados e os endpoints permanecem inalterados; a mudança é somente frontend.
- `profile_view_event`, busca por especialidade e video/favorite analytics continuam pendências de produto/dados antes de exibirem números reais.

## Validação

- `pnpm --dir frontend check`
- `pnpm check`
- `pnpm --dir frontend exec next build --turbo`
- `pnpm --dir frontend build`
- Browser local em `http://localhost:3002/app/professional/analytics` e `http://localhost:3002/app/professional/reviews`; sem sessão autenticada, ambas as rotas responderam e preservaram o gate para login.

## Observação operacional

Durante a validação, o primeiro `pnpm --dir frontend build` falhou por `ENOSPC` (disco local sem espaço) ao escrever cache do Webpack. Foram limpos caches locais de navegador/npm/pnpm e o build Webpack oficial passou em seguida.
