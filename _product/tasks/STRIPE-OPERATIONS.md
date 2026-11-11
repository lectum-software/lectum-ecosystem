# Stripe: operacao e publicacao controlada

TASK-323 / ADR-0687. Atualizado em 10/11/2026. Este runbook **nao autoriza deploy,
cobranca, emissao fiscal, reprocessamento remoto ou mudanca de Radar**. O estado
de aceite e a fonte de verdade continuam na [TASK-323](TASK-323-stripe-embedded-checkout.md).

## 1. Limites atuais e gates

### Fluxo vigente local: credito-only sem Radar Plus (ADR-0688)

O complemento de10/11 substitui a dependencia de regras pagas para novas assinaturas.
SetupIntent independente coleta/autentica o cartao; backend aceita somente funding
credit. Nova assinatura nasce sem default, tem coleta keep_as_draft conferida antes
da atribuicao e cada fatura usa PI proprio manual. Browser somente autentica 3DS;
confirmacao/reconfirmacao financeira depende do backend e de validacao fresca.
Nao expor o segredo do PI automatico da fatura nem retomar a coleta automatica.

`BILLING_STRIPE_COLLECTION_ENABLED=false` e opt-in independente, inclusive da
conciliacao/ledger. Precisa de Payment Intents e Invoices write; no sandbox foi
ampliada somente Invoices de read para write, pois PI ja tinha write. Na preparacao
live autorizada posterior, em 10/11, foi criada a chave restrita com as cinco areas
write e seis read, salva somente em STRIPE_SECRET_KEY do Environment do backend
no Dokploy. Naquele checkpoint, releitura confirmou preservacao das 125 variaveis
anteriores e nao houve uso da chave, deploy/restart ou ativacao. A publicacao
compativel inativa posterior esta registrada na TASK-323, nao deve ser confundida
com aquele estado historico de preparacao.

Ultimo estado produtivo comprovado neste registro: backend/frontend/admin
0.1.808, checkout disabled, collection/reconciliation/ledger false e gates fiscais
Stripe false. MP/SendNF globais preservados. Webhook criado, segredo carregado e
transporte assinado comprovado; oferta vinculada na revisao 1, 2990 BRL/month,
checkout false. Os ajustes finais locais de recuperacao, collector e fiscal
ainda exigem publicacao e conferencia do runtime antes da ativacao autorizada.
Salvar Environment nao atualiza o processo. Ter chave ou webhook validos nao
comprova conciliacao financeira, cobranca, NF ou entrega de email live.

Renovacoes usam worker retomavel. Uma recusa definitiva nao inicia Smart Retries:
fica aguardando cartao atualizado ou autenticacao/confirmacao explicita. Trocar
cartao, montar tela, consultar status ou receber webhook nao confirma pendencia
financeira silenciosamente. Retry de transporte ambiguo conserva PI/chave/corpo,
janela limitada e sequencia duravel. Nao reaproveitar a evidencia antiga de dunning
automatico como prova deste novo mecanismo; notificacoes/grace adicionais nao
foram implementadas neste complemento. A monitoracao de faturas pendentes e a
operacao do worker devem ser conferidas antes de liberar vendas.

Cancelamento aplica fence duravel antes do provider, recusa enquanto existe lease
financeiro e cancela PIs pendentes sem capturar/estornar. Marcador de cancelamento
nao impede consulta/ledger nem apaga periodo realmente pago. Rollback nunca remove
pausa automaticamente. Nenhum contrato legado e convertido implicitamente.

Provas reais executadas: bloqueio de debito/pre-pago antes de Subscription/PI,
checkout, cortesia sem captura, troca sem cobranca, renovacao/fim de cortesia com
testclock passado avancado ate o presente, replay sem duplicata,3DS de setup e
financeiro com interrupcao/retomada do mesmo PI. Confirmacao direta com chave
publica e outro cartao credito foi especificamente recusada por PI manual, sem
captura e sem depender do Radar. Unknown/ausencia de funding cobertos por testes
de contrato conservadores, nao por um cartao desconhecido inventado no provider.
Radar para SetupIntents continua OFF; protocolo18652759 deixa de ser bloqueio
tecnico deste desenho, sem afirmar resposta sobre custos ou alterar seu plano.

- Checkout incorporado, 3DS, recusas, renovacao, dunning e cancelamento tiveram
  provas reais no sandbox com PostgreSQL local. Nao repetir todo o lote para
  suprir uma pendencia diferente. Preservar evidencias e recorrencias encerradas.
- Evidencias anteriores de cortesia/Radar pertencem ao desenho da ADR-0687;
  o complemento acima usa coleta independente e confirmacao manual. Nao ativar
  Radar para SetupIntents nem contratar plano como parte desta migracao.
- Fiscal: chave SendNF test restrita instalada apenas localmente; consultas GET
  passaram. Usuario reconfirmou vigencia de codigo010501/ISS2,01% e reutilizacao
  da descricao fiscal exata anterior, ja presente no backend publicado; nao
  inventar nova redacao nem copiar dados fiscais para logs. Suporte esclareceu
  cnc_missing_in_test: cadastro governamental test
  ausente, sem regularizacao a cargo da Lectum. Conforme complemento posterior,
  existe tentativa real de transmissao antes da recusa cadastral e do fallback
  simulado; nao confundir ausencia de autorizacao com ausencia de transmissao.
  Suporte posteriormente confirmou `simulation: "never"` disponivel em test,
  resolvendo a divergencia documental. No complemento final autorizado, o
  emissor passou a forcar esse parametro somente em test; live o omite.
  Um E2E real local/sandbox confirmou invoice Stripe paga de 2990 centavos → recibo do ledger
  → recuperacao fiscal auditada → snapshot/preview → um POST SendNF test com simulation never.
  Resultado: rejected, simulation false e government_test_rejected; o motivo
  privado foi CPF do exemplo oficial ausente no cadastro governamental, nao CNC.
  Poll/replay fez somente GET, sem segunda emissao. Isso comprova integracao e
  recusa explicita, nao autorizacao governamental, PDF autorizado ou email.
  Documento simulado continua nao sendo prova fiscal. Novos previews/emissoes
  exigem escopo autorizado; nenhuma alteracao cadastral compartilhada.
- Customer/setup com resposta perdida, replay real apos corteTCP e eventos
  assinados fora de ordem foram validados em10/11, com cleanup preservando historico.
  Nao induzimos create commitado+atraso de indice nem exaustao temporal dos setups
  autonomos: limitacoes explicitas da prova, nao autorizacao para falsificar testes.
- QA visual local concluido; aprovacao visual do usuario e gates externos da task
  continuam requisitos antes de publicar. Editor de
  precos no Admin e mudanca de preco sao etapa posterior; oferta atual BRL2990/mes.

SendNF: status remoto authorized isolado nao basta. Documento test explicitamente
simulado deve aparecer como tal e nao ser servido pelo endpoint de NFS-e autorizada.
Campos de autorizacao ausentes/contraditorios ficam nao verificados. O endpoint
rele/classifica mesmo cache antigoauthorized; conciliacao preserva documento e
referencia, sem nova emissao para "corrigir" um espelho. Historico MP relatado nao
substitui E2E Stripe/SendNF nem confirma parametros fiscais atuais.

O diagnostico `check-sendnf` separa `nfseReady` (cadastro) de
`governmentTestTransmission` (ultima evidencia test informada pelo provider).
`available` nao garante uma nova transmissao; `simulated` registra a limitacao
governamental, e campo ausente/invalido retorna `unknown`. Motivo livre nunca e
impresso. Essa leitura nao altera flags, nao faz preview e nao emite notas.
O campo auxiliar e historico: nao representa consulta atual ao CNC governamental.
Referencia: https://sendnf.com/desenvolvedores/api/ (revisada em10/11/2026).

**Atencao de rollout fiscal (Backend/Frontend):** documento antigo legitimo
sem os novos sinais explicitos pode ficar authorization_unverified e seu PDF
indisponivel. Antes do piloto, obter autorizacao para consultar um documento
governamental real existente e conferir o contrato live, sem emitir outra nota.
Esse gate foi concluido por READ ONLY no banco e GET SendNF: uma nota MP
autorizada vinculada ao Lectum possui simulation false, chave de 50 digitos e
public_query HTTPS, compativel com o classificador. Nao confundir essa unica nota
vinculada com a contagem da UI remota. Publicar backend conservador e depois
frontend com os novos rotulos; clientes antigos mostram pendencia, sem liberar
espelho. Nenhuma env nova ou migration e necessaria para essa classificacao.

## 2. Matriz de configuracao

Backend, frontend, Admin e Video permanecem apps independentes. Nao copiar o
arquivo local de QA para producao nem instalar chaves live em localhost.

| Configuracao backend | Local/sandbox | Producao futura |
| --- | --- | --- |
| `BILLING_CHECKOUT_GATEWAY` | `disabled` fora de teste explicitamente controlado | Comecar `disabled`; `stripe` apenas no cutover autorizado |
| `STRIPE_ENV` | `test` | `live` |
| `STRIPE_ACCOUNT_ID` | Conta do sandbox existente | Conta recebedora live conferida |
| `STRIPE_SECRET_KEY` | Chave restrita test, fora do Git | Chave restrita live em secret store do backend |
| `STRIPE_PUBLISHABLE_KEY` | Mesma conta/modo da chave secreta | Mesma conta/modo live |
| `STRIPE_WEBHOOK_SECRET` | Segredo do listener/destino test exato | Segredo do endpoint live exato; nunca reutilizar o do CLI |
| `BILLING_STRIPE_RECONCILIATION_ENABLED` | `false` fora do ensaio | Comecar `false`; habilitar somente apos inventario da inbox |
| `BILLING_STRIPE_COLLECTION_ENABLED` | `false` fora do ensaio financeiro autorizado | Comecar `false`; opt-in financeiro independente da conciliacao e do ledger |
| `BILLING_STRIPE_LEDGER_ENABLED` | `false` fora do ensaio | Comecar `false`; independente do fiscal e subordinado ao scheduler |
| `SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED` | `false`; nao altera modo test | `false` por padrao; opt-in exclusivo de novas NFS-e Stripe live |
| `SENDNF_STRIPE_LIVE_AUTO_ENABLED` | `false`; nao altera modo test | Comecar `false`; automacao MP global nao autoriza Stripe |
| `SENDNF_STRIPE_LIVE_PAYMENT_ID` | vazio; nao altera modo test | Invoice `in_...` de piloto separado, com emissao Stripe habilitada |

Nao existe `NEXT_PUBLIC_STRIPE_*` consumida por esta implementacao: frontend
recebe a chave publicavel pela configuracao autenticada do backend. Segredos
Stripe/SendNF nunca entram em build/env do frontend, Admin ou Video.

Runtime test aceita localhost com banco local explicitamente de teste, ou runtime
publicado com `BASE=https://homolog-api.lectum.com.br` e banco de homologacao.
Live exige `NODE_ENV=production`, `BASE=https://api.lectum.com.br`, banco nao local
e nao identificado como dev/test/homolog. Nunca renomear destino/ambiente para
contornar guard. Configuracao ausente/divergente bloqueia, nao cobra via MP.

Fora de ensaio explicitamente escopado, manter flags SendNF locais de
habilitacao/emissao false; o E2E test autorizado usou lote restrito e nao autoriza
deixar scheduler fiscal global executando fixtures antigas. Em
producao foi observado MP/SendNF com live/issue/auto/confirmacao fiscal globais
ativos: preserva-los, nunca aplicar defaults de QA por cima deles. Stripe live
tem opt-in proprio apenas para novas emissoes; flags novas ausentes/invalidas
impedem essas emissoes sem esconder documentos existentes nem parar MP. O gate
global de emissao/confirmacao continua necessario, mas auto/piloto MP nao
contornam nem limitam auto/piloto Stripe. Flags test nao sao um piloto limitado
a um pagamento: inventariar corte e lote antes de teste autorizado. Radar nao e
configurado pelo runtime.

Configurar modo/conta Stripe pode ampliar o escopo do worker fiscal. Checkout,
reconciliador e ledger OFF nao sao trava para jobs fiscais ja persistidos. Antes
de ativar Stripe, todas as instancias backend precisam do guard acima; preparar
env sem restart nao comprova runtime atualizado. Pausa de emissao Stripe mantem
captura/snapshots e reconciliacao GET de documentos com ID existente. Piloto e
automacao Stripe exigem autorizacao separada e inventario de pendencias.

### Permissoes a conferir no gateway

O codigo le conta, Price/Product, Customer/search, Subscription/search, Invoice,
InvoicePayment, PaymentIntent, Charge, Dispute, PaymentMethod e SetupIntent/list.
O desenho da ADR-0688 exige cinco areas de escrita: Customers (create),
Subscriptions (create/update/cancel), Setup Intents (create), Payment Intents
(create/confirm/cancel) e Invoices (finalize/attach payment). Os demais recursos
ficam somente leitura; conferir no painel as dependencias de permissoes, inclusive
Invoice Payments, sem ampliar acesso por conveniencia. O Stripe.js confirma o
SetupIntent e autentica 3DS; confirmacao/reconfirmacao financeira do PaymentIntent
manual ocorre exclusivamente no backend apos verificar novamente funding credit.
Conferir acesso minimo real ao preparar a chave de cada ambiente; consultas GET
nao comprovam permissoes de escrita. Nao reutilizar o formulario antigo com tres
areas de escrita nem ampliar a chave por conveniencia.
O runtime nao cria Price/Product, refund ou disputa. `stripecli_session_write`
pertence ao encaminhamento CLI local, nao ao endpoint produtivo de webhook.

Preparacao inativa nao autoriza habilitar vendas, collector, reconciliacao, ledger
ou emissao fiscal Stripe. Manter seus gates false/disabled e a oferta pausada;
gravar Environment sem restart nao atualiza o processo em execucao. A habilitacao
posterior exige backend/frontend compativeis, webhook verificado, oferta vinculada
e monitoramento do worker. Nao contratar Radar Plus, habilitar Radar para
SetupIntents ou retomar a coleta automatica das assinaturas como parte do rollout.

## 3. Webhook e processamento

Destino backend: `/api/public/billing/stripe/webhook`. Versao esperada:
`2026-10-28.endive`. Configurar endpoint da conta/modo corretos; nao usar eventos
Connect ou outro sandbox como substituto. Body bruto limitado256KiB; inbox
duravel/deduplicada antes do ACK. Resposta HTTP200 nao prova conciliacao concluida.

Eventos consumidos:

- `customer.subscription.created`, `.updated`, `.deleted`;
- `invoice.paid`, `.payment_succeeded`, `.payment_failed`,
  `.payment_action_required`, `.voided`, `.marked_uncollectible`;
- `setup_intent.succeeded`, `.setup_failed`, `.canceled`;
- `charge.refunded`, `charge.dispute.created`, `.updated`, `.closed`.

### Smoke assinado sem operacao financeira: escopo e limites

A prova de 10/11/2026, 20:18:05 BRT, usou reenvio de `product.updated` real ja
existente na propria conta live, pelo console visual oficial Stripe Shell, sob
permitida inscricao temporaria desse unico topico. Nao criar evento sintetico,
produto, assinatura, pagamento ou nota para produzir uma prova.

Se repetir, exige autorizacao explicita para alterar temporariamente os topicos.
Inventariar antes URL/nome/descricao/API/conta/status e os 16 eventos originais,
sem exportar segredo. Preservar todos os gates financeiros/fiscais OFF e oferta
pausada. Reenviar somente o evento real conferido e verificar Delivered/HTTP 200,
resposta `processed:false`; o topico fora da allowlist financeira deve ser ignorado
sem inbox ou operacao financeira. Restaurar imediatamente os 16 topicos originais
e conferir a leitura salva, sem alterar permissao, chave ou Radar. Conferir
inventario READ ONLY antes/depois e saude/runtime; registrar somente agregados.

Essa prova fecha transporte/assinatura, **nao** conciliacao, recebimento de evento
financeiro suportado ou E2E live. Para os tipos financeiros, HTTP 200 tambem nao
prova conclusao do worker. Preservar essa separacao ao planejar ativacao posterior.
Nao ampliar topicos permanentemente nem fazer replay financeiro sob esta rotina.

### Preparacao sem deploy: limite confirmado em 10/11/2026

Registro historico anterior a publicacao inativa 0.1.808: as pendencias de rota,
migrations, destino, segredo e oferta abaixo foram posteriormente superadas na
TASK-323. Nao repetir criacao de webhook ou vinculo como se ainda faltassem.

O `/ping` produtivo retornou HTTP 200, no-store e versao `0.1.791`. A revisao do
commit dessa versao confirmou ausencia do SDK, rota webhook Stripe, operacao
`stripe-offer` e migration de fundacao. Nao testar entrega real contra essa versao,
nem copiar scripts/dependencias ou fazer INSERT manual para contornar publicacao.
Isso nao presume o estado atual do banco: nao houve consulta privada nesta rodada.

No painel live, formulario conferido com os 16 eventos acima, propria conta,
payload snapshot e API endive. Continua apenas preenchido na aba, nao um destino
persistido. UI/WebMCP nao oferecem criar inicialmente desativado; referencias
oficiais de criacao V1/V2 tambem nao documentam esse parametro e retornam status
enabled. Nao criar ativo para desativar logo depois ou usar URL ficticia. Logo,
STRIPE_WEBHOOK_SECRET ainda nao existe para esse destino. Referencias:
[V1](https://docs.stripe.com/api/webhook_endpoints/create) e
[V2](https://docs.stripe.com/api/v2/core/event-destinations/create).

Produto/preco live existentes conferidos: R$ 29,90 por mes, BRL, flat rate,
preco padrao do produto ativo, sem duplicacao/edicao. Referencias exatas ficam
no registro operacional privado de QA e na aba do preco, nao em nova env ficticia:
o vinculo pertence a billing_offers/billing_price_versions, nao ao Environment.

Quando houver autorizacao de publicacao, a ordem segura sera:

1. Publicar codigo/schema compativeis, preservando todos os gates Stripe
   false/disabled e controles MP/SendNF existentes. Conferir runtime e migrations.
2. Inventariar plano, oferta, revisao e admin responsavel real. Nao presumir
   revisao zero nem selecionar um admin qualquer para preencher a auditoria.
3. Executar `stripe-offer` compilado sem `--apply`, com `--disable-sales` e
   referencias exatas conferidas. Depois, aplicar somente o vinculo pausado e
   reler `checkout_enabled=false`, revisao, conta/modo e versao do preco.
4. Criar o webhook no rollout coordenado, guardar o segredo exato somente no
   backend e carregar por reinicio/deploy autorizado. Verificar assinatura,
   recebimento/inbox e conciliacao em etapas separadas; nao presumir que o
   primeiro Save carregou o segredo no processo. Vendas/collector/fiscal continuam OFF.
5. Habilitar qualquer processamento, venda ou piloto fiscal apenas mediante
   autorizacao especifica e verificacoes correspondentes. Este roteiro nao a concede.

Scheduler: primeira rodada apos30s, proximas apos60s, ate10 eventos e10 operacoes
recuperaveis por rodada. Alterar flag de processo requer configuracao/reinicio
controlado; flag true nao inicializa retroativamente scheduler que nao iniciou.
O webhook pode acumular inbox enquanto scheduler esta OFF. Recuperacao periodica
de operacoes e GET-only no provider; evento assinado de SetupIntent pode atribuir
cartao remotamente. O collector separado finaliza faturas e confirma pagamentos
quando seu proprio opt-in esta true, mesmo com conciliacao OFF. Nao chamar todo o
worker de somente leitura nem usar apenas a flag da conciliacao como trava financeira.

## 4. Comandos e inventario

No desenvolvimento: `pnpm --dir backend exec tsx src/operations/billing/NOME.ts`.
Na imagem compilada, em `/app`: `node --enable-source-maps dist/operations/billing/NOME.js`.
O container produtivo nao possui `src`/`tsx`; nao instalar dependencias para
contornar isso. `--help` sozinho mostra argumentos, sem executar operacao.

### Oferta: `stripe-offer`

Obrigatorios: `--account`, `--mode test|live`, `--price`, `--expected-revision`,
`--actor-admin-id`, `--reason initial_catalog|enable_checkout|pause_checkout|replace_offer`.
IDs sao referencias operacionais, nao valores de chave. Nao passar segredo em argv.

- Sem `--apply`: dry-run; faz GET Stripe e transacao/lock no banco configurado,
  sem mudar registros. Usa SELECT FOR UPDATE no plano e pode obter lock temporario;
  nao executar dentro de BEGIN READ ONLY nem chamar de consulta sem locks.
- `--apply`: grava versao/oferta e auditoria, nunca modifica contratos remotos.
- `--enable-sales`/`--disable-sales`: mutuamente exclusivos. Nova oferta/preco
  substituido fica pausado sem enable; mesmo preco pode preservar estado anterior.
- Plano profissional e admin valido devem existir. Revisao0 somente se oferta
  ausente; nao fazer seed. So aceita2990BRL/month/1 nesta etapa.
- Enable exige segredo de webhook e reconciliador configurados; presenca nao
  equivale a entrega/conciliacao E2E ou prontidao do worker de cobranca. O collector
  possui opt-in proprio; regras pagas de Radar nao sao gate deste desenho.

Antes do dry-run, ler `billing_offers`/`billing_price_versions` no banco correto,
em transacao READ ONLY, com filtro de gateway/conta/modo/plano. Conferir revisao,
checkout_enabled e valor/Price sem exportar dados pessoais. O comando nao e um
editor irrestrito nem cria catalogo remoto.

Se nao souber se a fundacao existe, comecar por este inventario READ ONLY. Na
publicacao inativa ela foi conferida, mas nao presumir estado de outro ambiente.
Se tabelas faltarem, parar; nao
criar manualmente. Mesmo tabelas presentes nao substituem o codigo compativel:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SELECT
  to_regclass('public.billing_offers') IS NOT NULL AS offers_present,
  to_regclass('public.billing_price_versions') IS NOT NULL AS prices_present;
SELECT migration_name, finished_at IS NOT NULL AS applied
FROM _prisma_migrations
WHERE migration_name LIKE '%stripe%'
ORDER BY migration_name;
SELECT id, slug, active, deleted
FROM subscription_plans
WHERE slug = 'profissional';
COMMIT;
```

### Ledger: `reconcile-stripe-ledger`

Obrigatorios: `--subscription-id` (ID LOCAL), `--account`, `--mode test|live`.
`--max-pages 1..5` limita leitura, padrao1, ate5 invoices/pagina.

- Dry-run faz GET Stripe, sem persistir recibos/cobertura.
- `--apply --confirm test|live` grava fatos/cobertura; confirm deve coincidir.
- `--refresh` exige apply: reinicia cursor/cobertura, preserva recibos existentes.
  Apply sem refresh retoma scan incompleto; completo nao e refeito.
- CLI manual independe das flags de automacao. Flags false NAO impedem apply.
- Conferir `has_more`, `coverage_written`, `receipts_complete`, `periods_complete`.
  `adjustments_complete=false` nao vira receita liquida conhecida; nao completar
  dado por inferencia. Nao emite nota nem chama invoice.pay.

### Inbox em revisao: `requeue-stripe-event`

Obrigatorios: `--event-id` (ID LOCAL), `--account`, `--mode test|live`,
`--expected-attempts`, `--actor-admin-id`, `--reason`.
Motivos: `provider_recovered`, `configuration_corrected`, `binding_reconciled`.
Dry-run por padrao; `--apply --confirm test|live` autoriza UM reenfileiramento no banco.

Diagnosticar a causa antes. Somente review_required, versao/escopo corretos,
sem lease/conclusao e tentativas correspondentes (>=1); codigo de erro desconhecido
e bloqueado, nao copiado para auditoria. CAS e auditoria sao atomicos;
duas execucoes concorrentes nao reabrem duas vezes. Preserva attempts, recursos
e erro anterior ate desfecho do worker; nao concede beneficio, atribui cartao
ou executa provider no comando. Nenhuma opcao em massa. Proximo worker ainda
aplica todas as verificacoes e pode voltar para revisao. Conflito anterior ao
limite de10 tentativas pode usar o saldo de retries da politica original; nao
prometer somente uma execucao do worker nem reiniciar o contador.

Reenvio do mesmo evento pelo Stripe nao reabre review_required (dedup preserva
registro). Nao apagar inbox, zerar attempts nem fabricar vinculo para destravar
SetupIntent autonomo: sem operacao exata, revisao e o estado correto.

### Fiscal Stripe: `recover-stripe-invoice`

Obrigatorios: `--invoice-id` (Invoice remoto `in_...`, nao PaymentIntent),
`--account`, `--mode test|live`, `--actor-admin-id`, `--expected-job-attempts`,
`--expected-invoice-attempts`, `--reason`.
Tentativas aceitam inteiro >=0 ou `absent` somente quando o respectivo registro
nao existe. Motivos: `provider_recovered`, `configuration_corrected`,
`missing_fiscal_job`. Conferir argumentos sem executar operacao:

```sh
node --enable-source-maps dist/operations/billing/recover-stripe-invoice.js --help
```

1. Inventariar apenas o pagamento/conta/modo pretendidos, job e documento fiscal,
   tentativas, conclusao e leases, em acesso privado READ ONLY. Identificar admin
   real ativo/confirmado/sem reset pendente e corrigir a causa antes de reabrir.
2. Executar sem `--apply`: valida admin, identidade e GETs canonicos Stripe do
   pagamento/contrato. Exige invoice efetivamente paga, BRL, valor contratado,
   ausencia de estorno e vinculo local exato. Dry-run nao altera fila ou auditoria.
3. Somente apos autorizacao, usar `--apply --confirm test|live` com o mesmo modo
   e inventario. Uma transacao serializavel revalida scope/owner/revisoes,
   tentativas e leases, e grava reenfileiramento + auditoria atomicamente.
   Job existente precisa estar concluido, sem lease; invoice autorizada nao pode
   ser reaberta. Inventario divergente ou concorrencia bloqueiam, nao sobrescrevem.
4. O comando nao cobra, nao executa worker nem escreve no Stripe/SendNF. **Workers
   ja habilitados podem emitir depois do apply**: conferir gate/piloto/lote antes.
   Flags false nao bloqueiam a escrita local explicita da CLI. Nao confundir
   `provider_writes:0` no resultado com promessa de ausencia de efeitos futuros.
5. Referencia idempotente, snapshot, tentativas e documento existente sao
   preservados. Com document_id o worker consulta o mesmo documento, sem criar
   outro para substituir rejeicao. Recuperacao nao corrige snapshot imutavel nem
   promete nova autorizacao; se os dados da nota estiverem errados, parar e
   definir procedimento fiscal especifico, sem editar banco/apagar documento.

Backfill de ledger nao cria job fiscal por si so. Essa CLI permite recuperar UM
job faltante de invoice paga comprovada, sem nova cobranca. Nenhuma opcao em
massa, reset de tentativas ou fabricacao de vinculo. IDs operacionais ficam no
canal privado; segredos, CPF, nome e email nunca vao nos argumentos/evidencias.

### Fiscal test: recusa explicita e fila escopada

O adapter forca `simulation: "never"` em todo POST test, inclusive snapshot
anterior sem o campo. Live remove o parametro, preservando seu contrato e
configuracao existentes. Falhas conhecidas sao allowlist:
`cnc_missing_in_test`, `municipality_missing_in_test`, `registry_missing_in_test`,
`government_test_rejected`. `simulation:false` com status rejected **nao** e
autorizacao; apenas authorized + sinais governamentais completos liberam PDF.

Invoice Stripe draft/open sem pagamento elegivel tem retries limitados a 10 no
job fiscal; zero/void/uncollectible sao encerradas sem emissao. Um evento posterior
de pagamento pode reabrir o mesmo job, que le prova fresca antes do snapshot.
401/403, contrato financeiro invalido e limite de falhas tecnicas exigem revisao;
nao reenfileirar indefinidamente nem tratar indisponibilidade como valor zero.
Endereco ou identidade fiscal incompletos permanecem pendentes, sem emissao,
com nova leitura no scheduler (backoff maximo 1h), pois dependem de dados do usuario.
O contador do documento inclui polls bem-sucedidos; nao e usado como limite de
falhas consecutivas. Documento ja criado e reconciliado por GET, nao recriado.

Para QA interno explicitamente autorizado, `processInvoiceQueue` aceita
`{jobIds, invoiceIds}` com ate 5 IDs unicos por lista. Objeto fornecido com um lado
omitido ou lista vazia processa zero desse lado; sem argumento mantem scheduler
global. Preparar snapshot com `{jobIds:[id], invoiceIds:[]}` e depois processar
somente `{jobIds:[], invoiceIds:[id]}` evita emitir fixtures antigas. Essa funcao
nao e endpoint publico, bypass de gate ou autorizacao para executar producao.

### Dados fiscais do pagador antes da primeira tentativa

Codigo 010501, ISS 2,01% e descricao anterior ja foram confirmados pela
contabilidade; nao solicitar nova revisao de enquadramento. A pendencia individual
e outra: CPF do perfil, **nome fiscal auditado** e endereco de cobranca completos.
Nome exibido no perfil/alias nao substitui identidade fiscal. O sistema usa a
confirmacao CFP historica exata ou evento de identidade fiscal gravado pelo fluxo
administrativo auditado; nao preencher CFP artificialmente para passar o gate.

- O usuario completa o endereco na tela prevista, sem enviar dados pessoais pelo
  chat. Quando o endereco do perfil e valido, o fluxo pode reaproveita-lo.
- Se faltar identidade fiscal, operador autorizado confirma o nome no painel
  administrativo existente; nao inventar nome nem editar diretamente o banco.
- O pagamento pode chegar antes do endereco: job aguarda, nao emite com dados
  incompletos, e retoma apos correcao. Ate criar snapshot, historico pode mostrar
  apenas pagamento confirmado, ainda sem cartao de status da NF. Para o piloto,
  conferir os dados antes evita essa espera e torna o resultado observavel.
- Cancelamento/fim do periodo pago ou cortesia nao devem bloquear essa correcao:
  `current` informa capacidades aditivas `billing_address_editable` e
  `billing_address_maintenance_only`. Historico Stripe integro ou documento fiscal
  proprio, no scope/contrato corretos, permite manter o endereco sem renovar,
  sincronizar provider, conceder beneficios ou alterar CPF/nome fiscal. Salvamento
  de manutencao volta a gestao da assinatura, nao ao onboarding de beneficios;
  snapshot/nota ja existente nunca e reescrito pela alteracao do endereco.
- Historico/NF permanece acessivel ao proprietario apos cancelamento, plano
  gratuito ou cortesia; estorno e disputa mantem rotulo financeiro proprio.
  Documento simulado/nao verificado nao disponibiliza PDF de nota autorizada.

## 5. Monitoramento e criterio de parada

Consultar somente agregados/IDs operacionais necessarios em acesso privado:

- Inbox por state/type, maior idade pending, leases expiradas, review_required e
  last_error_code controlado. Comparar recebimento, processed_at e entrega no Stripe.
- Operacoes abertas/creating/review por conta/modo e idade; correlacionar pela
  referencia hash, nao pelo e-mail ou payload. Resolver ambiguidade antes de nova
  tentativa; nunca recomendar pagar de novo sem consultar contrato/pagamento.
- Ledger: cobertura/invoices/recibos/has_more/conflitos; financeiro indisponivel
  significa falta de prova, nao zero. Recibos, beneficio e NFS-e sao fatos separados.
- Fiscal: job/documento por scope, idade/next_attempt_at/leases e erro controlado.
  `[BILLING_INVOICES] Etapa fiscal observada.` publica somente `invoice_ref` hash,
  stage/outcome, diagnostic allowlist, attempts e document_status allowlist.
  Referencia da etapa pode derivar de job ou documento, nao e ID remoto; correlacionar
  por lookup privado autorizado, sem publicar tabela de correspondencia. Codigo
  desconhecido vira `operation_unavailable`, nunca mensagem livre do provider.
  CLI retorna referencia hash e booleans de prova/preservacao/efeitos, nao payload.
- Fiscal aprovado, PDF e email sao verificacoes distintas. SendNF faz envio ao
  tomador conforme configuracao; readiness/send_to_taker nao provam entrega.
  No piloto real, conferir nota autorizada e download do proprietario, e o proprio
  usuario confirma recebimento do email. Nao reenviar nota para testar email.
- Versoes por app (`/ping`, `/version`) e `/health`/`/ready`. Essas rotas nao
  comprovam Stripe, webhook, pagamento ou fiscal funcionando.

Parar novas vendas se houver escopo divergente, duplicidade, valor inesperado,
beneficio sem prova ou crescimento de review sem diagnostico. Nao registrar
payload integral, PAN/CVV, client_secret, CPF, email, chave, assinatura ou stack.

## 6. Ordem de publicacao, ativacao posterior e rollback

1. Resolver gates da task; aprovacao visual/publicacao expressas. Seguir
   [LOCAL-TO-PRODUCTION](LOCAL-TO-PRODUCTION.md), confirmar autodeploys homolog OFF
   nos provedores, checks locais e PR revisado homolog→main. Sem bypass de checks.
2. Publicar backend expansivo/migrations com checkout disabled, reconciliacao,
   ledger e novas emissoes Stripe OFF; preservar fiscal MP existente. Conferir
   guard por gateway, migracoes e todas as instancias; nao editar
   migration aplicada nem voltar worker antigo sobre fluxo Stripe ativo.
3. Provisionar env/endpoint live separados e validar conta, permissoes, Price,
   versao e entrega; oferta inicialmente pausada. Inventariar inbox antes de
   habilitar reconciliador. Preservar MP para contratos/operacoes existentes.
4. Publicar frontend/Admin, conferir versoes, manutencao de legados e contrato
   aditivo. Inventariar ledger, dry-run limitado e apply separado se autorizado;
   automacao financeira nao habilita fiscal.
5. Piloto/vendas exigem nova aprovacao e controle operacional: **nao ha allowlist
   de usuario**. Oferta enabled + gateway stripe abrem novas vendas globalmente;
   nao anunciar piloto exclusivo sem implementar esse requisito em outro escopo.
   Nenhuma cobranca live automatica para smoke. SendNF/Radar nao ativados por tabela.

### Checklist executavel apos o deploy dos ajustes finais

Este checklist descreve a ativacao autorizada, **nao registra sua execucao**.
Cinco gates independentes: reconciliation, collection, ledger, fiscal issuance e
fiscal auto. Gateway e oferta sao duas travas adicionais de novas adesoes.

- [ ] Conferir backend/frontend/admin publicados, versoes, migrations e
  health/ready; endpoints de versao publicos/no-store/noindex. Manter inicialmente
  `BILLING_CHECKOUT_GATEWAY=disabled`, os cinco gates false e oferta checkout false.
  Conferir todas as instancias, conta/modo live, chave minima, publishable key,
  webhook/assinatura e preco 2990 BRL/month. Nao duplicar webhook/preco/oferta.
- [ ] Inventariar inbox, operacoes, contratos/faturas/collections e jobs ledger/
  fiscais anteriores; resolver escopo/revisao/leases e ausencia de duplicatas.
  E2E sandbox e transporte live assinado nao substituem esse inventario.
- [ ] Habilitar `BILLING_STRIPE_RECONCILIATION_ENABLED=true` e
  `BILLING_STRIPE_LEDGER_ENABLED=true` apenas com inventario aceito e reinicio
  controlado; conferir scheduler/inbox/recibos. Reconciliador pode atribuir cartao
  apos SetupIntent assinado; nao e consumidor inteiramente sem mutacoes remotas.
- [ ] Habilitar `BILLING_STRIPE_COLLECTION_ENABLED=true` somente com autorizacao
  financeira e ausencia de pendencias antigas nao avaliadas. Collector pode
  finalizar/cobrar renovacoes elegiveis mesmo com checkout fechado. Conferir
  keep_as_draft/default, PI manual e worker no runtime; nunca reativar coleta
  automatica do provider, Smart Retries ou Radar como substituto.
- [ ] Usar `stripe-offer` com inventario/revisao atuais e admin real: dry-run,
  depois apply auditado `--enable-sales --reason enable_checkout`. A CLI exige
  reconciliacao/webhook configurados, mas nao comprova prontidao integral.
  Reler oferta enabled/conta/modo/preco; manter gateway disabled ate a abertura.
- [ ] Mudar `BILLING_CHECKOUT_GATEWAY=stripe` em reinicio controlado e conferir
  configuracao autenticada/Payment Element. Isso abre vendas globalmente; nao
  prometer exclusividade do piloto. Usuario preenche cartao e autoriza seu proprio
  pagamento; agente nao efetua cobranca real. MP permanece no codigo para legados,
  sem fallback automatico para novas assinaturas.
- [ ] Para NF piloto, apos invoice real paga comprovada, definir somente seu
  `SENDNF_STRIPE_LIVE_PAYMENT_ID` e habilitar
  `SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED=true`, mantendo
  `SENDNF_STRIPE_LIVE_AUTO_ENABLED=false`. Gates globais SendNF/fiscal confirmados
  continuam necessarios e devem preservar MP. Reler runtime antes do worker;
  invoice fora do piloto permanece aguardando ativacao, nao e descartada.
- [ ] Conferir eventos financeiros, entitlement, recibo, NF autorizada com
  simulation false/chave de 50 digitos/public_query, PDF por owner e email recebido. Somente
  depois de autorizacao da automacao e inventario de todo o backlog habilitar
  `SENDNF_STRIPE_LIVE_AUTO_ENABLED=true`; limpar piloto se deixar de ser usado e
  reler configuracao. Nao inferir esse aceite do teste rejeitado governamental.

O preflight live GET confirmou identidade/readiness/go-live SendNF, codigo 010501,
ISS override 201 e send_to_taker; Stripe charges/payouts/card estavam habilitados,
sem requirements pendentes e sem inventario financeiro Stripe. Sao leituras de
prontidao, nao prova de cobranca, autorizacao fiscal/email ou ativacao dos gates.

Pausa emergencial de novas adesoes: `BILLING_CHECKOUT_GATEWAY=disabled` com
configuracao/reinicio controlado. Preservar segredos, contratos, webhook e
conciliacao, salvo incidente que exija pausa especifica desses consumidores.
`stripe-offer --disable-sales` depende de GET remoto e pode falhar em indisponibilidade;
nao e o unico controle de pausa. Pausa nao cancela recorrencias no Stripe e nao
impede confirmacoes ja autorizadas. Nao trocar gateway para mercadopago como
fallback, apagar filas/dados ou remover credenciais MP ainda necessarias.

Pausa do collector (`BILLING_STRIPE_COLLECTION_ENABLED=false` e reinicio) e
pausa de novas NFs Stripe (`SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED=false` e reinicio)
sao independentes da pausa de checkout. Nao interrompem uma chamada em voo nem
cancelam/estornam fatos ja confirmados. Reconciliar resultados ambiguos antes de
qualquer nova tentativa. Desabilitar auto fiscal com piloto ainda preenchido nao
e pausa total desse piloto; usar o gate issuance para impedir nova emissao Stripe.

Se reversao binaria for indispensavel, conter novas operacoes e preservar inbox/
ledger/migrations expansivas; revisar compatibilidade dos consumidores antes.
Nao restaurar banco ou regredir schema para desfazer a integracao.
Nao voltar a artefato anterior ao guard fiscal com pendencias Stripe: as novas
envs seriam ignoradas e auto MP poderia autorizar Stripe. Preferir pausa pelo
guard conservado; reversao antiga exige plano especifico para impedir essa
emissao sem apagar filas ou interromper MP.
