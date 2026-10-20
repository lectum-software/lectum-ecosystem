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
