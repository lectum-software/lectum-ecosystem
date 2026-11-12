# TASK-330 - Custos operacionais registrados no Admin

Data: 2026-11-11
Status: Concluida localmente em 0.1.823 e publicada no lote 0.1.824, PR#179, 11/11/2026
Dependencias: TASK-328, TASK-329
Decisao: [ADR-0695](../../adrs/0695-admin-operating-expenses.md)
Modelo: DATA-MODEL.md, secao Custos operacionais administrativos.

## Objetivo e limites

Pedido do usuario abrange gestao do preco e custos. Depois da TASK-329, registrar
custos operacionais manuais no Admin. Nenhum pagamento, emissao, nota fiscal,
provider, recorrencia automatica, importacao bancaria ou alteracao produtiva.
Sem push/deploy. Sem inventar custos reais da Lectum para popular o painel.

## Contrato

BRL em centavos inteiros1..99999999. Competencia civil YYYY-MM-DD de2000..2100,
pagamento civil opcional nao futuro (BRT), sem exigir pagamento apos competencia
(prepagamentos existem). Categoria controlada infrastructure/software/accounting/
marketing/people/taxes/other. Descricao3..140, sem dados pessoais/segredos.
Sem cadastro de fornecedor, parcelas, recorrencia, cambio ou inferencia tributaria.

Criacao com request_key UUIDv4 por ator e fingerprint inicial imutavel; replay
retorna registro atual sem sobrescrever correcoes. Payload inicial diferente409.
Correcao completa e anulacao exigem expected_revision e reason8..240, CAS e
transacao atomica com admin_activity_log. Anulada nao pode ser editada/restaurada
implicitamente. Sem DELETE. Auditoria guarda valores controlados e hashes do
texto livre, nao payload integral nem texto livre nos logs tecnicos.

GET/POST /api/admin/private/finance/expenses; PUT /:id; POST /:id/void.
GET filtros: competence_from/to, category, status(active|voided|all), search,
page/limit (max100), ordenacao competence_date/createdAt/id desc. Linhas, contagem
e totais calculados no MESMO where/snapshot RepeatableRead. Totais BRL seguros:
ativos registrados, marcados pagos, pendentes e anulados, todos nos filtros.
Valores de competencia NAO sao fluxo de caixa do periodo nem custos completos.
Nao somar tarifas estimadas, duplicar taxas Stripe ou anunciar lucro liquido.

## UI/arquitetura

/financeiro/despesas no menu Financeiro e link do resumo existente. Mobile390,
componentes/controllers RHF/Zod existentes, slot de erro estavel, dialogs de
criacao/correcao/anulacao e paginacao. Request key preservada antesPOST; conflito
CAS pede recarga, sem retry cego. Estados loading/empty/error honestos.
Builder indisponivel; referencia _product/proto/admin/Financeiro.png e padrao
atual. Nenhum package ou env nova. Nao modificar vitrine/precos desta task.

## Aceite

- [x] Modelo expansivo/migration aplicada so no PG QA local, sem reset.
- [x] API autenticada, validacao inteira/civil, idempotencia, CAS e auditoria.
- [x] Filtros, pagina/totais consistentes e sem afirmacoes falsas de lucro/taxas.
- [x] Criacao/correcao/anulacao reais somente em registros QA descartaveis locais.
- [x] Browser390/desktop, checks raiz, builds backend/Admin e testes aprovados.
- [x] QA auth restaurada, dados financeiros/fiscais preservados, ADR e commit.

## Deploy / rollback

Migration expansiva cria somente nova tabela, sem backfill ou mudanca nos recibos.
Backend/migration antes de Admin. Contrato aditivo; rollback mantem lancamentos e
historico, nao remove dados. Nenhum job/provider/gate financeiro novo.
Publicacao somente com autorizacao especifica futura. Taxas Stripe reais e sua
permissao de leitura permanecem task separada, nunca zero por falta de acesso.

## Evidencias executadas

- Migration `20261111223000_admin_operating_expenses` aplicada com db:migrate e
  Prisma Client gerado somente no PG QA127.0.0.1:32768/lectum_stripe_test, sem
  reset ou drift. SQL aplicada permaneceu imutavel.
- Sete testes unitarios aprovados em UTC e America/Sao_Paulo; integracao PG real
  cobriu concorrencia/idempotencia com uma auditoria, replay apos correcao,
  CAS/anulacao, soma acima de Int32, hashes sem texto livre e leitura consistente
  enquanto outra transacao corrigia um registro. Fixtures proprias removidas.
- HTTP real autenticado apos login normal:3 registros descartaveis, replay e
  payload conflitante, revisao obsoleta, tentativa de editar anulado, filtros,
  tres paginas, totais e rejeicoes de auth/dispositivo/datas/valores aprovados.
- Browser real390/1440: criou um quarto registro descartavel12,34, corrigiu para
  23,45/revisao2 e anulou/revisao3. Historico preservado e total anulado separado
  do ativo; filtro/estado vazio e URL invalida honestos. Sem overflow de pagina.
  Erros usam slots existentes dos controllers; overlay manteve844px. Datas foram
  confirmadas com teclado nativo (fill isolado da automacao nao notificava o RHF).
- Revisao cruzada encontrou e corrigiu pagina fora do intervalo apos anular o
  ultimo item: count/safePage/skip/response sao do mesmo snapshot. PG regrediu
  ultima pagina, page100000 e colecao vazia. Label de busca limitado a descricao,
  correspondente ao predicado da API, e cor do botao usa token semantico.
-12 testes novos Admin/SSR passaram, mais9 de regressao financeira. Sem novo
  package/lock/env. Quatro registros QA e auditorias proprias removidos por IDs,
  request keys, ator/prefixo exatos, preservando despesas preexistentes e todos
  os15 conjuntos financeiros/fiscais/catalogo protegidos. Autenticacao original
  restaurada e somente a sessao deste ensaio removida.
- Check integral final da raiz e builds backend/Admin de0.1.823 aprovados. Bump
  unico0.1.822→0.1.823 e cinco manifests sincronizados. Git/hooks executados com
  PATH Node24.22.1/pnpm10.33.0 fixado. Sem push/deploy ou acao produtiva.

A leitura de taxas Stripe e independente desta task: apos autorizacao especifica,
apenas Balance Read foi acrescentada na chave restrita do sandbox. GET de Charge
ja existente/Balance Transaction passou de403 para200 e retornou taxa158centavos
sobre2990, sem criar pagamento. Isso ainda nao implementa o coletor/visibilidade
no Admin nem autoriza permissao live; segue TASK331, sem confundir com OPEX.
