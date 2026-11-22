# ADR-0707 — InitiateCheckout com identidade Stripe do servidor

## Status
Aceito para configuração local; publicação pendente.

## Contexto
O usuário confirmou Stripe live e a presença das configurações de conta, chaves, webhook e envio Meta. A fila agora é criada atomicamente com o contexto. Subscribe tem uma pendência independente de elegibilidade externa.

## Decisão
Habilitar somente InitiateCheckout. Derivar a política da identidade Stripe configurada, validando gateway, modo, formato da conta e limite de runtime de produção já aplicado à cobrança. Usar a URL canônica da tela /app/professional/billing sem parâmetros. Capturar navegador para psicólogo consentido antes do checkout pela rotina de atribuição da página; evidência posterior à operação é recusada pelo resolver. Falhas de medição não interrompem pagamento nem encerram sessão.

O payload contém fbp e User-Agent validado, sem IP e sem custom_data financeiro. O contexto pode ser registrado em requires_confirmation, processing ou complete, mantendo a hora original do checkout e deduplicação. Isso cobre respostas que já avançaram de estado, sem interpretar checkout como compra. Contexto e fila continuam na mesma transação.

## Consequências
Não há nova variável obrigatória. A configuração ausente ou incompatível falha fechada. Subscribe permanece bloqueado e não há backfill. A prova de recebimento externo será feita após publicação autorizada; testes locais não a substituem.
