# ADR-0514 — Open Graph padrão e metadados privados padronizados

Data: 2026-09-17

## Status

Aceita

## Contexto

O Admin **SEO / Metadados** usava `/logo-light.png` como fallback técnico da imagem Open Graph dos registros gerenciados. O usuário pediu que a imagem padrão do site fosse redefinida para a logo anexada e observou que rotas privadas visíveis no produto, como perfil, favoritos e notificações, não apareciam na lista de padronização do painel.

As áreas privadas sob `/app` continuam não indexáveis pela arquitetura do produto. A inclusão no Admin serve para padronizar título, descrição e Open Graph, não para publicar essas páginas em mecanismos de busca.

## Decisão

- Criar o asset público `/lectum-og-default.png` em `frontend/public` e `admin/public`, em formato Open Graph 1200x630, usando a logo azul anexada centralizada em fundo branco.
- Trocar o fallback padrão de Open Graph dos defaults gerenciados de SEO para `/lectum-og-default.png`.
- Sincronizar registros existentes que ainda usam o fallback legado `/logo-light.png` para a nova imagem padrão, preservando imagens customizadas enviadas pelo Admin.
- Adicionar as chaves gerenciadas `app_profile`, `app_favorites` e `app_notifications` para padronização das rotas `/app/perfil`, `/app/favoritos` e `/app/notificacoes`.
- Manter essas rotas privadas sempre `noindex`/`nofollow`: o backend força os robots privados ao criar/sincronizar/salvar e o frontend também renderiza os metadados privados com robots desabilitados.
- Renomear o bloco do Admin de “Páginas públicas” para “Páginas e rotas”, explicitando que áreas privadas aparecem apenas para padronização.

## Consequências

- Bases existentes recebem as novas linhas por `ensureDefaults()` sem migration, pois `page_key` é string e os defaults já são sincronizados em tempo de leitura administrativa/pública.
- Não há nova env, package, schema, migration, reset, seed, backfill destrutivo ou alteração de dados sensíveis.
- O endpoint público de SEO passa a expor metadados seguros de rotas privadas, sem PII e com robots fechados; isso não concede acesso ao conteúdo privado nem remove autenticação.
- Rollback simples reverte o commit. Registros extras eventualmente criados no banco ficam inofensivos e não indexáveis; uma limpeza física exigiria task própria e não é necessária.
