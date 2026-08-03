# ADR-0407: Metadados SEO administráveis com fallback público server-side

## Status

Accepted

## Task relacionada

TASK-141

## Contexto

O Admin precisava de uma tela em Configurações para editar metadados usados por mecanismos de busca. As páginas públicas da Lectum já tinham metadados codificados no Next.js após a fundação de SEO, enquanto áreas privadas permanecem `noindex`. A solução precisava persistir dados reais, manter auditoria administrativa e não depender de mocks, Builder output ou packages novos.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual auditável usada foi `_product/proto/admin/Configurações.png` e a captura enviada pelo usuário.

## Decisão

Criar a tabela `site_seo_setting` para armazenar metadados por chave de página pública (`default`, `home`, `psychologists`, `psychologist_profile`, `community`, `community_post`, `top_mentors`). A edição acontece em endpoints Admin privados sob `/api/admin/private/settings/seo`, com validação backend e auditoria em `admin_activity_log` quando há mudança real.

Também foi criado `GET /api/public/seo/metadata`, que expõe somente metadados seguros para consumo server-side do frontend público. As páginas públicas principais passam a usar helper de metadata dinâmica com fallback para os valores codificados existentes quando a API estiver indisponível.

No Admin, `Configurações` passa a ter submenu. `SEO / Metadados` usa formulário React Hook Form + Zod + controllers locais. `Assinatura` aponta para uma rota sob Configurações que reaproveita a tela real de assinaturas, evitando submenu quebrado ou placeholder.

## Consequências

- Metadados podem ser alterados por Admin sem deploy de código.
- Alterações ficam auditáveis.
- Search engines recebem metadata renderizada server-side nas rotas públicas principais.
- A indisponibilidade temporária do backend não quebra build/render: o frontend mantém fallback honesto com os metadados anteriores.
- Upload/gestão de assets Open Graph fica fora do escopo; a tela aceita caminho público ou URL absoluta.
- JSON-LD/schema.org avançado fica para uma task futura.

## Validação

- `pnpm --dir backend db:migrate` aplicado com sucesso após remover BOM da migration.
- `pnpm --dir backend exec prisma generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local com Chrome headless em viewport 390px abrindo `http://localhost:3002/configuracoes/seo-metadados` e renderizando o gate do shell Admin autenticado; `GET` da rota retornou `200`.
- Smoke local do endpoint público em `http://localhost:3001/api/public/seo/metadata` retornando `200` e payload seguro.
## Pendências

- Definir em task futura se haverá upload próprio de imagem Open Graph.
- Definir em task futura se haverá editor de dados estruturados JSON-LD por página.

## Complemento 2026-08-03 - SEO dinâmico de comunidade por slug

Decisão complementar: a página pública de detalhe da comunidade (`/community/[slug]`) deixa de reutilizar diretamente a configuração genérica de listagem `/community` e passa a resolver metadados próprios pelo endpoint público `GET /api/public/seo/community/:slug`. O Admin ganha a chave `community_detail` com rótulo **Comunidade** e rota técnica `/community/[slug]`; essa configuração atua como fallback/robots/imagem padrão, enquanto o título compartilhado (`og:title`) é sempre sobrescrito pelo nome real da comunidade ativa.

Para posts, o endpoint dinâmico mantém o `title` HTML com sufixo `| Lectum`, mas o `og:title` passa a ser o título limpo do post, sem o sufixo de marca, porque o produto definiu que o título compartilhado deve ser exatamente o título do conteúdo. O mesmo princípio foi aplicado às threads de resposta: o `og:title` usa o título contextual da resposta sem sufixo adicional. As consultas server-side de comunidade/post usam `cache: "no-store"` para evitar que o cache interno do Next preserve títulos antigos em previews de compartilhamento durante edição/testes.

Essa separação preserva SEO/browser title com marca quando útil e, ao mesmo tempo, deixa cards de compartilhamento mais fiéis ao objeto compartilhado: comunidade mostra nome da comunidade; post mostra título do post; resposta mostra o contexto da resposta.

## Complemento 2026-08-03 - imagens Open Graph quadradas de comunidade e perfil

Decisão complementar: objetos públicos com identidade visual própria devem sobrescrever a imagem Open Graph genérica configurada no Admin. Para `/community/[slug]`, a imagem compartilhada passa a ser `community.avatar_url`; para `/psychologists/[id]`, passa a ser a foto/avatar do psicólogo (`user.avatar`). Quando esses campos existem, o metadata publica `og:image:width=512` e `og:image:height=512`, explicitando o formato quadrado esperado para avatares.

A imagem configurada no Admin para **Comunidade** e **Perfil público de psicólogo** permanece como fallback quando a entidade não tiver avatar/foto ou quando o endpoint dinâmico não puder resolver o registro. Para comunidades antigas que armazenam `/community/icons/*`, o frontend de metadata traduz esse caminho para o asset público equivalente em `/images/community/explore/*`, evitando que crawlers recebam uma URL de frontend inexistente.
