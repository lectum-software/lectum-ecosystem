# ADR-0705 — Resolver separado de checkout

O scheduler encaminhava checkout ao resolver exclusivo de Subscribe. Adicionar resolver próprio de InitiateCheckout com política separada, vazia por padrão. A fonte canônica devolve operação e conta Stripe. Exigir contexto da mesma operação, conta e documento revisados, navegador anterior ao início do checkout, consentimento anterior e vigente, revisão idêntica e contexto ainda válido. Contexto é capturado após criação da operação; não reutilizar a regra de Subscribe, em que captura precede pagamento. Preservar timestamp e event_id originais, sem exportar valor, dados clínicos, título, plano, identidade pública ou detalhes do pagamento no checkout.

Subscribe mantém a confirmação financeira existente. Preparação local não altera os bloqueios pending_compliance_review nem configura conta/origem de produção. Ausência de alertas no Gerenciador não prova levantamento da restrição anterior. Nenhum envio externo ou cobrança integra esta validação.
