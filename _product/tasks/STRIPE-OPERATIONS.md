# Stripe: operacao e publicacao controlada

TASK-320 / ADR-0684. Atualizado em 10/11/2026. Este runbook **nao autoriza deploy,
cobranca, emissao fiscal, reprocessamento remoto ou mudanca de Radar**. O estado
de aceite e a fonte de verdade continuam na [TASK-320](TASK-320-stripe-embedded-checkout.md).

## 1. Limites atuais e gates

- Checkout incorporado, 3DS, recusas, renovacao, dunning e cancelamento tiveram
  provas reais no sandbox com PostgreSQL local. Nao repetir todo o lote para
  suprir uma pendencia diferente. Preservar evidencias e recorrencias encerradas.
- Cortesia: Radar para SetupIntents continua OFF, aguardando suporte Stripe
  protocolo18652759. Nao alegar credito-only integral sem essa prova. Atribuicao
  automatica de cartao no trial nao e impedida apenas pelo guard local.
- Fiscal: chave SendNF test restrita instalada apenas localmente; consultas GET
  passaram. Usuario reconfirmou vigencia de codigo010501/ISS2,01% e reutilizacao
  da descricao fiscal exata anterior, ja presente no backend publicado; nao
  inventar nova redacao nem copiar dados fiscais para logs. Falta provisionar a
  descricao no QA de forma segura e autorizar teste fiscal. Suporte esclareceu
  cnc_missing_in_test: cadastro governamental test
  ausente, sem regularizacao a cargo da Lectum. Conforme complemento posterior,
  existe tentativa real de transmissao antes da recusa cadastral e do fallback
  simulado; nao confundir ausencia de autorizacao com ausencia de transmissao.
  Suporte posteriormente confirmou `simulation: "never"` disponivel em test,
  resolvendo a divergencia documental. Parametro nao foi enviado, validado em
  emissao ou adotado pelo emissor nesta etapa; implementar/testar somente em
  escopo separado autorizado.
  Documento simulado nao comprova autorizacao governamental. Nao emitir nem
  executar preview sem autorizacao; nenhuma alteracao cadastral compartilhada.
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
Nao foi feita consulta live nesta etapa. Publicar backend conservador e depois
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

No QA local as flags SendNF de habilitacao/emissao/auto permanecem false. Em
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
Escreve Customer/create, Subscription/create/update/cancel e SetupIntent/create;
confirmacao do Intent e feita pelo Stripe.js. Conferir acesso minimo real ao
preparar a chave de cada ambiente, sem prometer paridade da chave live nao auditada.
O runtime nao cria Price/Product, refund ou disputa. `stripecli_session_write`
pertence ao encaminhamento CLI local, nao ao endpoint produtivo de webhook.

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

Scheduler: primeira rodada apos30s, proximas apos60s, ate10 eventos e10 operacoes
recuperaveis por rodada. Alterar flag de processo requer configuracao/reinicio
controlado; flag true nao inicializa retroativamente scheduler que nao iniciou.
O webhook pode acumular inbox enquanto scheduler esta OFF. Recuperacao periodica
de operacoes e GET-only no provider; evento assinado de SetupIntent pode atribuir
cartao remotamente. Nao chamar todo o worker de somente leitura.

## 4. Comandos e inventario

No desenvolvimento: `pnpm --dir backend exec tsx src/operations/billing/NOME.ts`.
Na imagem compilada, em `/app`: `node --enable-source-maps dist/operations/billing/NOME.js`.
O container produtivo nao possui `src`/`tsx`; nao instalar dependencias para
contornar isso. `--help` sozinho mostra argumentos, sem executar operacao.

### Oferta: `stripe-offer`

Obrigatorios: `--account`, `--mode test|live`, `--price`, `--expected-revision`,
`--actor-admin-id`, `--reason initial_catalog|enable_checkout|pause_checkout|replace_offer`.
IDs sao referencias operacionais, nao valores de chave. Nao passar segredo em argv.

- Sem `--apply`: dry-run; faz GET Stripe e transacao/lock local, sem mudar registros.
- `--apply`: grava versao/oferta e auditoria, nunca modifica contratos remotos.
- `--enable-sales`/`--disable-sales`: mutuamente exclusivos. Nova oferta/preco
  substituido fica pausado sem enable; mesmo preco pode preservar estado anterior.
- Plano profissional e admin valido devem existir. Revisao0 somente se oferta
  ausente; nao fazer seed. So aceita2990BRL/month/1 nesta etapa.
- Enable exige segredo de webhook e reconciliador configurados; presenca nao
  equivale a entrega/conciliacao E2E nem confirma regras de Radar.

Antes do dry-run, ler `billing_offers`/`billing_price_versions` no banco correto,
em transacao READ ONLY, com filtro de gateway/conta/modo/plano. Conferir revisao,
checkout_enabled e valor/Price sem exportar dados pessoais. O comando nao e um
editor irrestrito nem cria catalogo remoto.

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

## 5. Monitoramento e criterio de parada

Consultar somente agregados/IDs operacionais necessarios em acesso privado:

- Inbox por state/type, maior idade pending, leases expiradas, review_required e
  last_error_code controlado. Comparar recebimento, processed_at e entrega no Stripe.
- Operacoes abertas/creating/review por conta/modo e idade; correlacionar pela
  referencia hash, nao pelo e-mail ou payload. Resolver ambiguidade antes de nova
  tentativa; nunca recomendar pagar de novo sem consultar contrato/pagamento.
- Ledger: cobertura/invoices/recibos/has_more/conflitos; financeiro indisponivel
  significa falta de prova, nao zero. Recibos, beneficio e NFS-e sao fatos separados.
- Versoes por app (`/ping`, `/version`) e `/health`/`/ready`. Essas rotas nao
  comprovam Stripe, webhook, pagamento ou fiscal funcionando.

Parar novas vendas se houver escopo divergente, duplicidade, valor inesperado,
beneficio sem prova ou crescimento de review sem diagnostico. Nao registrar
payload integral, PAN/CVV, client_secret, CPF, email, chave, assinatura ou stack.

## 6. Ordem de futura publicacao e rollback

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

Pausa emergencial de novas adesoes: `BILLING_CHECKOUT_GATEWAY=disabled` com
configuracao/reinicio controlado. Preservar segredos, contratos, webhook e
conciliacao, salvo incidente que exija pausa especifica desses consumidores.
`stripe-offer --disable-sales` depende de GET remoto e pode falhar em indisponibilidade;
nao e o unico controle de pausa. Pausa nao cancela recorrencias no Stripe e nao
impede confirmacoes ja autorizadas. Nao trocar gateway para mercadopago como
fallback, apagar filas/dados ou remover credenciais MP ainda necessarias.

Se reversao binaria for indispensavel, conter novas operacoes e preservar inbox/
ledger/migrations expansivas; revisar compatibilidade dos consumidores antes.
Nao restaurar banco ou regredir schema para desfazer a integracao.
Nao voltar a artefato anterior ao guard fiscal com pendencias Stripe: as novas
envs seriam ignoradas e auto MP poderia autorizar Stripe. Preferir pausa pelo
guard conservado; reversao antiga exige plano especifico para impedir essa
emissao sem apagar filas ou interromper MP.
