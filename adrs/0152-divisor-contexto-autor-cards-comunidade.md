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
