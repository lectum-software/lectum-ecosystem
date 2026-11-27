# Analises de comunidades no GA4

Propriedade Lectum; medicao G-Q6FX22KLND. Somente novos dados apos publicacao e aceite Google v2. O historico enviado como raiz nao pode ser corrigido retroativamente.

## Configuracao da propriedade (verificar antes de concluir)
1. Administrador > Fluxos de dados > fluxo Web > Medicao otimizada: desativar visualizacoes de pagina por alteracoes do historico. O site envia page_view manualmente. Revisar/desativar pesquisas, formularios, cliques de saida e demais automacoes que coletem URLs/conteudo alem do contrato do site. Manter o engajamento nativo do GA4.
2. Administrador > Definicoes personalizadas > Criar dimensao personalizada: nome Comunidade, escopo Evento, parametro community_name. Nao usar propriedade de usuario. O titulo padrao da pagina tambem apresenta Comunidade: Nome | Lectum.
3. Administrador > Eventos/Eventos principais: marcar sign_up como evento principal. Nao criar conversao Google Ads nem audiencia de remarketing com comunidades.
4. Coleta de dados: Google Signals e personalizacao de publicidade desligados. Revisar links de Google Ads para nao habilitar publicidade personalizada. O codigo tambem nega os consentimentos publicitarios e desativa os sinais.

## Quatro analises
| Pergunta | Relatorio / dimensoes | Medidas |
| --- | --- | --- |
| Quantas visitas recebeu cada comunidade? | Engajamento > Paginas e telas; Titulo da pagina ou Caminho da pagina, filtrar /comunidades/ | Visualizacoes e usuarios ativos |
| Qual pagina de entrada gera cadastros? | Pagina de destino; selecionar evento principal sign_up | Sessoes, sign_up e taxa de eventos principais da sessao |
| Qual origem traz visitas para cada pagina? | Exploracao livre: Caminho da pagina + Origem/midia da sessao; filtro evento page_view | Contagem de eventos (views), usuarios; campanha da sessao opcional |
| Onde ha mais engajamento? | Paginas e telas, Titulo/caminho; Comunidade como dimensao adicional | Tempo medio de engajamento e usuarios ativos |

Nao confundir visitas/sessoes com visualizacoes: a mesma sessao pode visitar diversas comunidades. Na exploracao, sessoes por pagina nao devem ser somadas como total unico. Cadastros por pagina de destino usam o inicio da sessao, nao a pagina do formulario. O sign_up conta apenas cadastro confirmado, nao abertura/clique.

## Conferencia
DebugView/rede: um page_view por transicao, dl com URL publica e apenas parametros aprovados; dt com titulo controlado; community_name com cadastro publico. Primeiro referrer externo sem busca/query; seguintes com pagina anterior sanitizada. Uma navegacao A -> B -> A deve contar tres views. Verificar user_engagement no contexto correto e ausencia de eventos antes do aceite/apos revogacao. Relatorios consolidados e dimensoes novas dependem do processamento do GA4; validar novamente apos 24-48h.

## Limites deliberados
URLs privadas, IDs/textos de posts e respostas, filtros/buscas e queries livres nao sao enviados. Paginas fora do contrato aparecem como categorias genericas; paginas de comunidade aguardam o cadastro publico resolver. Consentimento nao e garantia de conformidade com as politicas do Google; nao utilizar estes dados para inferir condicoes individuais ou criar publicos publicitarios.
