# ADR-0094: Estado vazio do filtro de comunidades seguidas no feed geral

## Status

Aceita em 2026-06-15.

## Contexto

O filtro lateral do feed geral `/app/community/feed` permite alternar entre todas as comunidades e comunidades seguidas. Quando o usuário não seguia nenhuma comunidade, o estado vazio anterior era genérico e sugeria que a funcionalidade ainda não estava ativa. Também era necessário diferenciar o caso em que o usuário segue comunidades, mas elas não possuem posts para o filtro atual.

O feed principal deve abrir sempre no maior recorte possível de conteúdo, por isso o filtro "Comunidades que sigo" não deve ser persistido entre acessos. A referência visual ativa continua sendo Builder/Quick Copy, mas a ferramenta não está exposta como callable neste ambiente; a validação visual usou a tela local `_product/proto/Feed Comunidade.jpg` e a implementação vigente do feed.

## Decisão

O endpoint `GET /api/private/community/feed/posts` passou a devolver `following_count` quando `scope="following"`. Esse contador mede comunidades seguidas reais via `community_member`, independentemente de haver posts no filtro atual, permitindo ao frontend distinguir:

- usuário sem nenhuma comunidade seguida;
- usuário com comunidades seguidas, mas sem posts no recorte selecionado.

No frontend, o estado vazio do feed geral agora renderiza:

- título "Você ainda não segue nenhuma comunidade", descrição orientativa e CTA "Encontrar comunidades" apontando para `/app/community` quando `following_count` é zero;
- título "Nenhuma publicação encontrada" e descrição específica quando há comunidades seguidas, mas sem posts no filtro;
- comportamento anterior para o recorte "Todas as comunidades".

O estado do filtro permanece local em `useState("all")`, sem localStorage, sessionStorage ou query param. Assim, ao montar novamente o feed, o padrão volta a ser "Todas as comunidades".

## Consequências

- O estado vazio fica mais honesto e acionável para quem ainda não segue comunidades.
- Usuários que seguem comunidades recebem uma mensagem correta quando não há conteúdo no filtro.
- O contrato do feed ganha metadado opcional sem alterar a estrutura de posts nem exigir nova migration.
- O CTA abre a tela de comunidades e não a busca global.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke local com `next start -p 3007` e `GET /app/community/feed` retornando HTTP 200.

## Pendências

- Nenhuma.
