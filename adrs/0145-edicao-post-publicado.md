# ADR-0145: Edição de post publicado

## Status

Accepted — 2026-06-21

## Contexto

O produto precisa permitir que o autor corrija um post depois de publicado. O fluxo deve reaproveitar a experiência já existente de criação e os menus de ações do dono do post, sem permitir alterações que quebrariam o contexto de respostas já publicadas.

Também é necessário sinalizar publicamente que o conteúdo foi editado, mas sem criar uma trilha de auditoria completa neste momento.

Após a primeira versão, produto pediu que a edição usasse exatamente a mesma superfície visual da criação de post. A antiga faixa informativa azul de "Dados fixos" não deve aparecer; campos imutáveis devem permanecer visíveis e inativos dentro do próprio layout.

Builder/Quick Copy não está disponível como ferramenta callable neste ambiente; a referência visual usada foi a aplicação local e os protótipos exportados em `_product/proto`.

## Decisão

- Adicionar `community_post.edited_at DateTime?` para registrar a última edição pública do post.
- Criar `PUT /api/private/posts/:id`, restrito ao autor autenticado do post.
- Permitir editar somente `title`, `content`, `media_url` e `media_type`.
- Manter imutáveis pelo fluxo de edição: comunidade, autoria, anonimato e status.
- Renderizar a edição no mesmo sheet/modal da criação de post: cabeçalho com fechar/título/ajuda, área branca editorial sem caixas de formulário pesadas, rodapé fixo com mídia/anonimato e botão primário.
- Exibir campos imutáveis como controles desabilitados no próprio fluxo: comunidade como seletor inativo e anonimato como switch inativo quando aplicável, sem faixa azul de dados fixos.
- Para mídia nova/substituída, exigir URL pública emitida pelo upload R2 real em `/public/files/posts/media/` e o mesmo entitlement de mídia dos posts de psicólogos verificados/assinantes/cortesia.
- Permitir remoção de mídia via `mediaUrl:null` e `mediaType:null`.
- Exibir o metadado discreto `editado` nos cards e no detalhe quando `edited_at` existir.
- Não criar histórico de versões no MVP; se houver necessidade de auditoria/moderação granular, criar modelo específico em ADR futura.

## Consequências

- A edição é simples, reversível do ponto de vista de produto e não altera a identidade da conversa.
- A edição fica visualmente consistente com a criação; alertas fixos foram removidos da superfície principal para não criar um layout paralelo.
- O campo `edited_at` é suficiente para transparência visual, mas não permite recuperar versões anteriores.
- A implementação permanece sem mocks, endpoints paralelos ou dependências novas.

## Validação

- `pnpm --dir backend db:migrate -- --name add_community_post_edited_at`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile 390x844 em `/app/posts/mine`, confirmando modal de edição sem faixa `Dados fixos`, com comunidade inativa e layout igual ao sheet de criação.
