# TASK-326 - Sincronizacao de documentos fiscais existentes apos estorno

Data: 2026-11-11
Status: Validada localmente em 0.1.818; publicacao autorizada em preparacao
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
- [ ] Bump unico, cinco manifests, ADR, commit homolog e PR revisado com checks.
- [ ] Producao saudavel e NFS-e 4 Cancelada no Lectum, sem nova cobranca/emissao.

## Evidencias

Banco local de QA isolado em loopback; backend/.env aponta
para ambiente remoto e nao pode ser usado nos testes. Chave local SendNF e test;
nao copiar chave live para local nem criar documento para fabricar prova positiva.
Validacao real final sera GET do documento existente, no ambiente autorizado.

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
