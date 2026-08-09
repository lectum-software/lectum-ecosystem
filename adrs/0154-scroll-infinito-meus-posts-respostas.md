# ADR-0154: Scroll infinito em Meus posts e respostas

## Status

Accepted

## Task relacionada

TASK-28

## Contexto

A tela `/app/posts/mine` exibia uma barra de paginação manual no fim das abas `Posts` e `Respostas/Comentários`. Em mobile, esse controle cria uma interrupção artificial no consumo de conteúdo e exige um clique adicional para continuar navegando pela própria produção do usuário.

O endpoint `GET /api/private/posts/mine` já possui contrato paginado real (`page`, `limit`, `pages`, `count`), então a mudança poderia reaproveitar o backend existente sem alterar schema Prisma nem criar endpoint novo.

## Decisão

- Remover a barra visual `Anterior / Próxima` da tela `Meus posts e respostas`.
- Criar `useInfiniteMyPosts` com TanStack Query, usando o mesmo endpoint paginado e `getNextPageParam` baseado em `page < pages`.
- Achatar as páginas recebidas no frontend e deduplicar itens por `id` para evitar duplicidade em refetches ou invalidações.
- Carregar a próxima página automaticamente com um sentinel via `IntersectionObserver`, mantendo apenas feedback de loading incremental quando houver busca ativa.
- Preservar as consultas leves de contagem para a aba inativa, garantindo que os números de `Posts` e `Respostas/Comentários` continuem reais.

## Consequências

- A navegação fica contínua e mais natural em mobile e desktop.
- A tela deixa de depender de clique manual para avançar páginas, mas continua respeitando o contrato paginado do backend.
- Invalidações existentes em `posts.mine` continuam funcionando porque a nova query mantém a mesma raiz de cache.
- Não há impacto em banco, permissões, edição, exclusão, mídia, WhatsApp, salvos ou ranking.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual foi orientada pelo screenshot do usuário e pelos componentes existentes.
