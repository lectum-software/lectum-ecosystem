# TASK-325 - Historico financeiro administrativo e NFS-e

Data: 2026-11-11
Status: Concluida; backend/Admin 0.1.816 publicados e download administrativo real validado
Dependencias funcionais: TASK-324, TASK-323, TASK-56, TASK-62, TASK-315/317
Decisao: [ADR-0690](../../adrs/0690-admin-financial-history-invoices.md)

## Pedido e limites

Autorizacao inicial: historico financeiro completo no Admin, incluindo status e
download da NFS-e, validacao local e commit em homolog, sem publicacao nessa etapa.
Depois, o usuario autorizou publicar o lote via PR homolog -> main e validar uma
NFS-e ja existente pelo Admin de producao, sem cobrar nem emitir. Essa publicacao
e a prova positiva foram concluidas em 11/11/2026, conforme evidencias abaixo.
Sem recuperacao/replay fiscal, alteracao contratual ou Radar. Nao substituir a
sessao do cliente: verificacao owner-scoped e recebimento na caixa de entrada do
titular continuam fora desta prova administrativa.

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
aditivos, com rollout backend antes do Admin. Admin novo diante
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
- [x] Prova positiva E2E de PDF governamental elegivel pelo novo endpoint Admin, com download real no browser em producao autorizada, sem nova emissao.
- [x] Check raiz, check/build backend/Admin, ADR/modelo e bump unico sincronizado.

## Limite do QA no checkpoint local (historico)

Inventario READ ONLY do QA e 11 backups existentes: 3 recibos Stripe test/4 contratos,
zero billing_invoices/jobs. Documento SendNF test antigo e simulated; teste recente
`simulation: never` foi rejected. Nenhuma NF governamental elegivel com contexto local
recuperavel. Nao copiar dados/segredos de producao, emitir ou inventar vinculo para
fechar a prova positiva. A validacao permaneceu pendente nesse checkpoint; os
demais criterios locais avancaram sem declarar conclusao integral. A prova foi
obtida depois, em producao autorizada, sobre documento existente. Evidencia privada:
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
- O checkpoint local original foi commitado somente em homolog, sem push/deploy
  naquela etapa. A publicacao autorizada posterior esta registrada abaixo.
- Artefatos privados em `/Users/rezende/.codex/lectum-stripe-qa/`: logs
  `task325-*`, `admin-history-http-evidence-0325.json` e capturas de tela.

## Publicacao e prova positiva administrativa em 11/11/2026

- Lote publicado por PR #177 (`homolog` -> `main`), merge `ca7683f4b`.
  Backend e Admin 0.1.816 publicados, com deploy concluido as 11:23 BRT.
  Frontend 0.1.813 preservado e compativel; video fora do escopo de publicacao.
  Nenhum novo schema/migration, env, worker ou gate de ativacao foi introduzido.
- Smoke publico: `/health`, `/ready`, `/ping` e `/version` do Admin e frontend
  responderam HTTP 200. Versoes conferidas: backend/Admin 0.1.816 e frontend
  0.1.813, com no-store; rotas de versao tambem noindex.
- Historico financeiro do Admin exibiu o pagamento como Pago e a NFS-e numero 3
  como Autorizada. Clique real em Baixar NFS-e concluiu o download no browser as
  11:24:21 BRT, pelo novo fluxo administrativo autenticado: 63.405 bytes,
  assinatura `%PDF-` e marcador EOF validos, SHA-256 registrado somente na
  evidencia privada. Nenhum conteudo sensivel foi extraido ou anexado ao repo.
- Inventarios READ ONLY as 11:16:13 e 11:24:50 BRT confirmaram os sete
  fingerprints financeiros/fiscais exatamente iguais: operacoes, recibos,
  contratos, jobs fiscais, notas fiscais, inbox e conciliacao financeira.
  Permaneceram duas operacoes completas, um recibo Stripe integro de R$29,90
  BRL, um pagamento/uma fatura, nenhum reembolso e duas NFS-e/documentos.
  Nao houve nova cobranca, emissao, contrato ou operacao financeira na janela.
- A unica alteracao observada foi a auditoria de PDF administrativo preparado,
  de zero para um registro. O download foi confirmado separadamente pelo browser;
  auditoria isolada nao provaria salvamento. Todos os gates preexistentes foram
  preservados, sem reconfigurar vendas, workers, emissao ou Radar.
- Essa evidencia encerra o criterio positivo do Admin, nao comprova login,
  abertura/download pelo titular nem recebimento na sua caixa de entrada.
  Tambem nao representa nova conciliacao externa completa ou ausencia de backlog
  remoto: o inventario explicita `remote_backlog_checked: false`.
- Evidencias privadas: `task325-production-before.json`,
  `task325-production-after.json`, `task325-production-admin-pdf.json` e
  `task325-production-public-smoke.json` e `task325-production-comparison.json`,
  no diretorio privado de QA ja indicado. A captura segura
  `task325-production-history.png` documenta somente o cabecalho do historico;
  a prova do PDF e o download concluido e sua evidencia binaria, nao essa imagem.
- Fechamento documental local separado da release produtiva: checkpoint 0.1.817
  somente em homolog, com bump sincronizado; sem push e sem novo deploy.

## Limites deliberados

Historico significa registros financeiros locais elegiveis, nao extrato reconciliado
do provedor ou lista de toda operacao tecnica de checkout. Fontes: recibos Stripe,
eventos MP de pagamento e registros fiscais; estes ultimos nao comprovam liquidacao.
Pessoas/perfis/contratos excluidos nao sao reexpostos por esta leitura. Consulta
com mais de 10.000 contratos ou registros por fonte pede filtro explicito (503),
sem entregar totais parciais. Usar usuario/nome/identificador quando o limite for de
contratos. Cobertura externa fica marcada como nao verificada. Sem novo custo,
package, migration ou env obrigatoria.
