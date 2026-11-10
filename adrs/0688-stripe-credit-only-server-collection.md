# ADR-0688 - Stripe credito-only sem regras pagas do Radar

Data: 2026-11-10
Status: Aceita; backend/frontend/admin 0.1.808 publicados inativos; transporte webhook assinado comprovado; E2E e ativacao financeira/fiscal separados
Task: [TASK-323](../_product/tasks/TASK-323-stripe-embedded-checkout.md)

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
Permissoes Payment Intents/Invoices write sao exigidas na ativacao; no checkpoint
de implementacao somente sandbox estava autorizado. Na chave test Payment Intents ja tinha escrita;
apenas Invoices passou de read para write. Nao usar chave irrestrita como atalho.
Nesse checkpoint nenhuma permissao, configuracao, venda, deploy ou cobranca live
foi alterada. Preparacao live posterior autorizada registrada abaixo.

Para preparar a chave live, revisar cinco areas de escrita: Customers,
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

## Checkpoint operacional live inativo — 10/11/2026

Apos autorizacao especifica para criacao e armazenamento e autenticacao feita pelo
usuario, criada chave live restrita. Revisao persistida confirmou 11 permissoes:
escrita em Customers, Subscriptions, Setup Intents, Payment Intents e Invoices;
leitura em Accounts, Charges and Refunds, Payment Disputes, Payment Methods,
Prices e Products. Nenhuma permissao de CLI ou chave irrestrita adotada.

Segredo salvo somente em STRIPE_SECRET_KEY no Environment do backend no Dokploy.
Releitura apos reload confirmou 126 variaveis e preservacao exata das 125 anteriores,
incluindo checkout disabled, collection/reconciliation/ledger false e gates fiscais
Stripe false. MP/SendNF globais existentes preservados. Sem segredo em arquivo ou
Git; evidencias retidas apenas como booleans e imagem das permissoes.

Nenhum deploy/restart, uso da chave em API, venda, cobranca, emissao ou mudanca de
Radar. Webhook segue apenas em formulario, sem destino/segredo; oferta versionada
e runtime ainda exigem rollout autorizado. Preparacao do Environment nao atualiza
o processo em execucao e nao autoriza tentativa real. Nao reiniciar versao antiga
com esse fluxo nem ativar webhook/worker antes do codigo compativel.

### Webhook e oferta antes do deploy

Preparacao posterior confirmou publicamente backend 0.1.791, cujo commit nao
contem rota/operacao/schema Stripe. Sem deploy autorizado, manter formulario de
webhook e referencias de Price conferidas, sem aplicar vinculo via SQL ou copiar
codigo para container antigo. Estado do banco nao foi consultado nem presumido.
Criacao inicialmente desativada nao e exposta na UI/WebMCP ou parametros oficiais
V1/V2 consultados; nao abrir janela de entregas ativas para depois desativar.
Destino/segredo e vinculo ficam para rollout coordenado, com vendas/collector/fiscal
OFF. Dry-run de oferta usa lock no banco configurado apesar de nao gravar registros;
inventario estritamente READ ONLY deve ser separado, conforme runbook.

## Preparacao da publicacao inativa — 10/11/2026, 0.1.808

A autorizacao posterior permite publicar o codigo compativel sem ativar vendas,
collection, reconciliation, ledger ou emissao fiscal Stripe, e sem cobranca real
ou alteracao de Radar. Nao confundir essa autorizacao com liberacao do checkout,
do collector ou do piloto fiscal; os gates false/disabled permanecem obrigatorios.

A integracao local preserva os cinco commits de `origin/homolog` ate `dea56b871`,
ja presentes em `main`. Os numeros publicados de tasks/ADRs foram preservados;
o conjunto Stripe foi renumerado para TASK-323 e ADRs 0687/0688. Check integral,
quatro builds locais e smoke compilado backend/frontend/admin em 0.1.808 passaram.
Migration loopback sem pendencia; nenhuma prova de migration produtiva presumida.

Autodeploys e schedules de homolog do backend/video no Dokploy foram conferidos
OFF/ausentes, assim como preview do backend. Vercel frontend/admin tiveram roots
conferidas, Ignore Build Step em `Don't build anything` e autoassigndomains OFF.
Essa conferencia externa habilita preparar publicacao controlada, nao comprova
deploy nem promocao do dominio. Nao foi desligado ambiente ou excluido dado.

Gate fiscal legado resolvido por transacao READ ONLY no banco do backend publicado
0.1.791 e GETs SendNF: uma unica nota MP autorizada vinculada a Lectum, com escopo,
empresa, referencia e total conferidos, simulation false, chave de 50 digitos,
consulta publica HTTPS e sem marcador de simulacao. Isso comprova compatibilidade
do documento existente com o novo classificador, nao E2E de emissao Stripe nem
validacao de duas notas do painel remoto. Nenhuma escrita no provider ou emissao.

Inventario READ ONLY solicitado pelo usuario identificou um unico admin apto e
plano profissional ativo, sem registrar PII/ID. Tabelas de oferta/precos ainda
inexistentes no banco publicado: migrations e vinculo pausado permanecem pendentes,
assim como commit/PR/deploy, webhook e smoke produtivo. Neste checkpoint ainda
nao houve push, merge concluido, deploy, cobranca ou nota. O estado fiscal MP
existente permanece preservado, distinto do opt-in Stripe OFF.

## Publicacao compativel inativa concluida — 0.1.808

PR #174 integrado em `main@4bc6aa7`, apos integracao local `6555b8619`, mantendo
`homolog`. Backend compativel publicado e atualizado apos carregar o segredo;
`/health`, `/ready` e `/ping` HTTP 200/no-store/0.1.808. Cinco migrations Stripe
concluidas sem falha. Runtime confirma checkout disabled, collection/reconciliation/
ledger e fiscal Stripe false, piloto vazio e segredo presente.

Webhook live criado com os 16 eventos e API `2026-10-28.endive`; segredo somente
no Dokploy, preservadas as 126 variaveis anteriores, total 127. Oferta vinculada
por CLI e auditoria, revisao 1, BRL2990/month e checkout false. Nenhuma assinatura
ou cobranca criada. POST sem assinatura recusado com HTTP 400; inventario posterior
com zero contratos Stripe e inbox, destino entao com zero entregas/falhas. A
entrega assinada positiva permanecia pendente nesse checkpoint; foi superada
somente no nivel de transporte pela prova posterior registrada abaixo. Isso nao
habilita reconciliacao nem autoriza cobranca para gerar evidencia financeira.

No historico anterior a prova abaixo, tentativa de reenvio de `product.updated`
real via interface WebMCP do Workbench foi recusada pelo parser como comando nao
suportado, antes do envio. Naquela etapa nao houve entrega, evento sintetico,
topico novo ou ampliacao de permissao. O limite da interface foi contornado
posteriormente pelo console visual oficial, nao por API privada ou evento criado;
nenhum desses eventos equivale a processamento dos tipos financeiros suportados.

Identidade Vercel verificada; builds frontend/admin de `main@4bc6aa7` Ready em
4m16s e 3m03s, respectivamente `ErUrL9gy8MKyQHLXksWzNEDMjfZo` e
`BZqyMmpy92Murx3eJqFPraZtNAya`. Promovidos a producao corrente em
`www.lectum.com.br` e `admin.lectum.com.br`; ambos `/version` HTTP 200/0.1.808,
no-store/max-age=0 e noindex/nofollow/noarchive. Browser renderizou os logins;
rota protegida redirecionou ao login, sem sessao autenticada nem checkout operado.
Video sem mudanca funcional e sem redeploy neste lote.

As verificacoes de nota MP existente e responsavel da oferta foram concluidas
antes; nao equivalem a emissao fiscal Stripe. Publicacao compativel inativa dos
tres apps concluida, nao integracao E2E ativa. A entrega positiva entao pendente
foi comprovada posteriormente apenas para transporte. Nenhuma venda, cobranca
real, emissao Stripe ou mudanca de Radar
executada neste rollout. Checkpoint documental local 0.1.809 nao altera a release
produtiva 0.1.808 nem demanda republicacao automatica.

## Transporte assinado comprovado sem processamento financeiro — 10/11/2026

As 20:18:05 BRT, apos autorizacao explicita, um evento real existente
`product.updated` foi reenviado uma unica vez pelo console visual oficial Stripe
Shell. Somente esse topico foi temporariamente inscrito no destino live
(16 → 17); URL, nome, descricao, versao de API, conta, status e segredo foram
preservados. Antes da inscricao, o console recusou `not_subscribed`, sem entrega.
Nao houve criacao de evento, fixture sintetica ou operacao financeira.

A entrega foi observada como Delivered HTTP 200, API `2026-10-28.endive`, com
resposta `{"status":200,"success":true,"data":{"processed":false}}`.
A assinatura foi aceita e o topico, fora da allowlist financeira, ignorado.
Esse e o limite exato da prova: transporte publico/assinatura, nao inbox de evento
financeiro, conciliacao, beneficios, cobranca, renovacao ou emissao fiscal.

O topico temporario foi removido e salvo; leitura final confirmou os 16 topicos
originais exatos e demais campos preservados. Inventarios READ ONLY antes/depois
mantiveram zero nas oito contagens: inbox do replay, operacoes, assinaturas Stripe,
recibos financeiros, jobs do ledger, jobs fiscais, documentos fiscais e ofertas
habilitadas. Checkout disabled, cinco flags false (collection, reconciliation,
ledger, emissao e automacao fiscal Stripe), piloto fiscal vazio e oferta revisao 1,
2990 BRL/month/checkout false preservados. Backend `/health`, `/ready`, `/ping`
continuam HTTP 200/0.1.808. Nenhuma chave, permissao, gate ou Radar alterado.

A pendencia de transporte assinado esta encerrada; E2E financeiro live segue
nao testado e nao autorizado. Evidencias privadas nao sao copiadas com IDs,
segredos ou PII para o repositorio. Registro local 0.1.810 sem codigo/schema ou
novo deploy; artefatos produtivos permanecem 0.1.808. Nao foi criada cobranca real,
nota, assinatura ou operacao financeira.

## Fontes

- https://docs.stripe.com/billing/subscriptions/pause-payment
- https://docs.stripe.com/api/invoices/attach_payment
- https://docs.stripe.com/api/payment_intents/confirm
- https://docs.stripe.com/api/setup_intents
- https://docs.stripe.com/api/webhook_endpoints/create
- https://docs.stripe.com/api/v2/core/event-destinations/create
