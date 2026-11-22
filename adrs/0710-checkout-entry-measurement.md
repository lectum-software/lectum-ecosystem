# ADR-0710 — Entrada no checkout independente da cobrança

Data: 2026-11-22. Status: aceito para implementação local.

O usuário confirmou que InitiateCheckout deve medir a entrada na etapa de pagamento, incluindo upgrade posterior a partir de qualquer caminho. A implementação anterior dependia de enviar o formulário e criar uma operação Stripe.

Criar marketing_checkout_entries como fato separado, com referência de navegador/consentimento, identidade e horário do servidor. A API autenticada aceita apenas revisão e versão do consentimento; não recebe cartão, URL, origem de navegação ou horário do cliente. A página comum captura após receber configuração válida e não inclui renovação de cortesia/manutenção de cartão. A API valida perfil profissional e exclui acesso pago ativo.

Transação serializável registra entrada e fila juntas. Janela fixa de 30 minutos por usuário/revisão deduplica recargas, reaberturas e abas; visita posterior é nova intenção. Retenção limitada a 24 horas e consentimento/navegador, com exclusão em revogação. Captura antiga conserva evidência de operação, mas não enfileira outra conversão quando existe entrada vigente anterior. Durante rollout, uma operação já medida nos últimos 30 minutos também evita nova entrada.

Worker revalida origem canônica, usuário, revisão, consentimento, navegador e configuração da conta. Payload permanece na allowlist existente, sem conteúdo clínico, cartão, preço ou caminho de entrada. Subscribe não é habilitado por esta mudança.

Migração expansiva, sem backfill. Backend antes do frontend; consumidores antigos continuam aceitos. Para rollback do backend, pausar CAPI e avaliar entradas pendentes antes de voltar ao worker anterior, que não conhece essa origem. Não remover a tabela. Sem alteração visual ou variável nova.
