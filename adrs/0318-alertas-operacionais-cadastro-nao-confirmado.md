# ADR-0318: Alertas operacionais derivados de cadastro nao confirmado

## Status

Accepted

## Task relacionada

TASK-83

## Contexto

A central Admin de moderacao ja consolida pendencias operacionais sem criar filas paralelas quando a pendencia pode ser derivada de dados reais. O produto pediu que cadastros de pacientes e psicologos que falharam logo no inicio aparecam em `/moderacao/operacionais`, com destaque **Erro no cadastro**, modo tentado de cadastro e e-mail.

O caso real disponivel hoje e o cadastro por e-mail/senha que cria `user` com `confirmed=false` ate a confirmacao de e-mail. Cadastros Google sao criados confirmados no fluxo atual; se algum registro Google persistido ficar nao confirmado por inconsistencia futura, ele tambem deve aparecer com modo **Google**.

## Decisao

- Criar o alerta operacional `registration_error` de forma derivada a partir de `user.confirmed=false`.
- Restringir a fila a usuarios `role in ("paciente", "psicologo")`, `active=true`, `deleted=false` e `account_status="active"`.
- Exibir o modo de cadastro a partir de `user.provider`: `google` vira **Google**; qualquer outro valor vira **Email/senha**.
- Exibir o e-mail real (`user.email`) nos fatos do alerta e na coluna **Detalhes** da tela de Operacionais.
- Direcionar a acao para `/pacientes/:id` ou `/psicologos/:id`, conforme o papel do usuario.
- Nao persistir pendencia, resolucao ou status administrativo novo; a remocao automatica acontece quando o fluxo real marca `user.confirmed=true`.

## Consequencias

- Operacao passa a enxergar abandono/problema no cadastro sem depender de mock, seed, backfill ou nova tabela.
- Compliance continua limitado a CRP pendente e WhatsApp invalido; `registration_error` entra somente em `operacional_total` e nos graficos operacionais.
- Falhas antes da criacao de `user` continuam fora do escopo porque nao existe fonte persistida confiavel nesta task; isso exigiria telemetry/evento proprio futuro.
- Usuarios suspensos, desativados ou deletados nao entram na fila, evitando misturar problema de conta com problema de conclusao de cadastro.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke read-only do use-case `listOperationalAlerts({ group: "operacional", alertType: "registration_error" })`, comparando `counts.registration_errors` com a contagem real de `user.confirmed=false` no banco local; o ambiente local retornou 0 pendencias reais no momento do teste.
- Smoke HTTP em `http://localhost:3002/moderacao/operacionais` retornou 200.

## Pendencias

- Avaliar futuramente se o produto deseja capturar tentativas que falham antes de criar `user`, com evento auditavel proprio e politica de retencao/LGPD.
