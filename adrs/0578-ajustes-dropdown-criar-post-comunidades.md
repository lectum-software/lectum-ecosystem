# ADR 0578: Ajustes visuais em dropdowns e criação de post comunitário

Data: 2026-10-08

## Integração para publicação autorizada

- Integrar os três commits locais em `origin/homolog` 9b41d28b numa cópia isolada, preservando os 92 commits remotos e todas as mudanças não commitadas do workspace original. Merge sem force push; resolução de documentos mantém os dois históricos.
- Renumerar este ADR de 0541 para 0578 por colisão com um ADR já publicado, sem apagar o registro remoto. Manifests preservam dependências/scripts atuais e recebem um único bump 0.1.609 → 0.1.610.
- Código funcional alterado somente no frontend. Backend/video: apenas metadado de versão obrigatório, sem implantação, banco, migrations, seed, reinício ou mudança de configuração desses serviços.
- Publicação manual na Vercel, primeiro preview/homologação; depois PR homolog → main e promoção da mesma revisão validada. Preservar a configuração original de autodeploy do frontend/admin, sem alterar vercel.json. Se for necessário suspender deploy automático durante a promoção manual, registrar a configuração original do provider e restaurá-la ao concluir ou interromper a publicação.
- Sem nova variável obrigatória ou dependência. Reverter pelo deployment anterior do frontend em caso de falha, sem modificar dados. Registrar resultados de validação e deploy no PR para não mudar a revisão já testada.
- QA isolado em Chromium local com o `SelectController`, `resolveCommunityOptions`, React Hook Form e CSS compilado reais, alimentados pelas sete comunidades da API local: 390px/1440px, última opção/descrição/separador de 1px dentro da rolagem, busca sem sobreposição, seleção/fechamento e ausência de overflow horizontal aprovados. Seis indicadores condizem com o catálogo; geral não tem cor local. Harness temporário ignorado, sem mock, rota de produto nova ou escrita no banco. Isso valida o componente, não substitui login end-to-end.

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
## Revisão após feedback visual de homologação — sem indicadores coloridos

Em 08/10/2026, o usuário rejeitou os pontos coloridos na captura mobile de homologação por considerar o resultado infantilizado. Esta decisão substitui as anteriores sobre indicadores no seletor, sem modificar a paleta cadastrada das comunidades.

- Remover os pontos das opções e do valor selecionado em todas as variantes do SelectController. A busca continua opaca e fora da rolagem; Saúde Mental em Geral permanece por último, com linha discreta e descrição na própria opção.
- A busca por usos confirmou que somente o seletor de comunidades consumia indicatorColor. Remover a propriedade opcional de FieldOption, a normalização de cor e o mapeamento correspondente, em vez de manter código visual sem consumidor.
- Não alterar cores persistidas, avatares, páginas de comunidade, API ou banco. Nenhuma nova dependência ou env; não implantar backend/admin/video. Os cinco manifests recebem somente o bump sincronizado obrigatório para 0.1.611.
- Referência mobile-first: captura de homologação enviada pelo usuário, PROTO-INVENTORY e Criar Nova Postagem - Psicólogo.jpg. Builder/Quick Copy não está disponível neste cliente.
- Testes de regressão verificam ausência de indicador mesmo com cor válida recebida da API, preservação do catálogo, ordenação, descrição e separador. Os 20 testes focais passaram.
- Check completo do frontend e build aprovados em 0.1.611. Chromium local em 390px/1440px com SelectController, CSS compilado e sete comunidades reais da API local: zero indicadores nas opções e no selecionado, última opção/descrição/separador de 1px na rolagem, busca sem sobreposição e sem overflow horizontal; seleção e fechamento aprovados. Sem mocks ou escrita no banco. A inspeção isolada do componente não substitui validação autenticada da modal; evidência remota depende do usuário, sem contornar o bloqueio de URL do Computer Use.
- Publicar a nova revisão somente em homologação para nova revisão visual; invalidar a candidatura produtiva de d040d7a9 no PR #97. Preservar toda a configuração original de autodeploy e os arquivos locais não relacionados do workspace original.

## Compatibilidade dos testes com o guard de tokens

- O pre-push de 0.1.611 bloqueou cores literais no teste de regressão, apesar dos checks das aplicações aprovados. Substituídas pelos valores da fonte central FALLBACK_COMMUNITY_PALETTE, somente no teste, sem alterar o guard nem criar exceções.
- Os 20 testes focais e check:source-safety passaram após a correção. O frontend de produto é idêntico ao validado visualmente em 0.1.611; o novo commit recebe o bump obrigatório 0.1.612 e será novamente validado antes do push/deploy.
- Build frontend 0.1.612 aprovado; guards de source-safety, encoding, ADRs, tasks, source-size, ciclos e segredos aprovados. Sem alteração de código runtime em relação a 0.1.611.
