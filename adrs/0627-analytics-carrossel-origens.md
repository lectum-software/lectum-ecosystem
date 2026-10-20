# ADR-0627: Analytics com seleção de métrica e origem de visualizações

## Status
Accepted

## Task relacionada
TASK-20 — refinamento solicitado em 19/10/2026.

## Contexto
O usuário aprovou seleção horizontal de métricas, gráfico temporal consultável por toque e tabelas integradas. Exibição na busca não equivale a reprodução.

## Decisão
WhatsApp vem primeiro. Não há comparação com período anterior. O gráfico fica fora da área de deslizar os cards e aceita toque, mouse e teclado. Buscas contam sessões com reprodução positiva, nunca impressões. Origem opcional é registrada na criação da sessão e do favorito; acesso ao perfil usa o contexto da navegação anterior. Legado sem atribuição é identificado, sem backfill especulativo. Pacientes informados semanalmente conservam granularidade semanal. WhatsApp mantém total único no período e gráfico de pessoas únicas por dia. A tabela mantém a tag Principal origem em todos os empates positivos. Acesso ao gerenciamento de pacientes continua disponível no preview.

## Produção e rollout
Migration aditiva de duas colunas nullable, sem alterar dados antigos. Aplicar migration antes do backend, depois frontend. Nenhuma nova variável de produção. Contrato chart_data opcional permite frontend novo com backend antigo. Rollback de código mantém colunas nullable. Não houve push/deploy.

## Validação
Builds de frontend/backend, tipos, lint e testes aprovados. Migration e integração executadas em PostgreSQL isolado; /health e /ready retornaram 200. Prévia real dos componentes validada em 390/1440px, com toque, mouse, teclado, empates e atalho. Resultados detalhados na TASK-20. Falhas iniciais de dados parciais/configuração de teste foram corrigidas e os testes afetados repetidos com sucesso.

## Pendências
Aplicar migration antes do backend na publicação autorizada. QA com sessão autenticada real não executado; UI e agregação foram validadas separadamente. Builder/Quick Copy indisponível nesta sessão; referências fornecidas pelo usuário e inventário de protótipos consultados. Layout mobile-first (~390px).

## Refinamento visual — 19/10/2026
O carrossel mantém a identidade Lectum: superfícies claras, ícones em círculos azul suave, borda de seleção e sombras/tipografia dos componentes existentes. O painel temporal usa o mesmo cabeçalho visual das seções de vídeo e comunidade. As seções PresentationVideoAnalyticsSection e CommunityActivitySection permanecem na página, incluindo retenção e cliques por conteúdo; apenas as informações transferidas ao resumo deixam de ser duplicadas. A prévia local agora inclui esses componentes reais, AppPageHeader, PeriodTabs e a fonte Manrope, com dados explicitamente de validação.

## Ajustes de interação e leitura — 19/10/2026
A legenda apresenta os totais por origem do período; a consulta por toque/mouse/teclado mostra data e valores do ponto em um balão no gráfico, sem substituir a legenda. Para séries únicas usa-se o total da métrica da API (especialmente pessoas únicas no WhatsApp), nunca a soma de pessoas diárias. Séries de origens contabilizam os eventos correspondentes; legado sem origem continua explícito. Carrossel usa rolagem nativa por toque e setas discretas no desktop. Textos auxiliares removidos conforme pedido. Descrições de tráfego são reaproveitadas da API. A regra anterior de múltiplos destaques em empate foi substituída: somente a primeira origem com maior contagem positiva recebe Principal origem, preservando a ordem recebida em empates; todas zeradas não recebem tag.

## Origens adicionais e escala responsiva — 20/10/2026
O SVG mede a largura disponível e calcula a altura proporcional com limite de 320px; o viewBox acompanha essas dimensões sem esticar textos/círculos. Uma amostra isolada permanece visível como ponto. Acesso ao perfil distingue Página de favoritos; favoritos distinguem Dentro do perfil, usando caminhos explicitamente registrados. Registros sem origem permanecem não identificados. WhatsApp agora usa quatro séries de origem provenientes dos mesmos eventos já usados na tabela (incluindo posts, respostas e Top Mentores). A comunidade entrega seus eventos por callback opcional para evitar repetir consultas. Cada série inclui total opcional de pessoas únicas no período e pontos de pessoas únicas por dia; a tabela usa os mesmos totais. Perfil e Favoritos deduplicam independentemente por canal, permitindo que a mesma pessoa conte em ambos. O total geral do card continua sendo pessoas únicas globais, sem somar os canais. Nenhuma nova migration ou variável de produção.

## Legenda integrada — 20/10/2026
No WhatsApp, os ícones da tabela usam a cor da série e fundo suavizado, substituindo a legenda superior. O mapa de cores é compartilhado e indexado por origem para preservar a associação mesmo quando a tabela muda de ordem. Pacientes adquiridos e Avaliações também omitem a legenda de total, já presente no card. As demais métricas preservam legendas por origem e todas mantêm a consulta temporal no balão.

## Espaçamento compacto — 20/10/2026
A consulta temporal usa balão absoluto sobre a área do gráfico, sem reservar uma faixa vazia acima do SVG. Margens menores aproximam cabeçalho e legenda da plotagem; gráficos sem legenda não recebem a margem destinada a ela. A altura responsiva e as interações permanecem preservadas.
