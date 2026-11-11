# ADR-0695 - Custos operacionais manuais, sem falsa conciliacao financeira

Data: 2026-11-11
Status: Aceita e validada localmente
Task: [TASK-330](../_product/tasks/TASK-330-admin-operating-expenses.md)

## Decisao

Registrar OPEX manual em BRL, competencia civil e pagamento opcional separados.
Correcao/anulacao auditadas com CAS; criacao idempotente nao sobrescreve edicoes.
Nao chamar registros manuais de custos completos nem subtrair do bruto para
inventar lucro liquido, pois tarifas/ajustes bancarios continuam outra fonte.

Reutilizar API/admin auth/auditoria/controllers do projeto. Schema expansivo,
sem provider, package ou env nova. Aplicacoes continuam separadas; backend antes
de Admin. Sem exclusao de produto ou edicao de migration aplicada.

## Trade-offs

Nao e ERP/contabilidade nem importacao bancaria. Categoria controlada sem PII de
fornecedor limita superficie e escopo. Descricao e motivos ficam no cadastro
protegido, auditoria tecnica apenas hashes/valores controlados. Competencia nao
prova desembolso; paid_date indica declaracao manual, nao conciliacao bancaria.

## Validacao

Migration expand-only, unitarios UTC/BRT, integracao PG real e HTTP/browser390/1440
aprovados. Concorrencia/CAS, paginacao ajustada dentro do snapshot e auditoria
sem texto livre conferidos. Quatro registros descartaveis/auditorias proprias
removidos; auth restaurada e fatos financeiros/fiscais/catalogo preservados.
Check integral e dois builds aprovados, versao0.1.823, commit local homolog, sem
push/deploy. Taxas Stripe continuam fonte independente, sem estimativa como fato.
