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

## Refinamento do respiro — 20/10/2026
Após revisão visual, o conjunto recebe 16px adicionais distribuídos entre a margem do cabeçalho e a margem da plotagem. Isso mantém uma separação moderada sem restaurar a faixa fixa reservada ao balão.

## Contadores do vídeo em duas linhas — 20/10/2026
As métricas detalhadas do vídeo usam grid por colunas com duas linhas, rolagem nativa e snap. Cada coluna ocupa 78% da largura no mobile, indicando a próxima sem diminuir a leitura dos cards. Nas telas maiores, as colunas ocupam 46% da largura e continuam roláveis para preservar a legibilidade. O painel pode receber foco para rolagem por teclado; setas atendem o desktop. A retenção permanece abaixo, sem mudança de dados.

## Rosca de cliques nas comunidades — 20/10/2026
A seção de comunidades passa a representar exclusivamente cliques no WhatsApp: os quatro tipos de conteúdo e Top Mentores formam uma rosca cuja soma corresponde às cinco linhas da tabela. O centro exibe Cliques, sem misturar contagem de conteúdo ou pessoas únicas. Cores dos ícones e seleção por toque/teclado vinculam a tabela às fatias, dispensando legenda adicional. Zero cliques usa anel neutro sem proporções artificiais; origem única usa anel completo.

## Miniaturas de conteúdos em destaque — 20/10/2026
O contrato de comunidades recebe highlights opcional com posts e replies. O ranking usa eventos de WhatsApp já filtrados por período e conteúdos ativos do profissional. Deduplica pessoas dentro de cada conteúdo, sem eliminar o crédito de outro conteúdo que a mesma pessoa tenha acessado; não soma os rankings para substituir o total agregado do canal. Empates usam ID estável e cada lista limita-se a cinco itens positivos. Metadados são buscados apenas para os vencedores e revalidam autoria, publicação e comunidade ativa; anexos apagados não são exibidos. Não há migração.

O frontend substitui a tabela por legenda selecionável e acrescenta miniaturas com imagens estáticas ou trechos, sem players automáticos. Os contadores exibem ícone e número com descrição acessível. Links de resposta preservam focusReplyId; atalhos dos títulos abrem `/app/publicacoes/minhas?type=posts` ou replies. Estado sem resultados mantém o atalho; payload antigo sem highlights indica indisponibilidade em vez de inventar dados.

## Quadros dos vídeos e legenda uniforme — 20/10/2026
A legenda usa pontos e a tipografia compacta das séries temporais; o tamanho é aplicado também ao contêiner para respeitar a regra global de herança dos botões. Os destaques recebem media_url opcional para obter um quadro do vídeo original, evitando artes sociais antigas em thumbnail_url. Stream reutiliza a resolução autenticada de poster; arquivos legados reutilizam a extração local de quadro. IntersectionObserver adia esse trabalho até a proximidade da miniatura. URLs de objetos são revogadas no descarte. Não há reprodução nem controles de player. O contador branco fica sobre a miniatura vertical com degradê de contraste.

## Escala compacta das miniaturas — 20/10/2026
A largura passa a 108px no mobile e 120px no desktop, mantendo a proporção 9:16. Miniaturas textuais usam fonte compacta e truncamento para reservar o canto do contador. Exemplos de texto e vídeo existem apenas na prévia de validação; o produto continua usando conteúdos reais do ranking.

## Densidade e atribuição após publicação — 20/10/2026
Os contadores superiores reduzem ícones, tipografia, padding e largura; somente seu rótulo abrevia Vídeo de apresentação. As métricas detalhadas preservam duas linhas e indicação da próxima coluna, com altura mínima de 88px e contraste por tokens de borda/superfície. A barra de período mantém borda e sombra no viewport arredondado, não no conteúdo que rola. O balão temporal fica como irmão do slider, permitindo um botão acessível de fechar sem capturar novamente o ponteiro; Escape também fecha e o botão devolve foco ao gráfico.

A série de vídeo identifica Dentro do perfil por rotas explícitas. O agrupamento reconhece também /app/psicologo/:id e /app/psicologos, usadas pelas rotas autenticadas em português. Registros sem origem ou com caminho não reconhecido permanecem em Origem não identificada; não há backfill presumido nem alteração de contagens. Contrato aditivo, sem migration. Player, medição de engajamento e sincronização da retenção não são alterados.

## Destaques unificados — 20/10/2026
Os cabeçalhos de métricas do vídeo e resultados de conteúdos dispensam ícones para alinhar o texto ao conteúdo. Conteúdos em destaque reúne os rankings de posts e respostas, ordena por cliques decrescentes com desempate estável por ID/tipo e limita a cinco conteúdos positivos. Como a API já retorna os cinco melhores de cada tipo, essa união permite selecionar os cinco melhores gerais sem alterar contrato ou consultas. Cada miniatura preserva 9:16 e recebe Post ou Resposta abaixo; links individuais mantêm o foco da resposta. O atalho único abre Minhas Publicações sem filtro de tipo. Setas continuam condicionadas ao overflow no desktop.

## Comparação de períodos — 20/10/2026
A resposta de analytics recebe comparison opcional, com limites e totais anteriores. A janela anterior termina um milissegundo antes da atual e tem a mesma duração inclusiva; Todo o período não gera consulta comparativa. Consultas agregadas preservam os filtros dos contadores atuais: WhatsApp por pessoas únicas no intervalo, sessões válidas do vídeo atual, perfil sem autoacesso, favoritos ativos e avaliações publicadas. Pacientes adquiridos reutiliza os relatórios semanais existentes e não exibe variação quando qualquer intervalo está incompleto ou sem resposta. Não há migração nem mudança em tracking/retenção.

O frontend tolera payload antigo omitindo o indicador. Aumento/queda usam seta e cor, estabilidade mostra 0%, base zero com novos registros mostra Novo. Percentuais pequenos preservam direção com <0,1%; percentuais muito grandes usam notação compacta. Um botão independente da seleção do card abre comparação com datas, horas e valores, via modal acessível existente. A altura dos contadores permanece compacta. Cabeçalho de comunidades renomeado para Desempenho de conteúdo.

O atalho para Minhas Publicações transporta um returnTo restrito à rota de Analytics, incluindo período, intervalo personalizado e métrica selecionada. A seta de retorno respeita essa origem, preservada ao alternar Posts/Respostas; acessos comuns continuam voltando ao perfil. Uma memória de sessão temporária registra a posição vertical. Analytics restaura após carregar os dados, com breve observação de layout e interrupção ao toque/rolagem; na ausência de memória, volta ao início dos destaques. Nenhum destino externo é aceito.


## Ações de WhatsApp e pessoas — 21/10/2026

Substitui a regra anterior de pessoas únicas para indicadores chamados cliques. Analytics usa important_action_event como fonte comum de ações, exclui autoacessos, eventos excluídos e conteúdos indisponíveis, respeita a janela inclusiva e conta cada ID uma vez. O total atual e anterior usam a mesma consulta, os pontos diários somam ações e cada ação pertence a uma única origem. Conteúdos contam ações por alvo, sem atribuir todos os cliques de uma pessoa ao primeiro conteúdo. Origens desconhecidas permanecem explícitas no gráfico e na tabela do novo frontend. Eventos de Top Mentores são preservados mesmo sem comunidades atuais.

whatsapp_unique_people e whatsapp_clicks_per_person são campos opcionais aditivos, calculados sobre o mesmo conjunto de ações do total; a média é nula sem pessoas. Pessoas únicas são identificadas por conta ou visitante, não somadas por dia/canal. O resumo de três linhas substitui a frase ambígua. Clientes antigos toleram os campos novos; frontend novo mostra traços se faltarem. Os relatórios de pacientes mantêm whatsappPeopleCounts e contact_requests com COUNT DISTINCT; pacientes adquiridos continuam sendo valores informados, nunca inferidos de cliques.

O botão de WhatsApp envia event_id opcional por clique, usado em upsert atômico com ID derivado de visitante e chave. Reenvio preserva a primeira ação; cliques independentes têm chaves distintas. Usa a chave primária existente, sem migration ou variável nova. Clientes legados continuam aceitos, mas seus reenvios sem chave não podem ser distinguidos retroativamente. Não se somam contact_requests aos eventos de analytics: ambos são registros paralelos da mesma interação. O histórico passa a refletir ações efetivamente presentes no tracking; eventos ausentes não são reconstruídos por suposição. Retenção e reprodução do vídeo permanecem intactas.

Deploy: backend antes do frontend, sem migração. Rollback por artefatos anteriores; registros com IDs novos continuam compatíveis. Nenhuma escrita em produção nesta tarefa. Referência visual: capturas do usuário, Builder indisponível.

Validação: pnpm check completo aprovado, 948 testes no backend, builds frontend/backend aprovados; SSR e navegador em 390px/1440px validam os três indicadores e alternância para pacientes. Testes cobrem cliques repetidos, canais/dias, deduplicação por ID, desconhecidos, limites da comparação, filtros de autoria e preservação da consulta DISTINCT dos relatórios. Consultas foram verificadas por contrato e testes isolados: PostgreSQL local recusou conexão; integração real/readiness ficam pendentes de ambiente disponível. Sem acesso a dados produtivos e sem publicação.


### 2026-10-21 — Legenda e resumo de cliques

- [x] Substituir a tabela de origens pela legenda compartilhada com Acesso ao perfil, acima do gráfico.
- [x] Exibir total de cliques, pessoas únicas e média de cliques por pessoa abaixo do gráfico, com divisor e tipografia text-sm/font-bold/text-muted de Gerenciar pacientes adquiridos.
- Referência: capturas fornecidas pelo usuário; Builder indisponível nesta sessão. Layout mobile-first, sem mudanças no cálculo das métricas.
