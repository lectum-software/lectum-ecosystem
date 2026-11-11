# ADR-0690 — Historico financeiro e NFS-e no Admin

Status: Aceita; publicada e validada com PDF administrativo real em producao
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
Rollout backend antes de Admin, rollback somente de codigo; auditoria permanece.
O checkpoint local nao publicou. A promocao posterior autorizada foi concluida
via PR #177, sem criar cobranca, nota, migration, env ou worker novo.

## Validacao local e limite original

Projecao/PG do historico (8 testes), repositorio/auditoria PDF (7 testes), limites
fiscais owner/Admin (5 testes), UI/politicas (25 testes) e 32 GETs locais aprovados.
Browser com recibos reais do QA em 320/390/1440px; dados financeiros preservados.
Check raiz e builds backend/Admin aprovados na versao local 0.1.816, sem publicar.
Testes puros e fixtures efemeras de repositorio nao comprovam emissao ou PDF real.
Nao ha NFS-e governamental elegivel no QA/backups: prova
positiva do novo download permaneceu pendente naquela etapa, sem mock como
evidencia. Estado simulated/rejected deve ser preservado. A conclusao integral
nao foi declarada com base em testes negativos ou em PDF previamente lido no
provider: dependeu da publicacao autorizada e do fluxo Admin descrito abaixo.

## Evidencia produtiva e fechamento em 11/11/2026

PR #177, merge `ca7683f4b`: backend e Admin 0.1.816 publicados as 11:23 BRT;
frontend 0.1.813 preservado. Health/readiness e versoes publicas HTTP 200,
no-store e rotas de versao noindex. A UI administrativa exibiu Pago e NFS-e
numero 3 Autorizada. O clique em Baixar NFS-e concluiu um download real as
11:24:21 BRT: 63.405 bytes, assinatura PDF e EOF validos, hash preservado na
evidencia privada, sem extrair conteudo sensivel.

Inventarios READ ONLY antes/depois mantiveram identicos os sete fingerprints de
operacoes, recibos, contratos, jobs/notas fiscais, inbox e conciliacao financeira.
Uma unica auditoria de PDF preparado foi acrescentada (0 -> 1); nenhum novo
pagamento, reembolso, documento ou operacao financeira. Recibo Stripe integro de
R$29,90 e duas NFS-e existentes permaneceram iguais; gates preexistentes intactos.
O inventario nao consultou backlog remoto, e o download fez somente GETs SendNF.

A prova encerra o criterio positivo administrativo da TASK-325. Nao substitui
login/download pelo titular ou confirmacao da caixa de entrada do cliente.
As evidencias privadas `task325-production-{before,after,admin-pdf,public-smoke,comparison}.json`
registram os resultados. A captura segura do cabecalho do historico nao substitui
a prova binaria do download. Nao anexar PII, documentos, segredos ou IDs de provider.
Checkpoint documental local 0.1.817 em homolog, sem push ou novo deploy da release 0.1.816.
