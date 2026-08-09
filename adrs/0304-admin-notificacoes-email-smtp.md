# ADR 0304: Canal e-mail real nas notificações administrativas

## Status

Accepted

## Data

2026-07-21

## Contexto

A TASK-64 inicialmente excluía e-mail das notificações manuais administrativas para manter a V1 restrita a in-app e push. O usuário confirmou que notificações também devem poder ser enviadas por e-mail e que o backend já possui SMTP/Nodemailer configurado com remetente de teste da Planuze para envios reais.

O projeto já tinha `EMAIL_API_*`, `modules/api/config/nodemailer/send.ts` e template `transactional.hbs`. Portanto, criar um mock, provider paralelo ou template temporário violaria a regra de não mascarar requisito externo.

## Decisão

Habilitar `email` como canal real de campanhas manuais do Admin Notificações, condicionado a configuração SMTP disponível no backend.

- O backend aceita `email` em `ADMIN_NOTIFICATION_CHANNELS`.
- Um endpoint autenticado `/api/admin/private/notifications/email-status` informa se o provider SMTP está configurado.
- Campanhas com `email` falham com `503` se o SMTP não estiver configurado, em vez de salvar/enviar algo simulado.
- O envio reutiliza `send()` do Nodemailer existente e o template `transactional.hbs`.
- O título da notificação é o assunto do e-mail.
- A mensagem vira HTML escapado; o redirect interno opcional vira botão para a primeira origem de `WEB_URL`.
- `notification_delivery.channel="email"` registra `sent` quando o SMTP aceita o envio, `failed` quando o provider falha e `skipped` quando preferência/dado do usuário impede a tentativa.
- Abertura e clique de e-mail não serão inventados; ficam sem tracking nesta etapa.

## Consequências

- Não há migração Prisma nem package novo: `admin_notification_campaign.channels` é JSON e `notification_delivery.channel` é string.
- A UI Admin mostra **E-mail** apenas quando o endpoint de status confirma SMTP real disponível.
- Push e e-mail são independentes; indisponibilidade/skip de push não bloqueia e-mail selecionado.
- Métricas de alcance passam a contar e-mails aceitos pelo SMTP como `sent`, mas taxas de abertura/clique continuam baseadas apenas em `read_at`/`clicked_at` persistidos.
- Evoluções futuras podem adicionar template editor, preferências explícitas de e-mail para o usuário, unsubscribe granular e tracking de abertura/clique com eventos first-party.
