# ADR 0142 - Rolagem infinita no perfil público do psicólogo

Status: Accepted

## Contexto

As abas públicas de `Publicações` e `Avaliações` do perfil do psicólogo ainda exibiam a barra de paginação manual (`Anterior`, `Página X de Y`, `Próxima`) no fim da lista. O restante da experiência comunitária do MVP já usa carregamento incremental por rolagem infinita no feed e dentro das comunidades, reduzindo fricção principalmente no mobile.

A alteração é visual e de experiência de navegação no frontend. Não altera contratos de backend, não cria novos modelos e não muda a ordenação, filtros ou quantidade por página retornada pela API. O inventário visual ativo foi consultado para as telas `Perfil Profissional - Publicações` e `Perfil Profissional - Avaliações`; Builder/Quick Copy não está disponível como ferramenta executável neste ambiente, então a validação usou os padrões locais já implementados no feed/comunidade.

## Decisão

- Remover a barra de paginação manual das abas `Publicações` e `Avaliações` do perfil público do psicólogo.
- Manter o endpoint paginado existente, mas consumir as páginas com `useInfiniteQuery` no frontend.
- Criar hooks específicos para listas infinitas de publicações e avaliações do perfil, preservando os hooks paginados existentes para os previews da aba `Sobre`.
- Usar um sentinel com `IntersectionObserver` para buscar a próxima página automaticamente quando o usuário se aproxima do fim da lista.
- Deduplicar itens carregados entre páginas antes de renderizar, evitando repetição visual em caso de revalidação/cache.
- Tornar os cards de publicações do perfil navegáveis pelas áreas neutras do corpo do card, reutilizando a proteção existente contra propagação em links, botões, menus e controles inferiores.

## Consequências

- A navegação nas abas do perfil fica contínua e consistente com feed e comunidades.
- O backend permanece simples e compatível com paginação `page/limit` atual.
- A URL deixa de depender de `postsPage`/`reviewsPage` para avançar nessas abas; parâmetros legados são ignorados pela nova experiência.
- A página inicial da aba `Sobre` continua usando apenas a primeira página para preservar o comportamento de preview e reduzir carga inicial.
- O clique em título, texto e espaços vazios dos cards de publicações abre a página de detalhes do post, enquanto nome da comunidade, ações de voto, comentários, salvar, compartilhar e demais controles permanecem independentes.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local:
  - `http://127.0.0.1:3000/app/psychologist/cmqmg35850000asuheq2ucwd0?tab=publicacoes` retornou 200.
  - `http://127.0.0.1:3000/app/psychologist/cmqmg35850000asuheq2ucwd0?tab=avaliacoes` retornou 200.
- Complemento de navegação por áreas neutras:
  - `pnpm check`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - Smoke HTTP local: `http://127.0.0.1:3000/app/psychologist/cmqmg35850000asuheq2ucwd0?tab=publicacoes` retornou 200.

## Pendências

- Sem pendências externas. A rolagem infinita usa os dados paginados reais já retornados pelos endpoints existentes.
