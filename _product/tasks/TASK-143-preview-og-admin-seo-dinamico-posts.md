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

## Ajuste pos-feedback 2026-08-03 - comunidade dinâmica e título compartilhado

- [x] Criado endpoint público `GET /api/public/seo/community/:slug` para resolver metadados reais de comunidades ativas por slug.
- [x] A rota pública `/community/[slug]` passa a usar o nome real da comunidade como `og:title` e canonical `/community/{slug}`.
- [x] O Admin SEO/Metadados passa a ter a chave **Comunidade** (`community_detail`) para a rota técnica `/community/[slug]`, separada da listagem **Comunidades** (`/community`).
- [x] Posts continuam usando o título real do post como título compartilhado; o sufixo `| Lectum` fica restrito ao título HTML/documento, com fetch dinâmico `no-store` para evitar cache interno stale do Next nas páginas compartilhadas.
- [x] Revalidado com checks/builds de backend, frontend e admin, `pnpm check` e smoke HTTP local para comunidade/post reais.

## Ajuste pos-feedback 2026-08-03 - imagens OG quadradas por entidade

- [x] Comunidades específicas (`/community/[slug]`) usam `community.avatar_url` como `og:image` dinâmico e publicam dimensões quadradas `512x512` quando há avatar.
- [x] Perfis públicos de psicólogo (`/psychologists/[id]`) usam a foto/avatar do psicólogo como `og:image` dinâmico e publicam dimensões quadradas `512x512` quando há foto.
- [x] O helper de metadata resolve ícones legados de comunidade de `/community/icons/*` para assets públicos equivalentes do frontend antes de montar a URL absoluta do Open Graph.
- [x] Revalidado com `pnpm --dir backend check`, `pnpm --dir frontend check`, builds backend/frontend, `pnpm check` e smoke HTTP local confirmando `og:image:width`/`height` quadrados em comunidade e perfil.

## Ajuste pos-feedback 2026-08-03 - label da listagem de comunidades

- [x] A lista **Páginas públicas** do Admin SEO/Metadados passa a exibir a rota `/community` como **Explorar comunidades**, diferenciando a listagem pública do template de comunidade específica (`/community/[slug]`).
- [x] O DTO de SEO resolve labels sistêmicos a partir dos defaults atuais, preservando metadados editáveis já salvos e refletindo o novo nome mesmo em bases de desenvolvimento com a linha antiga persistida.

## Ajuste pos-feedback 2026-08-10 - capa automatica nos videos de comunidades

- [x] Os players de videos de posts e respostas de comunidade passam a usar `thumbnail_url` persistido como `poster`, incluindo feed, detalhe, thread, perfil profissional, meus posts e salvos.
- [x] Videos legados ou registros sem `thumbnail_url` tentam uma capa transitoria no navegador a partir do proprio arquivo de video, sem persistir backfill nem alterar dados publicados.
- [x] A geracao automatica de miniatura no navegador deixa de depender de um unico frame em `0.5s` e tenta pontos diferentes do video, priorizando o primeiro frame com luminosidade/contraste suficientes para reduzir capas pretas.
- [x] Nao foi adicionada opcao manual de capa para psicologos em videos de comunidade; a capa segue sendo derivada automaticamente de uma parte real do video enviado.
- [x] Nao houve alteracao de banco, env nova, pacote novo, mock ou backfill destrutivo de videos antigos.

## Ajuste pos-feedback 2026-08-22 - link preview de videos no WhatsApp

- [x] Referencia visual do usuario registrada em `_product/proto/WhatsApp preview video link Instagram referencia.jpeg`; os textos de conversa dentro do print foram tratados como historico visual do WhatsApp, nao como instrucao de produto.
- [x] O compartilhamento nativo de videos profissionais prioriza enviar o link publico da Lectum para permitir card Open Graph no WhatsApp, mantendo geracao/exportacao do arquivo social apenas como fallback se o link nativo/copia falhar.
- [x] Links de video-resposta passam a apontar para `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`, abrindo a arvore do video dentro da Lectum e permitindo metadados especificos da resposta.
- [x] O endpoint publico de SEO usa o nome profissional do psicologo em `og_title` para posts/respostas com video profissional, no formato `[Nome] na Lectum`, preservando o titulo editorial no `title` HTML.
- [x] O fallback de arquivo compartilhado inclui `url` junto do payload de Web Share quando o navegador/destino aceitar, para nao perder o link de abertura na Lectum.
- [x] Nao houve alteracao de banco, migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.

## Ajuste pos-feedback 2026-08-22 - arquivo social primeiro e titulo no OG do WhatsApp

- [x] Referencia visual do novo feedback registrada em `_product/proto/WhatsApp preview link sem arte social referencia.jpeg`; os textos do print foram tratados como evidencia do efeito no WhatsApp, nao como instrucao isolada.
- [x] A decisao de priorizar link puro foi revertida no fluxo de video para restaurar as opcoes de Instagram Reels/Stories e manter a arte 9:16 com caixinha de pergunta como compartilhamento principal.
- [x] O link publico permanece na URL do payload de arquivo quando o destino aceitar e como fallback se a geracao/compartilhamento do arquivo falhar.
- [x] `og_description` de posts/respostas com video profissional passa a usar o titulo do post, evitando que o WhatsApp mostre o texto da resposta como descricao do card.
- [x] A rota canonica de resposta `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]` e o `og_title` no formato `[Nome] na Lectum` foram preservados.
- [x] Revalidado com teste direcionado de compartilhamento/SEO, checks e builds de frontend/backend, `pnpm check`, `pnpm version:bump` para `0.1.184` e `pnpm check:version`.
- [x] Nao houve alteracao de banco, migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.

## Ajuste pos-feedback 2026-08-22 - rota WhatsApp sem `og:video`

- [x] Criadas rotas publicas `/comunidades/[slug]/publicacao/[id]/whatsapp` e `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]/whatsapp` para previews de link no WhatsApp.
- [x] As rotas reutilizam a pagina publica canonica, mas geram metadata com `shareTarget="whatsapp"`, suprimindo `og:video` e mantendo `og:image`/`og:title`/`og:description` para card clicavel.
- [x] O `og:url` aponta para a propria rota `/whatsapp`, enquanto o canonical permanece na rota publica original de post/thread; o clique no card continua abrindo o conteudo dentro da Lectum.
- [x] A descricao do card de videos profissionais continua sendo o titulo do post, conforme ajuste anterior.
- [x] Nao houve alteracao de backend, banco, migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.

## Ajuste pos-feedback 2026-08-27 - imagem Open Graph quadrada por entidade

- [x] Perfis publicos de psicologo passam a publicar `og:image` para uma rota publica versionada que renderiza PNG quadrado `1200x1200` a partir de `user.avatar`.
- [x] Comunidades especificas passam a publicar `og:image` para uma rota publica versionada que renderiza PNG quadrado `1200x1200` a partir de `community.avatar_url`.
- [x] A imagem configurada no Admin SEO/Metadados permanece como fallback do template quando a entidade nao tem foto/avatar ou quando o SEO dinamico nao estiver disponivel.
- [x] As rotas de imagem usam apenas fonte publica ja validada pelo SEO dinamico, sem aceitar URL arbitraria do cliente e sem usar elemento HTML cru de imagem.
- [x] Nao houve alteracao de backend, banco, migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.

## Ajuste pos-feedback 2026-08-28 - aviso de imagem personalizada no Admin

- [x] O campo **Imagem Open Graph** dos templates `psychologist_profile` e `community_detail` passa a informar que a imagem principal do compartilhamento real e personalizada automaticamente pela entidade.
- [x] O upload permanece disponivel nesses templates apenas como fallback, evitando retirar a configuracao sem explicar sua utilidade residual.
- [x] A previa Open Graph do Admin explicita que perfis reais usam foto do psicologo e comunidades reais usam avatar da comunidade, enquanto a tela mostra o fallback do template.
- [x] Nao houve alteracao de backend, banco, migration, env obrigatoria, package novo, provider, mock, seed ou dado publicado.
