# ADR-0697 - Proveniencia assinada para SetupIntent auxiliar

Data: 2026-11-11
Status: Aceita; validada localmente em 0.1.826, publicacao autorizada em andamento
Task: [TASK-332](../_product/tasks/TASK-332-stripe-auxiliary-setup-resolution.md)

## Contexto

A atribuicao do cartao gerou SetupIntent auxiliar sem metadata. O principal ja
possui pin proprio; o auxiliar nao e nova compra nem autorizacao para cobrar.
Sem correlacao, revisar e mais seguro que ACK por ausencia de metadata. Requeue
isolado repetiria o problema. GET oficial atual confirma request e idempotency_key
credit-card no evento original. O retorno do update de Subscription nao continha
pending_setup_intent utilizavel; um pin desse retorno nao resolveria essa origem.

## Decisao

Persistir somente hash da key credit-card de evento validado por assinatura,
API/conta/modo. Compartilhar helper da derivacao atual sem alterar chaves. Campo
nullable expansivo, sem payload/chave bruta/PII. Redelivery enriquece com CAS sem
reabrir evento ou resetar tentativas; conflito nao sobrescreve prova.

Um unico checkout manual completo e historicamente pinado, GETs canonicos e
origem assinada exata permitem reconhecer auxiliar terminal. Setup metadata
deve estar realmente ausente; valores invalidos nao sao ausencia. Ambiguidade,
overflow ou conflito ficam em revisao. Troca de cartao/cancelamento posterior
nao eliminam historia; nunca reativar plano nem atribuir cartao para reconhecer.

ACK auxiliar e ramo separado: somente inbox, sem confirm, entitlement sync,
operacao financeira ou enqueue fiscal. Setups principais continuam no fluxo
existente. Historico exige redelivery assinada e requeue unitario auditado,
nao SQL pontual complete nem worker amplo. Nenhuma permissao live nova.

## Consequencias e validacao

Sem UI, Radar, package/env obrigatoria ou mudanca de infraestrutura. Migration
fica preservada em rollback. Testar PostgreSQL local real e eventos/objetos ja
existentes no sandbox; testes adversariais nao equivalem a prova externa.
Publicacao/reconciliacao somente quando autorizadas, com fingerprints financeiros
e fiscais preservados e logs sanitizados. Rotacao de logs continua separada.

Implementacao validada: migration expansiva real no PG QA, check integral/build
backend, tres integracoes PG reais e revisao independente. Lease usa horario
fresco depois do rowlock e antes do CAS; regressao cobre expiracao durante espera.
SDK consulta apenas SetupIntent e Subscription, alem da verificacao de identidade.
Setups principais e chave idempotente original preservados. Sandbox so forneceu
tres negativos elegiveis para fail-closed, sete GETs/zero escrita e 17 conjuntos
inalterados; nao alegar positivo externo inexistente. Rollout/replay ainda pendentes.

Referencias oficiais consultadas em11/11/2026:
- [Event.request e origem da requisicao](https://docs.stripe.com/api/events/object?query=request)
- [SetupIntents automaticos de assinaturas](https://docs.stripe.com/billing/subscriptions/deferred-payment)
- [Reenvio manual de evento existente](https://docs.stripe.com/webhooks#manual-retries)
