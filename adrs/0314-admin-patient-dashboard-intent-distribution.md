# ADR-0314: Distribuicao agregada de intencao dos pacientes no dashboard Admin

## Status

Accepted

## Contexto

O Admin precisa distinguir, de forma agregada, se a base de pacientes esta apenas navegando ou se demonstra intencao real de contato com psicologos. O produto tambem definiu restricoes importantes: a leitura nao pode virar pressao comercial, nao deve ser exibida publicamente, nao deve ser exposta a psicologos e nao pode inferir sessao, atendimento, diagnostico ou conversa, ja que o site observa no maximo discovery e clique no WhatsApp.

Ja existe a analise individual de intencao no detalhe do paciente (ADR-0312). O dashboard de pacientes precisava de uma leitura percentual da base logo abaixo de **Visao Geral**.

## Decisao

Adicionar `intent_analysis` ao payload de `GET /api/admin/private/patients/dashboard`, calculado somente com sinais reais ja persistidos no periodo selecionado:

- `profile_view_event.viewer_id` com `source="profile_page"` para abertura de perfil publico de psicologo;
- `psychologist_favorite.user_id` nao deletado para favoritos ativos;
- `contact_request.user_id` com `channel="whatsapp"` para clique no WhatsApp;
- repeticao de abertura do mesmo perfil por paciente/psicologo como retorno real ao perfil.

A distribuicao usa como denominador os pacientes reais existentes no final do periodo selecionado e classifica cada paciente em uma categoria unica:

- **Frios**: sem abertura de perfil, favorito ou clique no WhatsApp no periodo;
- **Curiosos**: abriram perfil/baixa intencao, sem favorito ou WhatsApp;
- **Interessados**: favoritaram psicologos ou retornaram a perfis, sem clique no WhatsApp;
- **Qualificados**: clicaram no WhatsApp ou concentraram multiplos sinais fortes.

A UI do Admin mostra apenas agregados: percentual, contagem por categoria e totais de sinais. Nao retorna lista nominal neste bloco, nao expande eventos brutos e inclui copy de privacidade informando que o indicador e interno do Admin e nao representa diagnostico, atendimento ou conteudo de conversa.

## Consequencias

- O dashboard passa a responder se a base tem sinais de intencao sem criar tracking novo ou dados artificiais.
- Pacientes sem sinais entram como **Frios**, mantendo percentual sobre a base total e evitando inflar segmentos quentes.
- Cliques no WhatsApp sao o sinal mais forte, pois representam o limite maximo observado pelo site.
- A classificacao e operacional/produto, nao clinica. Qualquer uso futuro em CRM, notificacao, ranking publico ou repasse para psicologos exigira nova decisao de produto/privacidade.
- Nao houve schema Prisma, migration, package novo, seed, mock ou backfill.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `buildPatientsDashboard({ period: "all" })` retornou as quatro categorias de `intent_analysis` com dados reais.
- Browser local headless autenticado confirmou o bloco abaixo de **Visao Geral**, as quatro categorias, nota de privacidade e mobile 390px sem overflow horizontal.

## Atualizacao 2026-07-23 - Label Interessados

O label de produto do segmento tecnico `objective` foi renomeado de **Objetivos** para **Interessados**. A mudanca evita sugerir que o paciente tomou uma decisao objetiva/rapida de contato; o segmento segue representando favoritos ou retornos a perfis sem clique no WhatsApp. O id tecnico foi mantido para compatibilidade do contrato.

## Atualizacao 2026-07-23 - Label Qualificados

Por decisao direta de produto, o segmento tecnico `very_qualified` do dashboard `/pacientes` foi renomeado visualmente de **Muito qualificados** para **Qualificados**.

O id tecnico `very_qualified` foi preservado para compatibilidade do contrato e o criterio de classificacao nao mudou: pacientes com clique no WhatsApp ou multiplos sinais fortes continuam entrando nesse segmento. A mudanca e somente de label de produto e foi validada com `buildPatientsDashboard({ period: "all" })`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless em desktop e mobile.

## Atualização 2026-07-25 - Filtros agregados por intenção

O dashboard `/pacientes` passou a expor `intent_filters` no contrato de `GET /api/admin/private/patients/dashboard` para permitir que os blocos **Gênero**, **Forma de cadastro**, **Devices e sistemas**, **Uso da plataforma** e **Localização** sejam recortados por **Todos**, **Frios**, **Curiosos**, **Interessados** e **Qualificados**.

A decisão preserva a classificação canônica já calculada em `intent_analysis`: o backend monta os recortes por segmento usando dados reais do mesmo período, e o Admin apenas alterna entre agregados prontos. Isso evita recalcular intenção no cliente e evita criar endpoint paralelo, tracking novo, seed, mock ou backfill.

Os recortes continuam agregados e internos ao Admin. Não há lista nominal por segmento nesses blocos, e localização permanece coarse via `visitor_location`, sem IP, coordenada ou endereço. Na UI, o seletor é compacto e sem o rótulo visual **Intenção**; a acessibilidade mantém label apenas `sr-only`.

## Atualizacao 2026-07-28 - Intencao e engajamento em duas colunas

O bloco do dashboard Admin de pacientes foi reorganizado de **Analise da intencao dos pacientes** para **Intencao e engajamento dos pacientes**, com duas leituras paralelas no desktop e empilhamento mobile-first:

- **Intencao dos pacientes**: mantem a classificacao agregada em Frios, Curiosos, Interessados e Qualificados, agora com grafico de donut e barra de distribuicao percentual.
- **Engajamento dos pacientes**: separa os sinais reais de comportamento em um grafico de barras para aberturas de perfil, favoritos ativos, cliques no WhatsApp e retornos ao perfil.

A decisao evita misturar temperatura/intencao com volume de acoes observadas. O contrato `intent_analysis` permanece o mesmo; a mudanca e somente de hierarquia visual no Admin, sem endpoint novo, schema Prisma, migration, package, tracking, seed, mock ou backfill. A UI informa que uma pessoa pode gerar mais de um sinal, entao o grafico de engajamento mede acoes reais e nao pacientes unicos.


## Atualizacao 2026-07-28 - Engajamento por paciente unico

Apos novo feedback de produto, o bloco deixou de usar `intent_analysis.signal_totals` como grafico de barras de acoes na coluna **Engajamento dos pacientes**. Acoes continuam disponiveis no contrato de intencao para compatibilidade, mas a leitura visual de engajamento passa a exigir pacientes unicos por nivel.

Foi adicionado `engagement_analysis` ao payload de `GET /api/admin/private/patients/dashboard`, calculado no backend com os mesmos sinais reais ja usados pela intencao:

- abertura de perfil de psicologo via `profile_view_event`;
- favorito ativo via `psychologist_favorite`;
- clique no WhatsApp via `contact_request`;
- retorno ao mesmo perfil como reforco derivado de aberturas repetidas para o mesmo psicologo.

A classificacao e exclusiva por paciente e usa estes criterios operacionais:

- **Sem engajamento**: nenhuma acao real no periodo;
- **Pouco engajados**: uma unica acao de descoberta, sem favorito, retorno ou WhatsApp;
- **Engajados**: favorito, retorno ao mesmo perfil ou pelo menos duas acoes reais;
- **Muito engajados**: clique no WhatsApp, quatro ou mais acoes reais, ou multiplos retornos ao mesmo perfil.

A UI agora mostra donuts espelhados: intencao em Frios/Curiosos/Interessados/Qualificados e engajamento em Muito engajados/Engajados/Pouco engajados/Sem engajamento. A coluna de intencao removeu a barra horizontal e os cards de contadores para manter foco no grafico. Nao houve schema Prisma, migration, package novo, tracking, seed, mock, endpoint paralelo ou backfill.

## Atualização 2026-07-28 - Intenção x Engajamento

Por pedido de produto, o dashboard `/pacientes` ganhou um bloco **Intenção x Engajamento** logo abaixo de **Intenção e engajamento dos pacientes**, seguindo a lógica analítica do bloco **Tração x Engajamento** de psicólogos sem expor listas nominais.

O contrato `GET /api/admin/private/patients/dashboard` passa a retornar `intent_engagement`, calculado no backend com as classificações reais já existentes de intenção e engajamento por paciente único. A matriz cruza as quatro categorias de intenção (**Frios**, **Curiosos**, **Interessados** e **Qualificados**) com os quatro níveis de engajamento (**Muito engajados**, **Engajados**, **Pouco engajados** e **Sem engajamento**), sempre sobre a mesma base de pacientes do período.

Para facilitar a leitura executiva, o payload também retorna uma comparação agregada:

- alta intenção = **Interessados** + **Qualificados**;
- alto engajamento = **Engajados** + **Muito engajados**;
- diferença observada = taxa de alta intenção entre pacientes com alto engajamento menos a taxa de alta intenção entre pacientes com pouco ou nenhum engajamento.

Essa leitura é observacional e interna ao Admin. Ela não indica causalidade, diagnóstico, atendimento, conversa, prioridade de cuidado, ranking público ou pressão comercial individual. Não houve schema Prisma, migration, package novo, tracking, seed, mock, endpoint paralelo ou backfill.
