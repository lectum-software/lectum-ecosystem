# ADR-0413: SEO administrável para respostas de comentários públicas

## Status

Aceita em 2026-08-03.

## Contexto

A rota pública canônica de thread/resposta já existia em PT-BR como `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]` e o endpoint dinâmico `GET /api/public/seo/community-post/:slug/:id/replies/:replyId` já retornava metadados reais para respostas publicadas.

No entanto, a tela Admin **SEO / Metadados** listava apenas o template de post raiz (`community_post`), deixando o link compartilhável de respostas/comentários sem representação própria entre os slugs públicos configuráveis.

## Decisão

- Adicionar a chave operacional `community_post_reply` aos defaults reais de `site_seo_setting`.
- Exibir essa página no Admin com o label **Resposta de comentário** e a rota `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`.
- Manter o endpoint dinâmico de SEO de respostas como fonte principal dos metadados de conteúdo real.
- Usar `community_post_reply` como fallback de metadata/robots/Open Graph apenas quando a página pública recebe `replyId`; posts raiz continuam usando `community_post`.
- Não criar migration, pois `page_key` é `String` e `SeoMetadataRepository.ensureDefaults()` já cria defaults ausentes em bases existentes.

## Consequências

- O Admin passa a mostrar explicitamente o slug público de compartilhamento de respostas de comentários.
- Operadores podem configurar fallback, robots e imagem Open Graph de respostas sem afetar posts raiz.
- Bases existentes recebem a nova linha ao acessar os endpoints reais de SEO, sem reset nem seed manual.

## Validação

Registrada no ajuste pós-feedback da TASK-145.

## Complemento 2026-08-03 - contenção visual no Admin

Após expor a rota longa de respostas no seletor **Páginas públicas**, a coluna podia crescer além do tamanho definido pela grid e invadir o bloco de edição de metadados. A decisão complementar é tratar caminhos públicos dinâmicos como conteúdo potencialmente longo no Admin:

- wrappers da grid/seletor usam `min-w-0`;
- o card do seletor usa `overflow-hidden`;
- o texto da rota permanece truncado;
- o badge `index` não encolhe.

Com isso, a lista continua mostrando o slug compartilhável de respostas sem alterar a arquitetura, os dados reais de SEO ou a experiência mobile-first.
