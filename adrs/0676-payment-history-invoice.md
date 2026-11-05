# ADR-0676 - Composicao do historico fiscal

O resumo do gateway nao identifica uma transacao e nao deve receber uma nota
por coincidencia de valor/data. A nota permanece ligada ao payment_id original.
O resumo pode ser omitido quando a mesma assinatura tem todas as parcelas
representadas no livro fiscal ou um pagamento confirmado na data/hora do resumo
ou posterior. Resumos mais recentes e ainda nao cobertos permanecem visiveis.
Notas de teste nunca substituem pagamentos reais.

Metadados opcionais de assinatura, pagamento e quantidade sao aditivos.
Sem alteracoes de banco, filas ou provedores. Publicacao apenas do backend.
