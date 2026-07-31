# TASK-117 - Medias reais de analises das comunidades no trafego WhatsApp Admin

## Status

Completed

## Contexto

A TASK-116 deixou **Comunidades** e **Video de apresentacao** como grupos expansivos na tabela **Origem do trafego para psicologos** em `/psicologos`. Ao expandir Comunidades, o usuario pediu que as sublinhas de posts/respostas com e sem video deixassem de exibir descricoes de CTA e passassem a mostrar as analises reais de padrao da plataforma. Depois, o usuario ajustou a regra para que essas analises sejam **medias por conteudo** em vez de somatorios totais e para que **Tempo total assistido** fosse substituido por **Visibilidade media** tambem nas linhas sem video.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel do painel Admin;
- screenshots enviados pelo usuario em 2026-07-31 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao esta callable no ambiente via MCP/tooling disponivel; a implementacao usa as referencias locais e os screenshots enviados, registrando esta limitacao.

## Objetivo

Expor, nas sublinhas de Comunidades da tabela **Origem do trafego para psicologos**, chips com valores reais de analises first-party da plataforma:

- Posts com video e Respostas com video: Visualizacoes, Retencao media, Visibilidade media, Acessos ao perfil, Upvotes, Downvotes, Comentarios, Salvamentos e Compartilhamentos.
- Posts sem video e Respostas sem video: Visualizacoes, Visibilidade media, Acessos ao perfil, Upvotes, Downvotes, Comentarios, Salvamentos e Compartilhamentos.

Todas as metricas quantitativas de evento sao calculadas como media por conteudo publicado na categoria ate o fim do periodo selecionado. Retencao media permanece uma media percentual de sessoes reais de video com duracao.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-75: detalhe analitico de conteudo e retencao de video.
- TASK-76: periodo global do Admin.
- TASK-97/TASK-108/TASK-111: fundacao de visibilidade/atencao temporal first-party.
- TASK-114: origem de trafego por WhatsApp com subcategorias reais.
- TASK-115: grupo visual Comunidades.
- TASK-116: grupos expansivos na tabela.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Estender o contrato do dashboard Admin de psicologos com `platform_metrics` por fonte de trafego.
- Reusar tabelas reais existentes: `community_post`, `post_reply`, `page_view_event`, `content_attention_session`, `content_video_watch_session`, `post_vote`, `post_save`, `post_reply_save` e `post_share`.
- Calcular medias por categoria de conteudo para posts/respostas com e sem video.
- Substituir `total_watch_time` por `average_visibility`/`Visibilidade media`.
- Exibir os valores no Admin como chips responsivos, preservando a descricao de Ranking Top Mentores e as linhas fora de Comunidades.
- Validar desktop e mobile (~390px) no browser local.

## Fora do escopo

- Alterar Prisma schema ou migrations.
- Criar backfill historico, seed, mock ou endpoint simulado.
- Alterar o detalhe individual do psicologo ou `/trafego` global.
- Instalar package novo.
- Criar benchmark externo ou integracao com analytics de terceiros.

## Regra de calculo

- O denominador das medias de Visualizacoes, Visibilidade media, Acessos ao perfil, Upvotes, Downvotes, Comentarios, Salvamentos e Compartilhamentos e a quantidade de conteudos profissionais publicados na categoria ate `period.end`.
- Eventos sao filtrados pelo periodo selecionado.
- Visibilidade media usa `content_attention_session.attention_seconds` real por conteudo.
- Retencao media usa `content_video_watch_session.watched_seconds / duration_seconds`, limitada a 100%, somente para sessoes reais com duracao positiva.
- Acessos ao perfil sao atribuidos de forma deterministica quando uma pageview de perfil do psicologo ocorre na mesma sessao em ate 30 minutos apos a pageview do conteudo desse autor.
- Se uma categoria nao possuir conteudo publicado ate o fim do periodo, as metricas retornam `value: null` e a UI mostra `Sem dados`.

## Criterios de aceite

- [x] Posts com video exibe valores reais de Visualizacoes, Retencao media, Visibilidade media, Acessos ao perfil, Upvotes, Downvotes, Comentarios, Salvamentos e Compartilhamentos.
- [x] Respostas com video exibe os mesmos valores reais de video.
- [x] Posts sem video exibe valores reais de Visualizacoes, Visibilidade media, Acessos ao perfil, Upvotes, Downvotes, Comentarios, Salvamentos e Compartilhamentos.
- [x] Respostas sem video exibe os mesmos valores reais sem video.
- [x] As metricas quantitativas deixam de usar somatorio total e passam a usar media por conteudo da categoria.
- [x] `Tempo total assistido`/`total_watch_time` nao aparece mais no contrato nem na UI.
- [x] As antigas descricoes "Cliques em CTAs..." nao aparecem nessas quatro sublinhas quando Comunidades esta expandida.
- [x] Ranking Top Mentores e demais linhas preservam suas descricoes atuais.
- [x] Nenhum valor numerico fake de analise foi adicionado.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nao foram usados mocks, seeds, dados fake permanentes, backfill ou endpoint simulado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshots do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0381-medias-reais-comunidades-trafego-whatsapp-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend biome:fix`
- `pnpm --dir admin biome:fix`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `$env:NODE_OPTIONS='--max-old-space-size=8192'; pnpm --dir admin build`
- Script backend `pnpm --dir backend exec tsx` validando que a API retorna medias reais, `average_visibility` e ausencia de `total_watch_time`.
- Browser local desktop e mobile ~390px via CDP em `http://localhost:3002/psicologos`, com screenshots temporarios em `.tmp/task117-admin-psicologos-desktop-final.png` e `.tmp/task117-admin-psicologos-mobile-final.png`.
- `pnpm check`

## Observacoes

- Nao houve alteracao em `backend/prisma/schema.prisma` nem em `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- O usuario de validacao `codex-task117-validation@lectum.local` foi removido apos a validacao local.
