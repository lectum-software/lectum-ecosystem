# ADR-0738: Atribuicao sanitizada no GA4

## Status
Accepted

## Task relacionada
TASK-374

## Contexto
O page_view sobrescrevia page_location por uma raiz sem UTMs/click IDs, conforme requisicao observada no navegador. O filtro anterior tambem excluia todas as UTMs e todo referrer.

## Decisao
Capturar em memoria o contexto na primeira sincronizacao consentida, antes do download do SDK, e reutiliza-lo em config e eventos. Limpar na revogacao. Manter raiz canonica e titulo generico para nao transmitir caminhos clinicos. Autorizar explicitamente as UTMs da campanha Meta fornecida pelo usuario e seus tres anuncios; novos nomes de campanha exigem revisao do catalogo. Preservar gclid/gbraid/wbraid validados. Referrer de buscadores e redes conhecidos transmite somente origem, sem caminho/query/hash. Nao enviar utm_term livre, IDs internos, conteudo, email ou outras queries.

## Consequencias
Atribuicao dos novos acessos consentidos pode distinguir campanhas e buscas organicas conhecidas. Nao corrige historico. Referrers desconhecidos e campanhas fora do catalogo permanecem sem detalhamento. Nao altera atribuicao first-party do backend nem dispara pageviews adicionais na navegacao SPA.

## Producao e rollout
Somente frontend; sem banco, envs ou contratos novos. Publicar apos autorizacao. Smoke: abrir URL de campanha com consentimento e verificar page_view/dl com UTMs, referrer sanitizado e tid correto. Rollback: reverter commit e republicar frontend. Sem deploy de homologacao.

## Validacao
Testes executaveis do runtime e politicas, suite de privacidade e check do repositorio. Documentacao Next local de use-client indisponivel neste pacote; nenhuma API Next ou componente alterado.

## Pendencias
Publicacao e confirmacao do evento real apos deploy.

Evidencia local: 56 testes de privacidade, check frontend completo e build aprovados. Check global interrompido no backend por DATABASE_URL ausente; nenhum banco acessado. Logs na TASK-374.
