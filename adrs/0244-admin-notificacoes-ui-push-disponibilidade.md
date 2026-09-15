# ADR-0244: UI administrativa de notificacoes e disponibilidade real de push

## Status

Aceita

## Contexto

A TASK-64 implementa a tela administrativa de Notificacoes. A tela nao e uma inbox do administrador; ela serve para criar campanhas manuais para usuarios e auditar logs automaticos gerados pela plataforma.

A TASK-63 ja definiu que a V1 nao possui e-mail e que os canais reais sao `in_app` e `push`. A UI precisava evitar prometer push quando o backend nao tem VAPID/subscriptions reais e evitar metricas inventadas de abertura/clique.

## Decisao

- A rota Admin `/notificacoes` consome exclusivamente endpoints reais de `/api/admin/private/notifications`.
- O fluxo de criacao usa React Hook Form, Zod e controllers do Admin para salvar rascunho, enviar agora com confirmacao explicita e agendar campanha.
- O canal `email` nao aparece no formulario, filtros ou tabelas. Copies podem citar que e-mail esta fora da V1, mas nao ha opcao acionavel.
- O canal `push` aparece somente quando o backend informa disponibilidade real em `/api/admin/private/notifications/push-status`.
- `push-status` considera push disponivel apenas quando VAPID esta configurado e existe ao menos uma `notification_subscription` real nao deletada com payload persistido.
- As metricas de abertura e clique usam apenas `read_at`/`clicked_at` e exibem `—`/copy honesta quando nao existe base real de entrega no periodo.
- A listagem de campanhas foi expandida para filtros reais por periodo, publico, canal e busca textual, mantendo a regra de nao criar endpoints fake para preencher UI.
- Logs automaticos sao somente leitura e usam `notification_deliveries.source="automatic"`.

## Consequencias

- Administradores nao visualizam ou selecionam push quando a infraestrutura real ainda nao permite envio efetivo.
- Numeros de abertura/clique podem aparecer zerados ou indisponiveis ate usuarios executarem eventos reais de leitura/clique.
- A UI fica preparada para habilitar push automaticamente quando VAPID e subscriptions reais existirem, sem mudanca visual adicional.
- A TASK-65 pode seguir sem misturar configuracoes de catalogos com notificacoes.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `http://localhost:3002/notificacoes` respondeu 200 no dev server local.
- `/api/admin/private/notifications/push-status` respondeu 401 sem token admin, confirmando protecao da rota.
