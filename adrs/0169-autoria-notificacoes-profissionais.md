# ADR-0169: Autoria em notificacoes profissionais individuais

## Status

Accepted

## Task relacionada

Ajuste incremental da TASK-29A/TASK-29B.

## Contexto

A central de notificacoes ja exibia autoria em `novo_post` e `nova_resposta`, porque essas notificacoes representam conversas individuais na comunidade. Para psicologos, outros sinais tambem sao individuais e acionaveis: uma avaliacao recebida, um novo favorito autenticado e um clique autenticado no WhatsApp.

Ao mesmo tempo, a identificacao de quem visualizou o perfil pode gerar exposicao excessiva para uma interacao passiva. Cliques no WhatsApp tambem podem ser originados por usuarios nao autenticados, pois o link publico pode registrar uma intencao sem `user_id`.

## Decisao

- Hidratar `actor` na listagem `GET /api/private/notification/index` tambem para:
  - `nova_avaliacao`, usando `professional_review.author`;
  - `novo_favorito`, usando `psychologist_favorite.user`;
  - `clique_whatsapp`, usando `contact_request.user` quando existir.
- Manter `visualizacao_perfil` sem identificacao de usuario.
- Manter avaliacoes como nao anonimas.
- Tratar favoritos como eventos autenticados; nao existe favorito sem usuario.
- Para clique no WhatsApp sem usuario autenticado, manter `actor=null` e exibir a copy generica `Um novo usuario clicou no seu WhatsApp`.
- Continuar sem identificar autores de sinais passivos como `upvote`, `salvamento` e `compartilhamento`.
- Nao alterar schema Prisma: a autoria e derivada dos ids reais ja gravados em `message_props`.

## Consequencias

- Psicologos recebem mais contexto nos sinais de conversao e reputacao.
- A UI preserva privacidade em visualizacoes de perfil e em interacoes passivas.
- Eventos historicos sem `source_id`/ids relacionais continuam renderizando sem ator.
- A listagem passa a realizar consultas adicionais condicionais, somente quando as chaves relevantes aparecem na pagina carregada.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local via `IndexRepository` na conta `<CONTA_DE_TESTE_AUTORIZADA>`, confirmando atores para eventos reais com `source_id` e `actor=null` quando o evento nao possui relacao autenticada.
- Smoke HTTP local em `/app/notifications` retornando 200.

## Pendencias

- Aplicar a janela futura de 24h para notificacoes e analytics de visualizacao/cliques repetidos quando essa regra for implementada.
