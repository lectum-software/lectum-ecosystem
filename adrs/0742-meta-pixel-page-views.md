# ADR-0742: PageView explicito com consentimento

## Status
Accepted.

## Contexto
A TASK-377 cobriu todos os eventos CAPI, mas excluiu PageView. O usuario solicitou revisar o inventario e corrigir a ausencia para medir visitas de anuncios.

## Decisao
Estender somente o adaptador browser com PageView. A resposta de recibos ja fornece o Pixel ID com flag backend ativa mesmo sem conversoes. Apos consentimento e resposta valida, enviar PageView sem parametros adicionais e com identidade aleatoria por visita. Manter identidade entre polls e reinicios de efeito; navegar para outra rota e voltar gera outra visita. Bloquear rotas e queries nao autorizadas, aba oculta, retirada de consentimento e mudanca de URL durante carregamento. Nao habilitar autoConfig, advanced matching ou PageView automatico. Sem alteracao de confirmacoes ou eventIDs CAPI.

O inventario completo consta na TASK-378. page_leave continua diagnostico Google; nao e uma conversao CAPI. PageView nao sera duplicado no servidor nesta task.

## Consequencias e validacao
SDK passa a carregar na visita consentida, antes da primeira conversao. Visitantes sem aceite, backend indisponivel ou bloqueadores podem nao ser medidos. Testes de deduplicacao, revogacao, navegacao e parametros; check/build locais. Nao afirmar atribuicao de campanhas apenas por ver o comando. Sem banco ou novas configuracoes; rollback frontend anterior/flag existente.
