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

## Correção de posicionamento em 2026-10-08

- Substituir a decisão de microcópia no topo do formulário: a orientação pertence à opção real `saude-mental-em-geral`, identificada pelo slug da API local, não pelo título editável.
- Ordenar essa comunidade por último, preservando ordem alfabética das demais. Não criar comunidade artificial se ela não estiver no catálogo.
- Usar descrição opcional em `FieldOption` no controller existente. Título e descrição compõem a mesma opção clicável, dentro da rolagem normal, sem rodapé fixo/sticky. A busca continua filtrando por título/grupo e preserva a ordem dos resultados.
- Preservar cores e tamanhos atuais dos indicadores neste ajuste de posicionamento.
- Referência mobile-first (~390px): inventário, `_product/proto/Criar Nova Postagem - Psicólogo.jpg` e esclarecimento explícito do usuário. Builder/Quick Copy não está exposto neste cliente.
- Sem dependências, env, contratos, backend ou banco novos; compatível com rollout independente. Rollback por reversão do ajuste frontend. Sem push/deploy nesta execução, conforme pedido.
- Validação deste complemento: `pnpm --dir frontend check` aprovado (545 testes aprovados, um skip preexistente de symlink no Windows); 19 testes focais dos controllers aprovados. Verificação adicional com as sete comunidades reais da API local confirmou ordem, descrição exclusiva e ausência de itens artificiais. Guards de encoding, ADRs, tasks, source-safety, source-size e versão aprovados.
- Browser local: a navegação real à criação de post redirecionou para login. Sem browser autenticado conectado ao Computer Use, validação visual mobile/desktop permanece pendente; nenhum guard foi contornado e nenhum mock substituiu a API.
- `pnpm --dir frontend build` aprovado. Alterações mantidas locais, sem push/deploy e sem escrita no banco.
