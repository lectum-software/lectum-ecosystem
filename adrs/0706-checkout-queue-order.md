# ADR-0706 — Contexto e fila de checkout na mesma transação

## Status
Aceito para implementação local.

## Contexto
O callback do serviço Stripe podia criar a referência antes de o frontend capturar o contexto. O worker poderia bloquear definitivamente o evento por falta de evidência.

## Decisão
Remover o callback do serviço financeiro. A captura válida cria o contexto e, sob as políticas e configuração de envio existentes, enfileira a conversão na mesma transação serializável. Repetições válidas reutilizam contexto e referência sem renovar retenção. A persistência e a recuperação exigem contexto vigente e temporalmente compatível. Erros continuam contidos na rota opcional, sem afetar pagamento.

## Consequências
O worker não observa a referência antes do contexto. Não há ativação de produção, migração, backfill ou mudança de cobrança. A validação local usa PostgreSQL descartável e não envia eventos externos.
