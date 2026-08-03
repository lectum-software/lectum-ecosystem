# TASK-143: Previa Open Graph Admin e SEO dinamico de posts

Status: Completed  
Data: 2026-08-03  
Dependencias: TASK-39, TASK-40, TASK-42, TASK-141  
ADR: `adrs/0409-miniaturas-video-seo-open-graph-posts.md`

## Contexto

O Admin de SEO/Metadados ja permitia preencher o campo **Imagem Open Graph**, mas o operador precisava abrir o link manualmente para confirmar qual imagem seria usada em compartilhamentos. Alem disso, as rotas publicas de posts e threads de comunidade usavam metadados genericos, sem aproveitar a midia real do post. Para videos, redes sociais precisam de uma imagem estatica em `og:image`; o arquivo de video em si deve ficar em `og:video`.

Esta task complementa as TASK-39, TASK-40, TASK-42 e TASK-141 sem tratar Builder/Quick Copy ou prototipo como arquitetura final. Builder/Quick Copy nao ficou acessivel como ferramenta neste ambiente; a validacao visual usou a tela local do Admin e referencias registradas em `_product/tasks/PROTO-INVENTORY.md`.

## Objetivo

Exibir uma miniatura da Imagem Open Graph no Admin e publicar metadados dinamicos reais para posts/threads publicos, usando imagem do post quando houver imagem e miniatura estatica persistida quando houver video.

## Escopo

- Admin: renderizar preview seguro da imagem Open Graph abaixo do campo de URL.
- Backend: persistir `thumbnail_url` em posts, midias de post e respostas; expor endpoint publico de SEO para post e thread.
- Frontend: gerar miniatura de video no navegador, subir pelo fluxo real de upload e enviar `thumbnailUrl` para criacao/edicao de posts e respostas.
- Frontend publico: usar metadados dinamicos nas rotas `/community/[slug]/post/[id]` e `/community/[slug]/post/[id]/thread/[replyId]`.

## Fora de escopo

- Backfill automatico de miniaturas para videos antigos.
- Transcodificacao/FFmpeg/server-side thumbnail extraction.
- Campo novo para upload manual de imagem OG no Admin.
- Controle de cache de redes sociais externas depois que elas ja coletaram a URL.

## Criterios de aceite

- [x] O Admin SEO/Metadados mostra miniatura ou placeholder abaixo de **Imagem Open Graph** sem usar `<img>` cru.
- [x] A miniatura do Admin resolve URLs absolutas, assets locais e `/public/files/...` via backend, com guarda de hosts configurados.
- [x] Posts novos/editados com video geram miniatura estatica no navegador, sobem a imagem pelo upload real e enviam `thumbnailUrl`.
- [x] Respostas novas/editadas com video geram miniatura estatica no navegador, sobem a imagem pelo upload real e enviam `thumbnailUrl`.
- [x] O backend persiste `thumbnail_url` para videos e limpa/ignora miniatura quando a midia nao e video.
- [x] O endpoint publico de SEO de post/thread retorna metadados apenas para conteudo publicado, nao deletado e de comunidade ativa.
- [x] Posts com imagem usam a imagem em `og:image`; posts/respostas com video usam `thumbnail_url` em `og:image` e `media_url` em `og:video` quando disponivel.
- [x] As paginas publicas de post/thread consomem o SEO dinamico com fallback para a configuracao Admin.
- [x] Nao foram usados mocks, dados fake permanentes nem pacote novo.
- [x] `pnpm --dir backend db:migrate` foi executado porque houve alteracao Prisma/migration.
- [x] Validacoes backend, frontend, admin, builds e browser local foram executadas.
- [x] ADR criado/atualizado.
- [x] Commit e push realizados ao final da task.

## Execucao

- Criada migration `20260803173723_add_post_thumbnail_urls` para `community_posts.thumbnail_url`, `community_post_media.thumbnail_url` e `post_replies.thumbnail_url`.
- Atualizados DTOs, validators, services e repositories privados de comunidade/posts para transportar e persistir `thumbnailUrl`.
- Criado endpoint publico `GET /api/public/seo/community-post/:slug/:id` e `GET /api/public/seo/community-post/:slug/:id/replies/:replyId`.
- Criado utilitario `frontend/src/utils/video-thumbnail.ts` com captura nativa via `video` + `canvas`, sem package externo.
- Atualizados fluxos de criar/editar post e resposta para gerar/subir thumbnail de video.
- Atualizado `frontend/src/lib/seo-metadata.ts` para overrides dinamicos, `og:video` e resolucao de arquivos publicos do backend.
- Atualizada tela Admin SEO/Metadados com preview de imagem usando `next/image`.

## Validacao

- `pnpm --dir backend exec prisma format`
- `pnpm --dir backend db:migrate -- --name add_post_thumbnail_urls`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3002/configuracoes/seo-metadados` retornou 200.
  - `http://localhost:3000/community` retornou 200.
  - `http://localhost:3001/api/public/seo/metadata` retornou 200.
  - `http://localhost:3001/api/public/seo/community-post/autocuidado-em-pratica/cmrmg709v000yt0uh8x55eqae` retornou 200 para post real publicado.
  - `http://localhost:3000/community/autocuidado-em-pratica/post/cmrmg709v000yt0uh8x55eqae` retornou 200.
- Browser local mobile-first/headless validou a tela Admin em 390x844.

## Observacoes

Videos antigos podem continuar sem `thumbnail_url` ate serem editados ou ate uma task futura criar backfill real. Nesses casos, a pagina segue retornando `og:video` e cai para a imagem OG configurada no Admin para `og:image`.

## Ajuste pos-feedback 2026-08-03 - preview WhatsApp de videos verticais

- [x] Referencia visual de WhatsApp para video vertical registrada em `_product/proto/WhatsApp preview video vertical Open Graph referencia.jpeg`.
- [x] Miniaturas geradas para videos novos/editados passam a usar o mesmo frame vertical 9:16 do layout Lectum de compartilhamento (`Postado na Lectum`/`Respondido na Lectum`, card superior e tag profissional), em vez de apenas o frame cru do video.
- [x] Endpoint publico de SEO passa a expor dimensoes `og_image_width=1080` e `og_image_height=1920` quando o `og:image` vem de miniatura de video no formato vertical.
- [x] `generateMetadata` passa a publicar metadados Open Graph de video como `video.other`, mantendo `og:image` com a miniatura vertical e `og:video` com o arquivo de video.
- [x] Revalidado com `pnpm --dir frontend check`, `pnpm --dir backend check`, builds de frontend/backend, `pnpm check` e smoke HTTP local.
