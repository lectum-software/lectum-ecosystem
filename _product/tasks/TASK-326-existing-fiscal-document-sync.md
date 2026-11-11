# TASK-326 - Sincronizacao de documentos fiscais existentes apos estorno

Data: 2026-11-11
Status: Concluida e publicada; backend 0.1.818 validado em 11/11/2026
Dependencias: TASK-323, TASK-325
Decisao: [ADR-0691](../../adrs/0691-existing-fiscal-document-sync.md)

## Pedido e limites

Corrigir a divergencia de uma NFS-e ja cancelada no SendNF, validar localmente e
publicar por PR homolog -> main. Confirmar a nota numero 4 cancelada no Lectum.
Nao emitir documentos, cobrar, estornar novamente, cancelar outra nota, alterar
Radar ou mudar gates produtivos. A operacao remota de cancelamento ja foi concluida
sob autorizacao anterior; esta task apenas observa e sincroniza o documento.

## Falha e escopo

O worker revalida pagamento aprovado/nao estornado antes de consultar um documento
ja emitido. Apos refund, essa regra de emissao impede o GET fiscal e pode deixar
o registro em manual_review, excluido das proximas consultas. O PDF ja rejeita
documento remoto cancelado, mas nao persiste a observacao; o historico fica defasado.

- Separar consulta GET-only de documento existente da elegibilidade de nova emissao.
- Validar empresa, ambiente, conta/gateway, referencia, valor, snapshot e ID canonico.
- Persistir estado fiscal com CAS/lease e cancelamento monotono; refund sozinho
  nunca significa cancelamento fiscal. Preservar fatos financeiros e snapshot.
- Retomar consultas limitadas de documentos existentes em manual_review, sem
  reabrir trabalhos de emissao sem document_id. Falha transitoria nao inventa estado.
- Reutilizar consulta no PDF e preservar autorizacao, auditoria e concorrencia.
- Disponibilizar comando operacional estritamente limitado a um documento existente,
  sem bootstrap/collector/fila de emissao, para verificacao imediata autorizada.
- Historicos continuam leituras locais; estados Cancelada/Estornado ja existentes
  na interface serao reutilizados. Nao criar novo formulario nem redesenhar telas.

## Impacto de deploy

Backend compativel com frontend/Admin atuais. Sem schema/migration, package ou env
obrigatoria nova. Nenhum gate ou credencial sera alterado. Deploy somente apos
check/build local, revisao e verificacao dos gatilhos externos de homologacao.
Rollback de codigo nao reverte cancelamento fiscal nem historico financeiro.
Inventario antes/depois deve comprovar ausencia de novas cobrancas/documentos;
sincronizacao pode alterar apenas a projecao fiscal e diagnosticos seguros.

## Aceite

- [x] Documento existente e consultado sem SDK financeiro, readiness ou emissao.
- [x] Pagamento estornado sem documento continua inelegivel para emissao.
- [x] Escopo/snapshot divergente, CAS perdido e estados concorrentes falham fechados.
- [x] Documento cancelado nao retorna PDF nem regride para autorizado.
- [x] Recuperacao bounded de documento em manual_review e idempotente.
- [x] Regressao de historico preserva Estornado financeiro e Cancelada fiscal.
- [x] Testes de contrato/PG real, checks e build locais aprovados; sem mocks para prova E2E.
- [x] Bump unico, cinco manifests, ADR, commit homolog e PR revisado; checks locais/hooks aprovados, sem checks remotos configurados.
- [x] Producao saudavel e NFS-e 4 Cancelada no Lectum, sem nova cobranca/emissao.

## Evidencias

Banco local de QA isolado em loopback; backend/.env aponta
para ambiente remoto e nao pode ser usado nos testes. Chave local SendNF e test;
nao copiar chave live para local nem criar documento para fabricar prova positiva.
Validacao real final realizada por GET do documento existente, no ambiente autorizado.

Em 11/11: 29 arquivos fiscais/financeiros, 153 testes aprovados, zero falhas/skips,
incluindo PostgreSQL real isolado. Fixtures efemeras servem exclusivamente para
contratos/persistencia, nao representam autorizacao governamental nem prova E2E.
Smoke HTTP compilado local 8/8: login real, historico com estorno/cancelamento,
download 409/no-store/nosniff, owner divergente404, anonimo401, ID invalido400,
zero chamadas externas e registros inalterados. Sem carregar bootstrap/worker.
Revisao independente confirmou separacao GET/emissao e protecao CAS; imports
puros funcionam sem env de banco/JWT. Build backend aprovado em Node24.22.1.
Gate integral aprovado com launcher seguro local; primeira tentativa sem env de teste foi recusada
por DATABASE_URL/JWT ausentes, corrigida somente no launcher local isolado.

Preflight produtivo somente leitura em 14:10 BRT: dois recibos Stripe integros,
um pago/um estornado integralmente, tres documentos existentes; zero trabalhos
fiscais pendentes e zero operacoes de cobranca ativas. GET oficial Stripe as
14:17 BRT confirmou zero invoices open/draft, sem paginacao restante. Nenhuma
alteracao de gates ou provider. Evidencias privadas fora do Git, sem PII/segredos.

## Operacao pontual apos deploy

`node dist/operations/billing/reconcile-existing-invoice.js --help` explica os
argumentos obrigatorios: ID local, ID remoto esperado e modo. Sem `--apply`, faz
somente GET canonico e verifica CAS, sem persistir. Com `--apply`, atualiza somente
a projecao fiscal daquele documento, sem filas nem escrita no provider. Rejeita
lease ativo/escopo divergente. Nao usar processInvoiceQueue, recuperacao de emissao,
SQL manual de status ou novos documentos para forcar a sincronizacao.

Polling de documentos autorizados continua limitado ao intervalo anterior de24h;
PDF ou comando pontual consultam imediatamente. A tela aberta nao faz polling:
recarregar historico apos conciliacao. Nao inferir cancelamento fiscal de refund.

Check integral `pnpm check` aprovado com runtime Node24.22.1 e env local isolado.
Cinco avisos informativos useTemplate de scripts fiscais antigos permanecem como
baseline; nenhuma falha/warning. Suites de integracao desabilitadas por opt-in no
check amplo foram executadas separadamente no gate fiscal PG serial (153/153).
Bump unico realizado para0.1.818 e cinco manifests sincronizados. Autodeploys
homolog backend/video e previews backend OFF; schedules vazios; Vercel frontend
/Admin com Ignored Build Step `exit 0`. Backend/video produtivos sem autodeploy.
Nenhuma configuracao foi alterada para atingir esses resultados.

## Publicacao e verificacao final em 11/11/2026

Codigo no commit `d0ef73933`, promovido pelo PR **#178** de homolog para main,
merge `0e8eb37d3` as **14:26 BRT**. Nao havia checks GitHub remotos configurados;
checks/builds locais, revisao e hooks aprovados, sem ignorar gate com falha.
Backend **0.1.818** confirmado apos deploy, por volta de **14:45 BRT**. `/health`,
`/ready` e `/ping` retornaram HTTP 200; `/ping` confirmou versao e no-store.
Admin **0.1.816** e frontend **0.1.813** permaneceram publicados, sem redeploy.

O primeiro build remoto falhou por falta de disco, mantendo o backend anterior
0.1.816 saudavel. Sob autorizacao explicita, foi removido somente cache de build
nao utilizado do builder default: 5,388GB antes da repeticao do build e 3,671GB
apos sua conclusao. Fingerprints de containers, volumes e imagens permaneceram
identicos antes/depois de cada limpeza. Nenhum servico, dado ou imagem foi
excluido para liberar espaco. Estado final: cerca de 4,4GB livres, **93% de uso**.
A publicacao concluiu, mas a capacidade da VPS ainda exige acompanhamento;
esta limpeza nao resolve definitivamente a pressao de disco.

Dry-run do comando compilado confirmou `cancelled` no SendNF. Aplicacao pontual
GET-only as **14:49:30 BRT** sincronizou somente a projecao local da NFS-e 4,
de `authorized` para `cancelled`. Digest dos campos imutaveis da nota e recibo
estornado permaneceram iguais. Nao houve chamada de emissao, cancelamento,
cobranca ou estorno, nem execucao de fila para forcar a atualizacao.

Apos reload, o Admin exibiu **Cancelada** e o historico do titular **Nota fiscal
cancelada**, sem controle de download dessa nota. O financeiro continuou
**Estornado / R$29,90** e a conta afetada no plano Free. Inventario READ ONLY
final as **14:50:21 BRT**: tres documentos antes/depois (dois autorizados e um
cancelado), dois recibos integros (um pago, um estornado integralmente).
Fingerprints de operacoes, recibos, contratos, trabalhos fiscais, conciliacao
financeira e auditorias de download permaneceram iguais; gates tambem inalterados.
Nao houve nova cobranca, nota, cancelamento, refund ou alteracao de Radar.

Evidencia comparativa privada `task326-production-comparison.json` mantida fora
do Git; documentos publicos registram apenas resultados agregados, sem IDs de
clientes/documentos, PII ou segredos. Checkpoint documental **0.1.819** separado
da release, somente local em homolog, sem novo push/deploy.
