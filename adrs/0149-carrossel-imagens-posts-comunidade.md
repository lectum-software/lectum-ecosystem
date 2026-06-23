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

## Complemento 2026-06-22 - miniaturas individuais na criacao do post

A modal `Criar Post` ja permitia selecionar multiplas imagens, mas a previa local agrupava tudo em um unico bloco grande com navegacao de carrossel. Isso escondia area de texto e confundia a acao de remocao antes da publicacao.

Decisao complementar:

- Na criacao do post, a previa local das midias selecionadas deixa de simular o carrossel final.
- Cada arquivo selecionado passa a ser exibido como uma miniatura independente e compacta, com seu proprio botao `X` de exclusao.
- A faixa de miniaturas nao recebe container visual destacado; ela funciona apenas como layout horizontal com limite de altura e rolagem horizontal quando necessario.
- A orientacao estimada por metadados continua sendo usada para diferenciar miniaturas horizontais, verticais e quadradas.
- A exibicao publicada do post continua usando o componente de carrossel quando ha multiplas imagens.

Consequencias:

- O campo de titulo/conteudo permanece visivel durante anexos multiplos.
- A remocao antes de publicar fica granular por arquivo.
- Nao ha mudanca no contrato de API, schema, storage, limite de 10 imagens, regra de video unico ou DTOs.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-22 - setas persistentes no carrossel publicado

Embora o carrossel de posts ja tivesse dots para navegação direta, o consumo no feed mobile nao deixava claro que havia mais imagens. A navegacao precisa ser obvia em qualquer ponto onde o carrossel publicado aparece.

Decisao complementar:

- Centralizar a solucao no `PostMediaCarousel`, componente compartilhado por feed geral, paginas de comunidade, detalhe do post e cards reutilizados.
- Exibir botoes persistentes de anterior/proximo sempre que houver mais de uma imagem.
- Usar botoes nativos com `z-index` explicito, fundo escuro translúcido, borda clara e blur para garantir contraste sobre imagens claras/escuras.
- Adicionar gradientes laterais sutis para reforcar a descoberta dos controles sem transformar a midia em um container pesado.
- Fazer setas e dots chamarem `preventDefault`/`stopPropagation`, evitando abrir o card/post ao navegar pelo carrossel.

Consequencias:

- Todos os locais que renderizam carrossel publicado recebem as setas sem duplicar implementacao.
- A descoberta de multiplas imagens melhora no mobile e desktop.
- Nao altera contrato de API, schema, storage, limite de 10 imagens, upload, edicao ou a regra atual de carrossel apenas com imagens.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.


## Complemento 2026-06-22 - carrossel na listagem interna da comunidade

A tela interna de comunidade (`/app/community/[slug]`) possuia um `PostMedia` local que ainda renderizava apenas `media_url`/`media_type` legado. Assim, posts com `media_items` reais apareciam como midia unica e nao exibiam as setas persistentes do `PostMediaCarousel`.

Decisao complementar:

- A listagem interna da comunidade passa a derivar `imageMediaItems` de `post.media_items` e usar `PostMediaCarousel` quando houver mais de uma imagem.
- O fallback legado de `media_url`/`media_type` permanece para posts antigos ou midia unica.
- O CTA de WhatsApp passa a considerar `media_items` alem de `media_url` ao decidir se fica anexado a midia.
- A correcao e local ao frontend e nao altera contrato de API, schema, storage, upload, limites ou regra de carrossel apenas com imagens.

Consequencias:

- Posts com varias imagens exibem as setas laterais tambem dentro da pagina da comunidade e no feed dinamico que reutiliza essa tela.
- A navegacao do carrossel permanece centralizada no componente compartilhado `PostMediaCarousel`, evitando duplicacao de controles.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.
