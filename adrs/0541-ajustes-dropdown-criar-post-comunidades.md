# ADR 0541: Ajustes visuais em dropdowns e criação de post comunitário

Data: 2026-10-08

## Status

Aceito

## Contexto

Os dropdowns pesquisáveis usavam busca `sticky` dentro do próprio painel, mas a lista rolava visualmente por baixo do campo de busca em alguns contextos, inclusive nos filtros de psicólogos. Na criação de post, também era necessário orientar pacientes e psicólogos com o texto "Não sabe onde postar? Publique aqui." e evidenciar as cores reais das comunidades no seletor.

## Decisão

- Elevar e isolar o painel do `SelectController` compartilhado, mantendo a busca pesquisável opaca, com borda e sombra própria.
- Renderizar um ponto colorido opcional em opções e valor selecionado quando o `FieldOption` informar `indicatorColor`.
- Popular o seletor de comunidades da criação de post com `visual_primary_color` vindo da API, normalizando apenas cores hexadecimais seguras.
- Adicionar a microcópia "Não sabe onde postar? Publique aqui." no topo do modal/sheet mobile-first de criação de post.

## Consequências

- A correção é aditiva e limitada ao frontend; não altera contrato HTTP, banco, env, upload, filas ou permissões.
- Todos os selects existentes continuam sem ponto colorido por padrão.
- Os filtros de psicólogos herdam a correção de sobreposição por usarem o mesmo `SelectController`.
- Comunidades sem cor válida continuam funcionando sem indicador visual.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

Validação visual em browser local ficou limitada porque o cliente não expôs browsers conectados via Computer Use nesta execução.
