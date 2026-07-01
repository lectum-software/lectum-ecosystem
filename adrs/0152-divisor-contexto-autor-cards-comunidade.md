# ADR-0152: Divisor entre contexto e autor nos cards de conteúdo

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

Os cards de conteúdo exibidos fora do detalhe do post reúnem duas informações próximas: o contexto da publicação (`Postado em`/`Respondido em`) e a autoria do conteúdo. Em telas compactas, especialmente no feed e nas listas de publicações, essa proximidade visual podia dificultar a leitura da hierarquia entre comunidade e autor.

## Decisão

- Adicionar uma linha horizontal fina entre o cabeçalho de contexto e a linha de autoria nos cards de conteúdo.
- Aplicar a regra nos cards reutilizados por feed, salvos, meus posts/respostas e publicações do perfil do psicólogo.
- Aplicar a regra também no card local da listagem interna de comunidade quando o cabeçalho `Postado em` estiver visível.
- Não aplicar o divisor no detalhe do post, mantendo a tela focada no conteúdo original e sem alterar a hierarquia visual já existente.
- Usar cor sutil (`#E7EEF6` / `border` no dark mode) e espaçamento curto para separar sem criar um bloco visual pesado.

## Consequências

- O leitor diferencia mais rapidamente o contexto da comunidade e o autor do conteúdo.
- A alteração permanece visual e não impacta endpoints, dados, tracking, votos, salvos, mídia, WhatsApp ou regras de navegação.
- Novos cards de conteúdo que exibirem contexto e autoria devem seguir o mesmo padrão de divisor, exceto quando estiverem no detalhe do post.

## Validação

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual foi orientada pelo screenshot do usuário e pelos componentes existentes.

## Atualizacao 2026-07-01 - gap compacto no contexto da comunidade

### Contexto

No topo do detalhe do post e dos cards de comunidade, o par `Postado em`/`Respondido em` + nome da comunidade deve ser lido como uma unica frase curta. O gap anterior (`gap-1.5`) podia parecer maior que um espaco textual normal, especialmente no desktop.

### Decisao

- Reduzir o gap horizontal entre icone, label de contexto e nome da comunidade para `gap-1`/`gap-x-1`.
- Preservar o `gap-y-2` no detalhe do post para manter respiro quando a linha quebrar em telas mobile.
- Aplicar o mesmo ajuste no card local da comunidade e no `CommunityPostCard` compartilhado, sem alterar follow, badges, links, truncamento, dados ou navegacao.

### Consequencias

- O nome da comunidade fica visualmente conectado ao texto `Postado em`, mais proximo da referencia `_product/proto/Dentro do Post.jpg`.
- A mudanca e apenas visual de frontend; nao altera backend, Prisma, endpoints, tracking, votos, salvos, comentarios, midias ou regras de permissao.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Chrome/CDP em `/community/ansiedade-em-equilibrio/post/cmr15abhh0004msuh2c5gqi5v`: gap medido de `3.75px` em viewport mobile 390x844 e `4px` em desktop 1365x768.
