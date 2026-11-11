# ADR-0690 — Historico financeiro e NFS-e no Admin

Status: Aceita; implementacao local, validacao positiva PDF pendente
Data: 2026-11-11
Task: [TASK-325](../_product/tasks/TASK-325-admin-financial-history-invoices.md)

## Contexto

Historico administrativo antigo depende de contrato vigente/resumo MP e nao inclui
NFS-e. Recibos Stripe e snapshots fiscais ja existem; ausencia de cobertura externa
nao pode virar zero financeiro nem permissao para cobrar, emitir ou conciliar no GET.

## Decisao

Criar leitura administrativa dedicada e paginada com projecao allowlist de fontes
locais, incluindo contratos cancelados. Nao importar controller privado do dono nem
reutilizar sua identidade. Manter APIs legadas e metricas existentes intactas.
Dedupe financeiro por gateway/conta/modo/pagamento; vinculo fiscal por fatura e
proprietario, sem inferir pagamento pela simples existencia de status authorized.
Fonte/cobertura locais sao explicitas. Datas/valores nao sao derivados do catalogo.
Filtros e apresentacao usam calendario BRT. Referencias MP duplicadas sao negadas
globalmente, nao resolvidas apenas entre contratos do usuario filtrado. Limite de
10.000 registros por fonte/contratos falha explicitamente, nunca entrega total
parcial como completo. Pessoas/perfis/contratos excluidos nao sao reexpostos.

Download exige middleware Admin atual (unico papel administrativo hoje), autorizacao
de objeto separada e auditoria minima append-only no modelo existente. Compartilhar
somente validacao de documento/transporte fiscal entre limites owner/Admin; Admin
nao pode chamar endpoint privado do cliente ou retornar URLs externas. Revalidar
empresa/modo/snapshot/autorizacao governamental antes do proxy PDF limitado.
Nenhum novo modelo RBAC paralelo: nao ha papeis administrativos granulares no schema.

## Consequencias

Sem migration/env/package novo, mutacao financeira/fiscal ou providers no historico.
Download faz apenas GETs SendNF e auditoria interna; nao emite nem reabre jobs.
Rollout futuro backend antes de Admin, rollback codigo. Sem push/deploy nesta etapa.

## Validacao e limite

Projecao/PG do historico (8 testes), repositorio/auditoria PDF (7 testes), limites
fiscais owner/Admin (5 testes), UI/politicas (25 testes) e 32 GETs locais aprovados.
Browser com recibos reais do QA em 320/390/1440px; dados financeiros preservados.
Check raiz e builds backend/Admin aprovados na versao local 0.1.816, sem publicar.
Testes puros e fixtures efemeras de repositorio nao comprovam emissao ou PDF real.
Nao ha NFS-e governamental elegivel no QA/backups: prova
positiva do novo download fica pendente, sem mock como evidencia nem uso de producao.
Estado simulated/rejected deve ser preservado. Sem declarar conclusao integral
com base em testes negativos ou em PDF previamente lido no provider de producao.
