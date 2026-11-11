# ADR-0689 — Oferta vigente somente leitura no Admin

Status: Aceita; validada localmente em 0.1.815
Data: 2026-11-11
Task: [TASK-324](../_product/tasks/TASK-324-admin-current-billing-offer.md)

## Contexto

TASK-142 antecede precos Stripe versionados. Sua tela apresenta o cadastro legado
como preco de novas vendas, apesar de o checkout usar oferta por conta/modo. A
pausa de novas adesoes nao pode ser confundida com revogacao dos beneficios.

## Decisao

Manter plan no GET administrativo e acrescentar checkout local, sem SDK/rede ou
mutacao. Repositorio consulta oferta mesmo pausada, vincula preco no mesmo
plano/gateway/conta/modo e aplica politica existente. Configuracao ausente/invalida
degrada somente o novo diagnostico; erro real de banco nao vira sucesso vazio.
Leitura em transacao READ ONLY/RepeatableRead impede combinar revisao de oferta
com preco de outro snapshot durante publicacao concorrente. A politica pura de
preco e compartilhada com o checkout, sem importar SDK ou executar providers.

O DTO nao expoe conta externa, chaves, produto/Price ou mensagens de provider.
Readiness remoto e explicitamente not_checked. O Admin apresenta configuracao,
nao garantia de disponibilidade financeira. Preco contratado de assinantes nao e
alterado nem inferido pelo catalogo. Cliente antigo permanece compativel e cliente
novo sem o bloco checkout nao afirma que o cadastro legado seja oferta vigente.

## Consequencias e limites

Sem migration, nova env ou dependencia. Backend e Admin continuam independentes.
Editor de preco exige outra task com CAS/idempotencia/auditoria e consentimento;
historico/NFS-e administrativo exige ownership/RBAC e contrato dedicado, sem usar
sessao do cliente ou burlar o endpoint owner-scoped. Nenhuma dessas acoes integra
esta leitura. Sem push/deploy, pagamento, emissao ou alteracao de Radar nesta rodada.

## Validacao

14 testes focais backend (politica e PostgreSQL real) e16 testes Admin aprovados.
Browser local autenticado com oferta sandbox real, em320/390/1440px, mantendo
travas financeiras desligadas. Fingerprints de14tabelas de negocio preservados;
autenticacao temporaria QA restaurada. Sem mocks como prova de provider, chamadas
financeiras ou producao. Check/builds integrais registrados no fechamento da task.

Check integral da raiz, check/build backend e Admin aprovados. Build limpo apos
remocao exclusiva de output next dev regeneravel, sem enfraquecer gate de mapas.
Bump unico/cinco manifests sincronizados; commit local em homolog, sem push/deploy.
