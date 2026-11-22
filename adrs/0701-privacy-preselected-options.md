# ADR-0701 — Preselecao das preferencias sem consentimento implicito

A pedido explicito do proprietario, a preselecao desmarcada da ADR-0700 e substituida por switches inicialmente ligados para visitantes sem escolha salva. A fronteira de consentimento da ADR-0700 permanece: somente Salvar preferencias ou Aceitar cookies confirma a escolha; abrir e fechar o painel nao autoriza medicao.

A escolha local prevalece, inclusive false. Uma decisao ja existente no servidor permanece como fallback da medicao; associacao nao e presumida quando existe decisao do servidor. Elegibilidade da associacao permanece inalterada. Esta mudanca nao ativa entrega CAPI nem declara IP verificado.
