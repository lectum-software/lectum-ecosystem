# TASK-331 - Tarifas Stripe observadas por recebimento no Admin

Data: 2026-11-11
Status: Concluida e publicada — 0.1.824, PR#179, 11/11/2026; encerramento documental posterior somente local
Dependencias: TASK-328, TASK-330
Decisao: [ADR-0696](../../adrs/0696-stripe-observed-fees.md)
Modelo: DATA-MODEL.md, secao Tarifas Stripe observadas.

## Fechamento da publicacao e do ciclo financeiro/fiscal — 11/11/2026

O escopo local descrito nas secoes seguintes e historico. A publicacao posterior
autorizada ocorreu pelo PR#179, merge2523e1a7e, fonteaa3db0376. Backend/Admin e
frontend estao em0.1.824; tres migrations aplicadas. Checks/builds locais de
backend/Admin/frontend e smoke produtivo health/ready/versoes aprovados.
Permissoes live adicionais autorizadas: somente Balance Read e Prices Write,
sem rotacionar credencial ou criar catalogo pela validacao.

- [x] Historico financeiro, resumo, assinaturas e CSV produtivos conferidos.
  CSV real5.923bytes, dois recebimentos e duas assinaturas; sem PII no Git.
- [x] Dois recibos existentes preservados; observacao canonica GET-only de duas
  capturas e um estorno. Taxas de captura316centavos, nao custo total/lucro.
- [x] Oferta comercial revisao2 preservada; novas operacoes de catalogo0, OPEX0.
  Telas e fluxos de preco/OPEX validados antes no local/sandbox, nao por criar
  preco/despesa ficticia em producao.
- [x] NFS-e3 existente autorizada: download administrativo real de63.405bytes,
  assinatura PDF conferida. NFS-e4cancelada no Lectum, sem download elegivel.
- [x] Cadeia de pagamento/plano/fiscal anterior comprovada; nenhuma nova cobranca,
  emissao, cancelamento, estorno ou alteracao de Radar nesta publicacao/validacao.

Evidencias privadas sanitizadas em `/Users/rezende/.codex/lectum-admin-closure-qa/`:
`release-0824-completion.json`, `production-0824-final-public-smoke.json`,
`release-existing-nf3-download.json` e `release-csv-proof.json`.

### Acompanhamentos que nao devem ser declarados como provas concluidas

- [ ] Primeiro cliente confirmar plano/historico/download pela propria sessao e
  recebimento do email. A comprovacao administrativa nao substitui seu acesso.
- [ ] Observar a primeira renovacao mensal natural live e sua NFS-e. O mecanismo
  foi validado no sandbox; nao antecipar cobranca para encerrar checklist.
- [ ] Triagem operacional do evento SetupIntent auxiliar: origem correlacionada
  no Workbench, mas sem prova posterior de processamento/vinculo ou encerramento.
  A release824 nao auditou esse residual. Nao afirmar inbox integralmente limpa,
  ACK/replay efetuado ou atribuir esse evento a nova tentativa do cliente. Ele
  nao invalida pagamento/plano/NFS-e comprovados; preservar revisao conservadora.
- [ ] Prova externa de disputa real: ausente, sem fabricar disputa/transacao;
  estados sem cobertura permanecem explicitos, sem afetar a leitura de capturas.
- [ ] Confirmar continuidade comercial SendNF antes do prazo02/12 indicado pelo
  painel na TASK-323, se ainda nao resolvida pelo responsavel; nao contratar plano
  ou presumir limites/custos por conta propria.

Infraestrutura (rotacao/capacidade/backups) tem gates proprios na TASK-327 e nao
e implementacao faltante desta integracao. A atualizacao documental posterior
fica somente em homolog, sem novo push/deploy ou transacao para encerrar o registro.

## Objetivo / escopo

Exibir custos reais obtidos da fonte canonica, sem percentual estimado, novas
cobrancas, refunds, disputes, notas ou alteracoes produtivas. Somente codigo local
e GETs dos objetos ja existentes no sandbox autorizado. Sem push/deploy/Radar.
OPEX manual fica separado. Nao apurar lucro nem apresentar tarifas de capturas
como custo total da conta Stripe. MP preservado, sem inventar tarifas legadas.

## Fonte e fronteiras

Reuse readAdminFinanceStripeLedger/projectFinanceStripeLedger.valid, incluindo
hash e vinculos recibo/contrato/preco/owner/conta/modo; historico nao depende de
usuario ativo/preco atual. Snapshot invalido falha fechado, sem impacto em planos.
SDK oficial/factory existentes, sem outro cliente. Charge canonico confirma
id, modo, customer, PaymentIntent, moeda/valor/paid/captured. BT da captura vem de
Charge.balance_transaction. Refunds.list charge-scoped e Disputes.list
charge-scoped descobrem ajustes existentes; consultar sempre, mesmo snapshotzero.
Refund.balance_transaction e failure_balance_transaction sao papeis distintos.
Dispute.balance_transactions sao canonicos. Validar IDs de source/charge e todos
os vinculos, datas/inteiros/sinais/aritmetica. BT e Refund NAO possuem livemode: modo vem do
mesmo cliente/conta e Charge verificados; Dispute tambem confirma livemode. Sem expandir
BT.source ou listar todo saldo da conta. Sem payload/description/fee_details/PII.

Valores assinados amount/fee/net em BigInt, net=amount-fee; aceitar creditos de
tarifa negativos quando canonicos. Fonte SDK Number inseguro nao e arredondada.
DTO converte somente inteiro seguro; valores ausentes/inseguros ficam null.
Hash imutavel liga recibo/scope/BT/role/source/amount/fee/net/currency/created_at;
status pending→available, available_on e observed_at sao observacoes separadas.
Tarifa original de captura nao some com refund. Net de captura e ANTES dos
ajustes, nao lucro, payout nem saldo disponivel.

## Operacao / API

GET /api/admin/private/finance/fees: snapshot local RR, filtro from/to por
receipt.paid_at em calendario BRT (nao renomear para captured_at), page/limit,
ordem estavel, clamp de pagina e totais no mesmo filtro. Escopo servidor.
POST /:receiptId/observe: admin autenticado, UMA etapa limitada/paginada por acao,
lease duravel/CAS/auditoria, cursor por recibo e controle de requests. Chamada
Stripe somente GET, fora de transacao SQL. Sem alterar receipt/reconciliation,
operacoes de cobranca, entitlement, assinatura ou SendNF. Retomar sem duplicar
BT; conflito de hash nao sobrescreve fato. Ao repetir ciclo completo, reobservar
ajustes (point-in-time nao prova ausencia futura). Erros fechados/sanitizados;
403/ausencia/timeout/pagina pendente deixam parcial/indisponivel, nunca zero.

DTO acordado: items com receipt_id, paid_at, amount_paid_cents, financial_status,
capture nullable {available,fee_cents,net_cents,observed_at,status}, transactions
{id_local,kind,occurred_at,available_on,amount_cents,fee_cents,net_cents,status},
coverage {state,capture_verified,refunds_scanned,disputes_scanned,has_more,
last_observed_at,last_error_code}. Summary separa receipt_count/gross eligible de
capture_verified_count/capture_missing_count/observed_capture_gross/fee/net e
observed_adjustment_fee; cobertura parcial explicita. Global complete=false,
account_costs_complete=false/net_cash_flow_available=false/profit_available=false.
financial_basis.fees_available continua false para custos totais; contrato aditivo.

## UI

/financeiro/tarifas no menu e link financeiro, mobile390/desktop. Consulta local
sem refresh implicito; botao 'Observar taxas' por recibo com etapa/retomada e
texto de que nao efetua cobranca. Cobertura X/Y e desconhecidos, datas BRT dos
recebimentos e datas dos BT separadas. Cards/tabela e estados loading/empty/error.
RHF/Zod/controllers para filtros, tokens atuais. Builder indisponivel; proto
_product/proto/admin/Financeiro.png. Nenhum package/env obrigatoria nova.

## Acesso comprovado / limites reais

Usuario autorizou somente Balance Read na chave restrita do sandbox existente;
aplicada uma leitura adicional, demais12 permissoes preservadas (4read/9write).
GET Charge/BT existente passou403→200:2990/fee158/net2832centavos. Inventario GET:
49Charges,31BT charge,0Refunds, Disputes403. Sem refund/dispute existente para E2E;
nao criar transacao nem chamar teste unitario de prova externa. Apos nova confirmacao especifica,
apenas Payment Disputes Read foi acrescentada tambem no sandbox:14permissoes,
5read/9write, anteriores preservadas. Nova consulta Disputes200/0objetos.
Leitura live/PricesWrite continuam nao autorizadas. Ausencia de leitura de disputes
tambem afeta resolveStripeWebhookSubscription; sandbox agora pode consultar,
mas a TASK323 (inventario10/11) ja registra Payment Disputes Read em live.
Nao alegar gap produtivo com base no sandbox. Futuro preflight deve reconferir
sem alterar a chave; Balance Read live/Prices Write exigem confirmacao propria.

## Aceite

- [x] Schema expansivo/migration local e hashes/leases/idempotencia/escopos.
- [x] Fonte canonica, ausencia/403/timeout/dedup/sinais/paginas tratados com seguranca.
- [x] Capturas reais existentes sandbox observadas sem alteracao financeira.
- [x] UI/coverage/bruto e taxas observadas coerentes, sem falso lucro/custo total.
- [x] Unitarios/PG real, API/browser390/desktop, checks e builds aprovados.
- [x] Limitacoes refund/dispute reais registradas, auth/fatos protegidos preservados.
- [x] ADR/task/bump unico/cinco manifests/commit homolog, sem push/deploy.

## Deploy / rollback

Migration apenas novas tabelas. Backend/migration antes de Admin; coleta manual
nao roda por boot, worker ou GET. Nenhuma nova env ou ativacao automatica. Falta de
Balance Read/Disputes Read nao quebra pagamento, mas observacao fica parcial;
permissoes live exigem confirmacao especifica futura. Rollback conserva fatos e
checkpoints, nao apaga ledger nem refaz financeiro. Nenhum provedor publicado
alterado por esta task.

Implementacao compativel com test/live pelo mesmo runtime/escopo estrito existente;
nao hardcodar test-only no produto nem exigir nova release apenas para habilitar
um GET manual futuro. A autorizacao de EXECUCAO desta task continua somente
sandbox: nenhum POST local dispara SDK live, job ou chamada automatica. Nenhum
deploy/grant live autorizado; futuras permissoes/observacoes live sao separadas.
Orquestracao Admin prepara target verificado; dominio nao importa API/fachada.

## Evidencias locais / sandbox em11/11/2026

- Migration `20261111233000_stripe_balance_observations` aplicada via db:migrate
  somente PG QA127.0.0.1:32768/lectum_stripe_test, sem reset/drift. Prisma Client
  gerado e SQL aplicada preservada. Duas tabelas novas, nenhum backfill financeiro.
- Dez testes unitarios/transportes SDK e integracao PG aprovados. PG verificou
  lease concorrente, retomada403, dedup, conflito sem sobrescrever, status canonico
  available→pending e recibo original intacto. Fixtures proprias em conta/IDs unicos
  removidas, sem apagar fatos canonicos existentes. Repeticao focal final passou.
- Referencia independente: GET canonico de3Charge/BT ja existentes, apos GET de
  identidade, confirmou recibos e calculou expectativas do provider (nao158fixo).
  Sete requests GET, nenhuma escrita de provider/banco nesta referencia.
- HTTP real apos login normal Admin completou2 ciclos por3recibos (18etapas), sem
  duplicar. Browser completou outro ciclo de3etapas em um dos recibos: parcial
  entre etapas e consultas de estornos/disputas concluindo sem objetos existentes.
  Observador oficial SDK contou44GET (2authority/21charge/7BT/7refund/7dispute),
  **zero nonGET**, sem modificar requests/responses ou usar SDK de providerfake.
- Tres fatos canonicos deduplicados preservados: bruto8970, tarifas474 e liquido
  das capturas8496centavos, ANTES de ajustes. Cada captura2990/158/2832. Todos os
  movimentos continuam pending, nao sao saldo disponivel. Sem fatos de ajustes,
  subtotal permaneceu null/nao observado, nao zero inventado.
- Harness inicialmente esperava subtotal0; expectativa corrigida para null,
  sem alterar produto nem reiniciar ciclos/baseline. finish-readonly validou os18
  passos ja gravados, totais, paginas/clamp e protecoes antes de concluir a prova.
- GETs autenticados/anonimo/dispositivo errado, recibo inexistente sem SDK,
  paginacao estavel e filtro BRT conferidos.22 conjuntos protegidos e auditorias
  anteriores identicos; usuarios/perfis conferidos contra baseline PRE-auth.
- Novo processo SEM chaves de provider respondeu GET200 com os mesmos valores,
  sem alteracao em nenhuma tabela. Autenticacao QA restaurada e somente a sessao
  deste ensaio removida. Tres fatos/checkpoints reais mantidos, nao fixtures falsas.
- Browser390/1440 sem overflow de pagina. Antes0/3 exibia 'Nao observado', depois
  3/3 e474centavos. Movimentos expansivos mostram ocorrencia/disponibilidade
  distintas; objetos de estorno/disputa criados ate cutoff separados da consulta.
  Coorte de01/10:2recibos,5980/316/5664centavos; datas de BT nao substituem paid_at.
  Filtros invalidos nao mostram consulta ampla; periodo sem recibos tem aviso de
  que nao comprova ausencia de pagamentos/custos.
-12 testes SSR/politica Admin mais9regressoes passaram. Revisoes cruzadas sem
  bloqueador apos separar target/API do dominio e refletir disponibilidade atual.
- Check integral final raiz e builds backend/Admin0.1.824 aprovados. Bump unico
  823→824/cinco manifests, sem package/lock/env nova. Sem push/deploy, SDK live,
  novos pagamentos/refunds/disputes, NFS-e, Radar ou mudanca de dados publicados.

## Limites nao mascarados e preparacao live

- Sandbox nao possui objetoRefund/Dispute real existente. Esses caminhos tiveram
  validacao unitaria/SDK/PG com fixtures declaradas, NAO prova E2E de um ajuste
  externo. Nenhuma transacao foi criada para produzir essa evidencia.
- Codigo e passivo e compativel com runtime/escopo test/live; somente POST manual
  autorizado por Admin consulta provider. GET, boot, jobs e views nao consultam
  Stripe. Esta task so EXECUTOU sandbox. Nao existe trava ficticia live no DTO.
- Chave live historica tem Payment Disputes Read; nao pedir novamente por causa
  do403 inicial do sandbox. Para observacao live de BT, Balance Read e configuracao
  futura separadamente autorizada. Para criar preco live, Prices Write na TASK329.
  Nao e necessario Products Write nem Balance Transaction Sources Read.
- Tarifas de capturas/ajustes observados nao cobrem Billing/conta/payouts/MP/OPEX
  completos. Cobertura global e fees_available totais permanecem false; nao
  transformar este subtotal em lucro/fluxo de caixa completo.
