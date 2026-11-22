# TASK-340 — Preparação local de checkout e assinatura

- [x] Resolver próprio para InitiateCheckout, sem valor de assinatura nem confirmação de pagamento.
- [x] Vincular operação canônica, conta, contexto, navegador e consentimento anterior.
- [x] Validar checkout e assinatura em PostgreSQL local, sem rede externa.

ADR-0705. Políticas de produção permanecem bloqueadas e vazias. Sem cobrança, backfill, migração ou deploy.

Validação local: três integrações PostgreSQL aprovadas (captura de contexto, checkout com roteamento real do scheduler e assinatura com recibo financeiro/webhook). Cobertura inclui conta/origem/documento incorretos, revisão e proprietário divergentes, contexto ausente/expirado/futuro, revogação e deduplicação. Nenhuma chamada a Stripe ou Meta. Versão 0.1.835.

Pendências de ativação: confirmar conta Stripe live e origem efetiva do checkout, configurar políticas de captura/entrega, resolver a elegibilidade externa de Subscribe e validar recebimento controlado. Capturas de Diagnóstico em 22/11 mostram ausência de erro ativo e aviso anterior de domínio; não comprovam liberação de Subscribe.

Build, Biome, runtime-deps e TypeScript backend aprovados. Suíte geral: 1532 aprovados, 58 ignorados e um timeout ETIMEDOUT em optional-auth-failure (30s); repetição isolada passou em 3,9s. Não afirmar execução geral sem falhas. Checks de versão, fontes, tamanho, ciclos, segredos, encoding e índices aprovados.
