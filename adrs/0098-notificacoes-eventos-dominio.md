# ADR-0098: Eventos reais de notificacao de dominio

## Status

Aceito - 2026-06-15

## Contexto

A TASK-29A concluiu o dispatcher central de notificacoes in-app, tempo real e push web. A TASK-29B precisava ligar eventos reais do produto a esse dispatcher, sem endpoint simulado, respeitando preferencias por `message_key`, evitando notificar o proprio autor e reduzindo duplicidade/anti-spam.

Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao. A task nao alterou interface; as referencias obrigatorias foram consultadas para confirmar escopo, arquitetura e ausencia de fonte visual aplicavel.

Durante a auditoria inicial foram encontrados produtores persistidos para avaliacao, favoritos, cliques WhatsApp, posts, respostas, votos e salvamentos. Naquela execucao, ainda nao existia fonte persistida para `profile_view_event` nem modelo/endpoint de compartilhamento de posts; os compartilhamentos eram apenas `navigator.share`/clipboard no frontend. Por regra do projeto, esses dois eventos nao foram simulados ate haver produtores reais.

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
  - `post_vote` -> `upvote` para autor do post/reply quando o voto positivo fica ativo.
  - `post_save` -> `salvamento` para autor do post quando o save e criado/restaurado.
- Para votos positivos, usar um `source_id` opaco por hash SHA-256 truncado, evitando expor o votante em `message_props`.
- Manter `visualizacao_perfil` e `compartilhamento` como pendencias documentadas ate existirem produtores persistidos reais (`profile_view_event` e evento/modelo de share). O complemento de 2026-06-29 resolve essa pendencia com `profile_view_event` e `post_share`.

## Consequencias

- Notificacoes passam a nascer dos services reais existentes, sem endpoint paralelo de notificacao.
- Preferencias seguem centralizadas no dispatcher da 29A.
- O historico in-app passa a ter `redirect`, `source_id` e `source_type` para abrir conteudo relacionado e deduplicar.
- Re-favoritar ou re-salvar sem mudanca real nao gera nova notificacao.
- Downvote permanece como sinal interno de ranking/moderacao, mas nao deve gerar nem aparecer na central de notificacoes.
- A execucao inicial permaneceu bloqueada para os eventos sem fonte persistida real; o complemento de 2026-06-29 conclui a ligacao dos produtores faltantes.

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

## Complemento 2026-06-26

- Downvotes deixam de emitir notificacao in-app/tempo real/push pelo produtor real `post_vote`.
- A listagem da central de notificacoes tambem exclui registros legados com `message_key = "downvote"`, evitando que notificacoes antigas continuem visiveis.
- A chave `downvote` permanece no contrato historico para compatibilidade com dados ja persistidos e com regras internas de reputacao/ranking, mas nao e mais exposta na central.

## Complemento 2026-06-26 - autoria exibida em eventos conversacionais

- Os produtores reais de `novo_post` e `nova_resposta` continuam persistindo apenas ids em `message_props` (`post_id`, `reply_id`, `parent_reply_id`, `source_id`, `source_type`), sem gravar snapshot de nome/foto dentro da notificação.
- A decisao de exibir autor fica na leitura da central: o repository hidrata `actor` usando os ids reais e as regras atuais de anonimato/delecao.
- Essa abordagem evita dados duplicados/obsoletos na tabela `notification` e permite que mudancas de nome/foto ou exclusao de conta sejam respeitadas na proxima leitura.
- Para posts anonimos, o alias exibido e o mesmo pseudoidentificador estavel por `author_id`; o id real e o avatar nao sao retornados no `actor`.
- Para psicologos, `actor.verified` segue a mesma semantica de verificacao usada nas telas de comunidade; a central exibe selo quando houver e nao adiciona sufixo textual de papel ao titulo.
- Eventos passivos seguem sem actor por politica de privacidade e reducao de ruido: `upvote`, `salvamento`, `compartilhamento` e similares nao devem identificar quem interagiu.

Validacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.

## Complemento 2026-06-29 - produtores reais para visualizacao e compartilhamento

- Criar `profile_view_event` como fonte persistida de abertura de perfil profissional publicado.
- O produtor real fica em `POST /api/private/directory/psychologists/:id/view`, usando `optionalAuth`, header `x-device`, anti-spam de 6 horas por usuario/dispositivo e bloqueio de auto-notificacao.
- `visualizacao_perfil` e emitida apenas para psicologo com entitlement profissional ativo, direcionando para `/app/professional/analytics`, sem expor identidade do visitante na central.
- Criar `post_share` como fonte persistida de compartilhamento de post ou resposta, com `user_id?`, `device_id?`, `post_id`, `reply_id?`, `target_type` e `channel`.
- O produtor real fica em `POST /api/private/posts/:id/share` e `POST /api/private/posts/:id/replies/:replyId/share`, sem endpoint paralelo de notificacao; o frontend chama a mutation somente apos sucesso de Web Share API ou clipboard.
- `compartilhamento` e emitida ao autor do post/resposta, respeitando preferencias, silenciamento do post e anti-spam de 1 hora por usuario/dispositivo/alvo.
- Eventos passivos de compartilhamento continuam sem `actor` na central por privacidade.
- Analytics profissionais passam a usar `profile_view_event` para "Aberturas de perfil"; ranking/feed passam a usar `post_share` como fonte real de compartilhamentos.
- Como `backend/prisma/schema.prisma` mudou, foi executado `prisma migrate dev` com a migration `20260630000554_add_profile_view_post_share_events`; antes disso, o banco de desenvolvimento foi resetado com autorizacao explicita do usuario porque uma migration ja aplicada estava modificada.

Validacao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local HTTP em `http://localhost:3000/psychologists`/`http://localhost:3000/community` com `200 OK`.
