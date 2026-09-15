# ADR-0468: Título real nos logs de notificações Admin

## Status

Accepted

## Task relacionada

TASK-64

## Contexto

A tabela **Notificações automáticas** do Admin mostrava um rótulo fixo na coluna
**Notificação**. Assim, entregas com títulos reais persistidos ou deriváveis, como avisos de
assinatura, posts, respostas e campanhas, apareciam como **Notificação automática** em vez do
título enviado ao usuário.

As entregas de push nem sempre possuem `notification_id`, porque o envio push pode ocorrer sem criar
um item in-app correspondente para aquele canal. Nesses casos, apenas `trigger_key` e `metadata`
ficavam disponíveis para auditoria do Admin.

## Decisão

- O endpoint Admin de logs passa a retornar `notification_title` de forma aditiva.
- O título é resolvido nesta ordem:
  1. `metadata.notification_title` ou `metadata.title`, quando já persistido na entrega;
  2. `notification.message_props.title`, para notificações manuais in-app;
  3. templates reais de `main/notification/constants` usando `message_key` e `message_props`;
  4. `metadata.message_key`/`trigger_key` quando a entrega antiga não tem `notification_id`;
  5. fallback honesto **Título não disponível** para registros legados sem dados suficientes.
- Novas entregas automáticas e manuais passam a persistir `notification_title` no JSON `metadata`,
  sem criar coluna nova, para preservar o título efetivamente usado em canais sem `notification_id`.
- A UI da tabela de logs automáticos consome `notification_title` e remove o hard-code
  **Notificação automática**.

## Consequências

- O Admin passa a auditar a mensagem por título real, não apenas por origem do disparo.
- Registros antigos de push conseguem recuperar títulos estáticos pelo `trigger_key`; títulos que
  dependiam de props não armazenadas podem usar fallback de template quando a informação não é
  recuperável.
- O contrato é compatível com rollout independente: backend novo adiciona campo sem quebrar Admin
  antigo; Admin novo trata `notification_title` como opcional enquanto backend antigo estiver ativo.
- Não há package novo, migration, backfill obrigatório ou alteração em preferências/canais.

## Produção e rollout

- Sem alteração de banco/migration: expansão lógica via campo adicional no JSON `metadata` e no
  payload de resposta.
- Sem env nova e sem **ALERTA DE DEPLOY**.
- Ordem segura: publicar backend e Admin em `homolog` pelo push da branch `homolog`; validar a tela
  `/notificacoes` e promover somente após smoke.
- Rollback: reverter o commit restaura o rótulo anterior na UI e para de gravar o título em novas
  entregas; os metadados já gravados são aditivos e podem permanecer no banco sem contrair schema.

## Validação

- `pnpm --dir backend exec biome check --write "src/main/notification/index.ts" "src/modules/api/admin/private/notifications/use-cases/services/delivery.ts" "src/modules/api/admin/private/notifications/use-cases/services/metrics.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/notifications/index.ts" "src/app/(admin)/notificacoes/components/logs.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em Chrome abriu `http://localhost:3002/notificacoes` e confirmou a rota
  protegida até o login administrativo; inspeção autenticada completa depende de sessão Admin real.
- Build do Admin não contém mais o literal **Notificação automática** no chunk de `/notificacoes`.

## Pendências

- Após deploy de homologação, validar com sessão Admin real que os logs existentes exibem títulos
  como **Novo contato pelo WhatsApp**, **Nova resposta no post** ou o título persistido da campanha.
