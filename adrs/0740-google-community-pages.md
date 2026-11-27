# ADR-0740: Analise de paginas publicas e comunidades no GA4

## Status
Accepted. Substitui a raiz fixa das ADRs 0738/0739 para as rotas publicas explicitamente suportadas.

## Contexto
O usuario precisa das analises por comunidade no GA4, incluindo nome, e autorizou a coleta analitica sem remarketing apos discutir as regras do Google. O nome de uma pagina publica nao afirma um diagnostico; ainda assim, o contexto de saude exige avaliar os termos do provedor. Desligar anuncios personalizados nao e garantia de conformidade da coleta.

## Decisao
Resolver nomes somente pelo cadastro publico renderizado, com slug correspondente a rota. Nao capturar document.title arbitrario, nomes de usuarios, conteudo de publicacoes ou queries livres. Paginas publicas previstas usam caminhos canonicos; publicacoes e areas privadas usam categorias genericas, sem IDs. Page views manuais por transicao, com espera pelo cadastro da comunidade, deduplicacao de polling e referrer anterior sanitizado. Atualizar o contexto da tag para engajamento automatico; cadastro continua sendo emitido somente apos sucesso da API. A sessao nativa GA4 fornece pagina de entrada e origem, sem inventar uma nova sessao por navegacao.

Somente analytics_storage e concedido. ad_storage, ad_user_data e ad_personalization continuam negados, allow_google_signals e allow_ad_personalization_signals false. Nao criar publicos de remarketing nem exportar nomes para Google Ads. Novo consentimento local Google v2 e texto explicito; Meta conserva seu contrato existente.

## Consequencias
As quatro analises ficam disponiveis para novos dados consentidos quando a propriedade estiver configurada. Titulo da pagina ja permite identificar comunidade sem dimensao personalizada; community_name e adicional. Registros historicos na raiz nao sao recuperados. Paginas desconhecidas, privadas e publicacoes nao sao individualizadas; nao afirmar cobertura irrestrita. A propriedade deve desativar pageviews por historico e outras coletas automaticas de conteudo; configurar sign_up como evento principal e community_name como dimensao de evento. Nao usar uma lista/pseudonimo como suposta anonimizacao.

## Validacao e rollout
TASK-376: testes de consentimento, corrida de SDK, navegacao, contexto e exclusao de dados; browser local 390px/desktop e rede real. Deploy independente frontend. Rollback revert/redeploy. Configuracao externa documentada separadamente, sem presumir conclusao quando nao acessivel.
`gad_source` e `gad_campaignid` numericos sao preservados junto a GBRAID, conforme documentacao de identificadores agregados do Google, para atribuicao quando ad_user_data esta negado. page_leave antes da troca de contexto permite ao SDK atribuir tempo nativo a pagina anterior, sem cronometro artificial.
