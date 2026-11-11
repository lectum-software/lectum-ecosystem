# ADR-0693 - Admin financeiro consome fatos Stripe verificados

Data: 2026-11-11
Status: Aceita (validacao local 0.1.821)
Task: [TASK-328](../_product/tasks/TASK-328-admin-stripe-finance-closure.md)

## Contexto

O ledger Stripe passou a registrar recibos e ajustes observados, mas o dashboard
e a relacao de assinaturas ainda conservam a cobertura pendente anterior. O
historico novo ja consulta esses fatos com escopo/integridade. Unificar leitura
nao autoriza criar recebimentos, imputar custos ou alterar a cobranca.

## Decisao

Consumir fatos financeiros locais verificados e snapshots contratados, separando
valor bruto recebido, estado atual de ajuste e cobertura temporal/externa. Nao
usar preco atual do catalogo ou eventos brutos como recebimento. Reutilizar
validacao forte e politica temporal existentes; leituras bounded e consistentes,
sem SDK ou worker. Metrica sem evidencia continua indisponivel com motivo preciso.

CSV e listagens usam a mesma semantica, ordem com desempate unico e erros de limite
explicitos. Historico de recibos nao equivale a todos os resultados de tentativas.
Contratos aditivos toleram rollout desencontrado. Nao remover MP ou gates seguros.

## Limites e consequencias

Nao ha fonte de tarifas/net settlement no ledger atual nem despesas operacionais
cadastradas. Nao calcular lucro/liquido ou transformar ausencia de dado em custo
zero. Gestao de ofertas/precos e custos recebe tasks seguintes delimitadas.
Sem migration, package ou env obrigatoria. Sem novas cobrancas, notas, alteracoes
de assinatura/gates ou infraestrutura publicada. Commit local sem push/deploy.

## Evidencia e temporalidade

Snapshot Stripe RepeatableRead com queries sequenciais, sem SDK na transacao.
Recibos imutaveis permanecem apos arquivo/exclusao; estado de acesso continua
historico, nao se reativa por recibo. Orfaos/divergencias falham fechado, inclusive
quando nao restar contrato. MRR precisa de estado observado e periodo pago;
reserva cancelada sem recebimento nao conta como churn pago.

Datas financeiras usam America/Sao_Paulo inclusive em processo UTC e no MRR do
dashboard geral; nao mudar o calendario padrao de outros dominios. Comparacao
historica sem cobertura nao vira zero ou taxa de sucesso. Estornos representam
snapshot atual apenas dos recibos Stripe capturados no periodo selecionado, nao
fluxo de caixa de estornos daquele periodo.

API/PG/browser locais reais conferiram tres recibos existentes do sandbox
(R$89,70), CSV e filtros390/1440. Regressoes negativas e revisao independente
aprovadas. Checks/builds registrados na task; autenticacao QA restaurada e
fingerprints financeiros/fiscais preservados. Producao somente consulta de
historico/PDF existente, sem nova transacao.

Consulta global limita10mil fatos por fonte e falha sem total parcial; crescimento
alem disso requer agregacao dedicada. Nao atribuir cobertura externa completa ao
simples sucesso de uma leitura local. Sem schema/env/dependencia nova.

