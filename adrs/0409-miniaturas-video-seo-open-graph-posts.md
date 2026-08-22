# ADR-0409: Miniaturas persistidas para Open Graph de videos de posts

Status: Accepted  
Data: 2026-08-03

## Contexto

O compartilhamento social de posts e threads de comunidade precisa entregar uma imagem estatica em `og:image`. Quando o conteudo possui video, redes como WhatsApp, LinkedIn, Facebook e X nao devem depender do arquivo `.mp4` como imagem do card; o video pode ser informado em `og:video`, mas a previsualizacao visual precisa de uma miniatura.

A UI de Admin SEO/Metadados tambem precisava mostrar qual imagem seria usada no campo **Imagem Open Graph**, sem obrigar o operador a abrir manualmente o link.

Restrições relevantes:

- nao adicionar pacote novo sem necessidade;
- nao usar mocks ou dados inventados;
- nao introduzir FFmpeg/transcodificacao server-side nesta etapa;
- usar storage/upload real ja existente;
- no frontend/admin, nao usar `<img>` cru.

## Decisao

1. Adicionar `thumbnail_url String?` em `community_post`, `community_post_media` e `post_reply`.
2. Gerar a miniatura de videos no navegador com APIs nativas (`video` + `canvas`) durante criacao/edicao de posts e respostas.
3. Subir a miniatura pelo endpoint real de upload de midia de posts, reaproveitando o prefixo publico `posts/media/`.
4. Persistir `thumbnailUrl` somente quando a midia efetiva for `video`; limpar/ignorar miniatura em imagens/carrossel.
5. Criar endpoint publico de SEO para posts e threads:
   - post: `GET /api/public/seo/community-post/:slug/:id`;
   - thread: `GET /api/public/seo/community-post/:slug/:id/replies/:replyId`.
6. O endpoint retorna apenas conteudo ja publico: post publicado, nao deletado e comunidade ativa.
7. Para imagem, `og_image_url` usa a imagem persistida; para video, `og_image_url` usa `thumbnail_url` e `og_video_url` usa `media_url`.
8. As paginas publicas de post/thread usam esses dados via `generateMetadata`, mantendo fallback para a configuracao Admin quando o endpoint nao retornar dados ou quando video antigo nao tiver thumbnail.
9. O Admin renderiza preview abaixo de **Imagem Open Graph** com `next/image`, resolvendo `/public/files/...` via backend e exibindo placeholder quando a URL estiver vazia ou o host externo nao estiver habilitado.

## Consequencias

- Novos videos e videos editados passam a ter card social com miniatura, comportamento esperado para compartilhamentos similares a TikTok/Instagram.
- Videos legados continuam sem `thumbnail_url` ate serem editados ou ate uma task futura de backfill real; nesses casos, a pagina ainda pode expor `og:video` e cair para imagem OG generica no `og:image`.
- A solucao evita dependencias novas e processamento server-side pesado, mas depende da capacidade do navegador de capturar frame do arquivo escolhido.
- Redes sociais podem cachear metadados ja coletados; apos mudancas de imagem, pode ser necessario usar ferramentas de debug/refresh da propria rede.
- Hosts externos para preview no Admin devem estar em `NEXT_PUBLIC_IMAGE_REMOTE_HOSTS` e no `next.config` correspondente.

## Complemento 2026-08-03 - frame vertical para previews de videos no WhatsApp

Decisao complementar: as miniaturas persistidas para videos novos/editados deixam de ser apenas um frame cru do arquivo e passam a usar o mesmo frame vertical 9:16 do layout Lectum de compartilhamento social. Para posts com video, o card usa `Postado na Lectum`; para respostas com video, usa `Respondido na Lectum`. O canvas reaproveita a composicao de compartilhamento ja existente: midia em `object-contain`, card superior com contexto do post/comentario e tag textual do profissional.

O endpoint publico de SEO passa a informar dimensoes `og_image_width=1080` e `og_image_height=1920` quando o `og:image` vem de `thumbnail_url` de video. O frontend publica esses valores no `generateMetadata` e usa `openGraph.type="video.other"` para conteudos com video, mantendo o arquivo em `og:video`.

Essa decisao aproxima o preview de links no WhatsApp do comportamento de Instagram/TikTok para videos verticais, preservando a imagem inteira e o layout editorial definido pela Lectum. Videos antigos permanecem dependentes da miniatura ja persistida ate edicao ou backfill real.

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
- Smoke HTTP dos endpoints publicos e da tela Admin.
- Browser local/headless mobile-first da rota Admin SEO/Metadados.

## Complemento 2026-08-10 - poster automatico no player de comunidades

Decisao complementar: o `thumbnail_url` persistido para videos de posts e respostas de comunidade tambem passa a ser a fonte do `poster` do player inline. A regra evita uma segunda origem de capa, nao cria upload manual para o psicologo e garante que feed, detalhe, thread, perfil profissional, posts do usuario e salvos reaproveitem a miniatura gerada no envio/edicao. Quando um video legado ainda nao tiver `thumbnail_url`, o frontend tenta gerar uma capa transitoria com `video` + `canvas` a partir do proprio arquivo, sem persistir backfill nem alterar dados publicados.

A extracao no navegador tambem deixa de capturar apenas `0.5s`: o utilitario tenta tempos diferentes do proprio arquivo e usa uma heuristica simples de luminosidade/contraste para pular frames provavelmente pretos. Se todos os candidatos forem escuros, preserva o melhor frame encontrado em vez de bloquear a publicacao. Videos antigos sem `thumbnail_url` continuam sem backfill automatico nesta mudanca; eles podem ganhar capa ao serem editados ou em uma task futura de backfill real.

## Complemento 2026-08-22 - preview WhatsApp de link de video

### Contexto

Novo feedback mostrou que, ao compartilhar um video da Lectum pelo WhatsApp, a experiencia desejada e um card de link semelhante ao preview do Instagram: miniatura vertical, nome do psicologo no titulo e URL abrindo o video dentro da Lectum. A imagem anexada foi usada apenas como referencia visual de formato; textos de conversa dentro do print nao sao instrucoes de produto.

### Decisao

- Para videos profissionais, a folha nativa passa a priorizar o compartilhamento do link publico da Lectum em vez do arquivo gerado, permitindo que o WhatsApp busque `og:image`, `og:title`, `og:url` e `og:video`.
- Video-respostas usam a rota canonica de thread `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`, e nao mais o post com `focusReplyId`/anchor como link primario de compartilhamento.
- O endpoint publico de SEO de posts/respostas com video profissional resolve o nome profissional do psicologo via `professional_first_name`/`professional_last_name` com fallback seguro para `user.name`, e publica `og_title` como `[Nome] na Lectum`.
- O titulo HTML/editorial permanece baseado no post/resposta para SEO de pagina; a mudanca de autoria e especifica para Open Graph/social preview.
- A exportacao do arquivo social com arte permanece como fallback se o link nativo/copia falhar; quando usada, o payload tambem inclui a URL da Lectum se o destino aceitar.

### Consequencias

- WhatsApp tende a montar o card clicavel no formato esperado, sujeito ao cache e as regras do crawler do proprio WhatsApp.
- O link compartilhado abre diretamente a pagina publica da resposta/thread, preservando leitura anonima permitida e contexto da comunidade.
- Instagram/TikTok podem receber link quando escolhidos pela mesma folha nativa; compartilhamento de arquivo continua apenas como fallback porque a Web nao informa previamente qual app sera escolhido.
- Rollback: voltar a priorizar arquivo restaura o envio do MP4 social, mas o WhatsApp deixa de ter card Open Graph como caminho principal.
- Deploy: mudanca aditiva de frontend/backend, sem banco, migration, env obrigatoria, package, provider, seed, mock ou alteracao de dados publicados.
