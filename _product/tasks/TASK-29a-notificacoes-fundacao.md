# TASK-29A: Notificações — fundação e recebimento

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-29A |
| Prioridade | P1 |
| Esforço | L |
| Fase | Conta |
| Status | Pending |
| Dependências | TASK-02, TASK-03, TASK-12 |
| ADR alvo | ADR de notificações e preferências |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Notificações.jpg` | `figma-design-frame-17-Notifica--es.html` |
| `_product/proto/Configurações de Notificações.jpg` | `figma-design-frame-24-Configura--es-de-Notifica--es.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Divisão da TASK-29

A TASK-29 foi dividida em duas:

- **29A (esta)**: o terreno — deixar tudo pronto para que notificações sejam **recebidas e exibidas** (models, CRUD in-app, subscription/VAPID, push, realtime, telas de central e preferências, montagem do manager). Não dispara notificações a partir de eventos de domínio.
- **29B**: liga os **eventos reais** de domínio (PRD §12) ao dispatch, respeitando preferências.

## Contexto

Notificações precisam refletir eventos reais e respeitar preferências. Esta task entrega o canal de recebimento (in-app + push + tempo real) sem ainda produzir eventos — quem produz é a 29B. Push/e-mail/WhatsApp dependem de decisões da TASK-03 / ADR-0006.

## Estado já scaffoldado nesta base (ponto de partida)

Já existe no repositório (trazido do sample e adaptado ao Lectum; revisar antes de concluir):

- Backend models/migração: `notification`, `notification_subscription` (migração `..._notifications`). **`notification_preference` ainda NÃO foi criado.**
- Backend CRUD in-app (registrado em `write.ts`): `GET /api/private/notification/index` (paginado `{data,page,pages,count}`), `PUT /api/private/notification/update/:id` (`{read}`), `POST /api/private/notification/clean`.
- Backend subscription (registrado): `GET /api/private/notification_subscription/key` (VAPID public key), `POST /api/private/notification_subscription/store` (`{subscription, force?}`).
- Backend infra de entrega: `backend/src/main/notification` (dispatcher) + `backend/src/main/socket/events/notification.ts` + `backend/src/config/webPush.ts`.
- Frontend: `api/req/notification`, `api/callers/notification` (CRUD), `api/req/notification-subscription`, `api/callers/notification_subscription`, `hooks/notification` (`NotificationManager`: registra service worker e inscreve push após e-mail confirmado), `utils/urlToBase64`, tipo `notification` e key `notification.index`.

## Objetivo

Entregar o recebimento de notificações ponta a ponta: persistência, listagem/leitura/limpeza in-app, preferências por canal, inscrição push real e atualização em tempo real — sem produzir eventos de domínio.

## Pré-requisitos e bloqueios

- Push web (`web-push`/VAPID) decidido na TASK-03 / ADR-0006. Sem `VAPID_EMAIL`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` no ambiente, a `key` retorna vazio e a inscrição é abortada silenciosamente — persistir preferência mas **não prometer entrega push**. Registrar a pendência de env.
- E-mail (Resend/Nodemailer) e WhatsApp/SMS (Twilio) só entram como canais de preferência aqui; envio efetivo por esses canais é responsabilidade da 29B/integração.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo backend (restante para concluir 29A)

- Adicionar o model `notification_preference` (1:1 por `user_id`, `prefs Json`) conforme `DATA-MODEL.md` › "Notificações", com migração aditiva.
- Endpoints de preferências em módulos separados (padrão do projeto): `GET /api/private/notification_preference/show` (cria default na primeira leitura) e `PUT /api/private/notification_preference/update`. Não aninhar sob `notification/`.
- Revisar/adequar o dispatcher `main/notification` aos padrões do Lectum: criar a notificação (`notification`), emitir via Socket.IO ao usuário conectado e enviar push **apenas** se houver `notification_subscription` e VAPID configurado; respeitar `notification_preference`.
- Garantir que toda rota privada de notificação passe por `_auth` (já passam). Não há `requireRole`: notificação é por usuário autenticado, escopada por `req.auth.id` (ownership).
- Service worker `public/sw.js` para receber push e exibir (criar se ausente).
- Traduções PT-BR para mensagens visíveis.

Modelos/tabelas (ver `DATA-MODEL.md` › "Notificações"; sem inventar):

- `notification` (in-app, já migrado): o evento do PRD §12 vai em **`message_key`**, payload em `message_props`, deep-link em `redirect`, flag de leitura em `read` (ver `DATA-MODEL.md` › "Notificações", já reconciliado).
- `notification_preference` (`prefs Json`, 1:1 por `user_id`) — a criar.
- `notification_subscription` (já existe; web-push). Não confundir com `notification`.

Endpoints (reais já existentes + a criar):

- GET `/api/private/notification/index` — lista paginada (existe).
- PUT `/api/private/notification/update/:id` — marca lida (existe).
- POST `/api/private/notification/clean` — limpa/marca todas (existe).
- GET `/api/private/notification_subscription/key` — VAPID (existe).
- POST `/api/private/notification_subscription/store` — salva subscription (existe).
- GET `/api/private/notification_preference/show` e PUT `/api/private/notification_preference/update` — preferências.

## Escopo frontend (restante para concluir 29A)

Rotas esperadas (mobile-first):

- `/app/notifications` — Central de Notificações.
- `/app/settings/notifications` — Preferências.

Implementação esperada:

- Montar o `NotificationManager` (`hooks/notification`) no shell privado (TASK-12) ou layout privado, para registrar SW e inscrever push.
- Central de Notificações consumindo `useNotification` (lista lida/não lida, marcar lida, limpar, scroll infinito via `useInfiniteQuery` já pronto), com estado vazio real.
- Tela de preferências usando a fundação da TASK-02 (toggles por categoria), consumindo o endpoint de preferências.
- Atualização em tempo real via Socket.IO (provider de socket já existe no frontend) — receber nova notificação e refletir na central/badge.
- `<img>` proibido; usar `next/image`. UI mobile-first.

## Contrato técnico detalhado

Arquitetura frontend/backend conforme `ARCHITECTURE.md` e `DATA-MODEL.md`. Callers/req de notificação já seguem o padrão (`callEndpoint`/`handleReq`, `useQueryClient`, keys em `cache/keys.ts`). Não criar client HTTP, store, auth ou design system paralelo; não usar `sample/` como fonte direta (o que foi portado deve ser adequado ao Lectum).

Packages permitidos: `socket.io`, `socket.io-client`, `web-push`, TanStack Query, Prisma (já instalados). Sem package novo sem ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio real (sem notificações).
- Sucesso com feedback discreto.
- Responsividade mobile-first.

## Fora do escopo

- **Disparar notificações a partir de eventos de domínio (é a 29B).**
- Criar dados fake, seed artificial ou mock para preencher a central.
- Envio efetivo por e-mail/WhatsApp (canais de integração ficam para 29B/integração).
- Refatorar módulos não relacionados.

## Critérios de aceite

- [ ] As referências visuais foram consultadas via Builder/Quick Copy ou imagens locais citadas. _(pendente: refinar UI contra os protótipos)_
- [x] `notification_preference` criado conforme `DATA-MODEL.md` (migração SQL adicionada) e endpoints de preferências (`notification_preference/show|update`) implementados.
- [x] CRUD in-app (`index/update/clean`) e subscription (`key/store`) revisados, registrados e compilando.
- [x] `NotificationManager` montado no shell privado; SW (`public/sw.js`) registrado; inscrição push degrada sem prometer push quando VAPID ausente.
- [x] Central de Notificações lista/marca/limpa notificações reais, com estado vazio real (sem mock).
- [x] Preferências por categoria persistem em `notification_preference`.
- [x] Recebimento em tempo real via Socket.IO ligado no provider (`socket.on("notification")`).
- [x] Modelos e endpoints seguem `DATA-MODEL.md`; módulo `notification_preference` separado conforme padrão.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado; nenhum `<img>` cru; UI mobile-first.
- [x] Pendência de VAPID env registrada (`_product/decisions.md` / ADR-0007).
- [x] ADR criado em `adrs/0007-notificacoes-fundacao.md`.
- [x] `pnpm --dir backend check`, `pnpm --dir frontend check` e `pnpm --dir frontend build` verdes.
- [ ] Validação em browser local + aplicar migração em ambiente com DB (`prisma migrate dev`). _(pendente: sem DB/VAPID no ambiente atual)_
- [ ] Commit criado com mensagem convencional. _(pendente: working tree segue uncommitted)_

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build` (schema/migração).
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em `/app/notifications` e `/app/settings/notifications`.

## Pendências

- VAPID env (TASK-03 / `_product/decisions.md`) para push efetivo.

## Notas para executor

Esta task deixa o canal de recebimento pronto. **Não** ligue eventos de domínio aqui — isso é a 29B. O que foi portado do sample deve ser revisado e adequado ao Lectum antes de marcar concluído. Commit próprio.
