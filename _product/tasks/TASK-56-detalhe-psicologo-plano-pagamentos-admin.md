# TASK-56: Detalhe administrativo do psicólogo — Plano, pagamentos e cortesia

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-56 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Financeiro |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-55, TASK-31A, TASK-31C, TASK-32, TASK-33 |
| ADR alvo | ADR se houver nova decisão sobre concessão por UI, cancelamento ou histórico financeiro admin |

## Contexto

A aba "Plano e pagamentos" usa como referência `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png`.

A Lectum já possui concessão administrativa por comando (`TASK-31A`) e data de inscrição CRP para cortesia (`TASK-31C`). Esta task transforma a concessão em fluxo Admin real quando possível.

## Objetivo

Exibir plano, método e histórico financeiro do psicólogo e permitir concessão de cortesia profissional por UI real, sem simular pagamento nem expor dados sensíveis de cartão.

## Pré-requisitos e bloqueios

- TASK-55 concluída.
- Credenciais/contratos de Mercado Pago devem estar configurados para dados de pagamento reais.
- Se histórico de pagamento não puder ser confirmado a partir de `payment_event`/gateway, exibir indisponível/estimado com label honesto.

## Escopo frontend

- Implementar aba "Plano e pagamentos".
- Renderizar:
  - plano atual;
  - próxima cobrança/renovação quando real;
  - forma de pagamento mascarada;
  - histórico de pagamentos;
  - formulário "Conceder cortesia".
- Form de cortesia:
  - período;
  - motivo;
  - CPF/CRP/regional já preenchidos quando existirem;
  - data de inscrição no CRP obrigatória quando necessária para concessão;
  - confirmação antes de aplicar.
- O botão "Cancelar assinatura" fica fora da V1 se não houver cancelamento real via gateway com confirmação forte.
- "Alterar forma de pagamento" pelo Admin fica fora da V1; cartão deve continuar sendo tokenizado pelo usuário/gateway.

## Escopo backend

- Criar endpoints admin privados:
  - `GET /api/admin/private/psychologists/:id/billing`;
  - `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`;
- Reutilizar a regra do comando `subscription:grant`, sem duplicar regra de domínio.
- Registrar auditoria real do admin responsável quando a audiência admin estiver disponível.

## Fora do escopo

- Cancelar assinatura paga via Admin.
- Alterar cartão pelo Admin.
- Criar cobrança manual.
- Simular pagamentos Mercado Pago.
- Exibir PAN/CVV ou dado sensível de cartão.

## Contrato técnico detalhado

- Cortesia:
  - `source="admin_grant"`;
  - plano `profissional`;
  - `status="ativa"`;
  - `current_period_end` futuro;
  - `grant_reason`, `grant_notes`, `granted_by`, `grant_started_at`;
  - atualizar `crp_registration_date` quando requerido.
- Receita:
  - `admin_grant` não conta como receita.
- Forma de pagamento:
  - somente brand/last4/validade se existirem em `payment_method`;
  - nunca expor token do gateway.

## Critérios de aceite

- [ ] Aba só abre para admin autenticado.
- [ ] Plano atual usa `professional_subscription` real.
- [ ] Histórico financeiro usa dados reais ou exibe indisponível honesto.
- [ ] Cortesia pela UI reutiliza regra real do comando operacional.
- [ ] Data de inscrição CRP é exigida quando necessária.
- [ ] Cancelar assinatura e alterar cartão não aparecem/habilitam sem implementação real.
- [ ] Não há simulação de pagamento.
- [ ] Form usa React Hook Form/Zod/controllers.
- [ ] UI mobile-first validada.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado se houver decisão nova.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Teste manual de concessão com psicólogo real.
