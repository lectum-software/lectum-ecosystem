# TASK-309 - Exclusao de conteudo e vigencia apos cancelamento

## Escopo aprovado

- Excluir conteudo de autoria da conta excluida, preservando respostas de terceiros.
- Retirar referencias publicas e enfileirar limpeza idempotente de arquivos proprios.
- Cancelar renovacao Mercado Pago sem retirar beneficios antes do fim do periodo.
- Sem retroatividade em contas anteriormente excluidas e sem push/deploy.

## Aceite

- [x] Conteudo textual e referencias de midia removidos atomicamente com a conta.
- [x] Respostas de terceiros preservadas com marcadores de conteudo removido.
- [x] Arquivos proprios e derivados entram em limpeza duravel com retries.
- [x] Cancelamento e webhooks preservam a data final sem reativar renovacao.
- [x] Permissoes e UI respeitam a vigencia e expiram na data final.
- [x] Testes, checks e builds locais aprovados.

## Evidencias locais - 2026-11-02

Migration aplicada no PostgreSQL isolado; check integral do monorepo e builds
backend/frontend aprovados. Integracao transacional confirmou expiracao, fallback
gratuito, preservacao de terceiros e deduplicacao da fila. QA real com API/banco
local em 320/390/1440 confirmou data do plano, exclusao completa da conta,
bloqueio HTTP 404 da midia e retry duravel. Sem erros JS/HTTP 500; fixtures limpas.
Evidencias ignoradas: .tmp/task310-root-check.log, .tmp/task309-backend-build.log,
.tmp/task310-frontend-build.log e .tmp/task310-browser-results.json.

O browser usou servidor de desenvolvimento: o build de producao corretamente
rejeita uma API localhost. OAuth real, cancelamento remoto Mercado Pago, exclusao
fisica em R2/Stream e iPhone fisico nao foram executados. Provedores ficaram isolados.

## Rollout

Backend antes do frontend. Migration aditiva de fila de limpeza, sem backfill.
Ativar ACCOUNT_MEDIA_CLEANUP_ENABLED=true somente apos conferir a fila e o namespace
de storage; default false para retries periodicos. Exclusoes novas executam uma
tentativa direcionada apos commit. Nao executar limpeza de contas antigas.
Rollback de codigo nao recupera conteudo apagado nem reativa recorrencia.
ADR-0670.

Objetos com namespace ausente/divergente permanecem pendentes para conciliacao
operacional; nao redirecionar a fila automaticamente para outro bucket/conta.
Caches externos ja preenchidos podem persistir ate expirar; o bloqueio imediato
validado e no endpoint de origem. A limpeza remota nao e atomica com o banco.
