# ADR-0735 - begin_checkout na entrada elegivel

Data: 2026-11-26
Status: Aceito

## Decisao
Mover begin_checkout do retorno da criacao de operacao Stripe para o efeito da tela de checkout, quando usuario, assinatura e cotacao estiverem validos. Capturar o consentimento na primeira execucao do efeito; nenhuma concessao posterior reproduz a entrada. Uma tentativa por montagem evita duplicacao por Strict Mode ou refetch; uma nova visita constitui outra entrada. O runtime revalida consentimento antes e depois do carregamento do SDK.

Excluir cortesia, assinatura ativa e retomada de operacao. Remover envio no submit para nao contar duas etapas como a mesma entrada. Preservar rememberGoogleCheckout no retorno da operacao para a prova de subscribe; visualizar o checkout nao e prova de pagamento. Nao enviar URL privada, identificador, valor ou dados do cartao.

Substitui o ponto de disparo begin_checkout da ADR-0733. Sem alteracao visual, backend ou publicacao automatica.
