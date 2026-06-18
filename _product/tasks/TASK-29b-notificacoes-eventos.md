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
| Downvote | `downvote` | TASK-26 (`post_vote`) | (não público — ver PRD §9; tratar com cautela) |
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
- `upvote` e `downvote` a partir de `post_vote`, sem expor votante no downvote.
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
