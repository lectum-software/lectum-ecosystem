# TASK-323 - Checkout Stripe dentro da Lectum e coexistencia segura de gateways

Data: 2026-11-09
Status: Producao ativa 0.1.811; primeira compra real confirmada, NFS-e aguarda identidade fiscal do titular; hardening de recuperacao em homolog
Decisao: [ADR-0687](../../adrs/0687-stripe-embedded-checkout.md)
Operacao: [Runbook Stripe](STRIPE-OPERATIONS.md)
Base auditada: `homolog` em `820077ccd`, versao `0.1.799`
Dependencias funcionais: TASK-02, TASK-31/32/33, TASK-56, TASK-142, TASK-313/314/315/317.

## Pedido e limite desta etapa

### Liberacao integral solicitada em 10/11, apos o smoke assinado

O usuario autorizou concluir implementacao, revisao, testes, publicacao e configuracao
para que uma conta real possa assinar e receber NFS-e, sem novas confirmacoes de
rotina. Esta autorizacao supera os limites de manter checkout/emissao Stripe OFF
dos checkpoints historicos abaixo, mas nao autoriza o agente a efetuar a primeira
cobranca real. A ativacao ocorre somente depois dos gates locais/sandbox e da
conferencia do inventario live. Radar, permissoes da chave e fiscal MP legado
permanecem preservados. Nenhuma nota live sera emitida antes de pagamento real.

- [x] Branch homolog e base remota conferidas; check integral inicial aprovado.
- [x] Fechar crash/race antes do primeiro debito e recuperacao transitoria sem
  cobrar por polling; leituras nao consomem limite de replay de mutacoes.
- [x] Fechar retomada, troca de cartao, 3DS e cancelamento em inadimplencia e
  cortesia com contrato agendado; DTOs aditivos e UX mobile-first.
- [x] Enviar simulation never somente em teste, classificar faturas fiscalmente
  inelegiveis, adicionar diagnostico seguro e recuperacao auditada sem duplicacao.
- [x] Revalidar credito/debito/prepago, cortesia, recusa, 3DS, renovacao, cancelamento,
  concorrencia e eventos reais no sandbox existente; sem mocks como prova final.
- [x] Validar passagem pagamento/ledger/fiscal test e recusa governamental explicita;
  nao declarar autorizacao governamental nem entrega de email sem evidencia.
- [x] Checks/builds, browser local, revisao cruzada e ADR; commit versionado deste fechamento.
- [x] PR homolog para main, deploys separados, preflight live somente leitura,
  ativacao ordenada e smoke autenticado sem envio de cartao.
- [ ] Entregar ao usuario o fluxo pronto para a primeira tentativa real, com
  observacao de pagamento unico, nota, PDF e email apos a transacao dele.

Impacto previsto: contratos aditivos, nenhum pacote novo; migrations somente se
necessarias e expansivas. Implantar backend compativel antes do frontend; ativar
reconciliacao/ledger/collector e fiscal Stripe apenas com inventario conferido,
oferta habilitada por operacao auditada ao final. Rollback operacional suspende
novas vendas sem apagar historico ou desligar conciliacao de pagamentos existentes.
Uma validacao ampla reduz risco, mas nao prova ausencia absoluta de falhas.

### Complemento autorizado em 10/11: credito-only sem Radar Plus

- Implementar e validar somente em `homolog`, localhost e sandbox existente, incluindo
  cortesia, 3DS, troca de cartao e renovacoes. Nao ativar vendas publicadas, producao,
  Radar para SetupIntents nem contratar plano. Nao efetuar cobranca real ou emissao fiscal.
- A verificacao `funding === credit` precisa ocorrer no servidor antes de cada tentativa
  financeira, inclusive renovacoes. Apenas validar a atribuicao do cartao e deixar
  cobranca automatica externa nao comprova esse requisito.
- Primeiro comprovar o contrato real de API: coleta independente com SetupIntent,
  retencao de faturas sem cobranca automatica e confirmacao financeira controlada
  pelo servidor. Nao devolver o segredo de um PaymentIntent automatico como atalho
  para 3DS; se a API nao suportar o desenho, registrar o bloqueio antes de implementar.
- Na rodada de implementacao 0.1.804, autorizadas somente permissoes de escrita
  Payment Intents/Invoices na chave sandbox.
  Inspecao confirmou Payment Intents ja em escrita; apenas Invoices mudou de leitura
  para escrita, com persistencia conferida no painel. Chave live intocada nessa rodada;
  preparacao live posterior autorizada consta no checkpoint 0.1.806 ao final.
- Impacto previsto: fluxo financeiro novo exige backend/frontend compativeis e
  reconciliacao duravel, sem reutilizar contratos antigos de forma silenciosa. Rollout
  e automacao produtiva exigem autorizacao separada da preparacao das permissoes live.
  Sem package novo.

Criterios adicionais (nao substituem as evidencias historicas):

- [x] Prova real de API da barreira de cobranca e do caminho 3DS sem bypass.
- [x] Checkout/cortesia coletam e validam cartao antes de associar recorrencia.
- [x] Debito, pre-pago e classificacao desconhecida/ausente sao recusados antes de cobrar.
- [x] Troca, recuperacao e renovacoes respeitam a mesma barreira e idempotencia.
- [x] Gates finais locais aprovados, sem push/deploy.

Gates finais em0.1.804: `pnpm check` integral aprovado (incluindo backend1372testes,
1356pass/16opt-inskips/zerofalhas), builds backend/frontend aprovados. Migration
expansiva aplicada com `pnpm --dir backend db:migrate` no PostgreSQL isolado;
reexecucao confirmou sem pendencia. Teste PG opt-in de collection/cancelamento
executado separadamente, sem skip. Backend compilado health/ready/ping200/no-store
e frontendcompilado version200/no-store/noindex em0.1.804; processos locais do
ensaio encerrados, PostgreSQL preservado. Bump unico e cinco manifests sincronizados;
registro em commit local deste complemento, sem publicacao.

Evidencia do complemento (sem substituir as limitacoes historicas):

- Sandbox existente, chaves test restritas, PostgreSQL isolado e servicos reais:
  seis casos de checkoutcredito, debit/prepaid bloqueados antes de Sub/PI,
  troca debit recusada mantendo cartao anterior, troca credit sem cobranca e
  cortesia sem captura. Nenhum provider foi substituido por mock.
- Relogio Stripe criado no passado e avancado ate instante ja passado no relogio
  real: renovacao normal e primeiro debito apos cortesia passaram pelo worker;
  invoices nasceram draft/auto_advancefalse, tres capturas/receipts test por PIs
  manuais, PIs automaticos receberam zero. Dois replays nao duplicaram capturas.
  Nao alteramos Date, cutoff ou guard de periodo futuro para fazer o teste passar.
- Browser localhost:3DS do SetupIntent e do PI manual com cartao oficial de teste.
  Interrupcao do desafio financeiro, nova aba e confirmacao explicita retomaram
  o mesmo PI; sequencia3 concluiu exatamente uma captura2990/3DSauthenticated.
  Navegacao prosseguiu ao endereco de faturamento, que nao foi preenchido.
- Probe hostil com chave publica/clientsecret e outro cartao CREDIT valido:
  GET200 de controle e confirm400 especificamente por confirmacao manual, sem
  Charge/captura. A recusa nao dependeu do bloqueio Radar de debit/prepaid.
- Funding unknown/ausente/inconsistente e seguranca de escopo cobertos por testes
  de contrato/politica, nao por dados falsificados como resposta do provider.
- QA visual mobile-first320/390/1440, sem overflow horizontal. Builder indisponivel;
  proto local Finalizar Assinatura e UI existente usados. Build aprovado, navegador
  funcional no dev local: build production corretamente recusa API HTTP loopback.
  Aviso de eval de Reactdev/CSP nao e erro financeiro; nao relaxar CSP produtiva.
- Fixtures locais usam autenticacao tecnica, sem validacao real de CFP/cadastro/email.
  Cleanup revoga sessoes tecnicas e encerra somente contratos criados pelo ensaio;
  customers, pagamentos e historico preservados. Nenhuma NFS-e, mudanca produtiva,
  Radar SetupIntents ou plano pago. A limpeza da sessao visual local nao comprova
  logout de uma sessao previamente revogada; esse fluxo nao pertence ao billing.
- Evidencias privadas em `.codex/lectum-stripe-qa` no HOME: credit-only-product,
  credit-adapter, credit-renewal, credit-public-confirm-bypass, credit-ui-final e
  credit-responsive. Nao versionar IDs operacionais, segredos, credenciais ou capturas
  de formularios preenchidos. Apenas imagens vazias/desafios de teste foram salvas.

Trade-off operacional: worker novo fica false por padrao. Recusa definitiva aguarda
acao explicita, nao Smart Retries. A evidencia antiga de dunning automatico nao
valida retentativas/grace/notificacoes desta nova politica; decidir/evoluir essas
funcionalidades separadamente antes de pressupor equivalencia. Cancelamento usa
fence duravel; consulta de periodo pago permanece permitida apos marcar cancelamento.
Cortesia/Radar deixa de ser bloqueio tecnico; suporte de custos nao foi presumido
como respondido. SendNF e aprovacao/publicacao continuam fora deste complemento.

O usuario autorizou implementar a integracao Stripe, escolheu formulario de cartao
**dentro da Lectum** e confirmou **R$ 29,90 por mes**. Manter o Mercado Pago no
codigo/factory para contratos legados, mas desabilitado para novas adesoes apos
o cutover. Nao migrar cartoes ou assinaturas existentes automaticamente.

A especificacao inicial foi seguida de implementacao autorizada em 09/11 e
validacao incremental ate 10/11. Checkout/3DS, recusa/reload, renovacao, dunning,
cancelamento, recuperacao de assinatura apos resposta perdida, ledger e principais
gates locais ja possuem evidencia executada. Nao devem ser tratados como trabalho
inteiramente pendente nem repetidos sem regressao demonstrada.

A task integral ainda nao esta concluida: cortesia credito-only depende do suporte
Stripe e o E2E SendNF depende de provisionar localmente os parametros contabeis
ja confirmados e obter autorizacao para teste fiscal, respeitando a limitacao
de autorizacao governamental em homologacao. As variantes tecnicas delimitadas de recuperacao/eventos
e o QA visual local foram encerrados em10/11. Registros cronologicos preservam
bloqueios ja superados. Aprovacao visual do usuario e autorizacao de publicacao
continuam requisitos de deploy, nao testes tecnicos a repetir. O commit local
registra a implementacao parcial validada, nao aprova o rollout. Nenhum push/deploy
autorizado nesta etapa; configuracao Stripe inativa foi preparada no Dokploy com
autorizacao, sem restart/deploy e preservando MP/SendNF existentes. Radar para
SetupIntents permanece intocado.

## Evidencia inicial e requisitos externos

- A factory atual instancia apenas `MercadoPagoAdapter`. O webhook, cancelamento,
  historico, entitlement e SendNF ainda possuem acoplamentos explicitos a MP.
- Admin ja tem `/configuracoes/assinatura` e GET privado de configuracao do plano,
  intencionalmente somente leitura (TASK-142 / ADR-0408). Nao ha editor de preco.
- Em 09/11, o orquestrador verificou conta Stripe live com cobrancas e repasses
  habilitados, sandbox separado existente e catalogos separados de R$ 29,90,
  BRL, recorrencia mensal. O Price sandbox foi conferido por API com
  `livemode=false`. API de referencia: `2026-10-28.endive`.
- Essa configuracao externa **nao** comprova integracao Lectum, checkout, webhook
  ou nota fiscal funcionando. Nenhuma assinatura, PaymentIntent ou cobranca foi
  criada nessa preparacao; nenhum webhook foi criado nessa preparacao inicial.
- Autorizacao especifica recebida e chave restrita sandbox criada, salva em
  `backend/.env.stripe.local`, ignorado pelo Git, permissoes locais `0600`.
  Conta e Price reais conferidos com essa chave sem expor valores. Nenhum segredo
  deve entrar em docs, logs, frontend ou Git.
- Pendente provisionar/verificar runtime sandbox, chave publicavel correspondente,
  assinatura de webhook, permissoes minimas e E2E real. Ausencia desses requisitos
  bloqueia o respectivo gate; nunca substituir o provider por mock.

## Escopo e contratos a implementar

### 1. Factory e coexistencia

- Separar provedor de **novas adesoes** de provedor do **contrato existente**.
  Checkout novo usa Stripe apos ativacao explicita; consulta, sincronizacao,
  troca de cartao, cancelamento, eventos e fiscal despacham pelo gateway salvo.
- Mercado Pago permanece disponivel para contratos/operacoes legadas, inclusive
  webhooks e conciliacao. Nao remover suas credenciais enquanto forem necessarias.
- Falha, timeout, recusa ou configuracao Stripe ausente nunca tenta cobrar no MP.
  Apos cutover, cliente antigo com token MP recebe erro recuperavel/instrucao de
  atualizar o fluxo; nao cria assinatura MP silenciosamente.
- Impedir nova assinatura duplicada enquanto existir contrato pago/pendente
  conflitante em qualquer gateway. Cortesia e gratuito permanecem fluxos proprios.
- Nao reutilizar token/cartao/ID de cliente MP no Stripe. Retokenizacao ou migracao
  gerenciada exigem fluxo e autorizacao separados.

### 2. Payment Element e retomada de checkout

- Usar Stripe Payment Element incorporado na tela existente, nao Checkout
  hospedado como substituicao da escolha do usuario. Autenticacao do banco/3DS
  pode exigir desafio ou retorno; isso nao muda a origem do checkout.
- PAN/CVV pertencem exclusivamente aos campos hospedados pelo Stripe. Nunca
  trafegam por API, logs, analytics, banco ou storage da Lectum. Client secret
  somente ao titular da tentativa, sem persistencia no browser ou logs. Nao
  construir URLs com o segredo; se o SDK o incluir no callback de autenticacao,
  remover parametros sensiveis antes de telemetria e impedir logging da query.
- Campos de produto usam React Hook Form, Zod, hooks/controllers da TASK-02;
  campos de cartao usam Elements, sem controller paralelo que capture PAN/CVV.
- Criar tentativa duravel, idempotente e retomavel, vinculada a usuario, oferta,
  gateway, conta e modo. Duplo clique, reload, timeout, retry e 3DS retomam a mesma
  operacao; resposta ambigua nao autoriza gerar outra cobranca.
- Preco vem do backend/catalogo verificado; cliente nao decide valor, moeda,
  recorrencia ou Price. Mudanca concorrente exige cotacao/consentimento coerente,
  sem cobrar valor novo silenciosamente.
- Sucesso do SDK, redirect ou clique nao concede beneficios. Backend verifica
  pagamento/assinatura e persiste estado normalizado; UI pode exibir pendente ate
  conciliacao. Preservar verificacao profissional e demais gates de onboarding.

### 3. Inbox, replay e consistencia

- Validar assinatura Stripe no corpo bruto limitado, antes de confiar no JSON;
  secret/destino/conta/modo/API version precisam corresponder ao ambiente.
- Persistir inbox antes de confirmar recebimento, deduplicada por gateway,
  conta, modo e evento. Guardar apenas evidencia necessaria, com acesso restrito;
  nao expor payload, dados pessoais ou segredos em logs/respostas.
- Processar com leases, tentativas limitadas por lote, backoff e estado de revisao
  operacional. Permitir replay idempotente e conciliacao retomavel sem fabricar
  webhook, simular aprovacao ou repetir cobranca.
- Eventos atrasados/duplicados/fora de ordem nao reativam cancelamento nem
  prorrogam periodo indevidamente. Consultar estado remoto quando necessario e
  comparar revisao/estado na gravacao concorrente.
- Separar pagamento, assinatura, entitlement e nota fiscal. Reembolso/chargeback
  exige tratamento explicito; nao cancelar nota fiscal automaticamente.

### 4. Catalogo e valor contratado

- Manter `subscription_plan` como identidade/beneficios. Introduzir oferta/preco
  versionado, imutavel e isolado por gateway/conta/modo; modelo e nomes finais
  serao detalhados antes da migration. Preco inicial: `2990`, `BRL`, `month`.
- Cada nova assinatura salva a referencia/Price e snapshot do valor, moeda e
  intervalo efetivamente contratados. Nao sobrescrever `gateway_plan_id` MP com
  Price Stripe; nao preencher contratos legados pelo preco atual sem evidencia.
- Campo de novas vendas separado de `subscription_plan.active`: o campo atual
  participa do entitlement e nao pode ser usado para pausar somente checkouts.
- Consultas de assinatura, historico, financeiro/MRR e Admin distinguem preco
  vigente da oferta de valor contratado. Historico de catalogo nao e prova de
  preco efetivamente cobrado a cada assinante.
- Preco novo significa novo Price/versao. Nenhuma atualizacao automatica de
  subscription items existentes, prorrata, reajuste em massa ou migracao MP.
- Fundacao de recebimentos Stripe independente de SendNF: fatos canonicos deduplicados
  e cobertura/varredura retomavel por contrato, sem payload/PII ou inferencias de preco
  e datas. Refund/dispute inicialmente como estado observado, sem fabricar movimentos
  historicos. Metricas continuam indisponiveis quando a cobertura nao sustenta o total.
  Migration expansiva/CLI dry-run e automacao desligada, conforme ADR-0687.

### 5. Ciclo de vida, cortesia e Admin

- Preservar cancelamento da recorrencia separado do fim do periodo pago;
  encerramento imediato administrativo continua explicito, confirmado e auditado.
- Tornar as regras existentes provider-aware: fonte Stripe nao pode perder
  periodo pago por condicionais que hoje aceitam apenas MP.
- Cortesia continua sem cobranca/nota por concessao; bloquear concessao enquanto
  houver cobranca externa conflitante. Preservar gratuito, vigencia e revogacao.
  Renovacao paga futura exige consentimento explicito, data confirmada pelo servidor
  e SetupIntent verificado; sucesso do setup nao significa primeiro pagamento.
- Fechar politica de cartoes antes do checkout: `card` Stripe tambem pode representar
  debito/pre-pago. Em 09/11 o usuario decidiu **somente credito**. Nao habilitar
  Pix, boleto, Link ou outros meios sem decisao de produto.
- Nesta task, adaptar leituras/acoes administrativas necessarias ao novo gateway
  e estabelecer a fundacao de preco contratado; nao criar CRUD comercial amplo.
- **Editor de preco: etapa subsequente**, reutilizando `/configuracoes/assinatura`.
  Publicar preco apenas para novas adesoes, com motivo, confirmacao, revisao/CAS,
  idempotencia e `admin_activity_log`. Pausa de vendas independente de beneficios.
  A falha externa mantem oferta anterior; assinantes existentes permanecem intactos.
  Esse editor nao e gate para o primeiro checkout Stripe a R$ 29,90 e nao e
  declarado implementado por esta especificacao.

### 6. SendNF provider-aware

- Remover dependencias conceituais exclusivas de MP sem enfraquecer isolamento:
  lookup do pagamento/assinatura pelo gateway salvo, referencia fiscal canonica
  por gateway/conta/modo/recebimento e compatibilidade com referencias MP antigas.
- Definir antes do codigo qual recebimento Stripe e canonico e sua relacao exata
  com invoice, pagamento e assinatura; eventos relacionados nao geram notas duplas.
- Faturar somente recebimento real elegivel, BRL, positivo, confirmado, apos corte,
  sem estorno, com tomador/CPF/nome fiscal/email/endereco completos. Nao emitir por
  resumo, sucesso do SDK, cortesia ou invoice sem recebimento elegivel.
- Preservar snapshots, leases, piloto, gates de emissao/auto, servico/ISS
  confirmados, autorizacao/PDF/email e separacao entre recibo Stripe e NFS-e.
- Homologacao deve aceitar **somente sandbox Stripe + SendNF test**, pelo gate
  explicito de origem, runtime e DB. O gate foi implementado nesta task e coberto
  localmente; isso nao comprova configuracao/emissao remota. Nao enganar NODE_ENV,
  BASE ou nome do banco para liberar.
- Producao exige Stripe live + SendNF live e piloto autorizado. Nao ativar emissao
  automaticamente ao ligar cobranca nem reutilizar nota/pagamento antigo cancelado.
- Planejar diagnostico e reconciliacao fiscais provider-aware; dry-run por padrao,
  escopo limitado e confirmacao de ambiente para alteracoes. Nao apresentar novos
  comandos como existentes antes de implementa-los.

## Complemento de isolamento fiscal live por gateway — 10/11/2026

- [x] Preservar MP/SendNF live automatico existente e bloquear novas emissoes
  Stripe live por padrao, independentemente das flags fiscais globais herdadas.
- [x] Stripe live exige autorizacao propria de emissao e auto/piloto; configuracao
  nova ausente/invalida bloqueia apenas Stripe, sem invalidar MP. Captura/historico
  e GET de documentos existentes permanecem disponiveis. Nenhum POST nesta etapa.
- [x] Validar politicas locais e adiamento duravel em PostgreSQL isolado, sem
  gateway externo, migration, alteracao de producao ou Radar SetupIntents.

Observacao produtiva comunicada pelo orquestrador: SendNF live, emissao, automacao
e confirmacao fiscal globais ja estavam true para o fluxo MP. Nao sobrescrever
esses controles com defaults de QA. O usuario confirmou vigencia de010501/ISS2,01%
e reutilizacao da descricao fiscal exata anterior (presente no backend publicado,
nao copiada para docs/logs). Pendencia contabil anterior esta resolvida; ainda
faltam provisionamento local seguro dessa descricao e teste fiscal autorizado.

Env novas propostas backend-only, opcionais e inativas por padrao:
SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED=false, SENDNF_STRIPE_LIVE_AUTO_ENABLED=false e
SENDNF_STRIPE_LIVE_PAYMENT_ID vazio. Primeiro publicar guard conservador; ativacao
posterior apenas por autorizacao, inventario e piloto proprio Stripe. Reverter
binario para versao sem guard exige conter antes os fluxos Stripe; nao desligar MP
nem regredir banco. O suporte confirmou simulationnever disponivel em test, mas
esse parametro fica para etapa separada; nenhuma emissao foi autorizada aqui.

Validacao focal:29 testes de politica/contrato e2 testes PostgreSQL reais passaram
sem skips. O helper utilizado pelo worker adia criacao Stripe para awaiting_activation,
preserva snapshot/referencia, libera lease e nao altera MP/documento ja existente.
A prova e local de guard/persistencia, nao E2E de emissao. Nenhum provider foi chamado.

## Apps, desenho e dependencias

- Backend: factory, operacoes duraveis, inbox/conciliacao, catalogo/contratos e fiscal.
- Frontend: Payment Element e estado retomavel nas telas existentes. Admin:
  compatibilidade de leitura/cancelamento/cortesia; editor comercial em etapa posterior.
- Video nao recebe alteracao funcional por esta integracao. Apps/lockfiles separados.
- Mobile-first (~390px, validacao tambem em 320/1440px). Consultar
  [PROTO-INVENTORY](PROTO-INVENTORY.md), Builder/Quick Copy quando acessivel e
  imagens locais de Finalizar Assinatura, Alterar cartao e Configuracoes Admin.
  Registrar indisponibilidade do Builder quando ocorrer; nao inventar aprovacao visual.
- Packages instalados separadamente nesta implementacao parcial: `stripe@23.1.0` no backend;
  `@stripe/react-stripe-js@7.0.1` e `@stripe/stripe-js@10.2.1` no frontend.
  Metadados/peer dependencies verificados; ver [PACKAGES](PACKAGES.md). Isso nao
  comprova build, runtime, E2E ou seguranca da integracao.

## Rollout e reversao a definir antes da implementacao

1. Formalizar contratos HTTP, estado de checkout/inbox e matriz de envs/segredos
   por app, com defaults inativos e verificacao de conta/modo/Price/API version.
2. Expandir schema sem editar migrations aplicadas; executar `db:migrate` em DB
   local isolado. Backfill somente comprovavel, retomavel e separado de cobrancas.
3. Provisionar sandbox e validar E2E real; contratos toleram apps em versoes
   distintas. Depois publicar backend expansivo, frontend e Admin afetados.
4. Cutover de novas adesoes somente apos gates e autorizacao. Homologacao fiscal
   usa modo test verdadeiro; producao usa chaves/objetos/webhooks live separados.
5. Rollback pausa novas adesoes Stripe, preserva inbox/ledger/contratos e operacoes
   legadas. Nao apagar dados nem habilitar fallback de cobranca MP automaticamente.

Variaveis novas devem ser opcionais/inativas no primeiro deploy. Se algum segredo
se tornar obrigatorio, emitir ALERTA DE DEPLOY com nome, app, ordem e impacto,
sem valor, antes de commit/push. Publicacao segue LOCAL-TO-PRODUCTION e autorizacao
separada; configuracao remota ja observada nao autoriza cobranca de validacao.

## Criterios de aceite da implementacao - evidencia por criterio

### Cobertura tecnica ja demonstrada

- [x] Contratos, matriz de configuracao e migrations expansivas revisados: defaults inativos, escopo conta/modo/runtime, quatro migrations locais aplicadas e checksums preservados; nao comprova deploy remoto.
- [x] Factory usa Stripe em novas adesoes configuradas, preserva MP legado e nao faz fallback de cobranca: revisao independente, testes de provider/contrato e PostgreSQL; cliente MP antigo falha fechado antes de mutacao apos cutover.
- [x] Payment Element incorporado e campos de produto seguem a fundacao existente: browser local autenticado com campos Stripe reais; PAN/CVV fora da API Lectum e segredo de confirmacao transitorio.
- [x] Tentativa idempotente/retomavel demonstrada em concorrencia PostgreSQL, reload/recusa/3DS no browser e perda real de resposta de criacao da assinatura antes de salvar o ID; recuperacao da mesma operacao por GET, sem nova cobranca. Variantes nao executadas ficam explicitadas abaixo.
- [x] Beneficios dependem de evidencia persistida no backend, nao do SDK/redirect: sucesso, recusa, renovacao paga/recusada e cancelamento conferidos contra banco e provider reais de teste.
  - [x] Gate temporal canonico exige invoice/alocacao validas e nao futuras, sem ordenar fatos independentes; regressao com faturas sandbox existentes por GET.
- [x] Catalogos/contas/modos isolados; valor inicial real BRL 2990 mensal conferido.
- [x] Snapshot por assinatura preserva valor contratado e separacao de legados: testes Finance/history/analytics e PostgreSQL, ledger real com apply/reapply sem duplicacao; metricas sem cobertura permanecem indisponiveis, sem inferir fatos de preco vigente.
- [x] Integracao SendNF provider-aware implementada e validada localmente: origem/conta/modo, referencia MP preservada, invoice Stripe canonica, dedup/lease/snapshot no PostgreSQL. Emissao externa sem duplicacao permanece no gate fiscal abaixo.
- [x] Homolog test e producao live possuem gates de codigo verdadeiros, validados localmente com casos permitidos/negados, sem falsificar env/DB; nao e validacao de ambiente publicado.
- [x] Chaves/runtime e encaminhamento local de webhook sandbox autorizados/configurados sem exposicao de valores (nao e webhook publicado).
- [x] Radar sandbox bloqueia debito/pre-pago antes da primeira cobranca; credito aprovado em API real.
- [x] PostgreSQL real isolado cobre leases, CAS, rollback, idempotencia e compatibilidade legada: suites opt-in executadas separadamente, incluindo cancelamento, manutencao sem catalogo, fiscal, ledger e correlacao de setup.
- [x] `pnpm --dir backend db:migrate`, checks/builds dos apps afetados e `pnpm check` aprovados na revisao de 10/11; backend1307pass/12opt-in skips, opt-in relevantes executados separadamente. Video nao alterado:16 skips conhecidos por drawtext ausente, sem alegar render real.
- [x] Auditorias de dependencias aprovadas: `--prod` sem advisories conhecidos nos cinco escopos e testes dos transitivos; nao e garantia contra vulnerabilidades futuras.

### Fechamento tecnico delimitado, sem repetir os subcenarios aprovados

- [x] Revisao final de logs/PII/segredos aprovada apos endurecimento residual do sanitizador:14 testes focais de politica/HTTP local e revisao independente sem novo P1/P2 no escopo.
  - [x] Revisao independente anterior de client_secret/webhook e testes focais aprovados, incluindo excecao restrita a resposta autenticada de confirmacao.
  - [x] Mascaramento de valores Stripe/SendNF em campos genericos, listas e URLs retestado, preservando somente a excecao autorizada; midia assinada nao libera credenciais de billing. Sem evidencia de exposicao conhecida.
- [x] Inbox assinada, duravel, deduplicada; replay/conciliacao e ordenacao validados nos cenarios delimitados abaixo, sem prometer toda combinacao possivel.
  - [x] Entrega genuina/repeticao assinada deduplicada, corpo alterado recusado, persistencia antes de ACK e backoff sem inventar contrato; worker real repetido sem novas escritas Stripe, cobrancas ou alteracao de snapshots.
  - [x] Rodada de dunning:30 eventos de assinatura/invoice e2 setups vinculados conciliados;3 setups autonomos mantidos pending com diagnostico fechado, sem falso complete.
  - [x] PostgreSQL real: lease abandonada/expirada, ACK antigo recusado, backoff persistido, retomada e duplicata terminal sem reabertura. CLI unitario de requeue com dry-run/CAS/auditoria e tentativas preservadas, concorrencia real com um vencedor; sem provider.
  - [x] Evento deleted genuino entregue duas vezes antes do updated antigo; quatroHTTP200/15GETs/zero escritas Stripe dos workers, sem reativacao/duplicacao ou mudanca de pins/periodo pago. Tres setups autonomos naturalmente devidos ficaram pending/unresolved na tentativa2, sem atribuicao/beneficio; politica/PG de limite complementam a prova, sem alegar espera E2E ate10.
- [x] Pausa de novas vendas preserva manutencao/beneficios; cancelamento, gratuito e regras locais de concessao/revogacao de cortesia preservados. Renovacao externa da cortesia fica no gate separado abaixo.
  - [x] Manutencao sem oferta/Price de novas vendas, locks de gratuito/cortesia e compatibilidade MP/Stripe validados localmente; cancelamento real e corrida pagamento/cancelamento preservam periodo pago sem reabrir encerramento administrativo.
- [x] E2E Stripe sandbox real cobre sucesso, 3DS, recusa, recuperacao, renovacao e cancelamento nos cenarios definidos abaixo; cortesia e fiscal nao estao incluidos nessa conclusao.
  - [x] Checkout pago real com banco local: operacao duravel, pagamento de teste, beneficio, replay sem contrato/cobranca duplicados.
  - [x] Browser autenticado: recusa sem beneficio, reload da mesma operacao e desafio 3DS concluido com retorno ao onboarding pago.
  - [x] Webhooks genuinos assinados do contrato local recebidos e conciliados; ativacao inicial foi confirmada pelo servico, nao atribuida ao webhook.
  - [x] Cancelamento real no sandbox pelo servico preserva periodo pago; recorrencia de teste encerrada sem nova cobranca.
  - [x] Renovacao mensal paga e primeira recusa em clock retroativo sandbox, com projecao real no banco e conciliacao assinada.
  - [x] Resposta perdida real: processo interrompido apos Stripe criar, antes de gravar referencias; recuperacao GET da mesma operacao/contrato sem cobranca duplicada.
  - [x] Dunning real: troca de cartao no mesmo contrato, retry automatico recuperado e esgotamento com cancelamento payment_failed sem beneficio indevido.
  - [x] Customer/setup: crash real no2xx antes do callback/pin, espera real de lease e GET do unico recurso. POST replay de assinatura apos corteTCP antesTLS preservou operacao/chave/corpo;1assinatura/1capturaTESTE2990. Cleanup confirmou assinatura e SetupIntent cancelados, historico mantido. Nao foi induzido atraso de indice apos create commitado.
- [x] Browser local mobile/desktop e retorno autenticado validados tecnicamente; aprovacao visual do usuario permanece requisito de futura publicacao.
  - [x] Payment Element/recusa/reload/3DS reais e layout320/390/1440px sem overflow; prototipos locais consultados, indisponibilidade de Builder registrada.
  - [x] Retorno historico sem vigencia foi para Minha assinatura/Plano Gratuito, sem onboarding pago ou nova tentativa; checkout vazio em320/390/1440px, SDK test BRL2990, zero inputs de cartao fora do iframe. Autenticacao temporaria da fixture restaurada; nao comprova signup/email/CFP nem Safari/iPhone fisico. Aprovacao visual solicitada, nao presumida.
- [x] [Runbook operacional](STRIPE-OPERATIONS.md), monitoramento, rollout/rollback e limites do piloto definidos; comandos compilados e flags separados, nenhuma allowlist de usuario prometida, publicacao/piloto live continuam dependentes de autorizacao separada e demais gates.

- [x] Complemento local de diagnostico SendNF: distinguir readiness cadastral da
  observacao historica `government_test_transmission`, com estados/codigos seguros,
  fallback desconhecido e nenhuma habilitacao/emissao. Contrato oficial revisado
  em10/11 passou a documentar esse campo e a opcao `simulation: "never"`;
  esta ultima sera apenas registrada, nao enviada nem ativada nesta etapa.

### Dependencias externas e autorizacoes separadas

- [ ] Politica somente credito cobre setup/cortesia, recuperacao e renovacao no E2E completo.
  - [x] Credito/debito/pre-pago na primeira cobranca e guard server-side de setup exercitados com provider real; screening das renovacoes conferido no painel, sem declarar E2E de todos os fundings.
  - [ ] Suporte Stripe ainda nao confirmou ausencia de custo Radar/SetupIntents (protocolo18652759); opcao continua desligada. Atribuicao automatica de cartao pelo trial impede considerar o guard local suficiente. Ativacao e prova de cortesia dependem dessa decisao, nao de repetir checkout pago.
- [ ] E2E fiscal test real cobre corte, tomador, duplicidade, autorizacao e PDF/email quando suportado.
  - [x] Politicas fiscais locais e repositorio PostgreSQL isolado cobrem corte, escopo conta/modo, dedup/lease e snapshot; nao equivalem a emissao externa.
  - [x] Painel SendNF inspecionado em Teste: empresa/checklist/chaves/aprovacoes existentes, sem alterar cadastro ou emitir; nota historica simulada identificada e excluida da prova fiscal.
  - [x] Chave SendNF test restrita a Lectum criada com autorizacao e instalada somente em arquivo local ignorado/0600; identidade/escopo/readiness/cadastro/aprovacao da empresa verificados por GET, politica da chave conferida no painel, chaves anteriores preservadas.
  - [x] Suporte esclareceu CNCtest ausente sem regularizacao Lectum; GET historico confirmou simulationtrue sob authorized. Classificador/worker/PDF conservadores e rotulos locais corrigidos, IDs preservados. Nao equivale a emissao/entrega fiscal.
  - [x] Usuario reconfirmou vigencia de010501/ISS2,01% e reutilizacao da descricao fiscal exata anterior; configuracao publicada existente foi conferida em leitura pelo orquestrador, sem copiar valores sensiveis. Nao requer novo cadastro/certificado/rota.
  - [ ] Provisionar descricao fiscal local com seguranca, definir corte/lote/destinatario controlados e autorizar preview/emissao test. Segundo complemento do suporte, a tentativa governamental test ocorre, mas o CNC ausente impede a autorizacao e origina fallback simulado. Separar transmissao tentada, documento simulado e autorizacao do governo, sem usar live como atalho. Consulta de nota governamental existente depende de autorizacao separada antes do piloto.

Itens somente sao marcados com evidencia executada. Provas parciais de API sandbox
abaixo nao equivalem ao E2E completo, publicacao ou piloto live. Nao usar mocks
para concluir a task nem expor dados sensiveis nas evidencias.


## Evidencia parcial em 09/11/2026 e bloqueios

- Implementados parcialmente: adapter/factory Stripe, operacoes duraveis, inbox,
  APIs aditivas e Payment Element. Isso nao comprova o fluxo integrado nem conclui
  os criterios de aceite; acoplamentos legados/fiscal/Admin ainda precisam revisao.
- Migration expansiva `20261109204337_stripe_billing_foundation` aplicada via
  `pnpm --dir backend db:migrate` apenas em PostgreSQL 18.6 local isolado, seguida
  de Prisma generate. Nenhum reset, seed destrutivo ou banco publicado foi usado.
  Inclui snapshots opcionais de contrato, ofertas/precos, clientes, operacoes,
  inbox, escopo de metodos de pagamento e campos fiscais aditivos; sem backfill
  especulativo. Indices parciais impedem operacoes abertas concorrentes equivalentes.
- Runtime local de validacao: Node 24.22.1 oficial com SHA-256 conferido e pnpm
  10.33.0 em `/tmp`, sem modificar Node global. Runner isolado suprime envs reais,
  aponta apenas ao banco local e deixa emissores/agendadores desligados.
- Correcao do diagnostico sandbox: `charges_enabled=false` e `card_payments=inactive`
  nao impedem necessariamente pagamentos simulados. O bloqueio anterior do nosso
  adapter era excessivo. Em 09/11 a API aprovou PaymentIntent de teste de BRL 2990
  com `livemode=false`, sem KYC real, novo sandbox ou alteracao da conta live.
  O painel continua exibindo pendencias em dados de teste; isso nao e prova de que
  o usuario precise informar documentos pessoais para executar estes testes.
  Preflight live continua exigindo charges/card ativos; test preserva verificacoes
  de chave, conta, modo, runtime e banco e deixa a API determinar disponibilidade.
- Chave limitada: Accounts/Charges and Refunds/Events/Invoices leitura;
  Customers/Payment Intents/Payment Methods/Products/Setup Intents/Prices/
  Subscriptions escrita. Sem payouts, transfers ou Connect. Permissoes de
  InvoicePayments foi validado por leitura real de invoice/PaymentIntent/Charge pagos
  em teste. Disputas, estornos e todos os cenarios fiscais ainda precisam de E2E.
- Faltam webhook local real e seu segredo, E2E sandbox, politica credit/debit,
  revisao final das adaptacoes legadas/fiscais, projecoes financeiras completas,
  validacao do bootstrap da oferta, browser e runbook completo. Nenhum mock substitui essas provas.
- Builder/Quick Copy indisponivel neste ambiente; frontend consultou os prototipos
  locais de assinatura e alteracao de cartao. Aprovacao visual ainda pendente.
- Checks focais e status completo serao registrados ao terminar a estabilizacao.
  Sem bump/commit/push/deploy enquanto a task nao estiver validada.

## ALERTA DE DEPLOY — ativacao futura, nao autorizada nesta etapa

Backend: `BILLING_CHECKOUT_GATEWAY` tem default seguro `disabled`; novas adesoes
ficam indisponiveis sem configuracao explicita. Para habilitar Stripe, provisionar
`STRIPE_ENV`, `STRIPE_ACCOUNT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
e `STRIPE_WEBHOOK_SECRET` correspondentes ao ambiente, antes de ativar a oferta.
`BILLING_STRIPE_RECONCILIATION_ENABLED` inicia desligado. A flag opcional
`BILLING_STRIPE_LEDGER_ENABLED=false` tambem inicia desligada; depende do reconciliador
e da migration financeira, nao ativa SendNF/cobrancas. Antes de habilitar, inspecionar
fila/cobertura e executar backfill limitado autorizado. Publicar expansao backend,
configurar/verificar webhook e reconciliacao, publicar frontend e apenas depois
ativar novas vendas com autorizacao. Falta ou divergencia deve bloquear checkout,
nao redirecionar cobrancas para MP. Nao ativar SendNF automaticamente.

### Validacoes parciais e revisao de codigo

- Backend: Biome, dependencias de runtime, TypeScript e build aprovados. Suite
  completa: 1227 testes, 1220 aprovados, 4 falhas e 3 skips no runner isolado.
  As quatro falhas em `runtime-config`, `local-database-safety` e `seed/safety`
  reproduzem no HEAD anterior, sob o mesmo `NODE_ENV=test`: casos que passam
  `undefined` recebem o default global. Nao foram contornadas nem declaradas aprovadas.
- PostgreSQL real: teste isolado de concorrencia/reservas/leases/CAS/customer/inbox
  passou, com limpeza somente das fixtures criadas pelo teste. Esse teste nao
  substitui Stripe real nem comprova recuperacao financeira apos resposta perdida.
- Frontend: Biome, ESLint e TypeScript aprovados; 28 testes focais Stripe/MP/mensagens
  aprovados. Suite principal: 700 testes, 691 aprovados, 8 falhas e 1 skip.
  As mesmas oito falhas de preview/interacao/comunidade reproduziram em arquivo
  temporario do HEAD anterior, sem alterar os fontes da branch.
- Build frontend aprovado em execucao limpa com `NODE_ENV=production`, sem patches
  ou minificacao desabilitada. Tentativas anteriores reutilizando cache geraram
  erro de minificacao de CSS; diagnostico temporario fora do repo revelou a causa
  escondida pelo Next e o cache gerado foi movido para `/tmp`, preservado. Tanto
  baseline quanto alteracao passaram sem esse cache. Browser/E2E seguem pendentes.
- Checks de env examples, tasks, ADRs, source-size, source-safety, segredos e
  `git diff --check` aprovados. `pnpm check` integral ainda nao aprovado.
- Revisao independente identificou e corrigiu isolamento live/local/homolog e
  cancelamento que indevidamente exigia ultima fatura paga. Guard de criacao MP
  passou a exigir selecao explicita desse gateway antes de qualquer mutacao.
- Bloqueios conhecidos antes de liberar checkout: recuperacao de customer,
  subscription e setup com resposta perdida/crash antes de salvar ID remoto;
  esses caminhos receberam recuperacao por metadata e replay limitado da mesma
  chave/corpo, com fingerprint e estado terminal monotono. Testes focais/PG nao
  substituem injecao de falha completa no E2E; nao declarar esse gate concluido.
- Cortesia futura exige comprovar/atribuir default payment method apos SetupIntent;
  nao assumir que sucesso do setup tem a semantica de pagamento de invoice.


### Continuacao tecnica do sandbox existente — 09/11/2026

- API Stripe real de teste (sem mocks): PaymentIntent aprovado; assinatura criada
  `incomplete`, repeticao idempotente devolveu o mesmo contrato, confirmacao com
  PaymentMethod oficial de teste passou para `active`, com fatura/recebimento
  verificados pelo adapter. Valores de segredos, cartao e identificadores operacionais
  nao entram nesta evidencia.
- Cortesia futura: trial + SetupIntent confirmado; default payment method atribuido
  com verificacao e replay seguro. Estado canonico permaneceu sem beneficio pago e
  sem recebimento. Troca de cartao com SetupIntent tambem passou sem cobranca.
- Recusa `insufficient_funds` e estado `requires_action` de autenticacao foram
  produzidos com metodos oficiais de teste. Nenhum deles concedeu beneficio pago.
  Desafio 3DS no navegador ainda nao foi concluido, portanto nao e E2E aprovado.
- O teste revelou outra incompatibilidade real: cancelar `incomplete` pode retornar
  `incomplete_expired`, nao somente `canceled`. Adapter corrigido para aceitar ambos
  como terminais, preservando verificacoes de ID/modo. Leitura posterior confirmou
  as quatro assinaturas criadas nestas provas encerradas (duas `canceled`, duas
  `incomplete_expired`); nenhuma recorrencia de teste ficou ativa.
- Search do Stripe e eventualmente consistente: buscas imediatas de customer/sub
  retornaram vazio, e leitura posterior encontrou as referencias exatas. Vazio nao
  autoriza criar nova chave. Recuperacao de contrato terminal retorna sem secret.
- Nova migration expansiva `20261109213330_stripe_request_fingerprint` aplicada
  via `db:migrate` no PostgreSQL local isolado, com Prisma generate. Campos opcionais
  guardam somente digest do pedido canonico. Linhas antigas ambiguas sem fingerprint
  fazem apenas leitura/conciliacao; nao recebem prova retroativa de replay.
- SendNF: implementada selecao por gateway/conta/modo, invoice Stripe `in_` canonica,
  deduplicacao e snapshots separados; referencia MP preservada byte a byte. Gates
  test local/homolog e live permanecem explicitos. 41 testes fiscais puros e um
  teste PostgreSQL real de concorrencia/isolamento passaram. Isso nao comprova
  emissao, autorizacao, PDF ou email SendNF; nenhuma nota foi emitida.
- Operador de oferta adicionado com dry-run, Price remoto existente validado,
  versao imutavel, revisao/CAS e auditoria administrativa. Nao foi executado para
  habilitar vendas. Checkout nao modifica catalogo nem contratos anteriores.
- Webhook: consulta ao Workbench confirmou nenhum destino configurado no sandbox;
  `STRIPE_WEBHOOK_SECRET` local ainda ausente. CLI local nao foi encontrada no PATH.
  Proxima prova exige encaminhamento autentico de eventos ao backend local, sem
  criar outro sandbox e sem substituir webhook por assinatura/evento fabricado.
- Rollout fiscal obrigatoriamente em duas etapas: manter novas vendas Stripe e
  reconciliador desabilitados enquanto houver workers antigos. Estes nao conhecem
  jobs Stripe e poderiam consumi-los como recurso invalido. Somente apos verificar
  substituicao de todos os workers, habilitar inbox/queue e depois vendas. Rollback
  para worker antigo exige parar a producao de jobs Stripe antes, sem apagar filas.
- Troca futura da conta Stripe exige estrategia de acesso aos recibos anteriores:
  history/PDF sao isolados pela conta configurada; nao reinterpretar recibo antigo
  com credenciais novas. Nenhuma migracao automatica de conta e feita.
- Fontes: [testes oficiais](https://docs.stripe.com/testing),
  [sandbox e dados placeholder](https://docs.stripe.com/sandboxes/dashboard/sandbox-settings).
- Sem nova env obrigatoria, chaves live, sandbox novo, dados publicados alterados,
  cobranca real, bump, commit, push ou deploy nesta continuacao.


### Fechamento parcial de validacao nesta continuacao

- Backend completo: 1255 testes, 1250 aprovados, zero falhas e cinco testes
  opt-in ignorados; Biome/runtime-deps/Prisma/TypeScript aprovados. Build aprovado.
  As quatro falhas anteriores expuseram fallback indevido de `undefined` explicito
  para NODE_ENV global. Corrigido o helper compartilhado: chamada sem argumento
  preserva default do processo; entrada explicitamente ausente falha fechada.
  Casos de teste cobrem ambos, sem enfraquecer os guards de banco/seed.
- Tres testes PostgreSQL opt-in executados em serie e aprovados: reservas/leases/
  fingerprints/oferta/inbox; isolacao e dedupe fiscal; bloqueio concorrente de
  cortesia/exclusao. Nenhum reset e somente fixtures isoladas limpas.
- Prisma 7 pode encapsular serializacao SQLSTATE 40001 em P2010; retry reconhece
  somente esse codigo/envelope estruturado, nao mensagem crua ou erro SQL generico.
- Admin check e build aprovados. Root check passa gates estaticos e para nas mesmas
  oito falhas preexistentes do frontend (700 testes, 691 aprovados, oito falhas,
  um skip), ja reproduzidas no HEAD anterior; gate integral continua reprovado.
- Fonte/segredos/envs/tasks/ADRs/source-size/ciclos/diff-check aprovados. Env sandbox
  continua ignorado pelo Git e modo 0600. Nao houve bump/commit/push/deploy.
- Cortesia sem SetupIntent nativo permanece em revisao; requer fluxo dedicado e
  teste antes de liberar esse caso. Projecoes Finance/MRR fora das telas billing,
  E2E HTTP/browser, webhook real e emissao fiscal de teste seguem pendentes.

## Continuacao em 09/11: webhook local autentico e politica de credito

- Usuario confirmou **somente cartao de credito**; debito, pre-pago, funding
  desconhecido/ausente e outros meios nao foram autorizados. A opcao `card` do
  Stripe nao equivale a credito. Validacao server-side do funding foi adicionada
  antes de atribuicao de novo cartao para recorrencia/cortesia; leituras historicas,
  beneficios de pagamentos ja realizados e fiscal nao sao removidos por essa regra.
- Essa verificacao de atribuicao **nao comprova** bloqueio antes da primeira
  cobranca nem impede sozinha um cartao ja atribuido pelo provider ao trial.
  Barreira no provider, cobertura de renovacoes e testes reais de debito/pre-pago
  continuam gates de liberacao. Nao divulgar o checkout como credito-only validado
  apenas por uma label, filtro de frontend ou verificacao depois da cobranca.
- Usuario autorizou encaminhamento de webhook sandbox para localhost e gravacao
  do segredo no arquivo local ignorado. CLI oficial `1.55.9` obtido da release
  Stripe com SHA-256 conferido, instalado temporariamente fora do repositorio;
  nenhuma dependencia das quatro aplicacoes foi adicionada.
- O primeiro acesso foi negado por `stripecli_session_write`. Apos autorizacao
  especifica, foi adicionado somente **Debugging Tools: Write** a chave restrita
  existente. Painel confirmou as 11 permissoes anteriores inalteradas e total
  de 12 permissoes (4 read, 8 write). Nao houve troca por chave full access/live.
- Conta sandbox conferida por API antes da provisao. `STRIPE_WEBHOOK_SECRET`
  salvo em `backend/.env.stripe.local`, Git-ignore e modo `0600` verificados;
  listener confirmou o mesmo segredo. Nenhum valor foi registrado na documentacao.
- Backend real em PostgreSQL efemero/loopback: `/health` e `/ready` retornaram
  200. A modificacao de metadata de uma assinatura sandbox ja cancelada gerou
  evento Stripe autentico `customer.subscription.updated`, API
  `2026-10-28.endive`, recebido pelo endpoint real em 09/11 22:15 UTC. Nenhuma
  nova cobranca foi criada; assinatura permaneceu cancelada.
- Encaminhamento via CLI: primeira entrega **200**, repeticao dos mesmos bytes e
  assinatura **200**, apenas **uma** linha scoped na inbox; alteracao de um byte
  mantendo a assinatura retornou **400**. O observador HTTP local foi limitado
  a 256 KiB; payload/assinatura ficaram apenas em memoria, sem arquivo ou log.
- Conciliacao do evento sem contrato local correspondente manteve inbox pendente,
  incrementou tentativa, agendou backoff e liberou lease; nao inventou assinatura
  ou beneficio. Isso prova recepcao/deduplicacao e falha segura, **nao** o E2E
  financeiro completo, processamento de renovacao, 3DS/browser ou SendNF.
- Producao e homologacao remota permanecem intocadas. Listener local nao constitui
  webhook publicado. Ainda nao houve bump, commit, push ou deploy desta task.


### Radar sandbox e prova real de funding — 09/11, 22:23–22:26 UTC

- Apos autorizacao especifica, criada somente no sandbox existente a regra Block
  `is_missing(:card_funding:) OR :card_funding: != 'credit'`, Enabled em 100%.
  Desabilitada somente a Allow de listas padrao que poderia anteceder o bloqueio;
  Allow de 3DS ja estava desabilitada e permaneceu assim. Demais regras preservadas.
  Nenhuma configuracao live, plano pago ou credencial adicional foi alterada.
- API real: tres assinaturas `default_incomplete`, mesmo preco BRL 2990, metodos
  oficiais de teste distintos. Credito: `succeeded`, valor recebido 2990, contrato
  `active` e fatura verificada. Debito/pre-pago: HTTP 402, `requires_payment_method`,
  valor recebido zero, Charge nao pago/capturado, `blocked`,
  `network_status=not_sent_to_network` e correspondencia exata com a nova regra.
  Funding real de cada Charge conferido por GET; nao inferido apenas pelo nome
  do PaymentMethod de teste. As tres recorrencias foram encerradas.
- O painel do sandbox confirmou **Screening all renewals**; nenhum skip de ciclos
  precisou ser alterado. Isso comprova configuracao, nao substitui renovacao E2E.
  Ausente/desconhecido esta coberto pela expressao e guard local, mas nao houve
  fixture oficial executada desses fundings; nao afirmar teste remoto desses casos.
- SetupIntents: opcao **Use Radar on payment methods saved for future use** estava
  desligada. Painel informa tarifa por confirmacao; nao foi ativada nem contratado
  produto pago. Validar condicoes/custo e autorizacao antes de mudar esse ajuste.
- Prova real adicional sem cobranca: trial/SetupIntent com credito, debito e
  pre-pago. Todos os setups chegaram a `succeeded`; guard do adapter recusou
  debito/pre-pago com `card_credit_required`. GET posterior comprovou, porem, que
  o Stripe atribui o cartao ao trial assincronamente, mesmo apos a recusa local.
  Logo o guard local **nao** e barreira contra essa atribuicao automatica.
  Nao liberar cortesia/checkout como integralmente validados por esta prova.
  Nenhum trial teve recebimento e os tres foram cancelados ao terminar.
- Operacao com setup nao-credito concluido fica em revisao, sem nova chave ou
  cobranca automatica Lectum. A reconciliacao agora preserva o motivo fechado
  `card_credit_required`, em vez de apaga-lo com erro generico. Substituicao
  self-service desse SetupIntent imutavel exige resolucao controlada ainda pendente.
- Webhook local autentico continuou recebendo eventos dessas provas; a ausencia
  de contratos locais dos probes de adapter nao e tratada como E2E de beneficios.
  No total desta rodada, seis recorrencias criadas foram encerradas; zero cobrancas
  live. Evidencias locais contem somente campos selecionados; sem PAN/CVV/segredos.
- Fontes: [metodos oficiais de teste](https://docs.stripe.com/testing),
  [setup exige opt-in Radar](https://docs.stripe.com/radar/optimize-risk-factors#enable-radar-for-future-use),
  [politica de triagem das renovacoes](https://docs.stripe.com/radar/how-radar-works).

### Correcoes de consistencia e validacao local desta rodada

- Selecao de gratuito agora usa lock MVCC de perfil/transacao Serializable e
  verifica todas as operacoes abertas/contratos externos conflitantes. Nao cancela
  contrato remoto apenas no banco local; preserva pagamento e periodo legado.
- Finance/Admin inclui Stripe com snapshot contratado e escopo conta/modo. MRR
  conhecido nao usa preco mutavel do catalogo. Receita/LTV/series sem ledger
  Stripe completo sao explicitamente indisponiveis, inclusive grafico/CSV, nunca
  zero fabricado. Contratos MP mantem comportamento legado.
- Backend check final apos analytics: 1272 testes, 1265 pass, 7 opt-in skips, zero falhas;
  build aprovado. Integracoes PostgreSQL reais de Finance/locks/preservacao da
  recusa executadas separadamente e aprovadas. Admin check/build finais aprovados.
- Projecoes restantes de detalhe/lista/dashboard usam snapshot contratado Stripe;
  ID externo sozinho nao prova pagamento. Conversao historica/tempo ate primeiro
  pagamento sem timestamp comprovado ficam indisponiveis; historico sem snapshot
  fica desconhecido, sem inferir valor/data/gratuidade. 71 testes focais de
  Finance/analytics/history e uma integracao PostgreSQL ampliada passaram.
- `pnpm check` reexecutado apos esta rodada: gates estaticos passaram e as mesmas
  oito falhas frontend se repetiram (700 testes, 691 pass, 8 fail, 1 skip).
  Nao contornadas e nao atribuidas a Stripe sem evidencia.
- Listener CLI, observador HTTP e backend temporario encerrados ao concluir as
  provas; portas locais 3121/3122 livres. Banco isolado preservado, sem reset.
  Arquivo de credenciais/segredo continua ignorado e com modo 0600.
- Permanecem gates: browser local/autenticado, 3DS, renovacao e recuperacao E2E,
  SendNF test com requisitos externos, ledger/metricas nao implementadas e check
  integral (oito falhas frontend preexistentes registradas acima). Sem bump,
  commit, push, deploy ou liberacao de vendas.


### Verificacao condicional de custo Radar/SetupIntent — 09/11

- Usuario autorizou ativar **somente se nao houver custo real**, exclusivamente
  no sandbox existente. Painel foi revisitado sem alterar a opcao: continua Turn on,
  triagem de todas as renovacoes preservada, aviso generico de tarifa por tentativa.
- Fonte oficial especifica de Radar/SetupIntents descreve tarifa por confirmacao,
  inclusive setup de subscriptions com invoice sem pagamento, mas nao esclarece
  excecao de sandbox. Docs de sandbox provam isolamento/transacao simulada, nao
  isencao explicita dessa tarifa de servico. FAQ de Sigma/Data Pipeline nao foi
  extrapolada para Radar. Nao afirmar nem que existe cobranca no sandbox nem que
  a gratuidade esta confirmada com essas evidencias.
- Ativacao permanece pendente de confirmacao especifica. Solicitada autorizacao
  para perguntar ao suporte oficial, sem dados pessoais/credenciais. Nenhum chamado
  foi enviado, nenhuma configuracao alterada, nenhuma nova operacao financeira
  criada e nenhuma nova prova de cortesia declarada nesta verificacao.
- Fontes: [Radar para Setup Intents](https://support.stripe.com/questions/radar-for-setup-intents?locale=pt-BR),
  [ambientes de teste](https://docs.stripe.com/testing-use-cases),
  [testes Radar](https://docs.stripe.com/radar/testing).

- Consulta ao suporte autorizada posteriormente em 09/11. Portal oficial aberto
  autenticado no sandbox correto; a janela exige Start chat. Controles do iframe
  nao responderam aos mecanismos documentados de automacao, mesmo com nova leitura
  e recarga do atendimento. Solicitado ao usuario somente esse clique, sem sair
  do sandbox. **Pergunta ainda nao enviada; nenhuma resposta do suporte recebida.**
  Radar/SetupIntents continua desligado; script pos-ativacao foi apenas preparado
  fora do repo, sem executar chamadas ou afirmar validacao adicional de cortesia.

- Consulta efetivamente enviada ao assistente do portal oficial em 09/11 apos
  intervencao do usuario nos controles do iframe. O assistente confirmou o
  isolamento de configuracoes, mas **nao confirmou isencao da tarifa Radar para
  SetupIntents em sandbox**; explicitou a mesma lacuna na documentacao publica.
  Solicitado encaminhamento para especialista humano, sem autorizar contratacao
  ou alteracao live. Portal ofereceu apenas atendimento por e-mail, estimativa de
  24 horas; abertura do formulario ainda depende de clique manual no controle
  indisponivel a automacao. Isso nao e resposta humana nem chamado de e-mail
  confirmado. Opcao continua desligada; probe pos-ativacao nao executado.

### Continuacao independente da cortesia — 09/11

- Usuario autorizou avancar demais testes, mantendo Radar/SetupIntents desligado
  e producao intocada. Portal oficial exibiu `Email received` apos envio do pedido
  de especialista; chamado recebido nao significa isencao confirmada. Nao houve
  ativacao de Radar/SetupIntents nem execucao dos probes de cortesia condicionados.
- Correcoes do ambiente QA, sem relaxar testes/codigo: `NEXT_PUBLIC_API_URL` tinha
  `/api`, mas o contrato exige origin puro. Essa configuracao causava as oito
  falhas antes registradas como preexistentes. Removido somente o path no arquivo
  temporario fora do Git: 113 testes focais passaram e frontend check integral
  passou. O diagnostico anterior de bloqueio por regressao preexistente fica
  corrigido por esta reproducao controlada.
- Runner tambem definia paths FFmpeg como strings vazias; paths dos binarios
  locais existentes resolveram a falha de validacao Zod. Video check passou com
  100 testes e 16 skips por falta de `drawtext` no FFmpeg instalado. **Render real
  nao foi validado**, nenhum binario/package foi instalado e video nao foi alterado.
- Seis integracoes PostgreSQL opt-in reais passaram: reserva/lease/CAS/inbox,
  fiscal, lifecycle, select-free, Finance e cancelamento. Novo teste focal
  `backend/src/modules/billing/stripe/cancellation.integration.test.ts` verifica
  persistencia MP/Stripe, referencia incorreta, idempotencia e periodo pago
  preservado; e teste de repositorio, nao simulacao de resposta do provider.
  Backend check/build passaram: 1265 testes aprovados, 8 opt-in skips, zero falhas.
- Oferta configurada pelo operador real no banco descartavel, apontando ao Price
  sandbox verificado. Fixtures tecnicas locais isoladas, sem CRP nem aprovacao CFP,
  nao sao prova de cadastro/onboarding completo. O cadastro via UI ficou bloqueado
  corretamente porque esse banco nao possui documentos legais publicados; nenhum
  documento/aceite ficticio foi publicado para contornar o gate.
- Probe pago pelos servicos reais confirmou uma operacao/contrato, credito de teste
  BRL 2990, invoice canonica paga, beneficio persistido, cartao escopado, CFP ainda
  pendente e replay idempotente. Primeira assertion de webhook falhou por limite do
  harness (backlog de eventos anteriores de adapter sem vinculo local), nao por
  defeito demonstrado do worker. Evidencia original preservada. Retomada sem nova
  cobranca conciliou os cinco eventos proprios; recorrencia encerrada no finally.
- Browser local autenticado com segunda fixture: Payment Element real carregado
  em modo test/BRL 2990; validacao de formulario vazio; recusa oficial por saldo
  insuficiente resultou em uma operacao/contrato incompleto, zero recebimento,
  zero beneficio pago e zero nota. Reload retomou a mesma operacao. Segundo cartao
  oficial exigiu 3DS; durante `requires_action`, beneficio permaneceu ausente.
  Conclusao do desafio levou a `/app/profissional/assinatura/endereco`, sem query
  de segredo. Endereco/CFP nao foram preenchidos nem artificialmente aprovados.
- Layout verificado em 320/390/1440px, sem overflow horizontal, com fonte visual
  local `Finalizar Assinatura - Psicologo` e valor vigente autorizado R$29,90.
  Builder/Quick Copy nao estava disponivel nas ferramentas; componentes hospedados
  Stripe nao foram substituidos por formulario simulado. QA tecnica nao substitui
  aprovacao visual do usuario nem iPhone/Safari fisico.
- Auditorias `pnpm audit --prod`: raiz/video sem advisories; backend/frontend/admin
  possuem `follow-redirects` 1.16.1 (high), `glob` 13.0.6 e `minimatch` 10.2.5
  (moderate). Nao houve alteracao de dependencias nesta rodada. Correcao/revalidacao
  de seguranca permanece gate de publicacao, nao evidencia de exploracao.
- Conferencia final do browser no banco/provider: uma operacao concluida, um
  pagamento aprovado de teste entre duas tentativas (recusa + sucesso), zero nota.
  Cancelamento pelo servico marcou fim de periodo preservando exatamente o acesso
  ja pago; encerramento final da recorrencia nao gerou nova cobranca. Nove webhooks
  genuinos desse contrato foram conciliados e preservaram cancelamento/vigencia.
  As duas recorrencias criadas nesta continuacao foram encerradas.
- `pnpm check` final passou com env QA corrigidas, respeitando os 16 skips de render
  local mencionados acima e os opt-in de banco executados separadamente. Build
  frontend final passou, sem source maps publicados. Backend check/build passaram.
  Seguranca/auditoria continua gate independente: check verde nao elimina advisories.
- Backend, frontend dev, listener e relay temporarios encerrados ao terminar;
  portas 3120/3121/3122 livres. Banco descartavel e evidencias privadas preservados,
  sem reset. Nenhum processo de homologacao remota ou producao foi alterado.
- Permanecem pendentes: Radar/SetupIntent/cortesia, renovacao futura, E2E de resultado
  ambiguo, SendNF test com requisitos externos, ledger/metricas e auditoria limpa.
  Sem bump, commit, push, deploy, cobranca live ou emissao fiscal.

### Remediacao e ciclos de renovacao — continuacao em 09/11

- Dependencias corrigidas em manifests/locks separados de backend/frontend/admin:
  follow-redirects1.16.3; express-handlebars9.0.4 no backend; glob14.0.4 limitado aos
  dois plugins Sentry em Next, com minimatch11.0.5 transitivo. Sem atualizar Stripe,
  Sentry major ou impor minimatch major global. ADR/Packages registrados antes de
  instalar. Nove novos testes reais de HTTP loopback/filesystem/template passaram;
  `pnpm audit --prod` retornou zero advisories nos cinco escopos. Checks/builds de
  backend/frontend/admin passaram apos as correcoes.
- Gap de metricas confirmado: data da reserva Stripe nao prova atividade paga numa
  data historica. Finance, MRR diario e CSV agora respeitam indisponibilidade de
  historico sem ledger. Periodo pago/entitlement atuais e MP preservados. Oito
  testes focais e PostgreSQL Finance real ampliado passaram, alem de TS/Biome.
- Warning de consulta concorrente do pg foi isolado com uma unica leitura awaited
  de relacoes dentro de transacao local: Prisma7.9.1 paraleliza internamente filhos
  dos joins, repassados ao adapter-pg/pg8.21.0. Nao houve evidencia de novo paralelismo
  indevido nos repositorios Stripe. Nao suprimir o aviso nem modificar fluxo correto
  para esconder uma limitacao upstream; leitura e suites passaram.
- Test clock NOVO criado dentro do sandbox EXISTENTE pelo Workbench oficial,
  sem ampliar permissoes da chave restrita e sem criar outro sandbox. Datas
  simuladas 01/10 -> 01/11/2026, sempre anteriores ao relogio real do backend;
  avancar apenas o provider para o futuro nao seria prova de entitlement Lectum.
- Dois customers reais de teste associados ao clock como fixture tecnica explicita,
  sem fingir esse caminho como cadastro normal. Assinaturas e confirmacoes pelas
  APIs/servicos reais. Primeiro periodo de outubro ja vencido nao liberou beneficio.
  Na renovacao `subscription_cycle`: A recebeu BRL2990, ficou ativa e liberou o
  periodo ate dezembro; B recebeu zero, ficou past_due/inadimplente, sem beneficio.
  Cartao de falha era fixture oficial de credito; nao houve chamada explicita
  de criacao/confirmacao de SetupIntent pelo ensaio.
- Quinze eventos genuinos do ensaio de renovacao foram conciliados. Nao foi
  alegado que o webhook causou a primeira ativacao: a confirmacao pelo servico
  foi explicitamente chamada. Ambos contratos foram encerrados ao terminar,
  sem nova cobranca/prorrata/fatura e sem excluir clock/customer. Nenhum Radar
  SetupIntents, CFP, nota fiscal ou estado produtivo foi alterado.
- Correcao de evidencia: listener registrou tambem `setup_intent.succeeded`.
  GET real confirmou que pertence ao customer B e ao cartao de recusa; chave de
  idempotencia do evento corresponde a nossa atualizacao de default_payment_method.
  Portanto o Stripe gerou/concluiu um SetupIntent automaticamente nessa atualizacao,
  mesmo sem chamada explicita ao endpoint de setup. A afirmacao inicial ampla de
  "nenhum SetupIntent" foi retirada/corrigida, com trilha preservada. Isso nao e
  ativacao de Radar nem validacao de cortesia; o gate condicional continua aberto.
- Esse evento automatico nao possui metadata/operacao de setup vinculada no banco:
  permaneceu pending, attempts2, sem referencia de assinatura, enquanto os quinze
  eventos de assinatura/fatura foram conciliados. Nao afirmar conciliacao de todos
  os eventos da fixture. O worker limita retries e encaminha a review_required na
  decima tentativa; nao descartar/forcar complete para maquiar a evidencia. Tratar
  classificacao segura desse evento autonomo como pendencia operacional. UI confirmou
  novamente Radar/SetupIntents desligado apos a auditoria (botao Turn on).
- Limites do clock: nao prova transicao em tempo real de beneficio inicialmente
  ativo para expirado (o primeiro periodo ja era passado), nem esgotamento de
  retries, dunning UI ou recuperacao por troca de cartao. Esses gates nao foram
  marcados completos por uma unica primeira recusa.
- SendNF test continua requisito externo ausente: chave test, empresa, corte de
  pagamentos e descricao do servico; habilitacao/emissao/confirmacao fiscal seguem
  false. Usuario avisado, sem solicitar valores sensiveis no chat. Nenhuma API
  SendNF foi chamada. Inbox de eventos e notas fiscais nao substituem ledger;
  habilitar emissao depois nao faz backfill automatico de recebimentos anteriores.
- Ensaio de resposta perdida **sem provider simulado**: subprocesso ouviu apenas
  metadados de resposta 2xx do SDK real na criacao da assinatura e encerrou antes
  de o callback gravar referencias. Banco manteve operacao creating/fingerprint,
  Stripe tinha um contrato incomplete, sem cobranca. Apos 117 segundos reais de
  lease (sem alterar relogio/banco), recuperacao com `allowReplay:false` encontrou
  por GET exatamente o mesmo contrato/operacao, zero POST de nova criacao, zero
  cobranca e zero beneficio. Mesmo requestKey retomou a mesma operacao. Recorrencia
  encerrada e tres eventos genuinos posteriores conciliados sem reativacao.
  Nao declarar que esse ensaio executou o ramo POST replay, pois nao o executou.
- Check da raiz final passou, assim como checks/builds backend/frontend/admin.
  Backend: 1269 testes pass, 8 opt-in skips; integracoes reais opt-in relevantes
  executadas separadamente. Video manteve os 16 skips conhecidos de drawtext.
  O aviso pg/Prisma upstream nao foi ocultado. Criterios amplos ainda pendentes
  nao foram marcados completos por estes subcenarios.
- Restam cortesia/Radar SetupIntents, dunning completo, SendNF test/parametros
  externos, ledger/backfill e revisao final de rollout/seguranca/visual. Sem bump,
  commit, push ou deploy; versao permanece 0.1.799. Nenhuma cobranca live.
- Ao encerrar, backend/listener/relay locais parados e portas3121/3122 livres;
  tres contratos de teste desta rodada encerrados (dois do clock e um do crash).
  Nenhum reset/delete de banco, clock, customer ou recursos publicados.


### Fundacao financeira e retomada historica — 09/11 BRT (10/11 UTC)

- Migration expansiva `20261110003545_stripe_financial_receipts` aplicada por
  `pnpm --dir backend db:migrate`, seguida de generate, somente no PostgreSQL
  local isolado. Duas tabelas novas; nenhuma migration aplicada editada, reset,
  backfill remoto ou alteracao em producao.
- Ledger separado de SendNF implementado com escopo conta/modo/contrato/Price,
  InvoicePayment/PI/Charge canonicos, fatos imutaveis com hash, leases/CAS e
  cobertura por cutoff. CLI dry-run por padrao; automacao opcional desligada por
  `BILLING_STRIPE_LEDGER_ENABLED=false`. Requer reconciliacao principal e migracao
  aplicada antes de eventual habilitacao, sem emitir notas ou iniciar cobrancas.
- Prova real GET-only em tres contratos locais anteriores: dry-run confirmou duas
  invoices pagas de A, uma paga e uma nao paga de B e uma paga do browser. Apply
  gravou quatro recebimentos; reapply nao criou duplicados. Operacoes e vigencias
  permaneceram inalteradas. Timestamps de InvoicePayment e invoice coincidiram
  nos quatro fatos, sem modificar guardas temporais para favorecer o clock.
- `receipts_complete`/`periods_complete` limitados ao cutoff examinado;
  `adjustments_complete=false`. Refund/dispute sao observacoes atuais, nao
  movimentos historicos liquidos. Metricas financeiras sem cobertura continuam
  indisponiveis; SendNF e backfill fiscal seguem bloqueados por requisitos externos.
- Checkout distingue conclusao de captura original de beneficio vigente. Prova
  interna exige PI originalmente pinado e vinculos exatos; renovacao paga nao
  substitui esse PI. Captura vencida/estornada/disputada nao deve pedir novo
  pagamento, mas tambem nao concede acesso. Operacoes terminais nao foram reabertas.
  Prova read-only real aceitou tres capturas originais, duas vencidas, preservando
  todos os estados/beneficios preexistentes; testes de ajuste nao equivalem a
  estorno/disputa executados no sandbox.
- Recuperacao de criacao com invoice inicial ja paga aceita somente
  `subscription_create` canonica com PI verificado, sem client secret. Invoice
  de renovacao/manual/setup nao autoriza inventar a referencia original.
- UI separa destino de operacao concluida e beneficio: captura historica sem
  vigencia deve retornar a Minha assinatura, nao ao onboarding pago/polling sem
  fim. Testes focais, frontend check/build passaram; browser desse ramo especifico
  ainda precisa execucao real. Hook generico de atualizacao de cartao preservado.
- Eventos SetupIntent agora passam por correlacao fechada antes do sync generico.
  Evento autonomo anterior foi reprocessado quando naturalmente devido, passou
  de tentativa2 para3 e ficou pending com diagnostico `setup_operation_unresolved`;
  nenhum assignment/beneficio artificial. Correlacao contraditoria vai para review;
  ausencia usa retries limitados e review no limite, nunca ignored/complete forjado.
- Manutencao de cartao foi separada da oferta de novas vendas: catalogo ausente ou
  Price arquivado nao apaga operacao pendente corretamente vinculada. Testes puros
  e PostgreSQL passaram; nenhum Price remoto foi alterado para esta verificacao.
- Pendencias mantidas: cortesia/Radar SetupIntents sem confirmacao humana de custo,
  SendNF test/configuracao fiscal, dunning completo, browser do retorno historico,
  revisao de cancelamento antes da primeira conciliacao e gates finais. Sem bump,
  commit, push ou deploy. Nenhuma cobranca live, ativacao de Radar ou emissao fiscal.

- Revisao complementar encontrou que cancelamento do usuario antes do primeiro
  sync podia persistir `cancelada/null` e perder periodo pago. Fluxo agora faz
  leitura canonica pos-mutacao antes do cancelamento local sticky; CAS e revogacao
  administrativa permanecem preservados. Sem prova positiva da captura original,
  terminal remoto vai para `review_required`, nao `failed` por ausencia de ledger.
  Ledger posterior exige novo confirm/sync para concluir; nao reabre failed legado.
- Ramo de recuperacao de invoice ainda nao paga tambem exige subscription_create,
  mesmo customer/contrato/invoice e PI valido. Renovacao/manual nao podem substituir
  o PIN original. Testes focais, TS/Biome e cinco testes PostgreSQL reais desta
  continuacao passaram (cancelamento, manutencao, ledger e classificacao de setup).
  Corrida de cancelamento em sandbox ainda precisa prova real; teste de repositorio
  nao equivale a corrida HTTP executada.

- Corrida real de cancelamento executada uma vez no sandbox: pausa no evento de
  resposta do SDK do GET de preflight, sem corpo nem substituicao de transporte;
  worker confirmou um credito de teste antes do DELETE real com snapshot antigo.
  Periodo local inicialmente null foi preenchido pela prova canonica pos-cancel,
  operacao original ficou complete e acesso pago foi preservado com ledger vazio
  e automacoes desligadas. Uma unica cobranca de teste; recorrencia encerrada,
  zero fiscal/CFP/live. Cinco eventos assinados conciliados depois, preservando
  cancelamento/vigencia e sem novas escritas Stripe.
- Check completo da raiz voltou a passar apos as correcoes: backend 1298 pass,
  12 opt-in skips; cinco testes PostgreSQL desta rodada foram executados
  separadamente sem skip. Video conserva 16 skips por drawtext ausente. Build
  backend final aprovado; frontend check/build desta continuacao aprovados.
  Primeira execucao concorrente do check pegou arquivos ainda em edicao e falhou
  em formatacao; reexecucao integral apos estabilizacao passou, sem ignorar gate.


### Retomada apos interrupcao — 10/11/2026

- Usuario reiterou continuar somente demais testes; Radar para SetupIntents e
  producao permanecem fora do escopo. E-mails apresentados confirmam recebimento
  (protocolo18652759) e encaminhamento para suporte brasileiro, **nao** isencao de
  custo. Nao ativar a opcao nem considerar cortesia validada por esses e-mails.
- Na retomada, arquivos de `/tmp` nao estavam mais disponiveis e o container local
  `lectum-stripe-qa-pg` estava parado. Inspecao confirmou armazenamento tmpfs; apos
  reinicio havia zero tabelas no banco descartavel. Nao foi executado reset/delete
  para provocar essa perda; codigo/Git e ambientes publicados permaneceram intactos.
- Reaplicado `db:migrate` ao banco local vazio, sem editar migrations. Runner
  isolado, Node24.22.1 verificado por checksum oficial e pnpm10.33 recuperados fora
  do Git. O pnpm global12 ignorava a configuracao dos apps Next; resolvido por shim
  privado10.33, sem alterar locks/manifests nem instalar dependencia de produto.
- Scripts/evidencias/dumps de QA passam a ficar no diretorio privado persistente
  `/Users/rezende/.codex/lectum-stripe-qa`, com permissao0600 e sem valores de chave
  em logs. Backup local apos configuracao permite retomar sem fabricar vinculos.
- GET sandbox encontrou os dois contratos do dunning interrompido: ambos past_due,
  uma captura inicial e uma renovacao recusada cada; troca de cartao ainda nao
  concluida. Encerrados especificamente como cleanup MANUAL, sem nova cobranca,
  sem excluir customers/clocks/historico. Isso **nao** e esgotamento automatico nem
  conclusao do E2E local perdido. Nao reconstruir estados de operacao por suposicao.
- Novo clock no MESMO sandbox prepara novo ensaio isolado. Oferta local restaurada
  pelo servico operacional, validando Price real BRL2990 e auditoria no banco local;
  nenhuma criacao/edicao de produto ou preco Stripe. Admin tecnico de QA nao e
  prova de onboarding administrativo. Automacoes de runtime continuam desligadas,
  worker sera executado explicitamente; presenca de config nao prova webhook E2E.
- Frontend/admin check e build reexecutados com runner isolado e aprovados. Sem
  publicacao, bump ou commit; task permanece parcial.

- Ensaio de recuperacao encontrou restricao do provider para o Amex internacional
  de teste na conta brasileira. GET confirmou fixture valida/credito e mensagem
  correspondeu ao motivo oficial cross-border; sem atribuir a Radar/return_url.
  Mesma operacao/SetupIntent retomada com Mastercard de teste, mantendo evidencia
  da recusa e sem criar nova assinatura ou efetuar invoice.pay.
- Retry recuperou captura canonica integral, mas ledger rejeitou ordem de datas:
  invoice paga em03/11 08:15:13Z e InvoicePayment em03/11 10:53:18Z. Nova migration
  `20261110133000_stripe_receipt_independent_timestamps` aplicada por db:migrate,
  sem editar a anterior nem reescrever fatos. Codigo agora preserva datas
  independentes, cada uma valida e <=cutoff/now; periodo/escopo/PI/valor/hash intactos.
  Vinte testes focais, PostgreSQL real, TS/Biome e revisao independente passaram.
- Limite da revisao temporal: os guards novos valem ao ledger e prova historica.
  O atalho canonico preexistente de entitlement usa invoicePaidAt, nao a data da
  alocacao; revisar explicitamente esse caminho antes de alegar protecao temporal
  integral/publicacao. Neste ensaio ambas as datas sao anteriores ao relogio real.

- Retomada da conciliacao da MESMA captura, sem invoice.pay/confirmacao adicional,
  passou apos a correcao: invoice/InvoicePayment/PI/Charge/novo Mastercard exatos,
  BRL2990 e periodo vigente persistidos. Operacao original preservou PIN e complete;
  repeticao de troca de cartao manteve uma unica operacao/assinatura. Recorrencia A
  encerrada apos comprovar recuperacao, preservando o periodo pago. Caso B segue
  em ensaio de esgotamento automatico; nao considerado concluido por primeira recusa.

- Dunning concluido nos novos fixtures: A recuperou automaticamente no retry com
  Mastercard de credito, uma unica nova captura BRL2990 para a invoice de renovacao;
  B teve nove tentativas no total e cancelamento canonico `payment_failed`, sem
  qualquer cancelamento manual desse caso, sem recebimento na renovacao e sem
  beneficio. Operacoes originais continuam complete/PIN inicial preservado. Ambos
  contratos encerrados; customers/clocks/historico nao excluidos.
- A recuperacao paga ocorreu em data simulada anterior ao relogio real. Somente
  o caso B, ja recusado e sem recebimento futuro, avancou ate15/11 no clock para
  comprovar a politica de esgotamento. Isso nao demonstra expiracao temporal de
  beneficio com relogio real nem autoriza afirmar recebimento futuro. Nao houve
  alteracao de Date.now, configuracao de retries, Radar ou producao.
- Nova rodada de gates apos correcao: backend check/build e check raiz aprovados,
  1301 testes backend pass/12 opt-in skips; PostgreSQL real da correcao executado
  separadamente, sem skip. Frontend/admin check/build aprovados nesta retomada.
  Video mantem16 skips por drawtext ausente. Auditorias --prod dos cinco escopos
  retornaram zero advisories conhecidos. Quatro migrations Stripe aplicadas tiveram
  checksums comparados aos arquivos, todos identicos; nenhuma aplicada foi editada.

- Webhooks desta rodada:35 entregas genuinas assinadas/HTTP200,35 eventos unicos.
  Conciliados30 eventos de assinatura/invoice e2 de SetupIntent vinculado;3 setups
  autonomos sem operacao continuam pending com setup_operation_unresolved, tentativa1,
  conforme classificacao conservadora. Nao foram forjados como complete/ignored.
  Reexecutar o worker manteve attempts/processed_at dos concluidos e snapshots de
  PIN, cartao, assinatura, beneficio,3recebimentos e13tentativas de Charge inalterados.
  Observador registrou49GETs e0escritas de provider durante a conciliacao; nenhuma
  nova cobranca. Essa repeticao prova idempotencia do worker, nao nova entrega HTTP
  duplicada (na rodada atual nao houve duplicata assinada observada).
- Evidencias privadas e dumps intermediarios/final preservados fora de/tmp. Nenhuma
  NFS-e, verificacao CFP ou cadastro real foi fabricado. As duas novas recorrencias
  de teste estao encerradas; as duas interrompidas anteriormente tambem foram
  encerradas manualmente, sem confundir seus resultados. Clock/customer/historico
  permanecem preservados. Task continua parcial, sem bump/commit/push/deploy.
- Encerramento desta rodada: backend, relay e listener locais parados; portas
  3120/3121/3122 livres. PostgreSQL isolado mantido e dump final0600 preservado,
  pois parar seu tmpfs descartaria novamente o banco. Nenhum servico publicado
  foi parado. Captura visual do cancelamento sandbox salva no diretorio privado;
  a data15/11 exibida pertence ao relogio simulado, nao a uma operacao live.

### Revisoes finais e preflight SendNF — 10/11/2026

- Usuario manteve producao e Radar para SetupIntents intocados. Revisao independente
  de factory, MP legado, idempotencia, client_secret e webhook nao encontrou novo
  P1/P2 no escopo;35 testes backend e10 frontend focais passaram. Isso nao substitui
  os gates externos ou todas as variantes E2E ainda abertas.
- Fechado o gap temporal canonico identificado acima: reader exige duas datas
  validas, entitlement verifica cada uma contra now e fiscal usa a alocacao como
  paidAt/corte, em paridade com ledger. InvoicePaidAt permanece fato independente.
  Estorno por flag ou centavos impede status aprovado; disputa continua impeditiva.
  MP, snapshots existentes, IDs e idempotencia preservados; nenhuma nova migration.
- 57 testes focais, TS/Biome e revisao independente aprovados. Releitura real de
  tres recibos e duas assinaturas existentes:16GETs, zero escritas/cobrancas/avancos
  de clock. Renovacao com alocacao posterior a invoice manteve datas exatas; corte
  exato aceito e corte1ms posterior recusado. Cancelamento sticky nao reabre.
  Evidencia privada `temporal-final-read-evidence.json`, sem valores de chave/PII.
- SendNF:43 testes locais passaram sem skips, incluindo uma integracao PostgreSQL
  real isolada (claims concorrentes, conta/modo, dedup e snapshot). Testes HTTP do
  adapter usam fixtures de contrato e nao comprovam nota, PDF ou email reais.
- Configuracao externa: arquivos locais backend `.env`, `.env.stripe.local` e
  `.env.production` nao possuem SendNF. A pedido do usuario, painel Dokploy lido
  em HOMOLG-Lectum/Backend, branch homolog:99 linhas de ambiente, nenhuma SENDNF_*.
  O ambiente interno desse projeto chama-se production no Dokploy; a identificacao
  de homologacao foi confirmada pelo projeto, branch e destinos, sem abrir/alterar
  o backend PRODUCTION-Lectum. Nao houve save, reinicio, copia de credenciais para
  disco ou alteracao de flags. Essa leitura nao prova estado de outros servicos/contas.
- Solicitado acesso ao painel SendNF para verificar a empresa existente somente
  em leitura. Nenhuma API privada SendNF foi chamada nesta revisao. Proximo gate:
  chave nt_test_ restrita a empresa, aprovacoes da chave/empresa, readiness real,
  descricao/codigo/ISS confirmados, corte e destinatario fiscal controlado.
- API oficial (https://sendnf.com/desenvolvedores/api/) documenta rascunho
  approval_request/pending_approval se empresa/chave exige aprovacao humana;
  contrato atual so acompanha nfse. Verificar antes de emitir, registrar bloqueio
  se ativo e nao desligar essa protecao automaticamente. Cadastro/certificados/
  whitelabel sao compartilhados test/live; chave test nao autoriza alteracao deles.
- Teste fiscal nao deve ligar fila remota indiscriminadamente: modo test autoEnabled
  e verdadeiro, e SENDNF_LIVE_PAYMENT_ID nao limita esse modo. Inventariar lote e
  corte no banco local isolado. Executar preview explicito com parametros fiscais
  confirmados: o caminho test atual nao reproduz automaticamente todos os guards
  de live. Depois exigir autorizacao real homologada, replay sem duplicacao, PDF
  autorizado ao titular/negado a outro usuario e entrega efetiva em caixa controlada.
- Ajustados comentarios dos templates env para refletir escopo Stripe independente
  de MP; nenhuma nova variavel obrigatoria ou configuracao publicada alterada.
  Sem Radar SetupIntents, NFS-e, bump, commit, push ou deploy. Task segue parcial.
- Check integral da raiz e build backend reexecutados apos ajuste temporal:
  aprovados, backend1307pass/12opt-in skips; Video100pass/16skips conhecidos por
  drawtext ausente. Teste fiscal PostgreSQL e mais cinco testes reais locais de
  cancelamento/manutencao/ledger/setup executados separadamente, todos sem skip.
  Sem mudanca de UI nesta rodada; builds/frontend/admin anteriores preservados,
  checks de ambos incluidos no gate integral. Cinco manifests em0.1.799.

### Inspecao do painel SendNF autenticado — 10/11/2026

- Modo Teste permaneceu selecionado. Empresa Lectum ja cadastrada, checklist
  visual NFS-e pronta, certificado A1 enviado/dentro da validade e rota Sistema
  Nacional. Servico padrao010501; ISS padrao sem valor e envio de email ao tomador
  marcado. Nao inferir aliquota atual pelo historico nem editar cadastro fiscal.
- Existem duas chaves, teste e producao, ambas apresentadas como restritas a uma
  empresa. Chave de teste identificada como integracao local, mas painel so exibe
  prefixo mascarado e nao ha valor completo nos arquivos locais conferidos. Isso
  nao contradiz ausencia de SENDNF_* no servico homolog: cadastro do provider e
  instalacao da credencial no app sao etapas distintas. Nao copiar chave live.
- Politica visual das chaves: aprovacao somente pelo MCP (padrao); exigencia por
  empresa desmarcada. Nenhuma politica foi desabilitada. Confirmar identidade e
  escopo da chave efetivamente usada via API antes de emissao; UI nao e prova da
  resposta HTTP atual do adapter.
- Nota historica de04/11, SIM-9, tem banner explicito de simulacao, sem protocolo
  governamental. Linha do tempo document.simulated/cnc_missing_in_test. O painel
  informa que o ambiente de teste governamental nao esta configurado para esta
  empresa/municipio: montou/validou a nota, mas ela nao foi autorizada pelo governo.
  Complemento posterior esclarece que houve tentativa de transmissao antes do
  fallback; a simulacao nao permite concluir ausencia de contato com o governo.
  Nao considerar status authorized isolado como autorizacao fiscal homologada,
  nem usar esse documento anterior como E2E da nova integracao Stripe.
- Separar provas: HTTP real Lectum/Stripe sandbox/SendNF test, persistencia/replay/
  PDF/email podem validar transporte e integracao com o fornecedor; autorizacao
  fiscal requer evidencia do ambiente governamental, nao espelho simulado. Conforme
  https://sendnf.com/blog/homologacao-e-producao-nota-fiscal/, ha provedores que
  apenas validam lotes; nessa situacao registrar limitacao, nao marcar gate fiscal
  concluido nem emitir live para contornar. Verificar com SendNF como habilitar a
  homologacao governamental dessa empresa sem alterar producao.
- Perguntado ao usuario se possui a chave test existente guardada, sem solicitar
  valor no chat. Nenhuma credencial criada/revogada/instalada, requisicao privada
  SendNF por CLI, preview, emissao, alteracao cadastral/certificado ou plano.
  Painel informa periodo de transicao ate02/12; nao foi contratado plano nem
  validada continuidade produtiva. Producao e Radar SetupIntents intocados.

### Chave SendNF test e consultas reais autorizadas — 10/11/2026

- Usuario informou nao ter o valor da chave anterior e autorizou criar outra de
  teste, restrita a Lectum, salvar em `.env.sendnf.local` fora do Git e executar
  somente consultas, sem notas, producao ou Radar. Criada uma unica chave
  `Lectum - QA local Stripe (teste)`, modo Teste e empresa Somente Lectum. As duas
  chaves anteriores, teste e producao, continuam presentes e inalteradas.
- Politica de aprovacao da nova chave manteve o padrao do painel (somente MCP),
  sem privilegio de aprovador. Isso nao torna a chave read-only: o limite somente
  GET pertence a esta autorizacao/diagnostico, nao a uma permissao inexistente
  atribuida ao token. Nenhuma protecao da empresa/chaves existentes foi removida.
- Segredo gravado sem exibir/copiar ao chat ou clipboard em
  `backend/.env.sendnf.local`, arquivo novo exclusivo, modo0600, ignorado pelo
  Git e nao rastreado. Chave test e empresa exata verificadas; todas as flags de
  ativacao/emissao/test/live/auto/confirmacao fiscal permanecem false. Nenhuma
  credencial live copiada e nenhum servico remoto recebeu o arquivo.
- Diagnostico executado com o adapter real, origin/path allowlist, redirect error,
  metodo GET exclusivo, sem corpo e respostas limitadas. Quatro GETs HTTP200:
  `/v1/me`, readiness, cadastro e approval da empresa exata. Identidade test e
  escopo da chave confirmados; nfse_ready=true, missing vazio. Servico retornado
  confere com o painel; ISS padrao ausente; email ao tomador habilitado. Aprovacao
  obrigatoria da empresa=false. Politica da chave comprovada pela UI, nao por um
  campo inventado na resposta `/v1/me`.
- Evidencia privada `sendnf-readonly-evidence-20261110.json`:4GETs,0nonGET,
  0mutacoes de provider durante o diagnostico,0mutacoes de banco. A criacao da
  chave foi a unica escrita autorizada anterior a esse diagnostico. Nenhum POST
  preview, nota, envio de email, alteracao fiscal/certificado/plano ou restart.
- Readiness cadastral nao supera a simulacao historica cnc_missing_in_test.
  Permanecem pendentes confirmacao contabil de codigo/descricao/ISS aplicaveis,
  esclarecimento SendNF sobre homologacao governamental, corte/lote/destinatario
  controlados e autorizacao separada para preview/emissao test. Nao inferir ISS
  zero pela ausencia nem usar producao para contornar a limitacao governamental.
- README/task/ADR atualizados; check:tasks, check:adrs e git diff --check aprovados
  nesta rodada documental. Task segue parcial, sem bump, commit, push ou deploy;
  producao e Radar SetupIntents permanecem intocados.

### Fechamento operacional sem dependencias externas — 10/11/2026

Usuario autorizou continuar a implementacao enquanto aguarda contabilidade,
SendNF e Stripe. Nao repetir testes comprovados nem habilitar provedores. Escopo
incremental desta rodada, antes de implementar:

- Sanitizacao de valores reconhece credenciais Stripe/SendNF tambem sob campos
  genericos; preservar somente a excecao existente do client_secret do Intent no
  DTO/rota autenticada autorizados. Nao ha evidencia de vazamento em producao.
- Teste PostgreSQL real isolado da inbox cobre lease abandonada, retomada apos
  expiracao, rejeicao de ACK do worker antigo, backoff e duplicata terminal. Nao
  declarar esse teste como prova de novo pagamento/webhook externo.
- Reprocessamento operacional limitado a UM evento em review_required no escopo
  gateway/conta/modo configurados, com motivo controlado, admin valido, numero
  esperado de tentativas e CAS. Dry-run por padrao; apply/confirmacao explicitos.
  Preservar contagem de tentativas: autoriza um reenfileiramento, nao reinicia
  o orcamento de retries nem muda estado financeiro. Conflito anterior ao limite
  pode usar tentativas restantes conforme politica existente. Nao reabrir
  evento concluido, processando, fora do escopo/API version ou com lease ativo.
  Registrar auditoria sem payload, PII ou credenciais; nenhuma chamada ao provider
  no comando. Executar apenas em DB local nesta etapa.
- Runbook com comandos existentes/compilados, flags independentes, inventario de
  webhooks, monitoramento e rollback. Reenvio Stripe de evento ja persistido nao
  reabre review_required; documentar o comando limitado em vez de UPDATE ad hoc.
- Nenhuma migration/env obrigatoria nova, alteracao de UI ou publicacao. Futuro
  deploy permanece opcional/inativo e sujeito aos gates externos e autorizacao.

Resultados desta rodada:

- Sanitizador passa a reconhecer sk/rk test/live, webhook secret, segredo de
  PaymentIntent/SetupIntent e chave SendNF test/live em valores genericos, listas
  e URLs. Chaves publicaveis e IDs sem segredo preservados. Excecao leaf autorizada
  do Intent nao libera irmaos/listas; permissao de midia assinada nao libera
  credenciais fiscais/financeiras.14 testes de politica/HTTP local e revisao
  independente aprovados, sem afirmar exposicao conhecida ou novo E2E de cobranca.
- Inbox-recovery.integration passou no PostgreSQL isolado: lease abandonada,
  reclaim no limite, ACK antigo rejeitado, backoff persistido, retomada e
  deduplicacao terminal. Referencias sinteticas existem somente nas fixtures
  temporarias de persistencia; nenhum endpoint/provider foi simulado.
- CLI requeue implementada com parser estrito e guards de escopo/admin/estado/
  API/attempts/lease. Transicao e audit atomicos; referencias, diagnostico e attempts
  preservados.4 testes de politica e1 integracao PostgreSQL real passaram, inclusive
  dry-run sem escrita e apply concorrente com um vencedor/uma auditoria. Fixtures
  criadas pelo teste foram removidas; dados sandbox anteriores preservados.
- TypeScript, Biome e revisao independente dos incrementos passaram. Build backend
  aprovado e CLI compilada --help exercitada. Smoke do artefato compilado, sem
  credenciais externas e schedulers OFF: health/ready/ping200, no-store e versao
  0.1.799, shutdown gracioso. PostgreSQL isolado mantido; backend encerrado.
- Runbook documenta destino test/live, segredo de webhook por endpoint, eventos,
  permissoes consumidas, comandos compilados, efeito manual independente de flags,
  ausencia de allowlist no piloto e pausa emergencial sem fallback MP. Nao e
  autorizacao operacional nem prova de configuracao live. Nenhuma chamada Stripe
  ou SendNF nesta rodada; Radar e producao intocados.
- Gate final desta rodada: `pnpm check` integral aprovado, backend1328total /
  1314pass /14opt-in skips; os dois novos testes PostgreSQL opt-in passaram
  separadamente, sem skip. Video100pass/16skips conhecidos por drawtext ausente.
  Frontend/Admin checks incluidos; nenhuma UI alterada nesta rodada. Build backend,
  smoke compilado, check:tasks/check:adrs e diff-check aprovados. Evidencias privadas
  em root-check-operational-20261110.log, backend-build-operational-20261110.log e
  operational-smoke-evidence-20261110.json, sem segredos. Sem bump/commit/push/deploy:
  TASK-323 segue parcial com gates residuais explicitados, nao apenas suporte externo.

### Recuperacao residual e browser local/sandbox — 10/11/2026

- Usuario autorizou fechar os testes tecnicos restantes apenas no local e sandbox
  existente, deixando suportes/contabilidade separados. Nenhuma autorizacao live,
  Radar SetupIntents, emissao SendNF ou alteracao de politica de cartoes.
- Harness privado usa servicos reais da Lectum, PostgreSQL isolado e HTTP real
  da Stripe. Uma fixture tecnica nova sem CRP/aprovacao CFP, um customer, uma
  assinatura, um pagamento TESTE de2990BRL em Mastercard de credito e um SetupIntent
  nao confirmado; nenhuma resposta de provider ou data fabricada.
- Customer: processo encerrado no2xx remoto antes do callback/gravacao local.
  Espera real da lease e recuperacao GET preservaram o mesmo customer, sem create
  adicional. Subscricao: duas conexoesTCP interrompidas antes doTLS (incluindo o
  retry interno do SDK), seguidas do POST replay pelo dominio com mesma operacao,
  chave e digest do corpo. Resultado: uma assinatura, nenhuma captura nessa fase.
- Uma tentativa preliminar do harness falhou no proprio guard antes do transporte;
  evidencia mantida e nao contada como corteTCP real. Nao foram alteradas tentativas,
  limite5, fingerprint ou janela23h no produto para fazer o ensaio passar.
- Setup: novo processo encerrado no2xx antes do pin local; espera real da lease,
  quatroGETs/zeroPOSTs recuperaram o unico SetupIntent da mesma operacao. Nao houve
  confirmacao de SetupIntent, atribuicao de novo cartao ou habilitacao de Radar.
- Limite explicito: POST replay de criacao ja commitada mas ainda ausente no indice
  de busca nao foi induzido. As provas complementares foram crash remoto+GET,
  falha real pre-despacho+POST replay e politicas/PG de fingerprint/CAS. Nao ocultar
  resultados GET, falsificar atraso do indice ou exigir repeticao infinita desse
  estado externo nao controlavel para o criterio delimitado.
- Browser: fixture existente exhaust, operacao complete e assinatura Stripe
  cancelada/sem vigencia. Preparados somente senha/hash e confirmacao de email de
  teste temporarios no DB local; login feito pela UI real, sem editar perfil/CFP,
  contratos, recebimentos ou beneficios. Isso nao comprova cadastro, confirmacao
  real de email ou verificacao profissional. Backup0600 restaurado ao final e
  unica sessao criada removida; browser terminou na area restrita sem sessao.
- Retorno historico levou a Minha assinatura/Plano Gratuito, sem onboarding pago,
  polling infinito ou nova operacao. O GETcurrent criou legitimamente um registro
  free_signup pelo fluxo restoreFreeAfterLatestCancelledProfessional. Comparacao
  ampla inicial apontou essa adicao; verificacao por IDs confirmou contrato Stripe,
  operacao, recibos e perfil identicos. Registro gratuito real preservado, nao
  excluido para fingir ausencia de side effect. Nenhum beneficio profissional novo.
- Layout conferido em320/390/1440px sem overflow horizontal, no retorno e checkout
  vazio. SDK real informou livemode=false, BRL2990 e recorrencia; zero campos de
  cartao fora do iframe. Nenhum cartao preenchido ou submit no browser desta rodada.
  Fonte local Minhas Assinatura consultada; Builder indisponivel. Screenshots
  privados salvos e aprovacao visual solicitada ao usuario, sem autorizar deploy.
- Visual executado com frontend development local. Tentativa inicial em NODE_ENV
  test bloqueou eval do HMR; build publicado bloqueia APIloopback por politica.
  Nao enfraquecemos CSP/guard produtivos para contornar: usamos runtime development
  verdadeiro para browser, preservando build produtivo anteriormente aprovado.
  Alteracao automatica de tsconfig do Next foi conferida e revertida isoladamente.
- Primeira tentativa de ordenar eventos foi bloqueada por429 no limite local
  agregado120req/15min (UI+webhooks). Nao contou como prova de entrega. Retomada do
  backend de QA usou somente env de processo RATE_LIMIT_RETRIES=1000, sem mudar
  codigo, configurações publicadas ou corpo/assinatura de webhook. Mensagens
  expiradas nao foram reassinadas nem usadas como prova de ordenacao.
- Recuperacao e cleanup finais aprovados: um customer, uma assinatura cancelada,
  um SetupIntent cancelado sem confirmacao e uma captura TESTE2990BRL. Operacao
  checkout complete e de cartao failed; seisGETs de verificacao final/zero escritas.
  Uma segunda falha preventiva do harness no allowlist da query de cancelamento
  ocorreu antes do transporte; corrigida sem relaxar escopo do produto e registrada.
- Prova valida de ordenacao: atualizar somente cancel_at_period_end da mesma
  assinatura e cancelar sem invoice_now/prorrata geraram updated(active) e deleted
  genuinos. Relay guardou bytes/assinatura originais apenas em RAM por no maximo
  84.661ms; deleted duplicado foi entregue antes de updated. QuatroHTTP200,
  auto_release=false, zero expirados/reassinados. Workers fizeram10+5GETs/zero
  escritas Stripe e preservaram cancelamento, periodo pago, pins e unica captura.
- Inbox final38eventos:35complete e3pending/unresolved, tentativa2 natural; nada
  foi marcado complete/ignored por ausencia de vinculo. Nao executar horas de
  retries nem alterar datas/contadores para fingir exaustao. Tres eventos genuinos
  novos e uma duplicataHTTP foram comprovados; primeira prova429 nao foi promovida.
- Revisao independente conjunta aprovou recuperacao, eventos e visual sem novo
  P1/P2 no escopo. Evidencias privadas recovery-e2e-20261110-summary.json,
  webhook-order-final-summary.json e visual-final-evidence.json; sem credenciais
  ou dados reais de cartao em docs/Git. Nenhuma alteracao funcional adicional foi
  necessaria nesta rodada. Checks/builds anteriores continuam aplicaveis ao mesmo
  codigo; validacao documental e hooks sao repetidos no checkpoint local.

### Resposta SendNF recebida e classificacao fiscal — 10/11/2026

- Suporte informado pelo usuario esclareceu: cnc_missing_in_test e ausencia do
  cadastro no CNC governamental de homologacao, separado de producao; nao ha
  regularizacao Lectum nem alteracao cadastral necessaria. Readiness nao consulta
  esse cadastro. A interpretacao inicial de que so haveria transmissao quando o
  governo reconhecesse a empresa foi corrigida pelo complemento posterior abaixo:
  a tentativa ocorre antes da recusa e simulacao. O opt-out segue divergente
  entre resposta do suporte e documentacao, sem prova de execucao.
- Relato do operador de duas notas live autorizadas e do desenvolvedor de MP
  confirma historico do fluxo anterior, mas nao valida Stripe→SendNF nem substitui
  parametros contabeis atuais. Nao consultamos/mutamos live para confirmar o relato.
- DoisGETs autorizados na nota historica SIM-9 confirmaram statusauthorized com
  simulation=true, simulation_notice presente, nfse_numberSIM e urls.public_query
  null. Access_key nao apresentou prefixoSIM nessa resposta; flag explicita e a
  prova primaria, nao exigir prefixoSIM como condicao de reconhecer simulacao.
- Revisao encontrou que parser descartava simulation e worker/PDF tratavam
  authorized sozinho como autorizacao. Corrigir dentro da TASK-323 antes do
  checkpoint: classificador conservador, estados aditivos simulated e
  authorization_unverified, sem migration; campos ausentes nao equivalem a false.
  Preservar document_id ao persistir resposta, nunca reemitir para corrigir estado.
  PDF relê/classifica provider, inclusive cache antigoauthorized; nao disponibilizar
  espelho pelo endpoint apresentado como nota fiscal autorizada. Copia publica
  controlada, sem notice bruto/URL/chave fiscal. Nenhuma emissao ou cambio live.
- E2E fiscal ainda depende de contabilidade/autorizacao de preview/emissao test.
  A falta de CNC nao e uma tarefa de regularizacao; validacao real do transporte
  SendNF com documento explicitamente simulado pode ser registrada separadamente
  da autorizacao governamental, sem marcar essa ultima como executada.
- Correcao implementada sem migration/env: campos opcionais simulation/access_key/
  urls.public_query conservadores; statuslocal simulated em test explicito,
  authorization_unverified em ausencia/contradicao e authorized apenas com prova
  compativel. Worker preserva document_id/reference/numero e agenda24h nesses
  estados; PDF rele/classifica antes de buscar arquivo, inclusive cache antigo.
  Estado financeiro, beneficio e origens MP/Stripe nao mudam por essa classificacao.
- Validacao:25 testes backend focais/contrato e1 PostgreSQL real,5 testes de
  renderizacao frontend, TS/Biome e revisao independente aprovados. Fixtures
  governamentais sao apenas casos de contrato; nao alegar E2Egovernment. DoisGETs
  adicionais com adapter real confirmaram SIM-9→simulated, IDpreservado e PDFfiscal
  inelegivel, sem nenhuma emissao/mutacao. Evidence sendnf-classifier-real-evidence.json.
- Componente InvoiceAction real renderizado com essa classificacao do documento
  historico e CSScompilado: browserlocal320px semoverflow, aviso de simulacao e
  zero botoes de download. Previa isolada, NAO historico de pagamento Stripe
  fabricado nem E2E de nova emissao. Sem cadastro/nota/flags/producao alterados.
- Impacto conservador: notas antigas sem metadados podem perder download ate
  classificacao verificavel. Runbook exige GET live de nota existente autorizado
  antes do piloto; nao realizado agora. Backend/Frontend toleram estados novos
  com fallback pendente em versoes antigas. Bump unico0.1.800 ja executado nesta
  tentativa de checkpoint; nao repetir ao tentar novamente o commit.
- Gates finais apos classificacao fiscal: pnpmcheck integral aprovado, backend
  1334total/1320pass/14opt-in skips, testes PG relevantes executados separadamente;
  frontend/Admin checks e Video100pass/16skips conhecidos. Builds backend/frontend
  0.1.800 aprovados; smoke backend compilado health/ready/ping200/no-store/0.1.800.
  Preview/servidores/relay/listener locais encerrados, PostgreSQL preservado com
  dump0600 atualizado. Checkpoint local registra implementacao parcial validada;
  nenhuma publicacao, nota ou mudanca Radar/live. A task integral aguarda cortesia
  e validacao fiscal externa autorizada, sem promover simulacao a autorizacao real.


### Revisao residual e readiness governamental SendNF — 10/11/2026

- Usuario pediu concluir somente pendencias locais enquanto aguarda contabilidade,
  sem emitir notas, alterar producao ou Radar SetupIntents. Revisao independente
  Stripe nao encontrou novo P1/P2 no escopo ja validado; nao repetimos checkout,
  3DS, dunning ou cobrancas sandbox para cobrir gates externos diferentes.
- Confirmado no historico b509baa53: codigo010501 e ISS201 (2,01%) registrados como
  confirmados com contador em26/10. Pendencia contabil reduzida a vigencia e texto
  fiscal exato ja aprovado; empresa/certificado/rota existentes sao reutilizaveis.
  Corte/lote/autorizacao de teste sao controles operacionais, nao novo cadastro.
- A referencia oficial SendNF agora documenta government_test_transmission em
  readiness e simulationnever na emissao. A conclusao inicial de que isso superava
  a resposta de suporte foi revista apos novo complemento: existe divergencia de
  disponibilidade efetiva, nao resolvida por documentacao isolada. Parametro apenas
  registrado, nao implementado, enviado ou validado externamente. Nenhum POST/preview.
- Adapter/CLI passam a distinguir cadastro pronto da ultima evidencia governamental
  test. Campos opcionais novos toleram ausencia/erro; estados/motivos por allowlist,
  checkedAt validado preserva o instante do provider, reason livre descartado.
  Available nao garante a proxima emissao; worker/flags/politica ficam inalterados.
- 33 testes focais passaram sem skips (contrato/politica, nao E2E fiscal). Revisao
  independente do diff sem P1/P2. GET real restrito test validou identidade e
  readiness:2HTTP200, zero nonGET/alteracoes de banco/provider. Cadastro readytrue;
  evidencia governamental simulated/cnc_missing_in_test, checkedAt em04/11.
  Evidencia privada sendnf-government-readiness-evidence-20261110.json sem PII.
- Nenhuma env, migration, dependencia ou UI nova. Sem necessidade de alterar
  parametros fiscais ou nota historica para conferir a resposta. Gate de emissao
  externa permanece aberto; nao usar o diagnostico como aceite governamental.
- Backend check aprovado: Prisma generate/TypeScript/Biome e1329 testes passaram,
  14 testes opt-in nao executados nesta rodada; nenhuma persistencia foi alterada,
  evidencias PostgreSQL anteriores preservadas. Gates raiz de env, tamanho, ciclos,
  tasks, ADR e diff aprovados. Bump unico0.1.800→0.1.801 nos cinco manifests;
  check:version e build backend aprovados. Commit somente local; sem push/deploy.
- Smoke compilado0.1.801: health/ready/ping HTTP200 e no-store, sem credenciais
  externas/schedulers; processo local encerrado graciosamente. Producao, Radar,
  certificados, emissoes e notas existentes permaneceram intocados.


### Complemento SendNF e divergencia de disponibilidade — 10/11/2026

- Usuario trouxe correcao do suporte: ha tentativa real de transmissao test, com
  recusa cadastral CNC antes do fallback simulado. A ausencia de cadastro nao exige
  regularizacao Lectum; autorizacao governamental podera ocorrer quando o CNCtest
  reconhecer a empresa. Nao confundir tentativa, simulacao e autorizacao.
- Codigo revisado independentemente: classificador e readiness historico continuam
  compativeis. Demais recusas nao sao convertidas em autorizacao pelo app; permitir
  tres motivos documentados no diagnostico apenas sanitiza a resposta, nao decide
  fallback. Nenhuma alteracao funcional ou teste de cobranca/emissao necessario.
- Referencia publica e OpenAPI reconsultados somente por GET continuam descrevendo
  simulationnever; suporte mais recente afirma indisponibilidade. Retirar a
  conclusao de que docs superam suporte: confirmacao de implantacao/contrato fica
  pendente, sem inferir se a mensagem ou a documentacao esta desatualizada.
- Sugerir prioridade ao fornecedor e esclarecer disponibilidade e retorno esperado,
  sem autorizar emissao, alteracao cadastral ou intervencao produtiva. Opt-out e
  controle adicional: nao criar novo gate obrigatorio da migracao por suposicao;
  classificacao conservadora existente permanece, E2E fiscal autorizado separado.
- Rodada documental apenas; nenhuma API privada, banco, nota, preview, cert/key,
  flag, producao ou Radar foi alterado. Preservadas as evidencias tecnicas0.1.801.
- Tasks, ADR, encoding, diff e check:version aprovados; bump unico para0.1.802 nos
  cinco manifests. Sem alteracao de codigo funcional, builds/E2E nao repetidos.
  Commit documental local em homolog, sem push/deploy.


### Preparacao live autorizada pelo Browser, sem ativacao — 10/11/2026

- Usuario autorizou preparar/salvar configuracoes live sem deploy/restart, vendas,
  emissao Stripe ou Radar SetupIntents. Autorizou separadamente criar chave live
  restrita e armazena-la somente no Environment do backend, nunca em arquivo local.
  Formulario tem11 permissoes (8read/3write: customers/subscriptions/setupintents);
  criacao ainda depende do autenticador do usuario. Nao alegar chave criada/salva.
- Conferidos via UI autenticada: conta live com Payments/Payouts ativos e sem
  tarefas ativas; produto/preco existente ativo2990BRL/mensal, sem duplicacao.
  WebMCP listou zero destinos live. Nenhum webhook foi criado/ativado antes do
  novo backend; assinatura/entrega/processamento permanecem pendentes.
- Dokploy backend produtivo: preservadas todas as115 variaveis originais, incluindo
  MP e SendNF live/emissao/auto/confirmacao fiscal ja habilitados. Salvas6 novas
  variaveis Stripe (gatewaydisabled, modo/conta/chavepublica live e dois jobsfalse),
  depois3 controles fiscais Stripe opcionais false/false/vazio. Releitura apos
  reload confirmou valores preparados e integridade do legado. Sem segredo live
  Stripe ou webhook instalado; sem reinicio/deploy. `/ping` publicado segue0.1.791.
- Leitura de nota live ja existente no painel: autorizada e chave50digitos visiveis,
  sem aviso de simulacao; UI nao expoe explicitamente simulationfalse/publicquery.
  Nao equivale a validacao do contrato API/PDF; gate continua aberto. Apenas troca
  da visao test/live e volta a test, nenhuma emissao/alteracao de nota ou cadastro.
- Conta Stripe live esta em RadarLite. UI oferece customrules no Plus por
  R$0,35/transacao analisada, nao so aprovada; nenhuma contratacao ou ativacao.
  Decisao de custo/politica somentecredito permanece externa. Nao ativamos Radar
  para SetupIntents nesta rodada.
- Evidencias locais redigidas: live-preparation-ui-evidence-20261110.json e
  screenshots de revisao de permissoes, Environment mascarado e planos Radar.
  Nenhum segredo em Git/arquivo; clipboard restaurado e conteudo env temporario
  descartado. Abas mantidas para o usuario concluir autenticacao/revisar custos.
- Isolamento fiscal local passou29 testes de politica e2PostgreSQL reais; revisao
  independente corrigiu dependencias indevidas do piloto MP e da pausa Stripe.
  Check backend:1337pass/15opt-in skips; Prisma/TS/Biome, build0.1.803 aprovados.
  Smoke compilado local health/ready/ping200/no-store, processo encerrado
  graciosamente, sem credenciais externas/schedulers. Sem UI/schema/package novo.
  Bump unico0.1.802→0.1.803 e check:version aprovados; commit local, sem push/deploy.

### Preparacao live inativa apos ADR-0688 — 10/11/2026

- Usuario autorizou preparar/salvar configuracoes live, sem deploy, restart,
  ativacao de vendas, emissao Stripe ou cobrancas reais. Autorizou em seguida
  criar a chave restrita com 11 permissoes (6read/5write) e guardar somente em
  STRIPE_SECRET_KEY do Environment do backend no Dokploy, nunca local/Git.
- [x] Conferida conta/modo/chave publicavel preparados; checkout disabled,
  conciliacao/ledger false e gates fiscais Stripe false. Acrescentado somente
  BILLING_STRIPE_COLLECTION_ENABLED=false; releitura apos reload confirmou125
  variaveis e preservacao exata das124 anteriores. Nao alteramos fiscal MP legado,
  que ja possuia controles globais ativos; preparar env nao muda processo corrente.
- [x] Conferido produto live existente2990BRL/mensal, sem criar preco/produto ou
  assinatura. Vinculo versionado da oferta local continua para rollout separado,
  pausado, depois de publicar a operacao compativel; sem escrita no banco publicado.
- [x] WebMCP de leitura confirmou zero destinos live. Formulario de webhook
  preparado para a propria conta, snapshot, API2026-10-28.endive e16 eventos do
  contrato, URL/api/public/billing/stripe/webhook. Nenhum destino foi criado:
  UI nao ofereceu criacao inicialmente desativada. Nao criar ativo para tentar
  desativar logo depois. STRIPE_WEBHOOK_SECRET continua pendente, sem valor ficticio.
- [x] Chave restrita live criada e salva apos o usuario concluir email/autenticador.
  Revisao das permissoes persistidas confirmou Customers, Subscriptions, Setup
  Intents, Payment Intents e Invoices em write; Accounts, Charges and Refunds,
  Payment Disputes, Payment Methods, Prices e Products em read (11 no total).
  Valor guardado somente em STRIPE_SECRET_KEY no Environment do backend produtivo
  do Dokploy, sem arquivo local/Git. Releitura apos reload confirmou a chave exata,
  126 variaveis e preservacao das 125 anteriores. Nenhuma chamada API com a chave.
- [x] Runbook/ADR corrigidos: collector independente explicito, cinco areas write,
  confirmacao financeira exclusivamente backend; nenhuma dependencia de Radar Plus.
- Evidencias UI locais mascaradas: live-disabled-environment-20261110.jpg,
  live-key-review-20261110.jpg e live-webhook-draft-20261110.jpg no diretorio privado
  de QA. Nenhuma chave/OTP/env integral em artefatos/Git. Nao houve emissao, cobranca,
  alteracao Radar, push, merge, deploy ou restart nesta preparacao.
- Checkpoint documental0.1.805: tasks, ADRs, encoding, diff e check:version
  aprovados; sem mudanca de codigo funcional/migration, sem repetir cobrancas
  sandbox para esta preparacao. Bump unico nos cinco manifests. Commit local
  registra explicitamente o bloqueio2FA, nao a conclusao de toda configuracao live.
- Complemento documental 0.1.806: bloqueio 2FA acima resolvido pelo usuario; chave
  persistida e permissoes revisadas. Evidencias privadas sem segredo:
  live-key-persisted-review-20261110.jpg e live-key-storage-evidence-20261110.json.
  Clipboard limpo/restaurado e valores temporarios descartados. Abas Stripe,
  Environment mascarado e rascunho do webhook mantidas para continuacao.
- Checkout disabled, collection/reconciliation/ledger false e gates fiscais
  Stripe false permanecem salvos; MP/SendNF globais existentes nao foram alterados.
  Nenhum deploy/restart, push, merge, cobranca, nota ou mudanca de Radar. Nao
  reiniciar backend antigo nem ativar webhook/worker antes do rollout compativel.
  Segredo do webhook, vinculo da oferta e validacao do runtime ficam pendentes
  para publicacao separada autorizada; nao liberar tentativa real nesta etapa.
- Validacao documental 0.1.806: tasks, ADRs, encoding, diff e check:version aprovados;
  bump unico nos cinco manifests. Nenhuma mudanca funcional, migration ou dependencia;
  builds/E2E nao repetidos neste registro operacional. Commit somente local em homolog.

### Preparacao de webhook e vinculo sem deploy — 10/11/2026

- [x] Produto/preco existentes reconferidos no painel live: R$ 29,90/mes, BRL,
  flat rate, padrao do produto ativo. Nenhum objeto remoto criado ou editado.
  Referencias exatas e evidencia visual guardadas no diretorio privado de QA.
- [x] Formulario de webhook conferido: propria conta, snapshot, API endive e
  16 eventos. Mantido aberto sem clicar Create destination; nao e destino salvo.
- [x] Impedimento de infraestrutura identificado: GET publico `/ping` retorna
  0.1.791/HTTP 200/no-store. Git dessa versao nao possui SDK, rota webhook,
  stripe-offer ou migration foundation. Nao consultamos o banco produtivo e nao
  inferimos seu estado a partir do artefato. Nao copiamos codigo/SQL para contornar deploy.
- [x] UI/WebMCP e referencias oficiais V1/V2 consultadas nao oferecem criacao
  inicialmente desativada; criar inicia entrega. Runbook registra ordem segura
  e inventario READ ONLY, distinguindo dry-run sem escrita de transacao com lock.
- Naquele checkpoint, vinculo live dependia do codigo/schema compativeis publicados,
  admin responsavel e revisao conferidos; destino/segredo aguardavam rollout
  coordenado. Ambos foram preparados posteriormente no checkpoint de publicacao
  inativa 0.1.808 abaixo, sem liberar vendas nem inventar revisao/identidade.
- Evidencias privadas: live-offer-reference-20261110.jpg,
  live-webhook-prepared-20261110.jpg e live-webhook-offer-preparation-20261110.json.
  Sem chave/OTP ou dados pessoais. Nenhuma nova alteracao de Environment, permissao,
  Radar, venda, cobranca, nota, banco, deploy/restart ou push nesta rodada.
- Validacao 0.1.807: cinco testes puros da politica de oferta aprovados, sem
  provider/banco e sem usa-los como prova de vinculo live. Tasks, ADRs, encoding
  e diff aprovados. Sem mudanca funcional/schema; builds/E2E nao repetidos.
  Bump unico e check:version dos cinco manifests; commit documental local em homolog.


### Pre-publicacao inativa e integracao remota — 10/11/2026, 0.1.808

- [x] Usuario autorizou deploy inativo. Permanecem `BILLING_CHECKOUT_GATEWAY=disabled`,
  `BILLING_STRIPE_COLLECTION_ENABLED=false`,
  `BILLING_STRIPE_RECONCILIATION_ENABLED=false`,
  `BILLING_STRIPE_LEDGER_ENABLED=false`,
  `SENDNF_STRIPE_LIVE_ISSUANCE_ENABLED=false`,
  `SENDNF_STRIPE_LIVE_AUTO_ENABLED=false` e piloto fiscal Stripe vazio.
  Nao autoriza venda, cobranca real, emissao Stripe ou alteracao de Radar.
  Configuracao e operacao fiscal MP legadas continuam preservadas.
- [x] Fetch identificou cinco commits novos em `origin/homolog` ate `dea56b871`,
  ja publicados em `main`. Incorporacao local preparada sem descartar nenhum dos
  lados; conflitos de manifests e indices resolvidos. Tasks remotas 320/321/322 e
  ADRs 0684/0685/0686 preservadas. Para evitar colisao, Stripe passa a TASK-323,
  ADR-0687 (checkout incorporado) e ADR-0688 (credit-only), com links atualizados.
  O merge ainda nao foi commitado neste checkpoint; nenhum merge produtivo realizado.
- [x] `pnpm check` integral aprovado em 0.1.808 e builds locais independentes de
  backend, frontend, admin e video aprovados. Bump unico ja executado nos cinco
  manifests; nao repetir ao concluir o commit/merge local.
- [x] `pnpm --dir backend db:migrate` executado no PostgreSQL loopback de QA:
  sucesso, sem alteracoes pendentes. Nao equivale a migration aplicada em producao.
- [x] Smoke compilado local: backend `/health`, `/ready` e `/ping` retornaram
  HTTP 200/no-store, versao 0.1.808; frontend e admin `/version` retornaram 0.1.808.
  Nao foi feita tentativa financeira live como smoke.
- [x] Conferencia nos provedores: backend e video de homolog no Dokploy com
  autodeploy OFF e sem schedules; preview do backend OFF. Vercel frontend/admin
  com root directories corretos, Ignore Build Step em `Don't build anything` e
  atribuicao automatica de dominios OFF. Este registro e evidencia de conferencia
  externa, nao alegacao de que um arquivo do repositorio desligou os gatilhos.
  A liberacao/promocao do artefato correto exige operacao coordenada posterior;
  nenhum ambiente, banco ou volume foi removido para bloquear autodeploy.
- [x] Gate fiscal legado conferido no backend publicado 0.1.791: transacao PostgreSQL
  READ ONLY e GETs SendNF de identidade/documento encontraram uma unica nota MP
  autorizada vinculada ao banco Lectum. Escopo, empresa, referencia e valor total
  conferem; `simulation: false`, chave de 50 digitos, consulta publica HTTPS e
  ausencia de marcador de simulacao comprovam compatibilidade com o classificador
  novo. Nao registrar duas notas: a quantidade do painel remoto nao equivale a
  documentos vinculados no app. Nenhuma escrita no provider ou nova emissao.
- [x] A pedido do usuario, inventario READ ONLY identificou um unico admin apto
  e plano profissional existente/ativo. Identidade operacional retida privadamente,
  sem PII/ID no registro. Tabelas `billing_offers` e `billing_price_versions` ainda
  nao existem nesse banco; nenhuma revisao ou registro de oferta foi inventado.
  Migration produtiva e vinculo pausado continuam pendentes; nao houve apply.
- Na pre-publicacao acima ainda nao havia push, merge concluido ou deploy.
  As etapas posteriores sao separadas no checkpoint seguinte; nao usar um aceite
  agregado para presumir frontend/admin ou entrega assinada de webhook concluida.


### Publicacao compativel inativa concluida — 0.1.808

- [x] Integracao local `6555b8619`, push e PR #174 concluidos; merge revisado em
  `main@4bc6aa7`. Branch `homolog` preservada. Registro atual nao autoriza ativacao
  financeira ou fiscal nem altera a separacao entre as quatro aplicacoes.
- [x] Backend publicado com codigo compativel e atualizado apos armazenamento do
  segredo de webhook. Smoke final `/health`, `/ready` e `/ping`: HTTP 200,
  no-store, versao 0.1.808. Cinco migrations Stripe completadas, zero falhas.
- [x] Gates conferidos no runtime: checkout disabled; collection, reconciliation,
  ledger, emissao e automacao fiscal Stripe false; piloto fiscal Stripe vazio;
  segredo de webhook presente. Nenhuma configuracao do Radar foi alterada.
- [x] Destino webhook live criado para a propria conta, API `2026-10-28.endive`,
  16 eventos do contrato. Segredo salvo somente no Environment do Dokploy:
  126 variaveis anteriores preservadas e uma acrescentada, total 127. Nenhum
  segredo, OTP ou payload integral registrado em Git ou artefatos de evidencia.
- [x] Vinculo da oferta aplicado pela CLI auditada com responsavel real previamente
  identificado, sem registrar PII/ID: revisao 1, 2990 centavos BRL, month,
  `checkout_enabled=false`, auditoria confirmada. Nao criou assinatura/cobranca
  nem alterou produto/preco remoto ou beneficios existentes.
- [x] POST sem assinatura, corpo vazio JSON, recusado com HTTP 400 e codigo de
  assinatura invalida. Inventario posterior: zero contratos Stripe e zero inbox.
  Naquele checkpoint, painel do destino mostrou zero entregas e zero falhas;
  leitura historica anterior a prova assinada positiva registrada abaixo.
- [x] Comprovar entrega positiva assinada do webhook live: pendencia deste
  checkpoint superada pela prova de transporte de 10/11/2026, 20:18:05 BRT,
  registrada abaixo. Nao equivale a conciliacao ou E2E financeiro; reconciliador OFF.
- Historico anterior a essa prova: tentativa de `events resend` de
  `product.updated` real pela interface WebMCP do Workbench foi recusada pelo
  parser como comando nao suportado antes do envio. Naquela etapa nao houve
  entrega, evento fabricado, topico acrescentado ou permissao ampliada.
  Esse limite da interface nao se aplica ao console visual usado posteriormente;
  `product.updated` nao substitui evento financeiro suportado no contrato.
- [x] Identidade Vercel verificada e builds da origem `main@4bc6aa7` concluidos:
  frontend `ErUrL9gy8MKyQHLXksWzNEDMjfZo`, Ready em 4m16s;
  admin `BZqyMmpy92Murx3eJqFPraZtNAya`, Ready em 3m03s.
- [x] Artefatos promovidos e conferidos como producao corrente nos dominios
  `www.lectum.com.br` e `admin.lectum.com.br`, respectivamente. Ambos `/version`
  HTTP 200, versao 0.1.808, `Cache-Control: no-store, max-age=0` e
  `X-Robots-Tag: noindex, nofollow, noarchive`.
- [x] Browser de producao renderizou os logins frontend/admin; rota protegida do
  frontend redirecionou corretamente ao login. Sem sessao protegida nesta prova,
  sem clicar/operar checkout ou preencher/enviar cartao. Smoke de publicacao
  inativa nao equivale a validacao autenticada integral ou E2E financeiro live.
- Video nao teve mudanca funcional neste lote e nao foi redeployado. A versao
  de cada aplicacao deve ser reportada separadamente, sem presumir sincronismo.
- Leitura fiscal MP legada e identidade do responsavel pela oferta ja foram
  comprovadas nos checkpoints anteriores; nao reabrir esses gates nem marcar
  como validada uma nova emissao Stripe. Suportes historicos continuam como
  historico; Radar SetupIntents nao e requisito deste desenho.
- Vendas, cobrancas reais, emissao Stripe e Radar permanecem desativados/intocados.
  MP/SendNF legados preservados. Publicacao inativa dos tres apps concluida;
  integracao E2E ativa nao declarada. A entrega positiva entao pendente foi
  comprovada posteriormente apenas para transporte, conforme checkpoint abaixo.
- Checkpoint documental local 0.1.809: bump unico executado pelo agente principal;
  nao repeti-lo. Sem mudanca funcional, nova migration ou novo deploy para esse
  registro. Artefatos produtivos backend/frontend/admin permanecem em 0.1.808.


### Transporte webhook assinado sem operacao financeira — 10/11/2026, 20:18:05 BRT

- [x] Sob autorizacao explicita, somente `product.updated` foi acrescentado
  temporariamente ao destino live (16 → 17 eventos), preservando URL, nome,
  descricao, API, conta, status e segredo. Antes dessa adicao, o console visual
  recusou reenvio com `not_subscribed`, sem entrega; a recusa anterior do parser
  WebMCP tambem nao havia enviado evento.
- [x] Console visual oficial Stripe Shell reenviou uma vez um evento real
  `product.updated` ja existente, sem criar evento, usar fixture sintetica ou
  gerar operacao financeira. Painel Event deliveries: Delivered HTTP 200,
  API `2026-10-28.endive`, resposta exata
  `{"status":200,"success":true,"data":{"processed":false}}`.
  Assinatura/transporte aceitos; topico fora da allowlist financeira ignorado,
  como esperado. Evidencias visuais/operacionais privadas, sem IDs ou segredos
  neste registro.
- [x] `product.updated` removido e configuracao salva. Leitura final do servidor
  confirmou exatamente os 16 topicos originais e demais campos preservados.
  Nenhuma permissao, chave, configuracao de Radar ou gate foi alterada.
- [x] Inventarios READ ONLY antes/depois mantiveram oito contagens em zero:
  inbox do evento reenviado, operacoes, assinaturas Stripe, recibos financeiros,
  jobs do ledger, jobs fiscais, documentos fiscais e ofertas habilitadas.
- [x] Runtime posterior: checkout disabled; collection, reconciliation, ledger,
  emissao e automacao fiscal Stripe false; piloto fiscal vazio. Oferta revisao 1,
  2990 centavos BRL/month, checkout false. Backend `/health`, `/ready` e `/ping`
  HTTP 200/0.1.808 apos a prova.
- [ ] Recebimento e processamento de eventos financeiros, conciliacao e E2E live
  continuam nao testados e nao autorizados. O HTTP 200/processed false fecha
  somente o gate de transporte assinado, sem habilitar vendas, cobrancas,
  renovacoes, beneficios ou emissao fiscal.
- Checkpoint documental local 0.1.810, bump unico do agente principal. Nenhuma
  mudanca de codigo/schema ou novo deploy foi necessaria; producao permanece
  0.1.808. Nenhuma cobranca real, nota, assinatura ou operacao financeira criada.


### Evidencias finais de liberacao 0.1.811 (antes da promocao)

- Check raiz aprovado em0.1.811: frontend1252pass/16opt-inskips,
  backend1370pass/19opt-inskips, admin264pass e video100pass/16opt-inskips;
  suites opt-in relevantes PG executadas separadamente com sucesso, sem usar skip
  como criterio. Builds backend/admin/frontend aprovados; frontend compilado /version200
  0.1.811/no-store/noindex, login200 e billing anonimo307; servidores QA encerrados.
- Browser local real320/390/1440: cortesia com contrato futuro pode cancelar a
  cobranca sem perder beneficio; cartao substituido apos recusa gera zero captura;
  CTA explicito retoma a mesma assinatura e captura uma vez; SetupIntent e PI com
  desafios3DS reais test concluidos; dois pagamentos sandbox confirmados, nao live.
- Historico de contrato cancelado/expirado aparece no plano gratuito. Endereco
  fiscal editado e salvo pela UI retorna ao plano gratuito, sem nova assinatura,
  acesso profissional ou nota; refetch autoritativo evita redirect por cache antigo.
- Falhas429 preservam CORS para origens permitidas e continuam limitadas, incluindo
  OPTIONS; HTTP real cobre origem negada/429 legivel/preflight. Limites produtivos
  nao foram alterados. QA multiploIPloopback precisou quota local existente1000.
- Readiness live somente leitura: conta Stripe habilitada sem pendencias,
  produto/preco ativo2990BRLmensal; SendNFready/liveReady, emailenabled,
  approval_requiredfalse. Fiscal010501/ISS201 e descricao anterior preservados.
- Teste fiscal real com chave test: preview2990, pagamento/ledger/auditoria/recovery,
  uma unica criacao SendNF com simulationnever, recusa governamentalE0207 por CPF
  oficial de exemplo nao cadastrado. simulationfalse/accesskeynull; replay nao cria
  outra nota. Isso valida recusa/recuperacao, NAO autorizacao governamental/email.
- Nao houve schema novo, pacote, mock de provider, cobranca ou NFS-e live. Autenticacao
  QA temporaria restaurada e recorrencias criadas encerradas, preservando historico.
  Primeira transacao real, PDF autorizado e entrega de email permanecem evidencia
  a coletar apos acao do usuario; nao se afirma ausencia absoluta de falhas.

Fechamento CORS: backend check final1393total/1374pass/19opt-in skips/zerofalhas e build
aprovados;9testesHTTP reais do contratoCORS/limiter passaram. Preflight esgotado
continua falhando fechado; nao se promete leitura de429 quando o proprio OPTIONS
e bloqueado. Limite live1000 foi observado por headerpublico, sem alteracao.

### Publicacao e liberacao ativa 0.1.811 — 10/11/2026 BRT

Este checkpoint supera o estado produtivo inativo dos registros anteriores.
O usuario autorizou o fechamento integral e a ativacao Stripe/SendNF, mantendo
a primeira cobranca real sob sua propria acao. Nao se declara E2E financeiro
live concluido antes dessa transacao.

- [x] Commit validado `3e27a435b` promovido por PR #175, merge revisado
  `main@e3af0ef`; branch homolog preservada. Backend/frontend/admin publicados
  separadamente em 0.1.811. Video sem alteracao funcional ou novo deploy.
- [x] Backend iniciou apos migrations concluidas, sem marcador de falha observado.
  Smoke publico final em 10/11, 21:44 BRT: `/health` e `/ready` HTTP 200/no-store;
  `/ping` HTTP 200/0.1.811/no-store/noindex/nofollow/noarchive.
- [x] Identidade Vercel confirmada pelo usuario. Frontend e admin concluidos e
  promovidos aos dominios correntes: ambos `/version` HTTP 200/0.1.811,
  no-store/max-age=0/noindex/nofollow/noarchive. GET publico do login administrativo
  retornou HTML 200/noindex; essa leitura nao substitui sessao autenticada.
- [x] POST unico `{}` sem Stripe-Signature foi recusado com HTTP 400 e codigo
  controlado de assinatura invalida. GETs anonimos de configuracao Stripe,
  assinatura/historico e current retornaram 401 sem dados. OPTIONS com origem
  www permitida retornou 204; GET 401 preservou CORS, private/no-store e no-cache.
  Nenhum evento financeiro foi fabricado ou reenviado por esse smoke.
- [x] Runtime conferido com `BILLING_CHECKOUT_GATEWAY=stripe` e cinco gates true:
  reconciliation, collection, ledger, emissao fiscal Stripe e automacao fiscal
  Stripe. Segredos/publishable key/conta/modo/webhook conferidos sem registrar
  valores; chave publica do painel coincide com a configurada e a API identifica
  a conta da chave restrita. Frontend recebe publishable key do backend autenticado,
  nao de uma variavel compilada NEXT_PUBLIC_STRIPE.
- [x] SendNF live identity/readiness/go-live/envio ao tomador/aprovacao automatica
  conferidos por leitura. Codigo 010501, ISS explicito 201 (2,01%) e descricao
  contabil anterior preservados. Default ISS remoto null e aceito pelo contrato:
  o snapshot envia 201 integralmente ao preview e a criacao, sem alterar cadastro.
- [x] Oferta habilitada pela CLI auditada, com responsavel real e inventario exato:
  revisao 1 → 2, checkout true, 2990 centavos BRL/month, applied true. Releitura do
  banco confirmou oferta/auditoria, sem criar ou alterar preco/produto remoto.
- [x] Inventario posterior: zero contratos, inbox, operacoes, recibos, jobs ledger,
  jobs fiscais e documentos fiscais Stripe; uma oferta habilitada. MP/SendNF legados,
  permissao das chaves e Radar preservados. Nao houve cobranca ou nota live do agente.
- [x] Automacao fiscal integral foi habilitada conforme a ultima autorizacao
  explicita do usuario, com inventario Stripe vazio. Nao foi executada a sequencia
  conservadora piloto fiscal individual → auto do runbook: registrar essa diferenca,
  sem apresentar emissao piloto como prova. Abertura e global, nao ha allowlist de usuario.
- [x] Usuario acessar a conta real e iniciar sua primeira assinatura com cartao
  de credito (10/11, 22:23 BRT; confirmacao somente leitura no checkpoint abaixo).
- [ ] Confirmar CPF/nome fiscal auditado individuais faltantes; endereco ja valido.
  Nao reabrir codigo/ISS/descricao ja aprovados pela contabilidade.
- [x] Apos a acao do usuario, comprovar uma cadeia financeira sem duplicacao,
  eventos invoice/subscription conciliados, recibo e periodo/contrato corretos.
- [ ] Apos dados reais completos, comprovar NFS-e autorizada
  (simulation false/chave de 50 digitos/public_query), PDF do proprietario e email
  recebido. Sem sucesso financeiro/NF/email alegado antes da evidencia.

Evidencias privadas, fora do Git e sem valores sensiveis neste registro:
[gates locais](file:///Users/rezende/.codex/lectum-stripe-qa/final-gates-0.1.811-evidence.json),
[UI local](file:///Users/rezende/.codex/lectum-stripe-qa/ui-release-0811-evidence.json),
[E2E fiscal sandbox](file:///Users/rezende/.codex/lectum-stripe-qa/final-fiscal-1794354530230-evidence.json)
e [smoke publico final](file:///Users/rezende/.codex/lectum-stripe-qa/public-release-smoke-20261111.json).
O ensaio SendNF test terminou rejeitado, nao autorizado; os registros anteriores
explicam seus limites. Este checkpoint documental nao exige novo deploy nem altera
os artefatos produtivos 0.1.811. Rollback continua por gates/oferta, sem apagar dados.

Checkpoint documental local 0.1.812: bump unico e cinco manifests sincronizados,
sem alteracao funcional, novo push ou deploy. A evidencia operacional da ativacao
esta em [liberacao live](file:///Users/rezende/.codex/lectum-stripe-qa/live-activation-0811.json).

### Primeira compra real e acompanhamento — 10/11/2026, 22:23 BRT

O usuario executou o pagamento. Consultas READ ONLY no banco e GETs canonicos na
Stripe confirmaram uma unica captura de 2990 centavos BRL, funding credit, sem
estorno ou disputa. InvoicePayment, invoice, PaymentIntent, charge, contrato e
recibo local coincidem; hash imutavel valido. Plano profissional ativo e efetivo,
periodo ate 11/12/2026 01:23:17 UTC. Operacoes checkout/collection completas e
eventos invoice/subscription conciliados. Nenhuma nova cobranca foi gerada pelo agente.

- [x] Captura real unica, recibo integro, vinculos e periodo/contrato ativo conferidos.
- [x] Causa da pendencia fiscal identificada sem expor dados: endereco valido,
  CPF e nome fiscal auditado ausentes. `recipient_incomplete`, job aberto, nenhum
  documento fiscal criado. Verificacao profissional desta conta ainda nao concluida.
- [ ] Titular concluir dados reais pelo onboarding; se conta administrativa, operador
  autorizado preencher CPF real auditado e nome fiscal no admin, sem forjar aprovacao CFP.
- [ ] Observar retomada, autorizacao governamental, PDF e entrega de email depois
  dos dados completos. Nao refazer assinatura nem cobrar outra vez.

Uma inbox `setup_intent.succeeded` permanece sem vinculo local, com diagnostico
`setup_operation_unresolved` e backoff. Nao afirmar que todos os eventos terminaram
nem descartar esse evento por suposicao; a guarda nao atribui cartao/beneficio nem
cobra nesse ramo. `adjustments_complete=false` no ledger e intencional nesta versao:
recebimentos/periodos estao completos ate o cutoff, ajustes historicos liquidos nao.
Consulta de origem do SetupIntent residual interrompida no GET Event por HTTP 403
da chave restrita; nenhuma permissao ampliada, evento descartado ou reprocessado.
O comportamento autonomo ja visto no sandbox e hipotese, nao origem live comprovada.

Evidencia sanitizada privada:
[primeiro pagamento live](file:///Users/rezende/.codex/lectum-stripe-qa/first-live-payment-0811.json).
Producao permanece 0.1.811; pendencia documental nao autoriza fabricar identidade.

### Recuperacao apos espera prolongada pelos dados fiscais — complemento local

Auditoria encontrou erro reproduzivel de politica: `attempts` inclui espera por
CPF/nome/endereco; apos dez passagens, um unico timeout de verificacao Stripe
poderia concluir o job como terminal. Isso ainda nao foi observado no caso live.
Corrigir separando falhas consecutivas de verificacao do total auditado de tentativas.

- [x] Contador persistido expansivo com default zero; preservar attempts/backoff.
- [x] Falhas consecutivas de verificacao mantem limite dez; leitura canonica valida
  seguida de espera de dados ou snapshot reinicia apenas o contador de falhas.
- [x] Erros de acesso/escopo/contrato e pagamentos inelegiveis continuam fechados;
  recuperacao auditada reinicia budget somente apos sua prova canonica existente.
- [x] Regressao pura e PostgreSQL real isolado: espera prolongada, falha transitoria,
  concorrencia/CAS, sucesso e ausencia de pagamento/documento extra.
- [x] Migration local, check/build, revisao cruzada, ADR e commit versionado.
- [x] DTO fiscal aditivo somente leitura e orientacao precisa no historico do titular:
  distinguir endereco/identidade incompletos de documento ainda indisponivel, sem
  expor valores ou alegar autorizacao. CTA respeita etapas WhatsApp/CFP e nao obriga
  perfil ja aprovado/cortesia/rejeitado a refazer verificacao; orientar suporte.
- [x] Validar contrato/ownership, backend antigo e frontend antigo, sem chamar
  providers; browser local real mobile-first e builds dos apps alterados.

Impacto previsto: coluna aditiva com default zero, sem backfill destrutivo, pacote,
env nova ou alteracao de parametros fiscais. Migration antes do backend novo;
backend antigo ignora a coluna. Nao reabrir jobs terminais automaticamente. Nao
alterar coleta financeira, gates, Radar, identidade, aprovacao ou documentos existentes.
Rollback permite backend anterior com coluna preservada. Implementar/validar localmente;
nao apresentar essa correcao como solucao da ausencia real de CPF/nome fiscal.

A melhoria visual reutiliza o historico/fluxo existentes; nao cria formulario fiscal
paralelo nem permite autodeclarar aprovacao. Necessidade constatada: a mensagem
generica "Nota fiscal em preparacao" nao explica falta de identidade e sugere somente
endereco. Projecao aditiva usa validacao fiscal ja existente e nunca trata dados
completos como autorizacao governamental. Nao se amplia acesso do onboarding.


Validacao local 0.1.813: migration aplicada no PostgreSQL de QA sem reset; Prisma
validate/status aprovados. Oito testes de politica/repositorio/recovery com PG real,
quatro testes de projecao fiscal/backend e 39 focais frontend aprovados. Check
integral da raiz, builds backend/frontend, smoke compilado `/version` 0.1.813,
login 200 e assinatura anonima protegida aprovados. Revisao cruzada final sem
bloqueadores. Bump unico sincronizado nos cinco manifests; commit deste fechamento.

QA visual mobile-first: tres contas locais com recibos reais previos do sandbox,
320/390/1440 (nove capturas), sem overflow. Endereco, cadastro e suporte corretamente
separados; destinos reais de endereco/cadastro abriram, sem enviar formulario.
O clique de Link pela automacao nao confirmou navegacao; os destinos observados
foram validados por navegacao direta, sem atribuir essa limitacao a falha do app.
Builder/Quick Copy indisponivel; inventario/proto local como referencia. Autenticacao
temporaria restaurada, sessoes extras removidas, servidores encerrados e contagens
financeiras/fiscais preservadas. Providers, chaves e envs live ausentes do runtime QA.
Nenhuma cobranca ou nota foi produzida por esses testes.

Preflight de publicacao em 11/11/2026 02:01 UTC: Dokploy homolog backend/video com
Autodeploy OFF e zero schedules; preview backend OFF. Vercel frontend/admin com
Ignored Build `exit 0` e auto-assign de dominios OFF. Conferencia feita nos provedores,
nao por alteracao documental. Publicacao ainda pendente neste commit; nao modificar
gates, oferta, Radar ou identidade do titular. Evidencias privadas sanitizadas:
`post-payment-0813-final-check.log`, `fiscal-retry-budget-local-20261111.log`,
`fiscal-guidance-visual-0813.json`, `fiscal-guidance-http-evidence.json` e
`release-guards-0813.json`, em `/Users/rezende/.codex/lectum-stripe-qa/`.
