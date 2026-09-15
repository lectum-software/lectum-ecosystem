# ADR-0459: Régua de cobrança para assinatura profissional

## Status

Accepted

## Contexto

A assinatura profissional recorrente pode falhar por problema de cartão. Antes desta decisão, a Lectum não tinha uma janela operacional clara entre a falha de cobrança e a perda dos benefícios, nem notificações automáticas específicas de cobrança ou um CTA explícito em **Minha Assinatura**.

Como homologação e produção já têm dados e pagamentos reais, a régua não pode fazer reset, seed, cobrança manual ou downgrade silencioso sem controle operacional.

## Decisão

- Criar metadados aditivos nullable em `professional_subscription`:
  - `billing_issue_started_at`;
  - `billing_grace_ends_at`;
  - `billing_downgraded_at`;
  - `billing_last_notice_key`.
- Ao sync/webhook Mercado Pago retornar `inadimplente` para assinatura `source="mercadopago"` previamente `ativa`, abrir régua D+0 com 7 dias de graça e enviar aviso `payment_failed`.
- Durante a graça, o entitlement profissional considera `status="inadimplente"`, `billing_grace_ends_at > now` e `billing_downgraded_at=null` como ativo.
- Um scheduler backend, desligado por padrão e habilitado apenas por `BILLING_DUNNING_SCHEDULER_ENABLED=true`, processa D+3 (`reminder_d3`), D+6 (`final_d6`) e D+7 (`downgraded`).
- No D+7, gravar `billing_downgraded_at` e remover o entitlement profissional sem excluir assinatura, sem apagar histórico e sem cobrança manual.
- Se o gateway voltar a `ativa`, limpar os campos da régua e enviar aviso `regularized`.
- Usar um único `message_key="billing_subscription_status"` com `billing_notice_stage` em `message_props`, mantendo preferência por categoria e auditoria por `notification_delivery`.
- Exibir em **Minha Assinatura** o alerta de prazo e botão **Regularizar cartão** para a rota existente `/app/profissional/assinatura/cartao`.

## Consequências

- Falhas de cobrança passam a ter comunicação e prazo previsíveis: D+0, D+3, D+6 e D+7.
- Psicólogos mantêm benefícios durante a janela de regularização e perdem o Pro somente após D+7.
- A implantação é compatível com versões antigas: campos novos são opcionais e nullable; frontend trata ausência como estado anterior.
- D+3/D+6/D+7 exigem ativação explícita da env `BILLING_DUNNING_SCHEDULER_ENABLED` no backend; `BILLING_DUNNING_INTERVAL_MS` e `BILLING_DUNNING_BATCH_SIZE` são opcionais e têm fallback seguro.
- Não há backfill automático de assinaturas que já estavam inadimplentes antes do deploy.

## Rollback

- Desabilitar `BILLING_DUNNING_SCHEDULER_ENABLED` interrompe lembretes D+3/D+6 e novos downgrades D+7 sem remover dados.
- Para rollback de código, os campos nullable podem permanecer no banco até uma task de contração futura.
- Notificações já entregues permanecem auditadas em `notification_delivery`; não devem ser apagadas.

## Validação

- Banco descartável: `pnpm --dir backend db:migrate` detectou drift preexistente de migrations antigas; após autorização explícita do usuário, `pnpm --dir backend exec prisma migrate reset --force` reaplicou as 93 migrations.
- `pnpm --dir backend exec prisma migrate deploy`: sucesso, sem migrations pendentes.
- `pnpm --dir backend exec prisma migrate status`: sucesso, schema atualizado.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Smoke local HTTP no frontend buildado em `http://127.0.0.1:3075`: `/version` respondeu `0.1.124` antes do bump; rotas `/app/profissional/assinatura` e `/app/profissional/assinatura/cartao` responderam `307` pelo guard autenticado.
- `pnpm check`: sucesso.
- `pnpm check:version` após `pnpm version:bump` para `0.1.125`: sucesso.
