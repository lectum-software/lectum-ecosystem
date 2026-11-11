# ADR-0696 - Tarifas canonicas separadas da captura e dos custos completos

Data: 2026-11-11
Status: Aceita e validada localmente
Task: [TASK-331](../_product/tasks/TASK-331-admin-stripe-observed-fees.md)

## Decisao

Observador GET explicito e separado do fluxo financeiro/fiscal, com fatos BT
unicos por conta/modo/txn, hash vinculado ao recibo e checkpoint paginado/lease.
Mesma factory/SDK. Nunca estimar fee, apagar tarifa apos refund, confundir net de
captura com lucro ou deduzir custos completos da conta pelas capturas registradas.

BT nao tem livemode; identidade do cliente e objetos canonicos vinculados provam
modo/conta. Refund/reversal/dispute sao papeis separados. Inteiros assinados em
BigInt, conversao segura na API, disponibilidade observada separada do hash.
Global financial_basis.fees_available=false preservado; novo contrato explicita
cobertura e valores apenas observados. Leitura degradavel nunca bloqueia ativacao
ou SendNF. Nao armazenar payload, texto de provider ou PII.

## Referencias primarias

- https://docs.stripe.com/api/balance_transactions/object
- https://docs.stripe.com/api/refunds/object
- https://docs.stripe.com/api/disputes/object
- https://docs.stripe.com/refunds
- https://docs.stripe.com/expand/use-cases
- https://docs.stripe.com/reports/balance-transaction-types

## Limites

Sem inventar ajuste sem objeto externo existente. Sandbox nao tem refund/dispute
neste inventario; resultados de unitarios nao serao chamados E2E desses caminhos.
Balance Read e Payment Disputes Read autorizados e aplicados somente no sandbox. Sem nova
transacao, permissao live, deploy ou Radar. Schema expand-only/rollback preserva
fatos; nenhuma env/package nova.

Os fatos/checkpoints financeiros nao possuem DELETE/soft-delete de produto:
retencao e auditoria sao permanentes e nenhuma exclusao de usuario/administrador
apaga observacoes por cascade. Status de disponibilidade reflete a consulta
canonica mais recente, separado da imutabilidade monetaria.

## Validacao executada

Migration/PG real, dez testes de politica/transporte, API autenticada e browser
390/1440 aprovados. Tres capturas preexistentes confirmadas por GET independente:
8970bruto/474tarifa/8496liquido ANTES dos ajustes. Dois ciclos completos mais um
ciclo UI,44GET/zeroescritaStripe, fatos deduplicados e22conjuntos protegidos
preservados. GET em processo sem chaves continua200; QA auth restaurada.
Check integral e builds backend/Admin0.1.824 aprovados, commit local homolog, sem
push/deploy/live. Refund/dispute existentes ausentes: limites E2E registrados,
sem criar transacao para simular prova. Fixtures unitarias/PG nao sao E2E externo.

Orquestracao Admin prepara target validado e dominio nao importa a API. Suporte
live e passivo pelo runtime/escopo estrito existente, sem SDK em GET/boot/jobs e
sem execucao live nesta task. Permissoes live novas e publicacao exigem etapas
separadas; nao confundir disponibilidade de codigo com ativacao produtiva.
