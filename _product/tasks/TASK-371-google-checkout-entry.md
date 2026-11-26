# TASK-371 - Medicao da entrada no checkout Google

Status: Concluida localmente

## Escopo
Corrigir begin_checkout, que dependia da criacao da operacao Stripe apos envio do cartao. Medir a entrada elegivel no formulario antes de informar dados de pagamento, com consentimento previo.

## Aceite
- [x] Entrada no checkout Stripe dispara sem enviar formulario ou criar pagamento.
- [x] Reexecucao de efeitos/refetch nao duplica na mesma visita.
- [x] Sem consentimento inicial, revogacao, cortesia, assinatura ativa, erro ou operacao pendente nao gera nova entrada.
- [x] Submit deixa de disparar begin_checkout; prova de subscribe preservada.
- [x] Testes de regressao, check frontend e build.
- [x] Upgrade gratuito para Profissional medido antes do envio do cartao.

ADR-0735. Nenhuma mudanca visual, banco, contrato ou deploy.

## Evidencias
53 testes de privacidade aprovados, incluindo execucao do componente com cadastro inicial, intent=upgrade, repeticao de efeitos, consentimento ausente/revogado e estados inelegiveis. Check frontend completo e build aprovados. Logs locais .tmp/checkout-entry-check.log e .tmp/checkout-entry-build.log. Versao 0.1.875. Sem alteracao visual; sem pagamento, push ou deploy. Validacao do recebimento real no GA4 depende da publicacao.
