# ADR-0684 - Stripe incorporado, contratos por gateway e preco versionado

Data: 2026-11-09
Status: Aceito; implementacao parcial e validacao externa pendentes
Task: [TASK-320](../_product/tasks/TASK-320-stripe-embedded-checkout.md)

## Contexto

O usuario pediu a implementacao Stripe, confirmou R$ 29,90/mês e escolheu o
formulario de cartao dentro da Lectum. O checkout auditado em 0.1.799 ainda usa
Mercado Pago, inclusive factory, webhook, lifecycle e integraçao fiscal SendNF.
Nao basta configurar chaves ou substituir o adapter global.

TASK-142/ADR-0408 criaram leitura administrativa do preco, deliberadamente sem
edicao. A hipotese de evoluir esse painel e valida, mas o modelo atual vincula
assinaturas ao preco mutavel de `subscription_plan`; financeiro/MRR leem esse
valor. `subscription_plan.active` tambem controla entitlement. Expor um PUT
direto de preco/active alteraria apresentacao de legados ou beneficios de clientes.

## Decisoes

### Checkout dentro do produto

Usar Payment Element na pagina Lectum, preservando a composicao de formulario
existente e a fundacao React Hook Form/Zod para campos de produto. Cartao fica
em campos hospedados do Stripe; PAN/CVV nunca passam pela Lectum. Um desafio 3DS
ou retorno de autenticacao e permitido quando necessario, sem substituir o fluxo
por Checkout hospedado. Client secrets sao efemeros, restritos ao titular e nao
entram em logs, analytics ou storage do browser. Nao construir URLs com segredos;
parametros sensiveis que o SDK incluir no retorno devem ser removidos antes da
telemetria, sem logging da query de callback.

Preco inicial: BRL 2990, recorrencia mensal. Backend determina a oferta e valida
Price/conta/modo; valor enviado pelo cliente nunca e autoridade de cobranca.
Sucesso do SDK/redirect nao e prova de entitlement: o estado persistido apos
validacao server-side de pagamento/assinatura governa beneficios e onboarding.

### Factory por contexto, sem fallback financeiro

Factory distingue nova adesao de manutencao de contrato. Apos cutover, novas
adesoes usam Stripe; Mercado Pago permanece para ler, conciliar, cancelar e
receber eventos de contratos existentes. Uma recusa/falha Stripe nao tenta MP.
Configuracao indisponivel bloqueia novas adesoes de forma segura.

Cada operacao de contrato usa seu gateway salvo, inclusive SendNF. Nao converter
IDs nem transportar tokens de cartao entre gateways. Migracao de clientes ativos,
retokenizacao e reajuste de contratos exigem decisao/autorizacao separadas.
Impedir contratos/cobrancas conflitantes entre gateways e preservar gratuito e
cortesia administrativa sem transformar concessao em pagamento.

### Idempotencia duravel e inbox

Persistir tentativa de checkout com identidade/revisao, titular, oferta, gateway,
conta/modo e referencias remotas. Reload, retry, timeout e 3DS retomam a tentativa;
resultado ambiguo exige recuperacao/conciliacao, nao nova cobranca presumida.

Webhook Stripe verifica corpo bruto limitado e assinatura antes de aceitar dados.
Inbox duravel deduplicada por gateway/conta/modo/evento antecede ACK; processamento
usa leases, backoff, revisoes/CAS e replay idempotente. A evidencia persistida deve
ser minima, protegida e suficiente para recuperacao; logs permanecem sanitizados.
Eventos fora de ordem nao reativam cancelamento nem estendem beneficios sem prova.
Contrato de reconciliacao deve ser limitado, retomavel e dry-run por padrao.

### Identidade de plano separada de oferta e contrato

Manter `subscription_plan` como identidade/beneficios. Adicionar versoes imutaveis
de preco/oferta com gateway, conta, modo, valor, moeda, intervalo e referencia
externa. Novas assinaturas guardam Price/versao e snapshot contratado. Nao
sobrescrever o vinculo MP existente nem preencher preco legado com o catalogo
atual sem evidencia. Evolucao do schema sera expansiva, com campos legados
compativeis e backfill retomavel quando houver fonte confiavel.

Novo preco gera novo Price; alterar oferta vigente afeta apenas novas adesoes.
Nao atualizar subscription items existentes, gerar prorrata ou reajustar em massa.
Pausa de vendas e flag distinta da ativacao de beneficios do plano. Leituras de
catalogo e leituras de contrato/financeiro devem usar as respectivas fontes.

A Stripe documenta que o valor de um Price criado nao e alterado por edicao;
reajustar assinatura existente e uma operacao explicita sobre seu item.
Fontes: [catalogo](https://docs.stripe.com/products-prices/manage-prices),
[mudanca de assinatura](https://docs.stripe.com/billing/subscriptions/change-price).

### Admin em etapa subsequente

Reutilizar `/configuracoes/assinatura`, hoje read-only. A fundacao versionada entra
com o Stripe; editor e etapa posterior, sem bloquear o primeiro checkout do preco
confirmado. Escopo futuro: publicar preco para novas adesoes, motivo/confirmacao,
CAS da revisao e auditoria em `admin_activity_log`; pausar somente novas vendas.
Publicar localmente apenas apos Price remoto validado; falha preserva oferta anterior.

Ficam fora CRUD amplo de planos, cupons, anualidade, prorrata, migracao e reajuste
em massa. Cancelamento e cortesia existentes devem tornar-se provider-aware nesta
integracao, preservando periodo pago e confirmacao administrativa para encerramento
imediato. O editor nao e declarado implementado ou habilitado por este ADR.

### SendNF e ambientes

Desacoplar de MP sem apagar referencias fiscais existentes. Escolher identidade
canonica de recebimento Stripe e vinculo a invoice/pagamento/assinatura antes de
implementar: eventos diferentes do mesmo recebimento nao geram varias notas.
Recebimento BRL confirmado, positivo, apos corte e sem estorno e necessario;
recibo Stripe nao substitui NFS-e. Preservar CPF/nome fiscal/email/endereco,
snapshots, idempotencia, piloto, servico/ISS e verificacao de autorizacao/PDF/email.

Homologacao usa sandbox Stripe e SendNF test com gate explicito para seu runtime
e banco reais; o bloqueio atual a homolog deve ser evoluido por codigo revisado,
nunca enganado por NODE_ENV/BASE/nome de banco. Producao usa live separado.
Habilitar cobranca nao ativa automaticamente emissao fiscal; nenhum pagamento
antigo cancelado ou nota manual sera reemitido como teste. Reembolso nao cancela
nota fiscal automaticamente.

### Packages e configuracao

Adotados na implementacao autorizada: backend `stripe@23.1.0`; frontend `@stripe/react-stripe-js@7.0.1`
e `@stripe/stripe-js@10.2.1`. Metadados do registry consultados em 09/11:
Node >=20 para o SDK backend; React/ReactDOM >=16.8 <20 e stripe-js >=10 <11
para o wrapper React, compativeis com o runtime/React declarados no repositorio.
Ver [PACKAGES](../_product/tasks/PACKAGES.md). Packages instalados conforme o registro de execucao abaixo;
metadados nao substituem build, auditoria ou E2E real. Admin/Video sem SDK Stripe.

Catalogos live/sandbox foram preparados separadamente pelo orquestrador para
BRL 2990 mensal; sandbox conferido como nao-live. API de referencia observada:
`2026-10-28.endive`, a fixar explicitamente em SDK/webhook no contrato final.
IDs/segredos operacionais ficam fora do Git. Chave restrita sandbox autorizada e provisionada na execucao abaixo; ainda pendem
configuracao de webhook e E2E real; a alegada necessidade de liberacao cadastral
foi corrigida apos a prova tecnica descrita abaixo.
Nenhuma assinatura, PaymentIntent, cobranca, chave nova ou webhook foi criada
nessa preparacao externa relatada. Catalogo nao significa integracao implantada.

## Consequencias, validacao e rollout

- Novos contratos serao Stripe sem abandonar manutencao MP; nao existe fallback
  automatico de cobranca. Possivel ampliar operacao para dois gateways temporariamente.
- Separacao de preco/contrato evita mudar historico e MRR por simples edicao de
  catalogo; exige revisar projecoes existentes, nao apenas adicionar uma tabela.
- Backend, frontend, Admin e Video continuam apps/instalacoes separados. Video
  nao tem alteracao funcional; instalar dependencias somente nos apps que as usam.
- Schema: expandir, backfill comprovavel e so depois contrair em outra entrega.
  Executar `db:migrate` local e testes reais PostgreSQL; nunca resetar publicado.
- Validar Stripe sandbox real, inbox/replay, concorrencia, rejeicao/3DS, lifecycle,
  SendNF test e browser local mobile-first; nenhum mock conclui esses gates.
- Publicar contratos expansivos antes de consumidores; envs novas com defaults
  inativos ou ALERTA DE DEPLOY previo. Autorizacao de implementacao nao autoriza
  publicar, cobrar ou emitir nota live. Piloto e ativacao exigem gates reais.
- Rollback pausa novas adesoes e preserva dados, filas e rotas de manutencao.
  Nao apagar contratos/notas nem reativar novas cobrancas MP automaticamente.

## Estado desta decisao

Decisao em implementacao parcial. Criterios da TASK-320 sao marcados somente
conforme evidencia executada, sem declarar conclusao integral. A especificacao original evoluiu conforme o registro
abaixo; nao houve bump, commit, push ou deploy.

## Inicio da implementacao — 09/11/2026

Usuario autorizou criar chave restrita sandbox e salvar no env local do backend,
fora do Git. Adotados para implementacao, ainda sujeitos a gates reais: stripe
23.1.0 no backend; @stripe/react-stripe-js 7.0.1 e @stripe/stripe-js 10.2.1 no
frontend. Instalacoes independentes, sem remover SDK Mercado Pago. Nenhuma
publicacao ou cobranca live autorizada por esta etapa.


## Validacao tecnica e correcao do preflight — 09/11/2026

A verificacao anterior confundiu pendencias simuladas do sandbox com bloqueio real
necessario para testes. Com a chave restrita autorizada, a API aprovou pagamento
simulado BRL 2990 apesar de `charges_enabled=false`/`card_payments=inactive`.
Nao foi necessario KYC real, outro sandbox nem alterar producao. Assim, somente
modo live exige capabilities prontas no preflight; ambos os modos continuam
exigindo chave/conta/runtime/banco correspondentes e verificacao das respostas.
Ver [sandbox settings](https://docs.stripe.com/sandboxes/dashboard/sandbox-settings)
e [testes oficiais](https://docs.stripe.com/testing).

Provas reais adicionais: assinatura incomplete -> pagamento de teste -> active;
repeticao da mesma chave retorna o mesmo contrato; invoice/PaymentIntent/Charge
confirmados. Cortesia/SetupIntent e troca de cartao sem pagamento, recusas e
requires_action sem beneficio. As quatro recorrencias de teste foram encerradas.
`incomplete_expired` tambem e retorno terminal valido de cancelamento de contrato
incompleto, conforme resposta observada. Desafio 3DS/browser completo permanece
pendente, assim como webhook assinado real e SendNF test.

Recuperacao usa metadata exata e busca eventualmente consistente; resultado vazio
nao autoriza nova chave. Replay do pedido identico e limitado a menos de 23 horas,
cinco tentativas e fingerprint persistido antes do request. Apos a janela ou sem
fingerprint antigo: apenas leitura/revisao. CAS impede rebaixar estado terminal.
Migrations expansivas aplicadas somente no PostgreSQL local isolado, incluindo
fingerprints opcionais; nenhuma migration aplicada foi editada.

Recebimento fiscal Stripe canonico: invoice `in_`, com alocacao integral de um
PaymentIntent e Charge confirmado, sem valor zero/out-of-band/estorno/disputa.
Referencia inclui gateway/conta/modo; referencias MP anteriores nao mudam.
A fila e selecao de contrato/recibo usam o gateway persistido. Nenhuma emissao
fiscal e ativada por selecionar Stripe no checkout. Antes de produzir jobs Stripe,
substituir todos os workers antigos; manter reconciliador e novas vendas desligados
durante expansao/rollout. Nao reverter para worker antigo com produtor Stripe ativo.

Operador inicial de ofertas somente le Price remoto existente, exige conta/modo,
revisao esperada, administrador confirmado e motivo controlado; dry-run por padrao.
Apply grava versao imutavel/oferta/auditoria atomicamente, sem alterar assinaturas.
Habilitar vendas e explicito, exige webhook/reconciliador configurados e nao substitui
E2E ou aprovacao de publicacao. Editor comercial Admin continua fora desta etapa.

Detalhes, validacoes e pendencias constam da TASK-320. Nao houve bump/commit/push/
deploy, cobranca live ou nota fiscal nesta continuacao.


### Guards de runtime e serializacao

Validacao real revelou dois detalhes de seguranca: entrada `undefined` explicita
em helpers de runtime nao pode herdar NODE_ENV permissivo do processo, enquanto
chamada sem argumento deve continuar lendo esse default; e Prisma 7 pode expor
40001 por P2010/DriverAdapterError estruturado. Corrigidos com testes, sem parse
de mensagens SQL, sem tornar outros erros retentaveis e sem executar seed/reset.
Cortesia/exclusao e checkout compartilham versao MVCC/lock de perfil; oferta e
reserva compartilham lock de plano para nao aceitar revisao pausada/alterada.

### Complemento: credito-only e webhook local (09/11)

Decisao explicita do usuario: somente credito. `payment_method_types=['card']`
nao restringe funding; conferir exatamente `credit` antes de atribuir metodo de
pagamento. Nao mascarar uma verificacao pos-cobranca como prevencao da cobranca,
nem retirar beneficio ja pago para esconder um metodo nao permitido. A barreira
do provider e sua precedencia/renovacoes precisam de evidencia propria antes
de cutover; alterar Radar live/contratar plano pago exige autorizacao separada.

Webhook local usa CLI oficial com chave restrita sandbox, sem tunnel publico nem
destino live. Permissao especifica de sessoes CLI autorizada separadamente,
com demais acessos preservados. Segredo de assinatura fica somente em arquivo
local ignorado/0600. Prova real obtida: entrega assinada 200, duplicata 200/uma
linha, corpo alterado 400; recurso remoto cancelado sem vinculo local permanece
pendente com backoff, sem criar contrato/entitlement. Listener nao e deploy.

Referencias: [CLI listen](https://docs.stripe.com/cli/listen),
[precedencia e atributos ausentes em Radar](https://docs.stripe.com/radar/rules/reference).


### Radar sandbox, setup e exibicao financeira — 09/11

Autorizada/ativada apenas no sandbox a regra Block de funding ausente ou diferente
exato de credit, com 100% de trafego e Allow conflitante desativada. Tres provas
reais: credito aprovado; debito/pre-pago bloqueados antes da rede, sem recebimento.
Triagem de todos os ciclos confirmada no painel. Nenhuma configuracao live alterada.

Radar em SetupIntents e opt-in separado; painel informa tarifa e nao foi ativado.
Trial/SetupIntent real demonstrou autoatribuicao assincrona de debito/pre-pago
pelo Stripe apesar da recusa do nosso guard. Nao tratar validacao local como
prevencao desse efeito remoto. Preservar operacao em revisao e motivo fechado,
sem nova chave automatica; resolucao controlada e protecao de setup continuam gates.
Todos os seis contratos sandbox desta rodada foram encerrados, sem cobranca real.

Finance distingue snapshot contratado de catalogo atual. Sem ledger Stripe completo,
metricas monetarias historicas dependentes ficam explicitamente indisponiveis;
nao preencher zero ou inferir pagamento apenas por existir referencia externa.
Selecao de gratuito nao pode cancelar localmente recorrencia externa; usa lock
compartilhado de perfil e verificacao transacional de conflitos.

Projecoes de detalhe/lista/dashboard foram alinhadas ao snapshot. Data de primeira
conversao paga Stripe nao e inferida de criacao da reserva, setup ou identificador
externo. Sem timestamp de recebimento persistido/historico comprovado, indicar
indisponivel/desconhecido; nao backfill especulativo. Cobertura completa de metricas
historicas continua pendente e exige ledger/evidencia adicional.


Autorizacao posterior para Radar/SetupIntents e condicional a ausencia de custo
real. A investigacao de 09/11 nao obteve confirmacao especifica dessa isencao em
fontes publicas/painel; nao equiparar transacao simulada a isencao de tarifa de
servico nem extrapolar precos de Sigma. Opcao mantida desligada ate confirmacao;
nenhuma afirmacao de que o sandbox e tarifado foi estabelecida.

Consulta autorizada enviada ao assistente oficial da Stripe em 09/11. A resposta
confirmou isolamento, mas nao isencao especifica de tarifa Radar/SetupIntents;
recomendou especialista humano. Encaminhamento solicitado, canal por e-mail com
estimativa de 24 horas oferecido, ainda sem confirmacao humana. Manter gate
condicional e opcao desligada; nao interpretar resposta generica de transacoes
simuladas como autorizacao financeira nem habilitar producao.

### Validacao independente enquanto suporte de cortesia aguarda — 09/11

Chamado de custos recebido pelo portal, ainda sem confirmacao de gratuidade.
Usuario autorizou testes independentes, sem ativacao Radar/SetupIntents/live.
Checkout pago usa sandbox real e banco descartavel, mantendo gates de verificacao
profissional separados: fixture sem CFP aprovado paga em teste, mas nao recebe
verificacao profissional por isso. Fixture de login nao equivale a onboarding real.

Browser validou recusa sem beneficio, retomada apos reload e desafio 3DS com retorno
seguro ao endereco de faturamento. Webhooks assinados reais foram processados por
worker explicito; recebimento HTTP 200 nao e tratado como conciliacao concluida.
Backlog de probes sem contrato local demandou mais lotes, sem repetir pagamento
nem descartar eventos para fabricar resultado. Casos de cortesia, renovacao futura,
fiscal completo e resultado ambiguo continuam gates separados.

Oito falhas frontend atribuidas anteriormente ao baseline eram causadas pelo
runner QA: URL de API com path contrariava o contrato de origin. Corrigido somente
arquivo temporario, preservando guardas e expectativas. Auditoria posterior aponta
dependencias vulneraveis ainda pendentes; nao publicar a task com esse gate aberto.

Cancelamento real validado em sandbox apos checkout browser: fim de periodo
preserva acesso pago, e encerramento final de QA nao gera nova cobranca. Eventos
genuinos posteriores nao reativaram recorrencia nem removeram vigencia paga.
Checks/builds desta rodada passaram apos ajustar envs QA; isso nao substitui
auditoria limpa, validacao de cortesia/fiscal/renovacao ou autorizacao de deploy.

### Remediacao focal de dependencias antes de fechar o gate de seguranca

Continuacao autorizada em 09/11: corrigir os advisories de follow-redirects,
glob e minimatch nos apps afetados sem misturar instalacoes ou atualizar Stripe.
Adotar follow-redirects 1.16.3 pelo override existente dos tres apps; no backend,
express-handlebars 9.0.4 (patch upstream, peer compativel) passa a depender de glob14.
Nos apps Next, manter Sentry10 e limitar glob14.0.4 aos seletores de pai
`@sentry/bundler-plugin-core>glob` e `@sentry/bundler-plugins>glob`, em vez de impor
minimatch11 globalmente ou migrar SDK Sentry inteiro para outra major. A dependencia
normal de glob traz minimatch corrigido. Inspecao dos usos confirmou API publica
glob/ignore/root, sem Matcher interno/debug removidos; ainda exigir testes reais
de filesystem, templates/HTTP, checks/builds e auditoria apos instalar.

Mudanca de glob major e trade-off explicito de build tooling; overrides devem
ser removidos quando os pais declararem versoes corrigidas. Runtime de validacao
Node24, sem nova env ou schema. Locks independentes; nenhuma publicacao autorizada.

Execucao: nove testes reais focais e checks/builds backend/frontend/admin passaram;
auditorias de producao nos cinco manifests/locks retornaram zero advisories conhecidos.
Admin instalado foi sincronizado ao baseline ja declarado. Nao houve upgrade
direto Stripe/Sentry nem nova funcionalidade em video.

### Relogio de teste e honestidade da projecao historica

Usar clock retroativo isolado para que datas de recebimento/periodo sejam anteriores
ao relogio real Lectum. Nao afrouxar hasPaidCurrentPeriod para aceitar pagamentos
futuros apenas para fazer teste passar. Cliente com clock e fixture explicita;
servicos de contrato/pagamento/conciliacao permanecem reais. Renovacao paga e primeira
recusa foram observadas, sem afirmar retries completos ou transicao temporal nao
executada. Test clock via Workbench sandbox evita ampliar credenciais persistentes.

Sem ledger financeiro, data da reserva nao serve como inicio historico de acesso.
Propagar unavailable tambem a contagem/serie ativa, MRR diario e CSV, preservando
valor contratado e entitlement atuais. billing_invoice so existe apos gates fiscais
e nao pode ser usado como ledger de todos os recebimentos Stripe. SendNF test
ausente bloqueia o respectivo E2E; nao fabricar empresa/corte/dados fiscais ou notas.

### Recuperacao de resultado ambiguo por falha real controlada

Ensaio externo ao codigo produto encerrou subprocesso no evento `response` real
do SDK, apos criacao Stripe 2xx e antes do callback persistir referencias. Sem
substituir transporte/response ou registrar body. Esperou lease real, recuperou
via GET com replay desativado e comprovou um unico contrato/operacao, sem cobranca.
Cleanup encerrou a recorrencia e eventos assinados posteriores permaneceram
consistentes. Isso comprova essa fronteira especifica de crash, nao todo timeout
possivel nem execucao do ramo POST replay. Hooks de teste nao entram no produto.

Auditoria posterior do ensaio de renovacao observou SetupIntent automatico da
Stripe ao atualizar default_payment_method do customer de recusa. Vinculo confirmado
por customer/metodo e idempotency key do evento. Diferenciar ausencia de chamada
explicita a SetupIntents de ausencia de recurso automatico do provider; nao declarar
"nenhum SetupIntent" nesse fluxo. Nenhum opt-in Radar foi ativado nem gate de
cortesia considerado concluido por esse evento.

O evento automatico permaneceu sem vinculo na inbox, em retry limitado; nao foi
forcado como complete nem silenciosamente descartado. Distinguir conciliacao dos
eventos de assinatura/fatura de conciliacao de todos os eventos da fixture.
Classificacao segura de setups autonomos continua pendencia operacional.

### Classificacao fechada de eventos de SetupIntent

Continuacao autorizada: tratar setup_intent.* antes da sincronizacao generica.
Evento assinado nao autoriza usar metadata isolada como vinculo de contrato.
Exigir GET canonico e correlacao exata do ID pinado/attemptId, tipo de operacao
compativel (troca de cartao ou renovacao de cortesia) e billing_customer na mesma
conta/modo/customer. Correlacoes contraditorias vao para revisao, sem assignment,
entitlement ou sincronizacao de outro contrato. Operacao terminal nao reaplica efeito.

Ausencia de metadata/pin nao prova irrelevancia: manter retries limitados para
cobrir eventos anteriores ao bind local, com diagnostico fechado especifico de
setup sem operacao. Apos limite, review_required; nunca forcar ignored/complete
para fazer o ensaio passar. Sem nova env/schema e sem mudar Radar ou producao.

### Fundacao financeira independente de nota fiscal

Expandir somente com duas tabelas novas: `billing_financial_receipt` para fatos
comprovados por invoice/InvoicePayment/PI/Charge e `billing_financial_reconciliation`
para trabalho/cobertura retomavel por contrato e conta/modo. Nao adaptar o payload
JSON legado de payment_event nem usar billing_invoice (que depende de emissao/corte
fiscal) como prova de todos os recebimentos. MP e dados existentes permanecem intactos.

Recebimento guarda referencias, valor/moeda, paid_at e periodo comprovados/imutaveis,
sem payload, PII, cartao ou segredo. Chaves unicas de escopo impedem duplicidade e
reatribuicao de InvoicePayment. A primeira versao aceita somente uma alocacao integral
de cartao, conforme leitor canonico existente; casos parciais/externos/creditos ou
associacao incerta deixam cobertura incompleta, nunca receita zero fabricada.
Estado de refund/dispute e observacao atual separada; nao inventar data economica
de ajuste usando observed_at. Historico liquido e metricas sem fatos suficientes
continuam unavailable, mesmo depois de criar a fundacao.

Reconciliacao exige lease/CAS, cursor de paginas, revisao solicitada/processada e
checkpoint atomico. Evento novo invalida a cobertura; pagina parcial/timeout nao
declara contrato coberto. Enumerar tambem invoices antigas pagas depois, por contrato
e customer exatos. Leitura financeira independe de usuario ativo, entitlement,
SendNF e emissores. CLI dry-run por padrao; apply somente no banco apos escopo
explicito, sem cobrar/alterar Stripe. Processamento automatico inicialmente desabilitado.

Rollout: migration expansiva antes do backend escritor, depois consumidores; nao
editar migration aplicada nem resetar dados. Rollback desabilita ingestao/leitura
nova e preserva tabelas/fatos. Nenhuma env obrigatoria nova ou backfill produtivo
automatico. Aplicar/validar migration apenas no PostgreSQL local isolado nesta task.
Permissoes externas ausentes mantem o respectivo caso incompleto, sem ampliar chave.

Compatibilidade de referencias de disputa: aceitar o prefixo du_ documentado pela
Stripe sem retirar o dp_ ja tratado no codigo; manter validacao de tipo/conta/modo
e GET canonico. Isso nao comprova acesso de leitura a disputas nem autoriza responde-las.

### Manutencao nao depende da oferta de novas vendas

Separar configuracao de cartao do catalogo ativo: contrato/customer precisam
corresponder a conta/modo/usuario atuais, mas uma oferta pausada ou Price arquivado
nao apaga a operacao pendente nem bloqueia apenas por isso a manutencao do contrato.
Pending payment_method retorna a configuracao de manutencao sem consultar Price.
Erro/ausencia de catalogo desabilita checkout novo; nao habilita outra conta,
outro contrato ou fallback MP. Novas adesoes continuam exigindo Price ativo/valor
contratavel e oferta explicitamente habilitada. Sem alterar Price remoto para testar.

### Conclusao da operacao original versus vigencia do beneficio

Checkout pago reconciliado tardiamente nao deve continuar aberto somente porque
o periodo venceu: isso bloqueia manutencao de cartao e pode induzir repeticao.
Permitir conclusao da operacao por evidencia interna validada do ledger, vinculada
ao PI originalmente pinado, contrato/perfil/conta/modo/Price exatos e captura integral
positiva BRL com timestamps nao futuros. Nao usar invoice mais recente de renovacao,
status active, data da reserva ou ID externo isolado como substitutos dessa prova.
Um recebimento positivo exato nao exige alegar cobertura completa de todo historico.

Estorno/disputa posteriores nao apagam a execucao original nem autorizam repeti-la.
Entitlement continua decidindo somente acesso vigente, sem grace inventada, sem
reativar cancelamento e sem usar o booleano de operacao concluida como pagamento atual.
UI de checkout concluido sem beneficio atual navega para Minha assinatura/pendencias,
nao para onboarding de sucesso nem polling eterno. Rollout permanece aditivo; clientes
anteriores podem continuar verificando, mas nao recebem permissao de nova cobranca.

Recuperacao da invoice inicial ja paga pode retornar o PI canonico verificado sem
client secret quando billing_reason for exatamente subscription_create e a invoice
expandida corresponder ao contrato/ID canonico. Isso permite pinar o resultado da
criacao original sem pedir novo pagamento. Nunca usar subscription_cycle/manual
ou status active isolado; se a invoice original nao puder ser comprovada (inclusive
latest ja substituida por renovacao), manter revisao, sem fabricar PIN historico.

### Cancelamento do usuario antes da primeira conciliacao

A revisao encontrou corrida: gateway pode confirmar o primeiro pagamento antes do
sync local; gravar cancelada com periodo null torna essa ausencia sticky e perde
vigencia paga. No fluxo de cancelamento iniciado pelo usuario, confirmar primeiro
o cancelamento remoto e o ID esperado, depois consultar/sincronizar estado canonico
antes da persistencia local de cancelamento. Exigir cancelamento agendado/terminal
canonico. Uma consulta apenas antes da mutacao nao cobre pagamento concluido durante
a chamada. Falha/ambiguidade nao autoriza fabricar periodo nem persistir null como
cancelamento final; nova consulta recupera o mesmo contrato, sem nova cobranca.

Nao relaxar sticky global, revogacao administrativa ou exclusao de conta. CAS
continua impedindo sobrescrever alteracao concorrente. Conclusao da operacao pode
reconhecer captura original verificada tambem em status cancelada, sem usar esse
resultado para acesso. PI exato e pagamento canonico permanecem obrigatorios;
beneficio segue resolveStripeEntitlement e jamais e restaurado por essa excecao.

No ensaio de dunning, distinguir cancelamento automatico de cleanup manual: exigir
motivo canonico payment_failed e preservar evidencia/origem. Verificacao inconclusiva
nao pode cancelar o contrato silenciosamente e depois alegar esgotamento automatico.

Ausencia de recibo nao e prova negativa de pagamento: inbox pode executar sync
antes do worker financeiro, ou o ledger pode estar desabilitado/indisponivel.
Checkout de assinatura paga com remoto terminal e captura original nao comprovada
fica review_required com diagnostico fechado original_payment_unresolved, nao failed.
A prova positiva posterior pode concluir a operacao sem alterar acesso/cancelamento;
terminais antigos nao sao reabertos. A mesma decisao deve valer em sync e confirmacao.
Failed definitivo exige prova negativa explicita, nao status canceled isolado.

Tambem restringir o ramo de invoice inicial ainda nao paga: extrair client secret/PI
como autorizacao original somente de subscription_create correspondente. Se latest
ja for renovacao e o pin original estiver ausente, manter revisao; nunca vincular
PI de renovacao como se fosse a tentativa inicial apenas por haver secret disponivel.

### Mensagem para assinatura Stripe sem vigencia confirmada

Browser do retorno historico confirmou o destino Minha assinatura, mas a copia
legada assumia primeiro pagamento pendente apesar de mostrar recebimento anterior.
Usar copia neutra para Stripe inativa/sem periodo, sem promessa de ativacao ou
instrucao de pagar outra vez. Preservar MP e layout; historico, status operacional
e vigencia sao fatos distintos. Nao inferir falta de pagamento pelo estado inativa.


### Evidencias e retomada de QA descartavel

A interrupcao mostrou que tmpfs do banco e arquivos /tmp nao sustentam ensaios de
varios turnos. Manter novos harnesses/evidencias privados fora do Git em diretorio
persistente, com snapshots pg_dump locais entre fases. Reinicio de banco efemero
nao autoriza reconstruir operacoes como concluidas com base apenas em metadata
remota. Ler recursos de teste conhecidos, encerrar recorrencias interrompidas
sem prorrata/fatura extra e executar novo ensaio explicitamente identificado.
Nao confundir cleanup manual com terminal automatico payment_failed; nao excluir
customers/clocks para esconder trilha. Isso nao muda armazenamento/producao.


### Datas canonicas independentes de invoice e alocacao de pagamento

O dunning real de 10/11 revelou captura valida na mesma assinatura/Price/customer:
invoice.status_transitions.paid_at e InvoicePayment.status_transitions.paid_at
nao vieram em nossa ordem presumida. No clock retroativo, a invoice foi paga em
03/11 08:15:13Z e a alocacao em03/11 10:53:18Z. PI succeeded e Charge capturado,
BRL2990, novo Mastercard de credito e referencias foram comprovados por GET.
A projecao recusou somente allocatedPaidAt > invoicePaidAt; nao e nova recusa de
cartao nem autorizacao para cobrar novamente. O SDK descreve fatos distintos,
sem contrato de ordenacao entre esses timestamps.

Preservar ambas as datas exatas e imutaveis, sem normalizar com min/max, inventar
paid_at ou usar observed_at como data economica. Remover apenas a ordenacao cruzada.
Continuar exigindo datas validas e nao futuras, cada uma comparada ao cutoff/now,
period_end > period_start, cadeia invoice/alocacao/PI/Charge, montante integral,
conta/modo/customer/Price e hash imutavel. Isso nao libera metricas liquidas ou fiscal.

A migration 20261110003545 ja aplicada permanece intocada. Nova migration troca
financial_receipt_period_check pela verificacao somente de periodo, sem atualizar
qualquer recibo/assinatura. Aplicar em banco local antes do novo escritor; rollback
operacional pausa ingestao e preserva fatos. Nao restaurar a regra antiga cegamente
apos gravar fatos validos com ordem diferente. Nenhuma env ou alteracao remota.

### Revisao final: elegibilidade temporal canonica e fiscal

Propagar os dois fatos independentes tambem na leitura canonica de vigencia:
invoice paga e alocacao paga devem ter datas validas, cada uma nao futura para
conceder beneficio. Nao exigir ordenacao entre elas. A leitura do provider exige
ambas as datas, mas o relogio/corte pertence a politica consumidora, permitindo
reconciliacao historica explicita sem fabricar timestamps.

Para novos candidatos fiscais Stripe, paidAt representa a data de alocacao do
pagamento, igual ao recibo financeiro; invoicePaidAt preserva o fato separado da
invoice. O corte SENDNF_PAYMENTS_FROM usa paidAt, e ambas devem ser validas e nao
futuras. Isso e uma regra tecnica de elegibilidade, nao uma definicao juridica de
competencia fiscal. MP permanece inalterado; snapshots fiscais existentes nao
sao reescritos, IDs/idempotencia nao mudam e nenhuma migration e necessaria.

O sinal charge.refunded tambem impede status approved, mesmo se o valor estornado
vier zero: preservar a inconsistencia para diagnostico, nunca emitir NFS-e ou
conceder acesso por ignorar esse sinal. Disputa continua impeditiva.

Validar com politicas puras e GETs das faturas reais ja existentes no sandbox;
nao criar novas cobrancas, ativar SendNF, Radar SetupIntents ou alterar producao.

### SendNF: preflight externo antes de qualquer emissao

Revisao da API oficial em10/11 (https://sendnf.com/desenvolvedores/api/) encontrou
contrato de aprovacao humana que o adapter atual nao implementa: empresa ou chave
com aprovacao pode retornar approval_request/pending_approval em vez de nfse.
Nao desligar protecao para contornar o contrato; antes do E2E verificar aprovacao
da empresa e da chave e registrar eventual bloqueio/escopo adicional. Um retorno
202/rascunho nao comprova autorizacao fiscal nem entrega de PDF/email.

A documentacao informa que cadastro de empresas, certificado e whitelabel sao
compartilhados test/live, mesmo com chave nt_test_. A autorizacao para testar nao
autoriza alterar esses itens. Ler identidade da chave restrita, readiness,
parametros fiscais e aprovacoes; se faltar algo, pedir acao especifica ao usuario.
Nao transportar chave live ao QA nem registrar valores/PII em docs/logs.

Em test, autoEnabled=true e o piloto de live nao limita o lote. A primeira prova
precisa banco/fila isolados, candidatos e corte inventariados e emissao controlada;
nao habilitar worker remoto sobre backlog desconhecido. O caminho test atual nao
inclui automaticamente todos os parametros/preview exigidos em live, portanto
autorizacao test isolada nao prova paridade fiscal: exigir diagnostico e preview
com parametros confirmados antes de considerar o gate externo concluido.

Inspecao autenticada de10/11 confirmou risco concreto: nota historica SIM-9 marcada
authorized tambem exibe banner de simulacao e evento document.simulated com motivo
cnc_missing_in_test, sem protocolo governamental. Readiness cadastral nao prova
homologacao fiscal disponivel. Separar evidencia do transporte/API real de prova
de autorizacao pelo orgao; nao concluir gate fiscal com espelho simulado. Nao ha
flag publica de simulacao documentada no contrato consultado; nao inventar campo,
inferir apenas pelo prefixo ou alterar o adapter por suposicao. Confirmar contrato
e capacidade de homologacao com SendNF antes de tratar esse status como prova E2E.
Producao nao sera utilizada para contornar limitacao de teste.

### Provisionamento local autorizado e limite somente leitura SendNF

Em10/11 o usuario autorizou uma nova chave test restrita a Lectum, preservando
as anteriores. Salvar apenas em `backend/.env.sendnf.local` ignorado/nao rastreado,
modo0600 e criacao exclusiva, sem valor em Git/chat/log/clipboard. Manter flags de
ativacao e emissao false. Nao instalar em homolog remoto nem copiar credencial live.

O painel permite escopo de empresa e politica de aprovacao, nao foi comprovada uma
permissao read-only. Preservar padrao MCP e nenhum privilegio de aprovador, sem
alterar politica existente. Impor GET-only/origin/path allowlist no diagnostico;
nao prometer que o token em si impede emissao. Quatro GETs reais HTTP200 validaram
modo/empresa/readiness/cadastro/aprovacao da empresa; politica da chave foi lida
na UI, nao inferida de `/v1/me`. Nenhuma escrita de provider/banco no diagnostico,
separado da criacao autorizada da chave. Nao executar nem preview nesta autorizacao.

Readiness true com ISS padrao ausente nao confirma parametros fiscais nem resolve
a homologacao governamental simulada. Ausencia nao equivale a aliquota zero.
Manter gate E2E aberto ate confirmacao contabil/SendNF e autorizacao para os
proximos testes; nao habilitar worker, producao ou Radar para ultrapassar bloqueio.

### Retomada operacional limitada de evento em revisao

Deduplicacao da inbox usa upsert sem reabrir o registro: um reenvio Stripe nao
destrava review_required, corretamente. Adotar CLI com dry-run por padrao e escopo
unitario (evento local, conta, modo, tentativas esperadas, admin ativo/confirmado e
motivo controlado). Apply exige confirmacao do modo, runtime permitido, API version
esperada, estado review_required e ausencia de lease/processamento concluido.
Gravar transicao para pending/next_attempt_at e auditoria na mesma transacao, por
CAS. Preservar attempts e historico; falha seguinte volta a revisao quando limite
ja foi atingido. Conflito precoce pode usar o saldo de tentativas conforme a
politica original: um reenfileiramento nao promete uma unica execucao do worker.
Nao alterar payload/referencias, contrato, beneficio ou ledger.

O comando nao chama provider nem executa o worker: reprocessamento posterior pode
fazer os mesmos efeitos de conciliacao ja autorizados nas flags do runtime. Isso
inclui escritas de banco e eventuais atribuicoes de cartao do fluxo assinado; nao
prometer worker GET-only em todos os tipos. Nao aceitar requeue em massa, eventos
terminais ou ressetar tentativas para contornar erro de vinculo. O operador deve
diagnosticar/corrigir a causa antes de autorizar mais uma tentativa.

Expandir sanitizacao por valor para credenciais Stripe/SendNF; excecao de Intent
continua limitada ao caminho DTO, tipo e rota autenticada existentes. Testes de
politica/HTTP local nao substituem E2E Stripe nem mudam o fluxo de tokenizacao.

### Fechamento finito de QA e checkpoint local

Em10/11 fechar cenarios definidos com provas complementares reais: crash remoto
2xx de customer/setup antes de persistir e recuperacao GET apos lease real;
corteTCP antesTLS com POST replay da assinatura mantendo chave/corpo; eventos
originais assinados deleted duplicado antes do updated antigo. Nao simular
respostas, ocultar resultados de busca, alterar Date.now/contadores para alegar
casos externos nao induzidos. Atraso de indice apos create commitado e exaustao
temporal completa dos setups autonomos nao foram executados; guards/politica/PG
e casos reais complementares sao a prova delimitada, nao cobertura universal.

QA de retorno historico usa autenticacao temporaria de fixture exclusivamente
local, restaurada depois. Isso nao atesta signup/email/CFP. Leitura current cria
fallback gratuito real quando elegivel; preservar essa adicao e verificar
imutabilidade dos fatos Stripe, nao apagar o fallback para fazer snapshot passar.
Separar validacao tecnica visual de aprovacao visual do usuario para publicacao.

Registrar implementacao validada em commit local sem declarar TASK-320 integral
concluida: gates externos de cortesia/Radar e fiscal permanecem pendentes. Nao
publicar, ativar live ou liberar emissores com base apenas nesse checkpoint.

### SendNF authorized nao equivale a autorizacao governamental

Resposta de suporte trazida pelo usuario em10/11 e GET real da SIM-9 confirmam
simulation=true em documento statusauthorized. Readiness valida cadastro local,
nao disponibilidade CNC de homologacao. Nao exigir regularizacao nem usar live
como atalho; historico MP nao e prova do novo fluxo Stripe.

Reter sinais adicionais sem expor notice/chave/URL; simulation ausente permanece
desconhecida. Classificar autorizacao apenas com simulationfalse e sinais coerentes
de documento governamental; flagtrue em test vira estado local simulated, sinais
ausentes/contraditorios viram authorization_unverified. Preservar IDs e snapshot
mesmo sem autorizacao, evitar reemissao e polling intensivo. Sem coluna obrigatoria,
migration ou backfill presumido; clientes antigos degradam novos estados para
pendencia. PDF exige releitura/classificacao atual mesmo se cache local antigo
authorized. Nao promover documento simulado a prova fiscal nem disponibiliza-lo
silenciosamente como NFS-e autorizada. Download de espelho nao faz parte desta etapa.

### Diagnostico fiscal aditivo, sem emissao

Na revisao de10/11 posterior a resposta de suporte, a referencia publica
https://sendnf.com/desenvolvedores/api/ passou a documentar
`government_test_transmission` em GET readiness e `simulation: "never"` no POST
de NFS-e. Novo complemento do suporte informou ausencia de opt-out: manter a
divergencia aberta, pois documentacao nao prova disponibilidade efetiva. Nao houve
envio desse parametro nem prova de sua execucao. Nunca ativar emissao para
esclarecer essa divergencia sem autorizacao separada.

Ler a evidencia adicional no diagnostico existente, preservando ready/missing
e o comportamento do worker. Status available descreve a ultima nota test,
nao um probe atual nem garantia da proxima transmissao. Aceitar somente estados
e motivos controlados, timestamp valido ou nulo; descartar reason livre e todo
dado cadastral. Campo novo ausente/malformado permanece desconhecido, sem
invalidar o readiness legado nem presumir autorizacao governamental.

Sem env nova, package, migration, UI ou mudanca de politica de emissao. Impacto
de futura publicacao restrito ao diagnostico aditivo backend/CLI; rollback pelo
artefato anterior, sem mutacao de dados. Producao e Radar permanecem intocados.

### Complemento de suporte: transmissao tentada versus autorizacao

O complemento recebido em10/11 esclarece que o fluxo test tenta transmitir ao
governo e a recusa cadastral CNC leva ao fallback simulado. Corrigir a interpretacao
anterior de ausencia de transmissao. Isso nao transforma um espelho em documento
governamental autorizado nem valida um novo E2E Lectum/Stripe/SendNF. Readiness
cadastral e sua observacao historica adicional nao consultam CNC em tempo real.

Manter classificador atual: simulationtrue nao autoriza; simulationfalse exige
chave numerica de50digitos e public_query valido; outros status preservados.
Nenhuma mudanca funcional, env, migration ou flag e necessaria. Priorizar com o
fornecedor a confirmacao do contrato/implantacao do opt-out documentado, incluindo
falha controlada em vez de sucesso simulado, sem solicitar intervencao na empresa.

### Isolamento de novas emissoes Stripe live sem parar MP

A inspeção autorizada de producao identificou SendNF global live/issue/auto e
confirmacao fiscal ativos. Configurar Stripe ou desativar seu checkout/reconciliador
nao e uma trava para jobs fiscais ja persistidos: a politica atual herdava auto
global. Preservar processamento MP e adicionar opt-in exclusivo na criacao de
novas NFS-e Stripe live, sem excluir scopes usados em historico/PDF/consultas.

Adotar SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED e SENDNF_STRIPE_LIVE_AUTO_ENABLED, ambos
false por ausencia, e SENDNF_STRIPE_LIVE_PAYMENT_ID opcional para invoice in_.
Exigir gate global de emissao/confirmacao e politica Stripe propria; auto/piloto
MP nao autorizam nem limitam o piloto Stripe. Flags novas invalidas ou piloto
invalido/missing quando necessario deixam Stripe fechado, sem derrubar config MP.
Test usa a politica global existente. Documento com ID ja emitido continua apenas
em reconciliacao/GET, mesmo com criacao Stripe pausada; manter snapshots e leases.

Parametros contabeis vigentes e texto fiscal anterior foram confirmados pelo
usuario; reutilizar configuracao existente, sem expor descricao/credenciais em
documentacao. Opcao simulationnever confirmada pelo suporte sera tratada em etapa
separada. Sem nova dependencia/schema/migration ou chamada externa nesta mudanca.
Novas envs sao opcionais, nao impedem boot nem requerem configuracao para o MP.
Rollback para codigo anterior ao guard nao e seguro com Stripe ativo; conter
novas operacoes e fila Stripe antes, preservando banco, notas e servico MP.
