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

## Refinamento de separador e cor — regra uniforme confirmada

- Adicionar `separatorBefore` opcional ao controller existente: borda discreta usando `border-border/60`, dentro da área rolável. Não renderizar separador quando a opção for o primeiro/único resultado da busca.
- A API local retorna todos os campos de paleta vazios para `saude-mental-em-geral`. Após indicar o verde na captura, o usuário esclareceu que a cor deve seguir exatamente a regra das demais comunidades. Removido o fallback específico experimental e seu token, sem persistir nenhuma alteração no banco.
- Todas as opções usam somente `visual_primary_color` hexadecimal válido, sem exceção por slug/ambiente. Valor ausente/inválido não mostra ponto. A captura não autoriza duplicar configuração produtiva no frontend.
- Indicadores de opções com descrição ficam alinhados ao título, não ao centro do bloco inteiro. Separador, título e descrição continuam dentro da rolagem; fonte mobile-first e limitações de Builder/browser permanecem as do complemento anterior.
- `pnpm --dir frontend check` e `pnpm --dir frontend build` aprovados na versão final sem fallback; 546 testes aprovados e um skip preexistente de symlink no Windows. Os 20 testes focais passaram. Verificação com as sete comunidades reais locais confirmou ordem, separador e regra uniforme de cor. Guards de source-safety, encoding, ADRs, tasks, source-size e versão aprovados.
- Validação visual autenticada permanece pendente: Computer Use sem browsers conectados e navegador automatizado sem sessão. Nenhum push/deploy, alteração de banco, dependência ou env. Versão dos manifests locais: 0.1.520.
