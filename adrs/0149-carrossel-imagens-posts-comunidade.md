# ADR-0149: Carrossel de imagens em posts de comunidade

## Status

Accepted

## Task relacionada

TASK-24 / TASK-26 / TASK-28

## Contexto

O upload de midia de posts ja usava storage real R2 e os campos legados `community_post.media_url`/`media_type`, suficientes para uma imagem ou um video. O produto passou a exigir upload de multiplas imagens para carrossel, similar ao padrao de consumo de imagens em redes como Reddit, sem quebrar feeds, detalhes, perfil do psicologo, listas de posts do usuario e edicao de post ja publicados.

## Decisao

Criamos a tabela `community_post_media` para armazenar os itens do carrossel por post, com `media_url`, `media_type`, `position`, soft delete e relacao cascade com `community_post`.

- O carrossel aceita apenas imagens e tem limite de 10 itens.
- Videos continuam sendo midia unica pelo fluxo existente.
- `community_post.media_url` e `community_post.media_type` permanecem como compatibilidade e refletem a primeira midia ativa.
- Os DTOs de post passam a retornar `media_items` ordenado por `position`, com fallback para a midia legada quando nao houver itens no novo relacionamento.
- Criacao e edicao de posts aceitam `mediaItems`, validando que as URLs vieram do prefixo publico permitido do storage real.
- A UI usa um componente unico `PostMediaCarousel` para feed, detalhe e cards reutilizados, mantendo 16:9 para carrossel de imagens.

## Consequencias

- Permite experiencia de carrossel sem alterar o contrato legado de `media_url`/`media_type` de uma vez.
- Evita misturar videos e carrossel, reduzindo complexidade de player/preview neste MVP.
- Edicoes substituem o conjunto anterior do carrossel com soft delete dos itens antigos; nao ha historico publico de midia.
- Posts antigos continuam funcionando pelo fallback de midia unica.
- Futuro suporte a carrossel misto ou reordenacao manual exigira ampliar contrato e UI.

## Validacao

- `pnpm --dir backend db:migrate -- --name add_community_post_media_carousel`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`

## Pendencias

- Validacao visual interativa no browser local deve ser feita quando houver ferramenta/sessao de navegador disponivel.
- Carrossel de videos ou midia mista permanece fora do escopo.


