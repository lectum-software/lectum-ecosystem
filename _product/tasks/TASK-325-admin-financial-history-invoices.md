# TASK-325 - Historico financeiro administrativo e NFS-e

Data: 2026-11-11
Status: Implementacao local validada; task parcial por prova positiva PDF elegivel pendente
Dependencias funcionais: TASK-324, TASK-323, TASK-56, TASK-62, TASK-315/317
Decisao: [ADR-0690](../../adrs/0690-admin-financial-history-invoices.md)

## Pedido e limites

Usuario autorizou historico financeiro completo no Admin, incluindo status e download
da NFS-e, validacao local e commit em homolog. Sem push/deploy, novas cobrancas,
emissao, recuperacao/replay fiscal, alteracao contratual ou Radar. Nao substituir
a sessao do cliente; verificacao owner-scoped de producao permanece pendente.

## Escopo

- Novo GET administrativo paginado `/api/admin/private/finance/history`, com
  filtro opcional `user_id`, `page`, `limit` e status financeiro. Todas as assinaturas
  do escopo, inclusive canceladas; nao apenas contrato vigente ou ultimas 10/100 linhas.
- Fontes locais: recibos Stripe com integridade verificada, eventos MP explicitamente
  vinculados e snapshots fiscais existentes. Sem consulta de gateway para montar
  o historico. Nenhum valor derivado do preco atual do plano.
- Dedupe por identidade financeira gateway/conta/modo/pagamento, nunca por dia;
  invoice_id associa NFS-e sem apagar pagamentos distintos da mesma fatura.
- Paginacao dos registros locais elegiveis e ordenacao estavel. Limite operacional
  de leitura deve ser explicito, nunca truncar silenciosamente ou alegar cobertura
  externa completa. Legado sem conta/modo comprovados e rotulado como tal.
- DTO allowlist, sem CPF/email, payload, segredo ou IDs externos. Nome de exibicao
  e IDs locais somente no contexto administrativo ja existente. Status financeiro
  separado de fiscal; estorno/disputa nao vira novo recebimento.
- Perfil/Plano e pagamentos e Financeiro/Cobrancas usam componente e caller comuns,
  com estados loading/erro/vazio, paginacao e mobile-first 390px/320px/desktop.
  Endpoints antigos preservados para rollout, sem redefinir metricas existentes.
- GET `/api/admin/private/finance/invoices/:id/pdf?user_id=...`: sessao Admin
  ativa/confirmada, escopo do usuario/perfil/contrato/empresa/modo/gateway/conta,
  revalidacao canonica SendNF e proxy binario limitado. Sem expor URL privada.
- Reaproveitar validacao fiscal/PDF existente: `simulation: false`, chave de 50 digitos e
  public_query validos; notas simuladas/rejeitadas/nao comprovadas nao sao autorizadas.
  Auditoria interna minima antes de entregar bytes; falha de auditoria falha fechada.
  Headers private/no-store, nosniff e attachment com filename seguro.

## Decisoes de arquitetura e rollout

Sem novo package, schema/migration ou env obrigatoria. Apps independentes, DTOs
aditivos, backend antes do Admin quando futuramente autorizado. Admin novo diante
de backend antigo mostra indisponibilidade explicita, sem chamar endpoint do dono
ou fabricar NF. Rollback somente codigo; auditoria de leitura permanece preservada.
Builder/Quick Copy indisponivel; exports Plano e pagamentos e Financeiro em
`_product/proto/admin`, mais padroes atuais, sao referencias visuais.

## Aceite

- [x] Historico local de todos contratos elegiveis, paginado, deduplicado e com status honestos.
- [x] Escopo de conta/modo/proprietario e integridade impedem associacao cruzada.
- [x] Estados fiscais e limite de download Admin protegido/auditado implementados e testados em politica/PG, sem emissao; entrega real coberta pelo criterio separado abaixo.
- [x] Perfil e Financeiro com componentes mobile-first, sem regressao do legado.
- [x] Testes de politica/HTTP/PG e QA com recibos reais locais, sem efeitos financeiros.
- [ ] Prova positiva E2E de PDF governamental elegivel pelo novo endpoint Admin.
- [x] Check raiz, check/build backend/Admin, ADR/modelo e bump unico sincronizado.

## Pendencia externa conhecida antes da implementacao

Inventario READ ONLY do QA e 11 backups existentes: 3 recibos Stripe test/4 contratos,
zero billing_invoices/jobs. Documento SendNF test antigo e simulated; teste recente
`simulation: never` foi rejected. Nenhuma NF governamental elegivel com contexto local
recuperavel. Nao copiar dados/segredos de producao, emitir ou inventar vinculo para
fechar a prova positiva. Essa validacao fica parada/pendente; demais criterios
locais podem avancar sem afirmar task integralmente concluida. Evidencia privada:
`admin-invoice-history-0325-readonly-inventory.json`.

## Evidencias locais de 11/11/2026

- Historico: 8 testes de projecao/PG aprovados, incluindo mais de 100 registros,
  contratos cancelados, deduplicacao, estorno/disputa, dois pagamentos da mesma
  fatura, integridade, ownership e calendario BRT (00h/23h59 e limites adjacentes).
- Referencias MP ambiguas sao identificadas contra todos os contratos persistidos,
  independente do filtro por usuario/busca; nao passam a pertencer ao usuario
  filtrado. Eventos sem referencia explicita nao sao prova de ownership.
- Repositorio PDF/auditoria: 7 testes em PostgreSQL isolado aprovados. Fixtures
  efemeras de politica foram removidas; nao representam notas emitidas/autorizadas.
- Limite fiscal compartilhado/owner/Admin: 5 testes aprovados; fixture do teste
  owner existente atualizada para cumprir o hash canonico, sem relaxar guardas.
- Admin: 25 testes de renderizacao/politica aprovados. Loading e erro escondem
  linhas anteriores, PDF exige MIME, assinatura binaria e tamanho limitado.
- HTTP local: 32 GETs aprovados, sessao administrativa normal criada pelo browser,
  sem fabricar token. Global com 3 recibos; usuarios com 2/1/0; filtros, paginacao,
  allowlist, no-store, 401 anonimo, 400 query invalida e 503 fiscal desativado.
  O 503 nao e prova de autorizacao positiva nem de transporte SendNF.
- Browser real: Financeiro/Cobrancas e perfil de contrato encerrado, busca/status,
  vazio e indisponibilidade real do backend local, 320px/390px/1440px, sem overflow
  horizontal. Usa os recibos reais do QA,
  nao endpoints ou notas simuladas para concluir a interface.
- Snapshot de 14 tabelas financeiras/fiscais e auditoria preservado durante os
  GETs. Nenhum SDK de pagamento, emissao, replay, reconciliacao ou producao.
- Check raiz (inclui backend e Admin), builds backend/Admin e repeticao dos 15
  testes focais com PostgreSQL aprovados. Versao local 0.1.816 nos cinco manifests.
  Build Admin inicialmente detectou source maps residuais do dev server; depois
  de parar o dev e remover somente `admin/.next/dev` gerado, build completo passou
  com o gate original intacto. Nenhum build ou recurso remoto foi usado.
- Sessao temporaria de QA removida, credencial anterior restaurada e baseline das
  14 tabelas/auditoria confirmado novamente apos os testes PG. Nao restou token
  temporario nem nota/recibo de teste de repositorio no banco.
- Commit solicitado somente em homolog; nenhum push/deploy integra esta entrega.
- Artefatos privados em `/Users/rezende/.codex/lectum-stripe-qa/`: logs
  `task325-*`, `admin-history-http-evidence-0325.json` e capturas de tela.

## Limites deliberados

Historico significa registros financeiros locais elegiveis, nao extrato reconciliado
do provedor ou lista de toda operacao tecnica de checkout. Fontes: recibos Stripe,
eventos MP de pagamento e registros fiscais; estes ultimos nao comprovam liquidacao.
Pessoas/perfis/contratos excluidos nao sao reexpostos por esta leitura. Consulta
com mais de 10.000 contratos ou registros por fonte pede filtro explicito (503),
sem entregar totais parciais. Usar usuario/nome/identificador quando o limite for de
contratos. Cobertura externa fica marcada como nao verificada. Sem novo custo,
package, migration ou env obrigatoria.
