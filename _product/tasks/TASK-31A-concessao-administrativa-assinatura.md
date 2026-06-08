# TASK-31A: Concessão administrativa de assinatura profissional

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-31A |
| Prioridade | P1 |
| Esforço | S |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-31 |
| ADR alvo | ADR-0028 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `adrs/0003-gateway-pagamento-mercado-pago.md`

## Contexto

O produto precisa permitir que a operação conceda gratuitamente, por prazo determinado, os recursos do Plano Profissional para psicólogos selecionados. O fluxo não deve depender de pagamento pendente, não deve simular checkout Mercado Pago e não deve criar `user.role="admin"` enquanto a audiência admin permanece fora do MVP.

## Objetivo

Registrar no Supabase/PostgreSQL uma assinatura profissional ativa e auditável, com prazo de expiração, sem cobrança e sem gateway externo, reaproveitando o mesmo modelo de entitlement usado para selo e recursos do Plano Profissional.

## Escopo

- Estender `professional_subscription` com origem e campos de auditoria da concessão.
- Criar migração Prisma aplicada ao banco configurado em `DATABASE_URL`.
- Criar comando operacional backend para conceder a assinatura por `email`, `user.id` ou `psychologist_profile.id`.
- Centralizar a regra de assinatura profissional ativa para considerar `status="ativa"` e `current_period_end` no futuro ou nulo.
- Manter Plano Gratuito como fluxo normal de entrada; a concessão administrativa troca a assinatura ativa para Plano Profissional sem passar por pagamento.

## Fora do escopo

- Criar interface admin.
- Criar role admin dentro de `user.role`.
- Simular pagamento ou checkout Mercado Pago.
- Criar dados fake, seeds ou mocks.

## Critérios de aceite

- [x] `professional_subscription` registra `source`, `grant_reason`, `grant_notes`, `granted_by` e `grant_started_at`.
- [x] Concessões administrativas usam `source="admin_grant"`, plano `profissional`, `status="ativa"` e `current_period_end` futuro.
- [x] O comando operacional cancela assinaturas não canceladas anteriores sem gateway antes de criar a concessão e bloqueia alvos com cobrança externa ativa/pendente.
- [x] Entitlement profissional ignora concessões expiradas.
- [x] Plano gratuito continua disponível sem gateway e registra origem própria para novas assinaturas gratuitas.
- [x] Nenhum package novo foi instalado.
- [x] Migração foi executada no banco configurado/Supabase via script do projeto.
- [x] ADR criado ou atualizado.
- [x] Checks/builds relevantes foram executados.
- [x] Commit criado e push executado.

## Uso operacional

```powershell
pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Parceria institucional" --actor "Operação Lectum"
```

Também é possível usar `--until YYYY-MM-DD`, `--psychologist-user-id` ou `--psychologist-profile-id`.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend subscription:grant -- --help`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`

## Execução

- Migração aplicada no Supabase configurado em `DATABASE_URL`: `20260608181526_add_admin_subscription_grants`.
- Comando operacional criado: `pnpm --dir backend subscription:grant -- ...`.
- Validação negativa sem mutação executada com e-mail inexistente; o comando retornou erro esperado sem criar assinatura.
- Validações executadas: `pnpm --dir backend db:migrate -- --name add_admin_subscription_grants`, `pnpm --dir backend db:generate`, `pnpm --dir backend subscription:grant -- --help`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm check`.
