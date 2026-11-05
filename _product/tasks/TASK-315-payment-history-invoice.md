# TASK-315 - Historico de pagamentos sem duplicidade fiscal

## Escopo
Uma linha por pagamento identificado; resumo de assinatura e nota fiscal nao sao
cobrancas adicionais. Titulo neutro: Pagamento confirmado.

## Aceite
- [x] Unificar pagamento e nota por gateway e identificador do pagamento.
- [x] Substituir resumo da mesma assinatura quando coberto pelo livro fiscal.
- [x] Preservar pagamentos distintos de mesmo dia/valor e separar modo de teste.
- [x] Testes e checks locais.
- [x] Revisao do contrato consumido pela interface existente, sem mudanca de layout.

Sem migracao, emissao fiscal, cobranca, push ou deploy nesta etapa.
Rollback: reverter a composicao do historico; dados financeiros nao sao alterados.

## Validacao local - 04/11/2026
- Backend check aprovado: 1188 testes, 1187 aprovados, zero falhas, um ignorado.
- Backend build aprovado.
- Nove testes de regressao adicionados para composicao fiscal, incluindo resumo,
  identidade exata, eventos repetidos, pagamentos distintos e isolamento de teste.
- Diff sem erros de whitespace.
- Smoke local /health e /ready aprovado no servidor com codigo compilado.
- O historico autenticado com dados reais do piloto sera conferido apos deploy;
  testes locais nao fazem cobranca nem consultam provedores reais.
- Publicacao autorizada junto da TASK-314; SEO e flags fiscais fora do lote.
