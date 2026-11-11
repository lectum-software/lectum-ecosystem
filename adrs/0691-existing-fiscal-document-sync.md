# ADR-0691 - Conciliar documento fiscal existente independentemente de estorno

Data: 2026-11-11
Status: Aceita; publicada e validada em producao, backend 0.1.818
Task: [TASK-326](../_product/tasks/TASK-326-existing-fiscal-document-sync.md)

## Contexto

O status financeiro e o estado fiscal sao fatos distintos. A emissao precisa de
pagamento elegivel, mas a consulta de uma nota existente deve continuar depois
de cancelamento da assinatura ou estorno. A condicao financeira compartilhada
impedia o GET SendNF, enquanto o leitor de PDF bloqueava a nota cancelada sem
atualizar a projecao local. O historico podia exibir Autorizada indevidamente.

## Decisao

Isolar a conciliacao de documento existente como operacao GET-only. Ela valida o
vinculo imutavel da nota e aplica somente uma observacao canonica por CAS/lease.
Nao instancia SDK de pagamentos, nao confere readiness de emissao e nao chama
create, collector, refund ou cancelamento remoto. As regras financeiras/gates
permanecem exclusivamente no ramo de nova emissao.

Consultas automaticas limitadas recuperam documentos existentes em manual_review;
registros sem document_id nao recebem essa excecao. Cancelamento confirmado nao
regride. Erros de rede/404 nao comprovam cancelamento e preservam o ultimo estado.
O leitor de PDF reutiliza a observacao e permanece fail-closed, com autorizacao e
auditoria administrativa existentes. Historicos permanecem projeções locais,
sem IO de provider dentro de transacao read-only. Um comando de manutencao
seleciona um unico documento existente e nao inicia qualquer fila financeira/fiscal.

## Consequencias e rollout

Backend-only, contratos compativeis, sem nova dependencia, schema ou env. UI atual
ja distingue Cancelada e Estornado; a conciliacao do backend seguida de nova
consulta/reload da tela atualiza o status, sem equiparar refund a cancelamento
fiscal. A tela aberta nao faz polling nem refetch ao receber foco. O polling do backend conserva limites;
nao promete sincronizacao instantanea com alteracoes externas. O comando GET-only
permite verificacao pontual sem esperar o intervalo automatico.

Nao ajustar status por SQL manual nem reabrir jobs para forcar a nota 4. Validacao
local usa PG isolado e contratos; prova canonica final usa documento ja existente
em producao autorizada. Nao emitir nota, cobrar ou alterar Radar durante a task.

## Validacao

Revisao independente sem bloqueio de seguranca no diff. Suites fiscais e admin
com 153 testes (PG real isolado, sem provider); smoke compilado HTTP8/8, sem
bootstrap/worker, contratos/autorizacao e persistencia corretos. Build backend
Node24.22.1 aprovado. Nenhum mock/fixture e declarado como prova de autorizacao
SendNF; a confirmacao canonica live usa somente documento ja existente apos PR.
Sem UI nova: rotulos Cancelada e Estornado existentes, mobile-first preservado.
Nenhum novo package, migration ou env. Backend-only evita redeploy desnecessario
de frontend/Admin/video; estados locais passam a ser verdadeiros apos nova consulta.

## Resultado produtivo e limite operacional

PR **#178**, merge `0e8eb37d3` em **11/11/2026, 14:26 BRT**, com revisao,
checks locais e hooks aprovados. Nao havia checks remotos GitHub configurados;
nao se atribui resultado de CI remoto inexistente. Backend **0.1.818** saudavel
apos publicacao, com HTTP 200 em health/ready/ping e versao sem cache. Admin
0.1.816 e frontend 0.1.813 preservados, compativeis com o novo estado fiscal.

O comando compilado fez dry-run canonico e, as **14:49:30 BRT**, aplicou somente
a observacao local da NFS-e 4 ja cancelada. Admin e historico do titular, apos
reload, passaram a exibir Cancelada/Nota fiscal cancelada, sem download; o
financeiro preservou Estornado/R$29,90 e a conta afetada permaneceu Free.
Inventario final manteve tres documentos e dois recibos integros, sem nova
transacao ou emissao. Digests imutaveis da nota, fatos financeiros, contratos,
trabalhos fiscais, conciliacao, auditorias e gates foram preservados. Prova live GET-only,
nao baseada em fixture nem em nova nota. Evidencia privada fora do Git.

O primeiro build falhou por disco cheio sem interromper a versao anterior.
Limpeza autorizada exclusivamente de cache de build nao utilizado liberou
5,388GB antes da repeticao e 3,671GB depois; fingerprints de containers, volumes
e imagens foram preservados nas duas etapas. O deploy terminou, mas a VPS
permaneceu em **93% de uso**, com cerca de 4,4GB livres: capacidade e retencao de
cache seguem risco operacional, nao resolvido permanentemente por esta task.
Checkpoint documental 0.1.819 somente local, sem nova publicacao de codigo.
