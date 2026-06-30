# ADR-0189: Feed da comunidade como home pública

## Status

Accepted

## Task relacionada

Ajuste ad hoc solicitado pelo usuário, sem arquivo `TASK-XX` dedicado.

## Contexto

Após a navegação global passar a tratar o feed de comunidade como `Início`, a
rota pública `/` ainda redirecionava para `/psychologists`. Isso criava uma
inconsistência entre a navegação principal do produto e a entrada canônica do
site, além de manter metadados/sitemap focados em outra página.

## Decisão

- A rota `/` passa a renderizar o feed agregado da comunidade.
- `DEFAULT_COMMUNITY_FEED_HREF` passa a ser `/`.
- `/community/feed` permanece disponível como compatibilidade, mas seus
  metadados apontam o canonical para `/`.
- O sitemap passa a listar `/` como rota pública de maior prioridade e deixa de
  listar `/community/feed` para evitar duplicidade.
- O `llms.txt` passa a destacar o feed inicial em `/`.

## Consequências

- Links internos de `Início`, `Voltar ao feed` e finalizações de fluxo passam a
  apontar para `/`.
- Links antigos para `/community/feed` continuam carregando o mesmo feed.
- SEO e crawlers passam a concentrar a autoridade do feed em `/`.
- Rotas internas de criação de post continuam sob `/app/community/feed/post/new`
  porque ainda dependem do slug técnico `feed` para o fluxo autenticado.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke local com `next start -p 3106`: `/` respondeu `200` com `<title>Início | Lectum</title>` e canonical root; `/community/feed` respondeu `200` com canonical root.
- Smoke local confirmou sitemap com `/` e sem `/community/feed`, além de manifest com `start_url: "/"`.

## Pendências

- Nenhuma pendência externa.
