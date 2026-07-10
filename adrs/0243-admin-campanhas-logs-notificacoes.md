# ADR-0243: Campanhas manuais e logs de notificacoes do Admin

## Status

Aceita

## Contexto

A TASK-63 cria a fundacao backend da tela administrativa de Notificacoes. A tela nao representa notificacoes recebidas pelo administrador; ela permite criar campanhas manuais para usuarios e consultar logs das notificacoes automaticas produzidas pelo dispatcher real.

A decisao de produto remove e-mail da V1. Portanto, nao deve existir SMTP, template de e-mail, tracking pixel ou metrica de abertura de e-mail nessa fundacao.

## Decisao

- Criar `admin_notification_campaigns` para campanhas manuais com status `draft`, `scheduled`, `sending`, `sent`, `canceled` e `failed`.
- Criar `notification_deliveries` como trilha auditavel por usuario/canal/origem, vinculando opcionalmente campanha e notificacao in-app.
- Usar somente canais `in_app` e `push`. Payload com `email` e rejeitado antes da persistencia.
- Usar `message_key="admin_campaign"` para notificacoes in-app geradas por campanhas manuais.
- Definir audiencias V1 como usuarios reais `deleted=false` e `active=true`; `patients`/`active_patients` filtram `role="paciente"` e `psychologists`/`active_psychologists` filtram `role="psicologo"`.
- Respeitar preferencias reais por chave/canal via `notification_preference.prefs`. Se a preferencia bloquear o canal, a entrega fica `skipped` com motivo `preference_disabled`.
- Registrar logs automaticos dentro do dispatcher existente `notify`, sem criar endpoint simulado ou fonte paralela.
- Push so e enviado quando ha VAPID configurado e subscription real. Ausencia de VAPID/subscription gera `skipped`, sem contar alcance.
- Leitura/abertura in-app e registrada somente quando o usuario marca a notificacao como lida (`PUT /api/private/notification/update/:id` ou `clean`). Clique e registrado somente em `POST /api/private/notification/:id/click`.
- Redirect de campanha manual fica restrito a rota interna iniciada por `/`, sem aceitar URL externa nesta V1.

## Consequencias

- A TASK-64 pode consumir endpoints reais de campanhas, logs automaticos e metricas agregadas sem mocks.
- Metricas de abertura e clique podem ficar zeradas ate a UI chamar os eventos reais; isso e desejado para evitar numeros inventados.
- Campanhas push-only terao alcance baixo ou zero quando usuarios nao tiverem subscription ou VAPID estiver ausente, e isso aparece como `skipped`/motivo real.
- A ausencia de e-mail reduz escopo operacional e evita prometer metricas que nao possuem fonte real.

## Validacao

- `pnpm --dir backend db:migrate --name add_admin_notification_campaigns` criou/aplicou a migration `20260710140831_add_admin_notification_campaigns`.
- `pnpm --dir backend db:migrate` confirmou o schema em sincronia.
- `pnpm --dir backend check`, `pnpm --dir backend build` e `pnpm check` executaram sem erro.
- Teste de integracao temporario usou admin e usuarios reais para criar/enviar uma campanha `in_app` e removeu as linhas temporarias ao final, validando 8 entregas reais sem dado fake permanente.
