# ADR-0098: Eventos reais de notificacao de dominio

## Status

Aceito - 2026-06-15

## Contexto

A TASK-29A concluiu o dispatcher central de notificacoes in-app, tempo real e push web. A TASK-29B precisava ligar eventos reais do produto a esse dispatcher, sem endpoint simulado, respeitando preferencias por `message_key`, evitando notificar o proprio autor e reduzindo duplicidade/anti-spam.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao. A task nao alterou interface; as referencias obrigatorias foram consultadas para confirmar escopo, arquitetura e ausencia de fonte visual aplicavel.

Durante a auditoria foram encontrados produtores persistidos para avaliacao, favoritos, cliques WhatsApp, posts, respostas, votos e salvamentos. Nao existe fonte persistida para `profile_view_event` nem modelo/endpoint de compartilhamento de posts; os compartilhamentos atuais sao apenas `navigator.share`/clipboard no frontend. Por regra do projeto, esses dois eventos nao foram simulados.

## Decisao

- Criar `backend/src/main/notification/domain-events.ts` como camada unica de traducao entre eventos reais de dominio e o dispatcher `notify` da TASK-29A.
- Usar `notifyOnce` com deduplicacao por `message_key`, destinatario e `message_props.source_id`, evitando duplicar notificacoes para o mesmo evento/destinatario.
- Filtrar o `actorId` da lista de destinatarios para impedir notificacao das proprias acoes.
- Ligar os seguintes fluxos reais:
  - `professional_review` -> `nova_avaliacao` para o psicologo avaliado.
  - `psychologist_favorite` -> `novo_favorito` para o psicologo favoritado, apenas quando criado/restaurado.
  - `contact_request` -> `clique_whatsapp` para o psicologo contatado.
  - `community_post` -> `novo_post` para seguidores da comunidade, exceto autor.
  - `post_reply` -> `nova_resposta` para autor do post ou comentario pai.
  - `post_vote` -> `upvote`/`downvote` para autor do post/reply quando o voto fica ativo.
  - `post_save` -> `salvamento` para autor do post quando o save e criado/restaurado.
- Para votos, usar um `source_id` opaco por hash SHA-256 truncado, evitando expor o votante em `message_props`, especialmente para downvote.
- Manter `visualizacao_perfil` e `compartilhamento` como pendencias documentadas ate existirem produtores persistidos reais (`profile_view_event` e evento/modelo de share).

## Consequencias

- Notificacoes passam a nascer dos services reais existentes, sem endpoint paralelo de notificacao.
- Preferencias seguem centralizadas no dispatcher da 29A.
- O historico in-app passa a ter `redirect`, `source_id` e `source_type` para abrir conteudo relacionado e deduplicar.
- Re-favoritar ou re-salvar sem mudanca real nao gera nova notificacao.
- Downvote notifica o autor sem revelar o votante nos props.
- A task permanece bloqueada para os eventos sem fonte persistida real; conclui-se apenas a ligacao dos produtores existentes.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Complemento 2026-06-16

- O evento real `community_post` agora consulta o papel do autor, o papel do destinatario e `notification_preference.prefs.novo_post.post_author_scope` antes de disparar `novo_post`.
- Regras aplicadas: psicologos podem receber somente posts de pacientes ou todos; pacientes podem receber somente posts de profissionais ou todos.
- A segmentacao foi isolada em `main/notification/preferences.ts`, preparando o dispatcher e produtores futuros para novas categorias segmentadas sem criar modelo paralelo.

## Complemento 2026-06-18

- A opcao visual `Desativado` de `Novas postagens` e representada no dominio como `notification_preference.prefs.novo_post.enabled = false`.
- `shouldReceiveNewPostNotification` preserva a ordem de decisao: primeiro respeita `enabled = false`; se a categoria estiver ativa, aplica a segmentacao por `post_author_scope`.
- A normalizacao em `main/notification/preferences.ts` tambem interpreta um eventual `post_author_scope: "disabled"` legado/manual como categoria desligada, sem tornar `disabled` um escopo de autor oficial.
- O desligamento afeta somente `novo_post`; respostas, votos, salvamentos, compartilhamentos e demais notificacoes continuam governados pelas suas proprias chaves.

Validacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke via `tsx` cobrindo `enabled = false`, outras chaves habilitadas e `post_author_scope: "disabled"`.
