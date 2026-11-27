# ADR-0739: Identificadores de campanha sem catalogo

## Status
Accepted; substitui a exigencia de catalogo para campanha/anuncio da ADR-0738.

## Contexto
O usuario pediu novas campanhas sem alteracao de codigo por nome. O catalogo literal de utm_campaign/utm_content limitava a operacao de anuncios.

## Decisao
Aceitar qualquer identificador de marketing em utm_campaign e utm_content com 1 a 100 caracteres ASCII alfanumericos, hifen ou sublinhado, com inicio alfanumerico. Preservar caixa e valor; rejeitar duplicatas e formatos invalidos, sem transformar silenciosamente. Manter canais conhecidos, gclid/gbraid/wbraid, raiz canonica e referrer restrito. utm_term, caminhos e demais queries nao sao enviados. Contexto continua capturado somente com consentimento e apagado na revogacao.

## Consequencias
Novas campanhas/anuncios com identificadores padronizados funcionam sem deploy por nome. Espacos/acentos nao sao aceitos: usar slugs como comunidades_rj_2027 e anuncio_104. Validacao sintatica nao garante ausencia de PII ou informacao clinica dentro de um slug: nomes devem ser metadados de marketing nao pessoais, nunca nomes de pacientes, contatos ou conteudo de publicacoes. Nao prometer deteccao semantica pelo filtro.

## Validacao e rollout
TASK-375; testes de integracao no runtime para novos nomes em Meta/Google e regressao dos limites/duplicatas/formatos, alem da suite de consentimento. Somente frontend; sem banco, env ou mudanca visual. Rollback via revert e republicacao. Visitas historicas nao sao reconstruidas.
