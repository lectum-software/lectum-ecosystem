# ADR-0266: Métricas administrativas de conversão e uso da plataforma por psicólogos

## Status

Accepted

## Contexto

O dashboard administrativo de psicólogos precisava responder quanto tempo os psicólogos levam entre cadastro e primeira assinatura paga e como usam a plataforma Lectum. O detalhe individual também precisava mostrar o prazo até assinatura no bloco de assinatura e concentrar métricas de navegação na aba **Estatísticas**.

A Lectum não intermedia consultas, sessões clínicas, mensagens ou conversas por WhatsApp. Portanto, as novas métricas precisam ficar restritas a cadastro, assinatura e navegação first-party autenticada.

## Decisão

- A conversão até assinatura paga será calculada por coorte de `user.createdAt` do psicólogo no período selecionado.
- A primeira assinatura paga será a primeira `professional_subscription` não deletada com plano profissional pago (`subscription_plan.price_cents > 0` e slug diferente de `gratuito`) e origem real Mercado Pago (`source`/`gateway`/assinatura gateway), usando `professional_subscription.createdAt` como data de ativação disponível no modelo atual.
- Status `ativa` e `cancelada` contam como conversão histórica paga. Assim, cancelamento posterior não remove a primeira conversão. Plano gratuito e cortesia administrativa não contam.
- Média, mediana, P75 e P90 consideram apenas psicólogos convertidos. A faixa **Ainda não assinou** entra nos buckets da coorte, mas não entra nos percentis.
- O modo de cadastro terá apenas **Google** e **E-mail e senha**; provedores legados/desconhecidos ficam em contador indisponível, sem criar categoria de produto.
- O uso da plataforma será derivado somente de `page_view_event` autenticado com `user.role="psicologo"`.
- A duração média só será exibida quando pelo menos 50% dos pageviews autenticados do recorte tiverem `duration_seconds` positivo; caso contrário, o retorno informa indisponibilidade honesta para essa métrica.
- Páginas mais acessadas serão normalizadas para rótulos humanos seguros, sem paths crus, IDs, query strings ou segredos.
- Não haverá alteração de schema Prisma nem backfill artificial de eventos históricos.
- Builder/Quick Copy não estava disponível no ambiente de execução; os blocos seguiram o padrão visual das imagens locais de dashboard, Geral e Estatísticas. Não havia protótipo específico para estes novos blocos.

## Consequências

- O Admin passa a acompanhar conversão paga, prazo de conversão, modo de cadastro e uso da plataforma sem criar dashboard paralelo.
- Métricas antigas continuam compatíveis e os novos campos são adicionados aos contratos existentes do dashboard, detalhe e estatísticas.
- Períodos sem dados reais retornam copy/estado de indisponibilidade em vez de zero falso.
- A limitação de usar `professional_subscription.createdAt` como data da primeira assinatura paga fica documentada até existir campo/evento mais específico de ativação confirmada.
- Não há migration nem `db:migrate`, pois a task reutiliza dados persistidos existentes.

## Alternativas consideradas

1. **Criar tabela agregada nova de analytics**: rejeitada nesta etapa porque os eventos e assinaturas reais já existem e a task não exige materialização.
2. **Usar `payment_event` como única fonte de conversão**: adiada, pois o contrato vigente de assinatura profissional já centraliza plano, origem e status; payload bruto de pagamento não deve ser exposto.
3. **Exibir paths crus nas páginas mais acessadas**: rejeitada por risco de expor IDs, query strings e detalhes sensíveis.
4. **Criar tracking de terceiros ou backfill histórico**: rejeitado por estar fora do escopo e por violar a regra de não inventar eventos.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local em `/psicologos`, `/psicologos/test-id`, `/psicologos/test-id?tab=estatisticas`.
- Smoke HTTP local dos endpoints Admin privados sem sessão retornando 401.

## Complemento 2026-07-14

O campo individual `time_to_first_paid_subscription.label` é a fonte única de exibição do `Tempo até assinatura` no detalhe do psicólogo. Além do card **Dados da assinatura** da aba Geral, a aba **Assinatura** também reutiliza esse mesmo campo no card **Plano atual**, evitando recálculo no frontend e mantendo o comportamento de plano gratuito/cortesia sem contar como assinatura paga.

## Complemento 2026-07-14 - Legibilidade dos seletores de gráfico

Os cards que controlam séries de gráficos no dashboard e na aba **Estatísticas** devem diferenciar claramente estado ativo e inativo. O estado inativo usa fundo cinza por token (`bg-border/50`) e sem sombra, enquanto o ativo mantém superfície branca, sombra e destaque primário. A decisão é visual, não altera contratos de API nem regras de cálculo das métricas.

## Complemento 2026-07-14 - Faixa agregada de ausência de conversão

O dashboard Admin de psicólogos não deve exibir uma faixa textual adicional quando a coorte não possui assinatura paga real. A indisponibilidade segue representada pelos próprios KPIs e buckets do bloco de conversão, enquanto `conversion.unavailable_reason` permanece no contrato backend para rastreabilidade e possíveis consumidores futuros. A decisão é apenas de apresentação e não altera cálculo, privacidade, schema Prisma ou endpoints.

## Complemento 2026-07-14 - Instalação PWA no uso da plataforma

O bloco **Uso da plataforma** do dashboard Admin de psicólogos passa a incluir o percentual de psicólogos com evento real `important_action_event.action_type="pwa_installed"` no período selecionado. A métrica considera apenas eventos autenticados de usuários `role="psicologo"` e usa como denominador os psicólogos elegíveis do dashboard no recorte. Ela mede instalação registrada por analytics first-party, não estado atual instalado nem desinstalação, e não cria backfill ou dados artificiais.

Validação complementar: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, validação do snapshot staged do Admin e `pnpm check`.

## Complemento 2026-07-14 - PWA instalado no uso individual

A aba **Estatísticas** do detalhe administrativo do psicólogo passa a exibir, no bloco **Uso da plataforma**, se há evento real `important_action_event.action_type="pwa_installed"` para aquele psicólogo. A consulta individual não fica limitada ao período selecionado, porque instalação PWA é uma adoção registrada e não uma métrica recorrente de navegação do recorte. A UI mostra `Sim` quando há evento e `Não registrado` quando não há evento persistido; isso não afirma estado atual instalado nem captura desinstalação.

Validação complementar: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e validação do snapshot staged do Admin.

Validação adicional: `pnpm check`.


## Complemento 2026-07-15 - Click de WhatsApp atribuido a conteudo

Os CTAs de WhatsApp exibidos em posts e respostas de comunidade passam a registrar tambem um evento first-party `important_action_event.action_type="whatsapp_click"` com `target_type`/`target_id` do conteudo. Esse evento e uma camada de atribuicao de UI para metricas de conteudo, nao substitui `contact_request` como fonte de contato por psicologo.

A decisao evita inferir origem a partir de `contact_request`, pois esse registro nao persiste post/resposta de origem. Clicks historicos sem alvo permanecem nao atribuidos e continuam fora das metricas por conteudo. Nao ha coleta de mensagens de WhatsApp nem alteracao de schema Prisma.

## Complemento 2026-07-16 - Ações atribuídas ao vídeo de apresentação

A análise administrativa do vídeo de apresentação passa a contabilizar ações first-party disparadas a partir do vídeo/feed de psicólogos: acesso ao perfil, favoritar, clique no WhatsApp e compartilhamento. A fonte é `important_action_event` com `target_type="psychologist"` e `target_id` do psicólogo, usando action types específicos (`psychologist_video_profile_access`, `psychologist_video_favorite`, `psychologist_video_whatsapp_click`, `psychologist_video_share`) para não misturar com pageviews, favoritos, `contact_request` ou compartilhamentos de posts de comunidade.

Esses eventos complementam `profile_video_watch_session`: retenção e visualizações continuam vindo das sessões de vídeo; as novas conversões/interações do vídeo vêm de `important_action_event`. Não há backfill histórico nem inferência por URL ou sessão. O card Admin pode exibir zero real até que as novas ações sejam registradas em produção.

Validacao complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.


## Complemento 2026-07-16 - Separacao visual entre consumo e acoes do video

O bloco Admin de video de apresentacao deve separar metricas de consumo do video das acoes atribuidas ao video. Visualizacoes, replay e retencao permanecem na coluna lateral do grafico; favoritar, acessar perfil, clicar no WhatsApp e compartilhar ficam em uma secao horizontal compacta abaixo. A decisao melhora escaneabilidade, evita uma lateral excessivamente alta e nao altera fonte de dados, contrato de API ou regra de calculo.

Validacao complementar de layout 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Complemento 2026-07-16 - Publicacoes do psicologo com remocao e metricas de conteudo

A aba **Publicacoes** do detalhe administrativo do psicologo deve tratar cada item como conteudo real de comunidade: a identidade exibida no card e a comunidade (avatar e nome), enquanto a autoria do psicologo fica implícita pelo contexto da pagina. A lista nao deve exibir a tag `Somente leitura` nem o subtitulo redundante `Comunidade` abaixo do nome.

Para exclusao administrativa, a UI reutiliza o endpoint real de moderacao de conteudo de comunidade. Posts do contrato do psicologo sao enviados como `post`; respostas sao mapeadas para `comment`, preservando auditoria, confirmacao forte e motivo interno via formulario existente com React Hook Form/Zod/controllers. Nao foi criado endpoint paralelo de exclusao por psicologo.

As metricas por publicacao seguem o mesmo conjunto visual da aba **Conteudo** de comunidades: visualizacoes, upvotes, downvotes, comentarios, salvos, compartilhamentos, cliques WhatsApp e denuncias. As novas fontes por item sao `post_report`, `important_action_event.action_type="whatsapp_click"` com `target_type` de post/resposta, e `page_view_event` com alvo de post/resposta quando houver tracking first-party. Eventos historicos sem alvo continuam fora dos totais por conteudo; nao ha backfill ou inferencia por URL.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local em `/psicologos/cmrqztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Complemento 2026-07-16 - Acoes do video no analytics do psicologo

O analytics privado do psicologo (`/app/professional/analytics`) passa a reutilizar os mesmos eventos first-party especificos do video de apresentacao que ja alimentam a leitura administrativa: `psychologist_video_profile_access`, `psychologist_video_favorite`, `psychologist_video_whatsapp_click` e `psychologist_video_share` em `important_action_event` com `target_type="psychologist"` e `target_id` do profissional.

A decisao mantem a separacao entre consumo do video e conversoes/interacoes: sessoes, replay e retencao continuam vindo de `profile_video_watch_session`; acoes geradas pelo video vem de `important_action_event`, sem inferencia por URL, sem backfill e sem misturar com `contact_request` ou favoritos globais. No analytics do proprio psicologo, autoacoes autenticadas do profissional sao excluidas para manter a leitura orientada a visitantes.

A curva de retencao tambem passa a exibir o eixo X em tempo do video (`0:00`, meio e fim) usando a duracao real do player/API quando disponivel. A mudanca e somente de apresentacao quando nao houver duracao, preservando estado honesto sem dados artificiais.

## Complemento 2026-07-16 - Agrupamento de consumo, acoes e diagnostico no analytics do psicologo

No analytics privado do psicologo, os indicadores de consumo do video (`Visualizacoes` e `Taxa de replays`) devem ficar junto das acoes atribuidas ao video, em vez de ocuparem cards isolados no topo da secao. A UI passa a usar um unico bloco **Consumo e acoes do video** abaixo do player/grafico, com grid mobile-first para consumo e conversoes/interacoes.

O diagnostico de retencao fica abaixo desse grid para funcionar como conclusao da leitura das metricas. A decisao e exclusivamente de hierarquia visual: nao altera fonte de dados, contrato de API, regra de calculo, schema Prisma ou tracking first-party.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Contadores compactos no analytics do psicologo

Os contadores do bloco **Consumo e acoes do video** no analytics privado do psicologo devem priorizar escaneabilidade mobile: icone no topo, titulo imediatamente abaixo do icone e valor em destaque, sem texto descritivo dentro de cada card. A descricao geral do bloco e o diagnostico de retencao continuam fora dos contadores.

A decisao e exclusivamente visual e nao altera fonte de dados, contrato de API, regra de calculo, schema Prisma ou tracking first-party.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Aproveitamento responsivo do bloco de video

No analytics privado do psicologo, o bloco de video deve aproveitar melhor telas medias e maiores sem alterar a ordem mobile-first. A partir de md, o painel **Consumo e acoes do video** fica na coluna de contexto da retencao, logo abaixo do resumo textual, enquanto o card de midia a direita permanece dedicado ao player e ao grafico de retencao.

A decisao reduz o vazio visual que aparecia abaixo do resumo de retencao em telas largas e mantem a regra de hierarquia definida anteriormente: visualizacoes, taxa de replays e acoes atribuidas ficam agrupadas, e o diagnostico continua abaixo dos contadores. Nao ha mudanca de fonte de dados, contrato de API, schema Prisma, tracking first-party ou package.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Consumo e acoes abaixo do bloco de video

No analytics privado do psicologo, o painel **Consumo e acoes do video** deve ficar abaixo do bloco de video, nao na coluna de contexto da retencao. A composicao final mantem o topo em duas areas em telas medias e maiores: resumo de retencao a esquerda e player/grafico a direita. O painel de consumo, acoes e diagnostico entra logo abaixo, com largura total da secao e grid responsivo de contadores.

A decisao atende a hierarquia visual solicitada: primeiro o usuario ve o video e a curva de retencao; em seguida ve visualizacoes, replay, conversoes/interacoes atribuidas e diagnostico. Nao ha mudanca de fonte de dados, contrato de API, schema Prisma, tracking first-party ou package.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Video e grafico abaixo do resumo de retencao

No analytics privado do psicologo, em telas medias e maiores, o card de video e grafico de retencao deve ficar abaixo do resumo textual de retencao, e nao ao lado dele. Essa composicao aumenta a area horizontal disponivel para o grafico e melhora sua legibilidade sem alterar a ordem mobile-first.

O grafico pode escalar em largura e altura a partir de md, enquanto o video permanece em largura controlada para preservar proporcao vertical. O painel **Consumo e acoes do video** continua abaixo do card de video/grafico, mantendo metricas, acoes e diagnostico agrupados. A decisao e exclusivamente visual e nao altera dados, contrato de API, tracking first-party, schema Prisma ou packages.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Alinhamento numerico da origem do trafego

No analytics privado do psicologo, a tabela desktop **Origem do trafego** deve centralizar os valores numericos nas colunas **Visualizacoes de perfil** e **WhatsApp**, mantendo a coluna **Fonte** com leitura textual alinhada a esquerda.

A decisao melhora a comparacao vertical dos numeros em telas maiores sem alterar dados, contrato de API, tracking first-party, schema Prisma ou packages. No mobile, a visualizacao continua em cards para preservar legibilidade.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Copy de acesso ao perfil

No analytics privado do psicologo, o card de `profile_view_event` deve usar a copy **Acesso ao perfil** em vez de **Aberturas de perfil** para ficar consistente com as demais referencias do produto ao mesmo comportamento.

A decisao e apenas textual: a fonte de dados, a metrica, o contrato de API, o tracking first-party, o schema Prisma e os packages permanecem inalterados.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Cabecalho compacto Perfil na origem do trafego

No analytics privado do psicologo, a tabela desktop **Origem do trafego** deve usar o cabecalho compacto **PERFIL** para a coluna de acessos ao perfil, em vez de **Visualizacoes de perfil**.

A decisao reduz largura e ruido visual no cabecalho da tabela sem alterar a fonte real (`profile_view_event`), os valores exibidos, o contrato de API, o tracking first-party, o schema Prisma ou packages.

Validacao complementar 2026-07-16: `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke HTTP local `GET http://localhost:3000/app/professional/analytics` retornando 307 pelo guard privado.

## Complemento 2026-07-16 - Layout dos blocos de estatisticas no detalhe Admin

A aba **Estatisticas** do detalhe administrativo do psicologo passa a usar, nos blocos **Estatisticas de negocio** e **Estatisticas de comunidade**, a mesma composicao visual consolidada no detalhe de comunidade: card unico com cabecalho interno, descricao curta, filtros no lado direito em desktop, contadores clicaveis e grafico de serie temporal no mesmo bloco.

A decisao e exclusivamente de hierarquia e consistencia visual. As consultas React Query, os endpoints `GET /api/admin/private/psychologists/:id/statistics`, os filtros de periodo/comunidade e as fontes first-party reais permanecem inalterados. O filtro de comunidade continua disponivel apenas no bloco de comunidade e fica agrupado aos filtros de periodo.

Consequencia: a leitura do Admin fica consistente entre estatisticas de comunidades e de psicologos, com melhor comportamento mobile-first e sem criar endpoint paralelo, novo contrato, schema Prisma, migration, package, mock ou persistencia adicional.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Complemento 2026-07-16 - Copy contextual dos blocos de estatísticas

Os blocos **Estatísticas de negócio** e **Estatísticas de comunidade** no detalhe administrativo do psicólogo devem usar descrições orientadas ao conteúdo analisado, e não uma instrução genérica de interação com o gráfico.

- Negócio: `Visão do desempenho comercial do psicólogo na plataforma, incluindo descoberta, interesse e intenção de contato.`
- Comunidade: `Indicadores de contribuição, engajamento e posição do psicólogo nas comunidades.`

A decisão é exclusivamente textual e de hierarquia de leitura: os contadores continuam clicáveis e os gráficos, filtros, endpoints, contratos e fontes first-party reais permanecem inalterados.

Validação complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Complemento 2026-07-16 - Filtros independentes em blocos adicionais do detalhe Admin

Os blocos **Analises do video de apresentacao**, **Origem do trafego** e **Uso da plataforma** no detalhe administrativo do psicologo devem ter filtros de periodo proprios, independentes dos filtros de **Estatisticas de negocio** e **Estatisticas de comunidade**.

A decisao preserva o contrato existente: cada bloco usa o mesmo endpoint real `GET /api/admin/private/psychologists/:id/statistics`, mas com uma query React Query propria para o periodo selecionado. Com `placeholderData`, a troca de periodo mantem o bloco visivel e atualiza somente os contadores/grafico relacionados ao bloco alterado, sem estado global de pagina ou reload completo.

O grafico de retencao do video no Admin passa a exibir marcadores de tempo no eixo X derivados da duracao real do video quando disponivel. Na ausencia de metadados de duracao, o fallback permanece honesto com `0:00` e `Fim`, sem estimar tempo inexistente.

Nao ha mudanca de fonte de dados, contrato de API, schema Prisma, migration, package, tracking first-party ou persistencia adicional.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.


## Complemento 2026-07-16 - Ordenacao por engajamento nas listas de conteudo

As listas administrativas **Conteudo da comunidade** e **Publicacoes** do psicologo passam a usar `sort=engagement` como ordenacao padrao, aplicada no backend antes da paginacao.

O score de engajamento soma sinais reais ja exibidos nos cards: visualizacoes, upvotes, downvotes, comentarios, salvamentos, compartilhamentos e cliques WhatsApp. Denuncias ficam fora do score porque representam sinal de moderacao, nao de engajamento, e continuam visiveis nos cards e fluxos de triagem.

A UI posiciona o seletor de ordenacao no cabecalho do card de resultados, na mesma linha do titulo em telas amplas e empilhado no mobile. As opcoes adicionais sao **Mais recentes** e **Mais antigos**, com desempate por recencia e identificador para manter estabilidade.

Nao ha endpoint paralelo, schema Prisma, migration, package novo, mock, backfill ou dado materializado.

Validacao complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, validacao direta dos services com scores em ordem decrescente (`community 200 [83,17,2,2,2]`, `publications 200 [6,2,0]`) e smoke HTTP local para `/comunidades/relacionamentos-com-proposito?tab=conteudo` e `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=publicacoes` retornando 200.

## Complemento 2026-07-16 - Copy curta no ranking agregado de comunidade

No detalhe administrativo do psicólogo, o card **Ranking do psicólogo** em **Estatísticas de comunidade** deve orientar o Admin com uma copy curta quando o filtro está em **Todas**: `Selecione uma comunidade`. A decisão é apenas textual e evita quebra visual no card estreito; os cálculos, filtros, endpoint, contrato de API, schema Prisma, migrations e packages permanecem inalterados.

Validação complementar 2026-07-16: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

## Complemento 2026-07-16 - Origem do trafego Admin sem faixa auxiliar

No detalhe administrativo do psicologo, o bloco **Origem do trafego** deve priorizar a tabela de canais e remover a faixa auxiliar sobre indisponibilidade de atribuicao dos cliques de WhatsApp por origem. A informacao permanece no contrato backend para usos futuros, mas a UI do detalhe nao a exibe nesse bloco.

A coluna de acessos ao perfil na tabela desktop deve usar a copy compacta **Perfil** em vez de **Visualizacoes de perfil** no detalhe e no dashboard administrativo de psicologos. A decisao e apenas textual/visual: os valores, a fonte real (`profile_view_event`), os filtros de periodo, o endpoint `GET /api/admin/private/psychologists/:id/statistics`, os contratos, o tracking first-party, o schema Prisma, migrations e packages permanecem inalterados.

Validacao complementar 2026-07-16: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.
