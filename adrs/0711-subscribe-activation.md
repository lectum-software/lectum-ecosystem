# ADR-0711 — Entrega da primeira assinatura paga

Data: 2026-11-22. Status: aceito.

O proprietario confirmou explicitamente a liberacao de Subscribe pela Meta. Esta confirmacao substitui a pendencia externa registrada na ADR-0698; nao e uma verificacao independente da conta pelo agente. O aviso network-context ja inclui primeira assinatura profissional paga, identificador/navegador, valor e moeda.

Entrega usa a mesma identidade Stripe live revisada do checkout, consentimento anterior ao pagamento e vigente na entrega, navegador associado e contexto da mesma operacao. Acrescentar user agent persistido ao serializer, exigido pelo transmissor. Nao depender de campanha cadastrada: consentimento e contexto de checkout sao suficientes para a referencia de aquisicao.

Primeiro pagamento continua baseado em invoice.paid verificado, recibo imutavel e conciliacao completa de contratos financeiros, com deduplicacao por profissional. Um contrato free_signup canonico, plano gratuito de valor zero, sem gateway e sem recibos, nao representa pagamento anterior. Demais contratos desconhecidos permanecem bloqueados. Renovacoes, estornos, disputas, testes e cortesias nao geram Subscribe.

Corte de ativacao: 2026-11-22T21:41:41.000Z. Pagamentos anteriores nao sao reenfileirados nem transmitidos. Novos registros internos usam Subscribe.verified; o resolver mantem leitura do formato antigo, mas a politica de producao impede entrega anterior ao corte. Nao ha backfill.

Sem alteracao visual, schema ou variavel obrigatoria. Implantar apenas backend apos validacao. Rollback desabilita novamente Subscribe; preservar registros/deduplicacao. Nenhuma chamada externa ou cobranca durante testes locais.
