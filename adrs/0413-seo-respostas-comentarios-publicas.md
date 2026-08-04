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
