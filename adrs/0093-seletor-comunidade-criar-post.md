# ADR-0093: Seletor simples de comunidade na criação de post

## Status

Aceita em 2026-06-15.

## Contexto

A tela de criação de post precisava reduzir o ruído visual do seletor de comunidade. O dropdown ainda exibia agrupamentos por categoria, como saúde emocional e autocuidado, além de uma opção textual redundante "Escolher comunidade" dentro da lista. O comportamento desejado é abrir o seletor com apenas campo de busca e lista simples de comunidades, preservando a busca e os dados reais já carregados pela API.

O Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi conferida pelos protótipos locais de criação de postagem em `_product/proto` e pela implementação atual da tela.

## Decisão

A alteração ficou restrita ao frontend:

- `CreateCommunityPostLogic` passou a construir as opções do seletor sem o campo `group`, impedindo a renderização de cabeçalhos/categorias no dropdown.
- A lista continua ordenada alfabeticamente pelo nome visível da comunidade usando `Intl.Collator("pt-BR", { sensitivity: "base" })`.
- O `SelectController` recebeu a opção `hideEmptyOption` para permitir, apenas neste seletor, ocultar a linha vazia/placeholder dentro do dropdown sem afetar outros selects do produto.
- O seletor de comunidade em `use-form.tsx` ativa `hideEmptyOption`, mantendo o placeholder do campo fechado e removendo o item "Escolher comunidade" da lista aberta.
- A busca existente foi preservada e continua filtrando a lista já ordenada.

## Consequências

- O seletor fica mais direto: busca + comunidades em ordem alfabética.
- Outros selects continuam com o comportamento anterior de opção vazia/placeholder.
- Não houve alteração de contrato de API, lógica de publicação ou dependências.
- O seletor de criação de post não oferece mais uma opção explícita para limpar a comunidade pelo dropdown, o que é aceitável porque o campo é obrigatório e o usuário pode trocar para outra comunidade.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start -p 3007` e `GET /app/community/feed/post/new` retornando HTTP 200.

## Pendências

- Nenhuma.
