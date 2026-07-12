# ADR-0237: Estatísticas e publicações reais do psicólogo no Admin

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-57: Detalhe administrativo do psicólogo — Estatísticas e publicações.

## Contexto

As abas administrativas **Estatísticas** e **Publicações** precisam permitir auditoria operacional do perfil do psicólogo, mas a base atual ainda não possui tracking para todas as métricas exibidas nos protótipos, principalmente impressões em busca e visualizações de respostas individuais.

A Lectum já registra dados reais em eventos e tabelas de domínio, incluindo `profile_view_event`, `profile_video_watch_session`, `contact_request`, `psychologist_favorite`, `community_post`, `post_reply`, `post_save`, `post_reply_save`, `post_share` e `page_view_event` para páginas públicas. A task exigia evitar qualquer estimativa ou dado fake permanente.

## Decisão

- Criar endpoints privados Admin específicos para engajamento do psicólogo:
  - `GET /api/admin/private/psychologists/:id/statistics`;
  - `GET /api/admin/private/psychologists/:id/publications`.
- Agregar somente fontes persistidas existentes:
  - métricas de negócio por `profile_view_event`, `contact_request.channel=whatsapp` e `psychologist_favorite`;
  - vídeo por `profile_video_watch_session`, derivando retenção dos marcos reais registrados;
  - comunidade por `community_post`, `post_reply`, `post_save`, `post_reply_save` e contadores reais de votos;
  - visualizações de posts apenas por `page_view_event.target_type=post/community_post`.
- Marcar como indisponíveis, e não estimar, métricas sem tracking confiável nesta etapa, como resultados de busca e visualizações de respostas individuais.
- A aba **Publicações** permanece somente leitura: não edita, remove nem modera posts/respostas.
- A UI Admin segue mobile-first, usa `next/image` para mídia renderizável e reaproveita o shell/cliente Admin existente.

## Consequências

- Administradores passam a ter visibilidade real de estatísticas e publicações sem criar uma camada paralela de analytics.
- O painel deixa explícita a diferença entre métrica real e métrica indisponível, reduzindo risco de decisões baseadas em estimativas invisíveis.
- A evolução futura de tracking de busca e respostas pode preencher os mesmos campos sem alterar o contrato principal, desde que a fonte real seja persistida.
- A leitura de publicações não interfere no fluxo público de comunidades nem adiciona poderes de moderação fora do escopo aprovado.

## Emenda 2026-07-11 — resultados de busca

O contador **Resultados de busca** deixou de ser indisponível porque a listagem pública de psicólogos passou a registrar uma impressão real quando um card/slide de psicólogo fica ativo na busca.

Decisão complementar:

- Reutilizar `profile_view_event.source` para separar fontes sem criar tabela nova:
  - `source="profile_page"` continua representando abertura real do perfil;
  - `source="search_result"` representa impressão real do psicólogo em resultados de busca/listagem.
- O endpoint público/optional-auth `POST /api/private/directory/psychologists/:id/search-impression` persiste a impressão de resultado sem disparar notificação de visualização de perfil.
- Métricas de abertura de perfil no Admin, dashboard de psicólogos e analytics do psicólogo passam a filtrar `source="profile_page"`, evitando misturar impressão de busca com visita ao perfil.
- A aba Admin **Estatísticas** passa a preencher o card **Resultados de busca** por `profile_view_event.source=search_result`.
- A UI deduplica impressões por psicólogo e conjunto de search params na sessão renderizada, sem seed, mock ou estimativa.

## Emenda 2026-07-11 — controles integrados ao gráfico

A área superior da aba **Estatísticas** passa a priorizar leitura comparativa:

- os cards de negócio viram botões acessíveis (`aria-pressed`) para mostrar/esconder as séries do gráfico;
- o gráfico de evolução passa a exibir curvas das métricas ativas, incluindo **Resultados de busca**;
- pelo menos uma métrica disponível permanece ativa para evitar gráfico vazio por acidente;
- no desktop, a área superior usa duas colunas: à esquerda ficam contadores e evolução do período; à direita ficam dados gráficos/estatísticos do vídeo de apresentação;
- no mobile, a composição continua empilhada para preservar leitura em ~390px.
- Ajuste de refinamento: esses controles devem ser botões compactos, em uma única linha horizontal dentro do card do gráfico, e não cards grandes separados. O bloco não deve ter rolagem horizontal; o gráfico deve usar a largura útil disponível e reduzir marcações quando necessário.
- Ajuste visual posterior: os blocos de **Estatísticas de negócio** e **Análises do vídeo de apresentação** devem ter pesos visuais compatíveis; o gráfico de negócio fica menos alto e o card de vídeo usa preview, títulos, métricas e retenção mais compactos para não dominar a área superior.
- Ajuste de legibilidade: os botões do gráfico de negócio não exibem ícones internos; apenas marcador de cor, rótulo completo e valor compacto, evitando elipse nos textos.
- Ajuste de período: o título **Estatísticas de negócio** fica fora dos cards e compartilha a linha superior com o filtro real de período (`Esta semana`, `Este mês`, `Este ano`, `Todo o período`) e os campos **De**/**Até** sempre visíveis. Ao editar uma data manualmente, o estado aplicado passa a ser `Personalizado` sem expor essa opção como seleção direta. O filtro é aplicado ao endpoint de estatísticas e, portanto, aos contadores e ao vídeo de apresentação.

Essa mudança preserva as fontes reais de dados, tracking e persistência, mas amplia o contrato de leitura de estatísticas com filtros opcionais de período (`period`, `from`, `to`) para que contadores, gráfico de negócio e vídeo de apresentação usem a mesma janela temporal.

## Emenda 2026-07-12 — granularidade adaptativa no gráfico de contadores

O gráfico de contadores da aba **Estatísticas** passa a adaptar a granularidade visual ao tamanho do período:

- períodos de até 31 dias continuam com pontos diários;
- períodos de 32 a 120 dias são somados em janelas semanais de 7 dias a partir do início do filtro;
- períodos acima de 120 dias são somados por mês.

Essa agregação ocorre apenas na UI Admin para reduzir ruído visual em períodos longos, sem alterar a fonte real, o endpoint de estatísticas nem os totais recebidos. Os tooltips exibem o intervalo agregado e os valores somados da série ativa.

## Emenda 2026-07-12 — filtro independente de comunidade

A seção **Estatísticas de comunidade** passa a seguir a mesma hierarquia visual de **Estatísticas de negócio**: título fora do card branco e controles de período/datas na lateral direita no desktop, empilhando em mobile-first.

Decisão complementar:

- Manter o contrato backend atual de `GET /api/admin/private/psychologists/:id/statistics`.
- Executar duas queries reais da mesma leitura: uma para negócio/vídeo e outra para comunidade.
- Cada query recebe seu próprio estado de `period`, `from` e `to`, permitindo que o Admin altere comunidade sem alterar negócio/vídeo.
- Não criar endpoint paralelo nem parâmetro composto enquanto a necessidade for apenas separar o estado visual do filtro.

Consequência: há uma segunda leitura de estatísticas quando os períodos divergem, mas ela reaproveita dados reais e evita mudança de contrato backend para um refinamento de UI. Se o custo da tela crescer, uma task futura pode evoluir o contrato para períodos nomeados por seção.

## Emenda 2026-07-12 — atualização parcial de estatísticas

A troca de período/data na aba **Estatísticas** não deve desmontar a aba inteira depois da primeira carga.

Decisão complementar:

- Usar `placeholderData` nas queries de estatísticas para manter o último resultado visível enquanto a nova janela é buscada.
- Exibir o skeleton global somente na carga inicial sem dados.
- Restringir o feedback de atualização à seção afetada com o estado `Atualizando`:
  - negócio/vídeo ao trocar o filtro de **Estatísticas de negócio**;
  - comunidade ao trocar o filtro de **Estatísticas de comunidade**.
- Manter filtros independentes e o contrato backend atual de `GET /api/admin/private/psychologists/:id/statistics`.

Consequência: a UI preserva contexto, gráfico, títulos e filtros durante refetches, com uma leitura extra apenas quando a seção alterada possui período diferente.

## Emenda 2026-07-12 — comparativo real e restauração dos cards de negócio

O recorte visual ativo da aba **Estatísticas** exige que os contadores de negócio sejam lidos como KPIs, não apenas como legenda compacta do gráfico, e que os contadores/vídeo mostrem crescimento ou queda em relação ao período anterior.

Decisão complementar:

- Ampliar o contrato de `GET /api/admin/private/psychologists/:id/statistics` com `previous_from`/`previous_to` no período.
- Incluir comparação real nos cards de negócio:
  - `profile_views`;
  - `search_results`;
  - `whatsapp_clicks`;
  - `favorites`.
- Incluir comparação real nas métricas do vídeo:
  - sessões/visualizações;
  - taxa de replay;
  - retenção média.
- Calcular o período anterior como a janela imediatamente anterior, com a mesma quantidade de dias do filtro atual.
- Quando o período anterior for zero e o atual for maior que zero, retornar `change_percent=null` e `trend="unavailable"` para não inventar percentual infinito.
- Manter os cards de negócio como botões acessíveis (`aria-pressed`) que controlam as séries visíveis no gráfico, mas com aparência de card/KPI alinhada ao protótipo.
- Ajustar o preview do vídeo para proporção visual mais compacta, preservando o gráfico de retenção como elemento principal do card de vídeo.

Consequência: o endpoint faz leituras adicionais das mesmas fontes persistidas no período anterior, sem tabela nova, sem mock e sem estimativa. O Admin ganha leitura comparativa coerente com o protótipo, mantendo a interação existente de ligar/desligar séries.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin real:
  - `GET /api/admin/private/psychologists/:id/statistics` retornou `200` com cards reais de negócio/comunidade e vídeo disponível quando há sessões reais;
  - `GET /api/admin/private/psychologists/:id/publications` retornou `200` com publicações reais de `community_post`/`post_reply`, filtros e paginação.
- Browser local via Edge/CDP em `http://localhost:3002/psicologos/demo-profile-marina-rocha?tab=estatisticas` e `?tab=publicacoes`, com login administrativo real, confirmou renderização das duas abas, estado mobile-first em 390px, fontes reais e avisos de métricas indisponíveis.

Validação da emenda de 2026-07-11:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real `POST /api/private/directory/psychologists/demo-psychologist-ana-luiza-mota/search-impression` retornou `200` com `tracked=true`.
- Browser local/headless em 390x844 abriu `http://localhost:3000/psychologists?search=Ana`, exibiu Ana Luiza Mota e acionou o tracking real de impressão.
- Leitura direta do service Admin `showAdminPsychologistStatistics` retornou o card `search_results` disponível com fonte `profile_view_event.source=search_result` e valor real persistido.

Validação da emenda de controles integrados:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/psicologos/cmrglzdds000ajkuhqedavedb?tab=estatisticas` retornou `200`.

Validação da emenda de granularidade adaptativa:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.

Validação da emenda de filtro independente de comunidade:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless via Edge/CDP em `http://localhost:3012/psicologos/demo-psychologist-marina-rocha?tab=estatisticas`, com admin temporário real removido ao final, confirmou:
  - título **Estatísticas de comunidade** fora do card branco;
  - campos **Período**, **De** e **Até** próprios da comunidade;
  - alteração do período da comunidade para `Este mês` mantendo negócio em `Esta semana`.

Validação da emenda de atualização parcial:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless via Edge/CDP em Next start local com backend real, admin temporário real removido ao final e atraso controlado nas requisições de estatísticas, confirmou:
  - trocar o período de negócio manteve a aba renderizada sem skeleton global;
  - apenas **Estatísticas de negócio** exibiu `Atualizando`;
  - o filtro de comunidade permaneceu inalterado;
  - trocar o período de comunidade manteve a aba renderizada sem skeleton global;
  - apenas **Estatísticas de comunidade** exibiu `Atualizando`;
  - o filtro de negócio permaneceu inalterado.

Validação da emenda de comparativo real e restauração dos cards:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm check`
- Validação executada em worktree limpo com apenas esta correção aplicada, porque o workspace principal continha alterações não relacionadas em andamento.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelos PNGs locais:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.
- Não foi criado tracking novo nem seed artificial para completar métricas ausentes.
