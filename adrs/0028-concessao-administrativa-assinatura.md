# ADR-0028: Concessão administrativa de assinatura profissional

## Status

Accepted

## Task relacionada

TASK-31A

## Contexto

Alguns psicólogos precisam receber, gratuitamente e por prazo determinado, os recursos do Plano Profissional. A alternativa de iniciar uma assinatura paga e liberar enquanto o pagamento está pendente acoplaria benefício comercial a estado de gateway e poderia conflitar com o fluxo Mercado Pago da TASK-32.

O documento `DATA-MODEL.md` reserva a audiência admin para pós-MVP e proíbe tratar admin como `user.role`. Portanto, a solução não pode criar uma área admin improvisada nem simular pagamento. O entitlement do Plano Profissional também precisa continuar sendo respondido pelo banco da aplicação, não por chamada síncrona ao provedor de pagamento.

## Decisão

Criar uma origem operacional de assinatura em `professional_subscription.source`, com valores documentados `"free_signup"`, `"mercadopago"`, `"admin_grant"` e `"legacy"`.

Concessões gratuitas de Plano Profissional são gravadas como uma nova `professional_subscription` com:

- `plan.slug="profissional"`;
- `status="ativa"`;
- `source="admin_grant"`;
- `gateway=null`;
- `gateway_subscription_id=null`;
- `current_period_end` futuro obrigatório;
- `grant_reason`, `grant_notes`, `granted_by` e `grant_started_at` para auditoria operacional.

Enquanto a interface/admin auth não existir, a operação é feita por comando backend versionado:

```powershell
pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Parceria institucional" --actor "Operação Lectum"
```

O comando cancela assinaturas não canceladas do mesmo `psychologist_profile.id` antes de criar a concessão, garantindo uma única assinatura vigente, mas bloqueia alvos que já tenham assinatura não cancelada vinculada a gateway (`source="mercadopago"`, `gateway` ou `gateway_subscription_id`). Nesses casos, a cobrança externa precisa ser cancelada/reconciliada no gateway antes de conceder benefício gratuito. O Plano Gratuito segue sendo criado pelo fluxo normal com `source="free_signup"`.

A regra de entitlement profissional foi centralizada em helper compartilhado: assinatura profissional ativa exige `deleted=false`, `status="ativa"` e `current_period_end` nulo ou futuro, além de plano ativo não gratuito. Essa regra alimenta selo/verificado, filtros de verificados e recursos profissionais, evitando que concessões vencidas mantenham benefícios.

## Consequências

- A operação pode conceder benefícios reais sem cobrar, sem checkout pendente e sem mock.
- O comando não encerra cobrança externa silenciosamente; isso evita divergência entre Supabase e Mercado Pago.
- A auditoria fica na própria tabela de assinaturas, compatível com Supabase/PostgreSQL e com futuras telas administrativas.
- Concessões vencidas deixam de conceder selo/recursos mesmo que o status permaneça `ativa`; uma rotina futura pode reconciliar status para `cancelada` ou `inativa`.
- O campo `granted_by` é texto livre até a audiência `admin` entrar no escopo; quando existir admin real, poderá ser migrado para FK/relacionamento.
- Assinaturas antigas recebem `source="legacy"` pela migration e continuam funcionando conforme status/período.

## Validação

- `pnpm --dir backend db:migrate -- --name add_admin_subscription_grants`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend subscription:grant -- --help`
- `pnpm --dir backend subscription:grant -- --psychologist-email codex-validation-nonexistent@example.invalid --days 1 --reason "Validacao sem mutacao" --actor "Codex"` retornou erro esperado sem criar assinatura.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`

## Pendências

- Criar UI/admin auth em task futura, sem usar `user.role="admin"`.
- Definir rotina operacional de expiração/reconciliação de concessões vencidas, caso seja necessário mudar status automaticamente.
