# TASK-328 - Fechamento da leitura financeira Stripe no Admin

Data: 2026-11-11
Status: Validada localmente em 0.1.821 (commit local)
Dependencias: TASK-323, TASK-325, TASK-326
Decisao: [ADR-0693](../../adrs/0693-admin-stripe-finance-closure.md)

## Pedido e limites

Usuario pediu auditoria e fechamento do ciclo administrativo de pagamentos,
listagens, precos e custos. Esta e a primeira task delimitada: corrigir a leitura
Stripe no dashboard financeiro, relacao de assinaturas e CSV, preservando o
historico de cobrancas/NFS-e ja entregue. Editor de precos e despesas operacionais
serao tasks sequenciais, nao valores ficticios inseridos neste fechamento.

Producao somente leitura. Nao criar checkout/customer/setup, cobrar, estornar,
cancelar contrato/nota, emitir NFS-e, alterar gates, Radar, precos ou infraestrutura
publicada. Sem publicacao implicita: commits locais em homolog ate autorizacao.

## Falha observada

Admin produtivo exibe recebimentos Stripe no historico, mas a visao geral ainda
oculta todos os indicadores como ledger pendente e lista zero cobrancas. A lista
de assinaturas nao consome os recibos para historico/ultima cobranca. A exportacao
herda a projecao incompleta e possui corte silencioso de cinco mil registros.

## Escopo e contratos

- Reutilizar recibos Stripe com validacao de integridade/escopo/vinculos e valores
  contratados imutaveis. Nao interpretar inbox/operacoes ou reserva como dinheiro.
- Diferenciar recebimentos brutos locais, estornos/disputas observados e cobertura
  externa. Nao apresentar taxas, lucro/liquido ou data economica de ajuste ausentes.
- Base temporal/historica e MRR exigem evidencia; manter indisponibilidade precisa
  quando realmente faltar fonte, nao negar Stripe globalmente por ser Stripe.
- Historico e ultima cobranca sem prometer taxa de sucesso a partir de recibos;
  tentativas recusadas nao sao pagamentos capturados.
- Paginar com ordem deterministica, limitar varreduras explicitamente e impedir
  exportacao truncada silenciosa. CSV deriva da mesma projecao e protege formulas.
- APIs aditivas e compativeis com Admin/backend em versoes diferentes. MP legado
  preservado. Sem SDK/rede/provider dentro do modelo de leitura/transacao.
- Sem schema/migration, nova dependencia ou env obrigatoria nesta task.

## Visual

Fonte: `_product/tasks/PROTO-INVENTORY.md` e `_product/proto/admin/Financeiro.png`.
Builder/Quick Copy indisponivel nas ferramentas deste cliente; fallback local
consultado. Preservar componentes existentes, mobile-first390px e telas maiores.
Imagens sao hierarquia visual, nao fonte de numeros ou regra contabil.

## Aceite

- [x] Dashboard e series consomem fatos Stripe verificados sem ocultacao global.
- [x] Escopo/integridade/temporalidade e disponibilidade honestos por indicador.
- [x] Historico/ultima cobranca na lista de assinaturas inclui Stripe corretamente.
- [x] Ordenacao estavel e CSV sem truncamento silencioso/sem PII tecnica/segredos.
- [x] Testes negativos/PG real e contratos antigos aprovados, sem provider financeiro.
- [x] Checks/build backend/Admin e browser local real390/desktop aprovados.
- [x] Auditoria produtiva somente leitura registrada sem nova transacao/emissao.
- [x] Task/ADR, bump unico/cinco manifests e commit homolog, sem push/deploy.

## Deploy e rollback

Futura publicacao separada autorizada, backend aditivo antes/Admin tolerante;
rollback de codigo nao altera fatos financeiros. Nenhum worker/gate e habilitado.
Pendencia de logs persistentes do backend exige decisao de orquestracao propria,
nao sera contornada com update Swarm efemero ou restart global do Docker.

## Evidencias

- API Express real compilada em loopback, sem bootstrap/jobs, providers sem chaves,
  gates financeiros/fiscais desligados e PG QA isolado. Nunca usado backend/.env.
- Leitura dos tres recibos existentes do sandbox (R$89,70), dois contratos com
  recebimentos e uma reserva sem pagamento. Dashboard, endpoint de cobrancas,
  historico e CSV concordam; reserva cancelada nao vira churn pago.
- HTTP autenticado real: resumo/dashboard/listas 200, acesso sem sessao401,
  consulta futura400. Fontes publicas sanitizadas e identificadores privados do
  gateway ausentes. Tentativas/recusas sem fonte permanecem nao apuradas.
- CSV baixado no browser:8695bytes, tres recebimentos, bruto8970centavos,
  tarifas indisponiveis explicitas; nenhum total parcial apresentado como completo.
- Browser local390/1440: sem overflow de pagina; filtros status/busca/criacao,
  historico expandido e estados vazios aprovados. Filtro de contrato usa criacao;
  inicio Stripe exibido exige primeiro recebimento, nao reserva.
- Regressoes puras cobrem escopo, integridade, preco versionado diferente do
  catalogo, estorno, orfao, falta de cobertura, reserva nao paga, futuro e UTC/BRT.
  Subprocessos de timezone ficam em scripts de teste, nao no runtime.
- Integracao PG real: snapshot RepeatableRead somente leitura, desempate estavel,
  catalogo/contrato arquivado preservam recibo sem reativar acesso. Fixtures
  temporarias de politica/PG nao sao evidencia de cobranca ou conciliacao externa.
- Auditoria produtiva somente leitura: historico Pago/NFS-e3Autorizada e
  Estornado/NFS-e4Cancelada; PDF3 existente baixado (63405bytes, assinaturaPDF).
  Apenas auditoria/observacao de download previstas; nenhuma nota/cobranca criada.
- Credencial administrativa QA e uma sessao temporaria restauradas; fingerprints
  de todas as tabelas de negocio protegidas identicos antes/depois.
- Check integral da raiz e builds backend/Admin aprovados antes do commit;
  pnpm10.33.0/Node24.22.1. Bump unico0.1.821 e cinco manifests sincronizados.

O build Admin inicialmente detectou mapas inline no cache residual `.next/dev`;
removido apenas esse cache gerado apos parar o dev server e repetido build limpo,
sem enfraquecer a verificacao de source maps. Aviso preexistente de import Sentry
obsoleto nao e falha de Biome; nao motivou atualizacao transversal de dependencia.

## Limites remanescentes do pedido abrangente

- Esta task nao entrega editor comercial nem despesas operacionais. Sao as
  proximas tasks, incluindo coerencia da vitrine e contratos existentes.
- Tarifas reais/settlement exigem fonte propria; nenhum valor ausente virou zero.
- Varredura financeira protegida em10mil fatos por fonte; exceder falha fechado,
  sem soma parcial. Historicos maiores exigem agregacao/paginacao dedicada; nao
  prometer que um filtro resolve limite global do dashboard.
- Logs persistentes do backend Application Dokploy nao possuem campo suportado
  no caminho atual. Update Swarm efemero e reload Docker nao resolvem; migracao
  controlada de orquestracao e etapa propria, sem interrupcao improvisada.
- Nenhum push/deploy, gate, preco ou infraestrutura publicada alterado.
- Saude produtiva consultada: backend health/ready200 e versao0.1.818;
  Admin0.1.816 e frontend0.1.813, sem redeploy nesta task.

