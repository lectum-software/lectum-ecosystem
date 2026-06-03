# ADR-0007: Notificações — fundação de recebimento (TASK-29A)

## Status

Accepted

## Task relacionada

TASK-29A (fundação/recebimento). A produção de eventos de domínio é a TASK-29B. Modelos em `_product/tasks/DATA-MODEL.md` › "Notificações".

## Contexto

A TASK-29 foi dividida em 29A (canal de recebimento) e 29B (eventos). O código de notificações foi trazido do `sample` e adaptado ao Lectum. Era preciso fixar a arquitetura do canal: modelo de dados, módulos de API, dispatcher, push web e tempo real — sem ainda disparar a partir de eventos de domínio.

A forma do `notification` migrada (derivada do sample) usa `read`, `redirect`, `message_key`, `message_props` — divergente da spec inicial (`type/data/read_at`). Reconciliado: **`message_key` carrega o tipo do evento do PRD §12** (e serve como chave i18n), `message_props` o payload, `redirect` o deep-link. O campo `modal` foi removido do modelo.

## Decisão

- **Modelo**: `notification` (in-app, já migrado) + `notification_preference` (criado nesta task, `prefs Json` 1:1 por usuário) + `notification_subscription` (web-push, já existente).
- **Módulos de API separados por caso** (padrão do projeto, controller/service/repository/validator/DTO/index): `notification/{index,update/:id,clean}`, `notification_preference/{show,update}`, `notification_subscription/{key,store}`. **Não aninhar preferências sob `notification/`** — `notification_preference` é módulo próprio.
- **Dispatcher** (`main/notification.notify(userIds, meta)`): persiste a notificação in-app, emite via Socket.IO e envia push web, respeitando `notification_preference` por canal (`in_app`/`push`, default permitir). Não é ligado a eventos aqui (isso é 29B).
- **Push web**: VAPID via `notification_subscription/key`; subscription persistida via `notification_subscription/store`; service worker em `public/sw.js`. Sem VAPID configurado, a inscrição é abortada silenciosamente — sem prometer push.
- **Frontend**: `NotificationManager` montado no shell privado (registra SW + inscreve push após e-mail confirmado); Central de Notificações (`/app/notifications`) e Preferências (`/app/settings/notifications`); tempo real já ligado no provider de socket (`socket.on("notification")` → refetch).
- **Autorização**: rotas privadas via `_auth`, escopadas por `req.auth.id` (notificação é por usuário; sem `requireRole`).

## Consequências

- Canal de recebimento pronto: in-app (listar/marcar/limpar), push e tempo real, com preferências por categoria.
- Separação por módulo respeita o padrão e evita acoplar preferências ao CRUD de notificação.
- Trade-off: a tela de preferências usa estado local simples (toggles), não a fundação completa da TASK-02 — aceitável para settings; pode ser migrada na refinação visual.
- A produção de notificações depende da TASK-29B ligar o dispatcher aos eventos do PRD §12.

## Validação

- `pnpm --dir backend check` e `pnpm --dir frontend check` verdes; `pnpm --dir frontend build` verde.
- `prisma generate` reflete `notification_preference`; migração `..._notification_preferences` adicionada.

## Pendências

- **VAPID env** (`VAPID_EMAIL`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`) — TASK-03 / `_product/decisions.md`.
- **Migração precisa ser aplicada em ambiente com banco** (`prisma migrate dev`); o SQL de `notification_preferences` foi adicionado, e a remoção da coluna `modal` de `notifications` exige uma migração de drop a ser gerada no ambiente com DB.
- TASK-29B: ligar os eventos de domínio ao dispatcher.
