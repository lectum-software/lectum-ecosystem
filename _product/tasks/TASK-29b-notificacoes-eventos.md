# TASK-29B: Notificações — eventos de domínio

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-29B |
| Prioridade | P1 |
| Esforço | M |
| Fase | Conta |
| Status | Blocked |
| Dependências | TASK-29A (e as tasks que produzem cada evento: 14, 15/16, 17, 20, 23, 24, 26) |
| ADR alvo | ADR de eventos de notificação |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Divisão da TASK-29

- **29A**: terreno de recebimento (models, CRUD in-app, subscription/VAPID, push, realtime, central e preferências, dispatcher pronto).
- **29B (esta)**: liga os **eventos reais** de domínio ao dispatcher da 29A, respeitando preferências e o enum do PRD §12.

## Contexto

Com o canal pronto (29A), falta produzir notificações a partir dos eventos reais do produto. Cada evento dispara o dispatcher (`main/notification`) que persiste a `notification`, emite via Socket.IO e envia push quando aplicável — sempre respeitando `notification_preference`.

## Objetivo

Disparar notificações reais nos pontos de domínio do PRD §12, sem mock, com idempotência e respeito às preferências do destinatário.

## Pré-requisitos e bloqueios

- 29A concluída (dispatcher, models, preferências e canal de entrega prontos).
- Cada evento depende da task que o origina existir; se a task de origem ainda não foi executada, ligar o evento quando ela existir e registrar a dependência.
- Não enviar por canal (push/e-mail/WhatsApp) sem consentimento em `notification_preference` e sem credenciais reais.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo

Ligar o dispatcher em cada evento, com o `type` correto (enum do PRD §12) e o destinatário correto:

| Evento (PRD §12) | `notification.message_key` | Disparado em | Destinatário |
|---|---|---|---|
| Nova avaliação | `nova_avaliacao` | TASK-17 (criar avaliação) | psicólogo avaliado |
| Novo favorito | `novo_favorito` | TASK-14 (favoritar) | psicólogo favoritado |
| Visualização de perfil | `visualizacao_perfil` | TASK-15/20 (view de perfil) | psicólogo (Plano Profissional) |
| Clique no WhatsApp | `clique_whatsapp` | TASK-16 (`contact_request`) | psicólogo contatado |
| Novo post | `novo_post` | TASK-24 (criar post) | seguidores da comunidade |
| Nova resposta | `nova_resposta` | TASK-26 (`post_reply`) | autor do post/comentário |
| Upvote | `upvote` | TASK-26 (`post_vote`) | autor do post/reply |
| Downvote | `downvote` | TASK-26 (`post_vote`) | não exibido na central; sinal interno não público |
| Compartilhamento | `compartilhamento` | TASK-26/feed | autor do conteúdo |
| Salvamento | `salvamento` | TASK-28 (`post_save`) | autor do post |

Regras:

- Disparar a notificação **dentro do fluxo real** que origina o evento (no service da task de origem), chamando o dispatcher da 29A — não criar endpoint paralelo de "criar notificação".
- Preencher `redirect`/`message_key`/`message_props` para o "Abrir Conteúdo Relacionado" (fluxograma 19.9).
- Respeitar `notification_preference` por categoria antes de emitir/enviar.
- Idempotência/anti-spam: evitar duplicar notificação para o mesmo evento/destinatário (ex.: re-favoritar). Downvote não deve expor quem votou.
- Não notificar o próprio autor das próprias ações.

## Contrato técnico detalhado

- Backend conforme `ARCHITECTURE.md`; reusar o dispatcher e os models da 29A (sem recriar). Sem novo endpoint de produção de notificação.
- Eventos em tempo real via Socket.IO já montado na 29A.
- Push/e-mail só quando consentido e com credenciais reais; senão, registrar in-app apenas.

## Estados obrigatórios

- Sem interface própria; a validação é por efeito: ao executar o evento real, a notificação aparece na central (29A) do destinatário e, quando aplicável, em tempo real.

## Fora do escopo

- Construir a central/preferências/canal (é a 29A).
- Criar eventos fake/mock para simular notificação.
- Moderação de conteúdo (decisões em `_product/decisions.md`).

## Critérios de aceite

- [ ] Cada evento do PRD §12 dispara o dispatcher da 29A com `type` e destinatário corretos, dentro do fluxo real de origem. Parcial: eventos com fonte persistida real foram ligados; `visualizacao_perfil` e `compartilhamento` seguem pendentes por falta de produtor persistido real.
- [x] Preferências (`notification_preference`) respeitadas por categoria antes de emitir/enviar.
- [x] Idempotência/anti-spam aplicada; autor não é notificado das próprias ações; downvote não expõe o votante.
- [x] `redirect`/`message_key`/`message_props` permitem abrir o conteúdo relacionado.
- [x] Nenhum mock, evento fake ou endpoint simulado.
- [x] Eventos sem origem persistida real ficam registrados como pendência e ligados quando a origem existir.
- [x] Modelos e contratos seguem `DATA-MODEL.md`.
- [x] ADR criado/atualizado em `adrs/`.
- [x] `pnpm --dir backend check` e builds relevantes verdes.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build`.
- Teste manual: executar um evento real (ex.: favoritar um psicólogo) e ver a notificação na central do destinatário, em tempo real quando conectado.

## Notas para executor

Esta task só produz eventos; o canal já existe na 29A. Ligue cada evento no service real que o origina, não em um endpoint separado. Commit próprio.

## Execução 2026-06-15

Implementado:

- `nova_avaliacao` a partir de `professional_review` criado.
- `novo_favorito` a partir de `psychologist_favorite` criado/restaurado.
- `clique_whatsapp` a partir de `contact_request` criado.
- `novo_post` a partir de `community_post` criado, notificando seguidores da comunidade exceto o autor.
- `nova_resposta` a partir de `post_reply` criado, notificando autor do post ou comentário pai.
- `upvote` a partir de `post_vote`; downvote permanece como sinal interno e não é exibido na central.
- `salvamento` a partir de `post_save` criado/restaurado.

Pendências registradas sem mock:

- `visualizacao_perfil`: não existe `profile_view_event`/fonte persistida real no modelo atual; TASK-20 já registra visualizações como indisponíveis até essa fonte existir.
- `compartilhamento`: as ações atuais de compartilhar posts usam apenas `navigator.share`/clipboard no frontend e não possuem modelo/endpoint persistido para gerar evento real.

Decisão documentada em `adrs/0098-notificacoes-eventos-dominio.md`.

## Complemento 2026-06-16

Implementado suporte de segmentação para `novo_post`:

- Preferências de novas postagens agora suportam `post_author_scope`.
- Para psicólogos: `patients_only` recebe alertas apenas de posts de pacientes; `all` recebe de pacientes e psicólogos.
- Para pacientes: `professionals_only` recebe alertas apenas de posts de psicólogos; `all` recebe de pacientes e psicólogos.
- A filtragem acontece no produtor real `community_post`, antes de chamar o dispatcher, sem criar endpoint paralelo ou evento simulado.

## Complemento 2026-06-18

Implementado suporte de desativacao total para `novo_post`:

- A preferencia visual `Desativado` salva `novo_post.enabled = false`, sem criar uma nova categoria e sem desligar `nova_resposta`, `upvote`, `salvamento`, `compartilhamento` ou demais notificacoes.
- O produtor real `community_post` continua chamando `shouldReceiveNewPostNotification`, que primeiro respeita `enabled = false` e so entao avalia `post_author_scope`.
- A normalizacao foi endurecida para tambem tratar um eventual legado/manual `post_author_scope: "disabled"` como `enabled = false`.
- A segmentacao existente por `patients_only`, `professionals_only` e `all` segue inalterada quando a categoria esta ativa.

Validacao:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke via `pnpm --dir backend exec tsx` validou que `novo_post.enabled = false` impede `novo_post`, preserva outra chave habilitada e trata `post_author_scope: "disabled"` como desligado.
- ADR atualizado: `adrs/0098-notificacoes-eventos-dominio.md`.

## Complemento 2026-06-18 - digests push de conteudo para pacientes

Implementada a regra de baixo volume para push de conteudo:

- A preferencia de pacientes em `novo_post` passa a usar `Todos` como padrao, com opcoes visuais `Todos`, `Favoritos` e `Desativado`.
- `Todos` para pacientes representa curadoria de psicologos relevantes, nao disparo imediato para todo evento.
- Psicologos favoritos tem prioridade sobre Top Mentors no digest, por representarem confianca explicita do paciente.
- Push imediato de `novo_post` para pacientes foi suprimido; a notificacao in-app e realtime continuam pelo dispatcher real.
- Foi criado scheduler backend de digests reais, sem mock:
  - almoco (`12:15` a `13:15`, `America/Sao_Paulo`): no maximo 1 push diario de atividade de psicologos;
  - noite (`19:30` a `21:00`, `America/Sao_Paulo`): no maximo 1 push diario de comunidades.
- O digest de psicologos considera preferencias:
  - `Favoritos`: apenas psicologos favoritados;
  - `Todos`: favoritos, comunidades seguidas, Top Mentors e relevancia real da plataforma;
  - `Desativado`: nao envia digest de conteudo.
- O digest de comunidades e regra interna do sistema, mas respeita `Desativado` em `novo_post` por cautela de consentimento:
  - prioriza comunidades seguidas;
  - depois categorias relacionadas;
  - depois conteudo geral relevante quando nao houver conteudo nas comunidades/categorias seguidas.
- O estado anti-duplicidade usa `user_background.type = "notification_digest_state"` com `last_checked_at`, `last_sent_at` e `last_sent_date` por janela (`favorites_lunch_digest` e `community_evening_digest`), sem alterar schema/migrations.
- Se nao houver conteudo, o sistema atualiza `last_checked_at` e nao envia push.
- Lookback usa ultimo envio da mesma janela; quando ausente/antigo, limita a 24h por padrao e 48h no maximo.

Pendencias sem mock:

- Nao existe fonte persistida de conteudo ja visualizado/lido pelo paciente; por isso o digest ainda nao exclui itens ja vistos.
- Nao existe modelo explicito de interesses do paciente alem de comunidades seguidas; o fallback relacionado usa categorias das comunidades seguidas e depois relevancia geral.

Validacao:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke via `pnpm --dir backend exec tsx` validou default `Todos`, normalizacao legada `professionals_only -> all` para pacientes e filtro `Favoritos`.

ADR criado: `adrs/0129-push-digest-paciente-favoritos-comunidades.md`.

## Complemento 2026-06-18 - politica de push para psicologos

Implementada a regra de prioridade para reduzir ruído sem perder sinais de conversão:

- Push imediato para psicólogos permanece ativo para eventos de alto valor:
  - `clique_whatsapp`;
  - `nova_avaliacao`;
  - `nova_resposta`;
  - `novo_post` de paciente conforme preferencia vigente de `novo_post`.
- `novo_favorito` continua gerando notificação in-app, mas o push imediato é agrupado por janela de 1 hora para evitar repetição excessiva.
- `clique_whatsapp` recebeu `actor_id` em `message_props` para agrupar push repetido do mesmo paciente em até 1 hora, mantendo a notificação in-app real.
- Push imediato foi suprimido para sinais de menor urgência enviados a psicólogos:
  - `upvote`;
  - `downvote`;
  - `salvamento`.
- Esses sinais entram no digest profissional diário, sem gerar interrupções a cada interação.
- Foi criado digest push para psicólogos, no mesmo scheduler real de notificações:
  - janela `18:30` a `19:30`, `America/Sao_Paulo`;
  - no máximo 1 push por dia;
  - base em eventos reais já persistidos em `notification`, sem mock;
  - considera `clique_whatsapp`, `nova_avaliacao`, `novo_favorito`, `nova_resposta`, `upvote` e `salvamento`;
  - respeita `notification_preference` por canal `push` antes de contar/enviar;
  - `downvote` não entra no resumo para não reforçar sinal negativo não público.
- O estado anti-duplicidade reutiliza `user_background.type = "notification_digest_state"` com a chave `professional_daily_digest`, sem alterar schema/migrations.

Pendências sem mock:

- A aba/filtro `Oportunidades` para psicólogos em comunidades foi decidida em produto, mas ainda não foi implementada nesta execução.
- A estratégia futura de ondas para posts de pacientes pode ser conectada ao mesmo eixo de oportunidade; hoje o push imediato de `novo_post` para psicólogos segue a regra real já existente de preferência/segmentação.
- Notificações de marcos de ranking, assinatura e perfil incompleto dependem de eventos/produtores específicos ainda não existentes.

Validação:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

ADR criado: `adrs/0130-psicologos-push-prioridade-digest.md`.

## Complemento 2026-06-26 - downvotes fora da central

Implementada a regra de produto para não exibir downvotes na página de notificações:

- O produtor real `post_vote` não chama mais o dispatcher para `value = -1`; apenas upvotes geram `notification`.
- A listagem `/api/private/notification` filtra registros legados com `message_key = "downvote"`, para que downvotes antigos também não apareçam na central.
- Downvotes continuam existindo como voto/reputação interna de posts e comentários, sem exposição pública e sem notificação ao autor.

Validação:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

ADR atualizado: `adrs/0098-notificacoes-eventos-dominio.md`.

## Complemento 2026-06-26 - autoria nas notificacoes individuais

Mantida a producao real de eventos sem endpoint paralelo, mas a listagem da central passou a hidratar autoria para os eventos em que a identidade melhora o contexto da conversa:

- `novo_post` continua gravando `post_id` em `message_props`; a central usa esse id para buscar o autor do post.
- `nova_resposta` continua gravando `reply_id` e `parent_reply_id`; a central usa `reply_id` para buscar o autor da resposta e `parent_reply_id` para escolher a copy de post/comentario.
- Autores de posts anonimos seguem mascarados pelo alias estavel `Membro Anônimo #1234`, derivado de `author_id`, sem expor id real, foto ou perfil.
- Psicologos nao exibem label profissional no titulo da notificacao; quando houver verificacao profissional, a central mostra apenas o selo de verificado ao lado do nome. Membros comuns continuam sem label `Membro`.
- Eventos passivos (`upvote`, `salvamento`, `compartilhamento` e equivalentes) permanecem sem identificacao de ator para evitar exposicao desnecessaria.

Validacao:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

ADRs atualizados: `adrs/0007-notificacoes-fundacao.md` e `adrs/0098-notificacoes-eventos-dominio.md`.
