# ADR-0685 - Stripe credito-only sem regras pagas do Radar

Data: 2026-11-10
Status: Aceita; implementada e validada local/sandbox; publicacao nao autorizada
Task: [TASK-320](../_product/tasks/TASK-320-stripe-embedded-checkout.md)

## Contexto

Somente credito e requisito de produto. Payment Element `card` inclui debito e
pre-pago. Conferir funding depois da cobranca, ou somente na atribuicao de um
default, nao estabelece a barreira anterior a toda tentativa. Radar Plus nao e
requisito inerente, mas remover suas regras do desenho anterior deixa lacunas.

## Decisao

Coletar com SetupIntent independente, validar estado final/escopo/customer/funding
no servidor, e manter novas recorrencias `manual_credit_v1` com coleta pausada
`keep_as_draft`, sem data automatica de retomada. Primeira fatura permanece
`auto_advance=false`; nenhuma atribuicao/cobranca ocorre antes de conferir a pausa.
Cada fatura elegivel usa operacao duravel, PaymentIntent proprio de confirmacao
manual e alocacao integral a invoice. O servidor valida o cartao antes de cada
confirmacao. Browser confirma o SetupIntent (`confirmSetup`) e pode autenticar 3DS
(`handleNextAction`), mas nao confirmar financeiramente nem trocar o metodo fora
da validacao. Confirmacao/reconfirmacao do PaymentIntent manual e exclusiva do
backend. Nunca expor segredo do PaymentIntent automatico do pagamento padrao da invoice.

Prova real de API no sandbox existente: criar assinatura incomplete sem default,
pausar coleta, anexar PI manual pelo valor integral de2990 antes do sucesso,
confirmar credito de teste e observar invoice paid/subscription active funcionou
em Endive. A invoice conserva vinculo a um unico InvoicePayment pago nondefault.
Isso nao conclui E2E do produto, cortesia, 3DS ou renovacao.

Reutilizar billing_operation/leases/fingerprints e ledger existentes. Setup e
pagamento possuem referencias distintas; nenhum ID previamente fixado e trocado.
Worker de cobranca separado da conciliacao de leitura, desativado por padrao.
Estado active do provider nao concede beneficios sem periodo realmente pago.
Historico MP e Stripe anterior nao e migrado automaticamente. Nenhuma nota fiscal
e emitida nesta etapa e os gates fiscais permanecem independentes.

## Compatibilidade e impacto operacional

Migration somente expansiva. Cliente novo informa flow_version credit_only_v1;
cliente antigo recebe falha segura para operacoes novas, sem fallback MP ou
confirmacao automatica. Backend/frontend podem ser publicados separadamente com
vendas bloqueadas; ativacao posterior exige ambos compativeis.

Nova flag opcional backend BILLING_STRIPE_COLLECTION_ENABLED=false. Sem ela nao
iniciar novas cobrancas controladas; consultas, cancelamento e historico continuam.
Permissoes Payment Intents/Invoices write serao exigidas na ativacao; somente
sandbox foi autorizado agora. Na chave test Payment Intents ja tinha escrita;
apenas Invoices passou de read para write. Nao usar chave irrestrita como atalho.
Nenhuma permissao, configuracao, venda, deploy ou cobranca live foi alterada.

Para preparar a chave live futura, revisar cinco areas de escrita: Customers,
Subscriptions, Setup Intents, Payment Intents e Invoices. Leituras de conta,
catalogo, metodos, pagamentos, Invoice Payments e disputas continuam necessarias;
dependencias da UI precisam de conferencia, sem chave irrestrita ou permissoes
de CLI para o backend publicado. O formulario anterior com somente tres areas de escrita
nao atende o collector. Esta decisao tecnica nao concede autorizacao operacional
para ampliar a chave live, publicar ou ativar cobranca.

Preparacao live deve manter checkout disabled e collection/reconciliation/ledger
false, alem dos gates fiscais Stripe false. Collection e independente da
reconciliacao: desativar somente esta nao impede cobrancas. Gravar configuracao
sem restart nao atualiza o processo corrente. Rollout futuro exige ambos os apps
compativeis, webhook, oferta e worker conferidos; nao depende de Radar Plus nem
de Radar para SetupIntents e nao autoriza ativa-los.

Rollback nunca retoma automaticamente a coleta no provider: manter contratos
pausados ate reconciliacao autorizada; versao antiga nao pode receber novas vendas
nem segredos financeiros deste fluxo. Disponibilidade do worker torna-se requisito
operacional de renovacao, com monitoramento de faturas pendentes e retomada duravel.

## Validacao

Provas reais na task: checkout/cortesia/troca, renovacao por testclock sem alterar
relogio do app, replays sem duplicata,3DS e retomada apos interrupcao no mesmo PI.
Confirmacao com chave publica e outro credito valido foi negada especificamente
por manual, com zero captura. Funding desconhecido e contratos hostis possuem
testes locais conservadores. PostgreSQL real cobriu unicidade/leases/fences/CAS.
Sem mocks como prova externa, sem Radar SetupIntents e sem compra de plano.

Cancelamento marca manual_credit_cancel_requested_v1 sob o lock compartilhado com
claim/renovacao de lease; novas tentativas ficam bloqueadas mesmo se o provider
falhar. A leitura do periodo pago aceita esse marcador, sem reabrir cobranca.
Uma recusa definitiva exige acao explicita; nao reproduzimos Smart Retries/grace
automaticamente. Confirmacao HTTP separa confirm_payment=true (acao explicita)
de consultas/montagem/polling (false). Worker possui escopo opcional limitado por
IDs de contratos para operacao/piloto, usando os mesmos guards e sem alterar tempo.

## Fontes

- https://docs.stripe.com/billing/subscriptions/pause-payment
- https://docs.stripe.com/api/invoices/attach_payment
- https://docs.stripe.com/api/payment_intents/confirm
- https://docs.stripe.com/api/setup_intents
