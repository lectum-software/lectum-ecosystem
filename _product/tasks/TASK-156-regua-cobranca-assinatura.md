# TASK-156: Régua de cobrança e regularização da assinatura

## Metadata

| Campo | Valor |
| --- | --- |
| Status | Completed |
| Owner | Codex |
| Criada em | 2026-08-15 |
| Concluída em | 2026-08-15 |
| Dependências | TASK-32, TASK-33, TASK-63, TASK-64, TASK-80 |

## Contexto

Após discussão de produto, a Lectum precisa de uma régua de cobrança para assinaturas recorrentes de psicólogos quando o cartão falhar. Antes desta task, a assinatura podia ficar `inadimplente` sem prazo explícito, sem lembretes automáticos e sem botão de regularização claro em **Minha Assinatura**.

## Decisão de produto

- A régua vale apenas para assinatura paga recorrente que já estava ativa. Falha na primeira tentativa de checkout não entra na régua; o cadastro continua pendente.
- D+0: ao receber status de inadimplência do gateway para assinatura paga ativa, abrir janela de 7 dias, manter benefícios profissionais e notificar o psicólogo.
- D+3: enviar lembrete de pagamento pendente.
- D+6: enviar aviso final antes do downgrade.
- D+7: se a assinatura continuar inadimplente, marcar downgrade local e remover benefícios do Plano Profissional.
- Regularização antes do D+7: ao gateway voltar a indicar assinatura ativa, encerrar a régua e notificar regularização.
- Durante a régua, **Minha Assinatura** deve exibir alerta com prazo e botão **Regularizar cartão** apontando para a tela existente de troca de cartão.

## Escopo

1. Persistir metadados aditivos da régua em `professional_subscription`.
2. Manter entitlement profissional durante a janela de graça e remover após downgrade.
3. Disparar notificações in-app, push web e e-mail transacional para as etapas da régua, respeitando preferências de notificação.
4. Adicionar categoria de preferência **Cobrança da assinatura** para psicólogos.
5. Atualizar **Minha Assinatura** e a tela de cartão para o estado de regularização.
6. Criar scheduler controlado por env para lembretes D+3/D+6 e downgrade D+7.

## Fora do escopo

- Cobrança manual pela Lectum fora do Mercado Pago.
- Backfill automático de assinaturas que já estavam inadimplentes antes do deploy.
- Mudanças no Admin financeiro além das notificações já auditáveis em `notification_delivery`.

## Impacto de deploy

- Migration aditiva e compatível: quatro colunas nullable e dois índices em `professional_subscriptions`.
- Backend novo pode conviver com frontend antigo: campos novos são aditivos e o entitlement mantém regras anteriores para `ativa`.
- Frontend novo pode conviver com backend antigo: campos da régua são opcionais no type client.
- O scheduler de D+3/D+6/D+7 fica desligado por padrão e só roda com `BILLING_DUNNING_SCHEDULER_ENABLED=true`, evitando downgrade automático antes da configuração operacional.
- D+0 e regularização são processados nos fluxos reais de sync/webhook do Mercado Pago.

### ALERTA DE DEPLOY

- Env nova: `BILLING_DUNNING_SCHEDULER_ENABLED`.
- Envs opcionais documentadas: `BILLING_DUNNING_INTERVAL_MS` e `BILLING_DUNNING_BATCH_SIZE`, ambas com fallback seguro.
- App: backend.
- Ordem: aplicar migration em homologação, validar webhook/sync e tela; depois habilitar `BILLING_DUNNING_SCHEDULER_ENABLED=true` em homologação para validar D+3/D+6/D+7; repetir a ordem em produção somente após homologação validada.
- Impacto se ausente: D+0 e regularização continuam funcionando, mas lembretes D+3/D+6 e downgrade D+7 não são executados automaticamente.
- Valores não devem ser expostos em logs, UI ou documentação pública.

## Referência visual

- Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`.
- Limitação: Builder/Quick Copy não ficou disponível como ferramenta direta neste ambiente; foi usado fallback local.
- Imagens consultadas: `_product/proto/Minhas Assinatura - Psicólogo.jpg`, `_product/proto/Alterar cartão de crédito.jpg`, `_product/proto/Cartão Alterado com Sucesso.jpg`.

## Critérios de aceite

- [x] D+0 abre régua de 7 dias apenas para assinatura paga recorrente previamente ativa.
- [x] Benefícios profissionais permanecem liberados durante a régua e são removidos após D+7.
- [x] D+3, D+6 e D+7 são processados por scheduler idempotente e controlado por env.
- [x] Psicólogo recebe notificação in-app/push e e-mail transacional em problemas de cobrança, downgrade e regularização.
- [x] **Minha Assinatura** mostra alerta com prazo da régua e botão **Regularizar cartão**.
- [x] A categoria de preferência **Cobrança da assinatura** aparece somente para psicólogos.
- [x] Migration local foi aplicada no banco descartável após reset autorizado; `migrate deploy` e `migrate status` confirmaram schema atualizado.
- [x] Checks/builds relevantes foram executados sem mocks.

## Validação executada

- `pnpm --dir backend db:migrate`: primeira execução bloqueada por drift preexistente de migrations antigas no banco descartável configurado; após autorização explícita do usuário, `pnpm --dir backend exec prisma migrate reset --force` reaplicou as 93 migrations, incluindo `20260815120000_add_billing_dunning_fields`.
- `pnpm --dir backend exec prisma migrate deploy`: sucesso, sem migrations pendentes após encerrar processo local pendurado de `migrate dev`.
- `pnpm --dir backend exec prisma migrate status`: sucesso, schema atualizado.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- Smoke local HTTP no frontend buildado em `http://127.0.0.1:3075`: `/version` respondeu `0.1.124` antes do bump; `/app/profissional/assinatura` e `/app/profissional/assinatura/cartao` responderam `307` para o guard autenticado.
- `pnpm check`: sucesso.
- `pnpm check:version` após `pnpm version:bump` para `0.1.125`: sucesso.
