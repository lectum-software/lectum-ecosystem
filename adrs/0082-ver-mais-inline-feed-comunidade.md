# ADR-0082 - Ver mais inline no feed de comunidade

## Status

Accepted

## Contexto

No feed de comunidade (`/app/community/feed`), o truncamento do texto do post e da resposta profissional posicionava `... ver mais` de forma absoluta sobre a ultima linha. Em mobile, esse padrao criava desalinhamento visual: o controle parecia solto, deslocado para a direita e interferia na leitura natural do paragrafo.

O pedido foi corrigir somente o alinhamento e comportamento visual do texto truncado/expandido, sem alterar o conteudo dos textos nem a estrutura geral dos cards.

## Decisao

Substituir o truncamento baseado em `line-clamp` + botao absoluto por um componente local de texto expansivel inline. O componente calcula uma pre-visualizacao textual curta, respeita limite por tipo de conteudo e renderiza `... ver mais` no fluxo do proprio paragrafo.

O botao inline usa o mesmo tamanho de fonte, mesma altura de linha e fonte herdada do texto imediatamente anterior. A unica diferenca visual e uma cor levemente interativa. O mesmo padrao passou a ser usado no texto principal do post e no texto da resposta profissional.

## Consequencias

- `... ver mais` deixa de usar posicionamento absoluto, gradiente, padding manual e deslocamento fixo.
- A leitura mobile fica mais natural porque o controle participa do fluxo do paragrafo.
- O conteudo completo permanece intacto quando expandido.
- Nenhum backend, Prisma, migration, contrato de API, package ou estrutura geral de post foi alterado.

## Validacoes

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://127.0.0.1:3000/app/community/feed`

## Task relacionada

Ajuste complementar de UX visual da TASK-23 em `/app/community/feed`.
