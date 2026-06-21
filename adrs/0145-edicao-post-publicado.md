# ADR-0145: Edição de post publicado

## Status

Accepted — 2026-06-21

## Contexto

O produto precisa permitir que o autor corrija um post depois de publicado. O fluxo deve reaproveitar a experiência já existente de criação e os menus de ações do dono do post, sem permitir alterações que quebrariam o contexto de respostas já publicadas.

Também é necessário sinalizar publicamente que o conteúdo foi editado, mas sem criar uma trilha de auditoria completa neste momento.

Builder/Quick Copy não está disponível como ferramenta callable neste ambiente; a referência visual usada foi a aplicação local e os protótipos exportados em `_product/proto`.

## Decisão

- Adicionar `community_post.edited_at DateTime?` para registrar a última edição pública do post.
- Criar `PUT /api/private/posts/:id`, restrito ao autor autenticado do post.
- Permitir editar somente `title`, `content`, `media_url` e `media_type`.
- Manter imutáveis pelo fluxo de edição: comunidade, autoria, anonimato e status.
- Para mídia nova/substituída, exigir URL pública emitida pelo upload R2 real em `/public/files/posts/media/` e o mesmo entitlement de mídia dos posts de psicólogos verificados/assinantes/cortesia.
- Permitir remoção de mídia via `mediaUrl:null` e `mediaType:null`.
- Exibir o metadado discreto `editado` nos cards e no detalhe quando `edited_at` existir.
- Não criar histórico de versões no MVP; se houver necessidade de auditoria/moderação granular, criar modelo específico em ADR futura.

## Consequências

- A edição é simples, reversível do ponto de vista de produto e não altera a identidade da conversa.
- Posts com respostas exibem alerta no modal para orientar preservação de contexto, mas a edição não é bloqueada.
- O campo `edited_at` é suficiente para transparência visual, mas não permite recuperar versões anteriores.
- A implementação permanece sem mocks, endpoints paralelos ou dependências novas.

## Validação

- `pnpm --dir backend db:migrate -- --name add_community_post_edited_at`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
