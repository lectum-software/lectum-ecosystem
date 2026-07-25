# ADR-0296: Central Admin de moderação textual, denúncias e alertas operacionais derivados

## Status

Accepted

## Task relacionada

TASK-77

## Contexto

A rota Admin `/moderacao` já existia como central de moderação textual determinística da TASK-74. O produto decidiu que a mesma área deve concentrar também ações urgentes e alertas operacionais, evitando que o time precise alternar entre moderação textual, denúncias, detalhes de psicólogo e checagens manuais.

Os novos alertas precisam usar somente fontes reais já persistidas. As dimensões de demanda por região/cidade, faixa de preço e horários foram explicitamente excluídas do momento atual. Também não há integração externa para validar entrega real do WhatsApp ou provar que um link está quebrado fora da sintaxe armazenada.

## Decisão

- Manter um único endpoint `GET /api/admin/private/moderation/summary` e adicionar o bloco `operational_alerts`, em vez de criar uma segunda central ou novos endpoints V1.
- Tratar alertas operacionais como **derivados/read-only** nesta task: eles não são persistidos, não possuem workflow próprio de resolução e desaparecem quando a condição real deixa de existir.
- Usar as seguintes fontes first-party:
  - `post_report` para denúncias pendentes de posts/respostas;
  - `community_post`, `post_reply` e `user.role` para post de paciente sem resposta de psicólogo após 48h;
  - `psychologist_profile` e `professional_subscription` para CRP não aprovado em Plano Profissional ativo;
  - `psychologist_profile.whatsapp` para WhatsApp ausente/formato inválido;
  - `psychologist_profile` e relações de catálogo para perfil não publicado por configurações obrigatórias;
  - `profile_view_event` e `contact_request.channel=whatsapp` para psicólogo profissional publicado sem visitas e sem cliques após adaptação.
- Considerar o período inicial de adaptação do psicólogo profissional como 30 dias até existir parametrização específica de produto.
- Considerar CRP aprovado quando houver `crp_status="aprovado"`, `cfp_verified_at` ou cortesia profissional/admin grant reconhecida, preservando a regra já usada no detalhe administrativo do psicólogo.
- Validar WhatsApp apenas por presença e quantidade de dígitos suficiente para link `wa.me` (8 a 15 dígitos). A decisão não afirma disponibilidade externa do número.
- Alinhar “perfil não publicado por configurações obrigatórias” às exigências reais já usadas na publicação do perfil: vídeo, modalidade, especialidade, serviço, abordagem, público atendido, gênero, CPF, nascimento, CRP regional/número e cidade/UF; CRP aprovado também é exigido para plano profissional.
- Retornar explicitamente `excluded_dimensions` para registrar que região/cidade, faixa de preço e horários não se aplicam agora, sem gerar alerta falso.

## Consequências

- A tela de moderação passa a funcionar como cockpit operacional mais amplo sem duplicar navegação.
- O badge lateral de Moderação passa a representar eventos textuais pendentes + alertas derivados.
- Como os alertas são derivados, não há histórico de “resolvido” para cada alerta; a correção deve ocorrer na entidade real (denúncia, perfil, post, assinatura, métrica).
- A checagem de WhatsApp pode apontar apenas ausência/formato inválido; link realmente quebrado por número inexistente depende de integração externa futura.
- O summary de moderação fica mais caro do que antes porque agrega múltiplas tabelas. A V1 aceita esse custo por reaproveitar a chamada já existente; se volume crescer, separar paginação/cache por grupo de alerta será necessário.

## Validação

- `pnpm --dir backend typecheck`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200. Headless mobile gerou `.tmp/moderacao-mobile.png`, mas sem sessão Admin ficou no estado de carregamento autenticado; validação visual final dependeu de build/check e do dev server local autenticado aberto pelo usuário.

## Pendências

- Parametrizar thresholds de 48h e 30 dias se o produto quiser ajustes por comunidade/plano.
- Definir workflow de resolução/acknowledgement para alertas derivados caso o time precise histórico operacional.
- Integrar validação externa real de WhatsApp apenas se houver fornecedor/contrato aprovado.
- Reavaliar alertas de alta demanda em filtros quando houver fonte first-party persistida e quando região/preço/horário voltarem ao escopo.
## Complemento 2026-07-24: previews e páginas exclusivas por categoria

O cockpit `/moderacao` passou a ser a visão de resumo. Cada módulo mostra somente as 5 últimas pendências e o botão **Ver todos** abre uma rota exclusiva da categoria:

- `/moderacao/denuncias-compliance` lista denúncias pendentes e compliance profissional;
- `/moderacao/alertas-operacionais` lista somente pendências operacionais derivadas;
- `/moderacao/textual` lista eventos de moderação textual com filtros, detalhe protegido e ações auditadas.

Para não transformar o summary em uma listagem completa, foi adicionado `GET /api/admin/private/moderation/operational-alerts`, paginado e filtrável por grupo. O endpoint continua derivado/read-only, sem persistir alertas nem criar status de resolução próprio. O resumo mantém limite operacional de preview, enquanto as páginas exclusivas usam paginação.

A separação visual evita que pendências operacionais de oferta concorram com triagem crítica de denúncias/compliance, preservando a decisão original de não criar workflow próprio para alertas derivados.

## Complemento 2026-07-24: submenu de Moderação com cinco páginas

Após revisão de produto, a navegação de **Moderação** passou a ter cinco entradas explícitas no menu lateral: **Dashboard**, **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível**. A rota `/moderacao` fica como dashboard/resumo; as demais rotas são páginas exclusivas de categoria.

A decisão substitui a rota combinada de denúncias/compliance planejada no complemento anterior. Denúncias e compliance precisam de leitura separada porque têm natureza operacional diferente: denúncias são triagem de conteúdo reportado por usuários, enquanto compliance reúne pendências profissionais como CRP/WhatsApp.

O endpoint `GET /api/admin/private/moderation/operational-alerts` permanece derivado/read-only e passa a aceitar os grupos `denuncias`, `compliance` e `operacional`. Conteúdo sensível continua usando os endpoints reais de `content_moderation_event` em `/moderacao/conteudo-sensivel`.

## Complemento 2026-07-24: filtros dedicados em Denúncias

A página `/moderacao/denuncias` passa a tratar a lista como fila exclusiva de triagem de denúncias de posts/respostas, com cabeçalho mais direto (**Moderação**) e sem ações de navegação/refresh no header.

O endpoint derivado `GET /api/admin/private/moderation/operational-alerts` permanece sem persistir workflow próprio, mas agora aceita filtros opcionais para a fila de denúncias: busca textual (`q`), data (`from`/`to`), status não terminal (`pending`/`reviewing` legado), denunciante por papel seguro (`paciente`/`psicologo`) e motivo (`reason`). Os filtros são aplicados sobre alertas derivados de `post_report` já mapeados, preservando o princípio de dados reais e sem expor dados pessoais do denunciante além do papel necessário para triagem.

## Complemento 2026-07-24: filtros automáticos e status terminal em Denúncias

Após revisão visual da página `/moderacao/denuncias`, os filtros de denúncias deixam de depender dos botões **Filtrar** e **Limpar** e passam a ser aplicados automaticamente a partir dos campos controlados por React Hook Form/Zod/controllers do Admin. A quantidade de registros encontrados fica abaixo da busca para preservar hierarquia visual e remover o título genérico **Pendências** dessa lista.

O filtro **Motivo** passa a ser um dropdown fechado com as mesmas opções do fluxo público de denúncia de conteúdo: `spam`, `abuse`, `self_harm`, `privacy` e `other`. O backend normaliza esses valores e a UI mostra labels humanos, evitando busca textual livre por motivo técnico.

O filtro **Status** passa a aceitar **Todos**, **Pendentes**, **Procedentes** e **Improcedentes**. Para isso, a página exclusiva de denúncias lista `post_report` não deletado, enquanto o summary/dashboard continua contando apenas denúncias pendentes para urgência. Registros legados em `em_analise` continuam aparecendo como **Pendente** e a opção **Em análise** não volta para a UI.

O filtro **Denunciante** permanece limitado ao papel seguro do usuário (**Todos**, **Pacientes**, **Psicólogos**), sem expor dados pessoais do denunciante.

## Complemento 2026-07-24: layout detalhado da lista de Denúncias

A página `/moderacao/denuncias` passou a reutilizar o padrão visual da aba **Denúncias** no detalhe do psicólogo para reduzir divergência entre a fila global de moderação e a visão contextual do profissional.

Para viabilizar a UI sem mocks, `GET /api/admin/private/moderation/operational-alerts` recebeu um campo opcional e aditivo `report` apenas nos alertas de `post_report`. Esse bloco expõe o conteúdo denunciado, autor, comunidade, disponibilidade, mídia, URL pública, status normalizado e histórico mínimo da denúncia. O contrato anterior de `AdminModerationOperationalAlertDTO` permanece compatível para compliance/operacionais e para consumidores que ignorem `report`.

A decisão mantém a central de alertas como derivada/read-only: `/moderacao/denuncias` pode abrir o conteúdo no Admin ou no público, mas não introduz um segundo workflow global de resolução de denúncias. A resolução com ações de **Procedente/Improcedente** continua associada às telas já desenhadas para o contexto de detalhe quando houver fluxo específico.

A renderização de mídia segue a regra do Admin de não usar `<img>` cru: imagens passam por `next/image` quando a origem é permitida e vídeos usam player HTML nativo com miniplayer. Quando o conteúdo foi removido, a UI mostra o motivo de indisponibilidade e oculta o atalho público.


## Complemento 2026-07-24: resolução global de denúncias e selo de autor verificado

Após revisão da fila global `/moderacao/denuncias`, a decisão anterior de manter essa página apenas como leitura foi substituída para denúncias reais de `post_report`: a lista global agora pode resolver a denúncia como **Improcedente** ou **Procedente** sem exigir navegação para o detalhe do psicólogo.

A resolução usa um endpoint específico, `POST /api/admin/private/moderation/reports/:reportId/resolve`, protegido por autenticação Admin, confirmação forte e motivo interno obrigatório. **Improcedente** altera apenas a denúncia selecionada para `rejeitada`. **Procedente** altera para `resolvida`; quando a medida escolhida é remover conteúdo, o backend aplica soft delete no post ou na árvore de respostas denunciada, ajusta `replies_count` e encerra denúncias pendentes do mesmo alvo. Todas as ações criam auditoria em `admin_activity_log` com `domain="moderation"`, `area="denuncias"` e `target_type="post_report"`.

O bloco de autor do conteúdo denunciado passou a expor `content.author.verified` no payload de `operational-alerts`. O valor não é armazenado em novo campo: é derivado no backend pela regra já aceita para registro profissional aprovado (`crp_status="aprovado"`, `cfp_verified_at` ou cortesia profissional/admin grant ativa). A UI usa esse booleano apenas para mostrar o selo **Verificado** ao lado do nome quando o autor é psicólogo verificado.

Alertas derivados de compliance/operacionais continuam read-only e sem workflow próprio; a nova resolução se aplica somente aos alertas globais que possuem `report` real de `post_report`.

## Complemento 2026-07-24: filtro de tipo, datas por blur e pendentes como padrão

Após revisão da fila global `/moderacao/denuncias`, a busca textual livre deixou de ser o primeiro filtro da tela. A fila passa a priorizar um filtro controlado de tipo de conteúdo, enviado como `contentType=post|reply|all`, porque a triagem operacional precisa alternar rapidamente entre denúncias de posts e respostas sem depender de termos digitados.

O status padrão da UI foi alterado para **Pendentes**, mantendo `status=all` disponível no dropdown para auditoria de resoluções anteriores. Essa decisão aproxima a página do uso principal da moderação: abrir já na fila acionável de denúncias ainda não encerradas.

Os campos `from` e `to` continuam controlados por React Hook Form/Zod, mas a aplicação do filtro de data foi separada do estado digitado. Mudanças em selects aplicam automaticamente; datas só são copiadas para a query após `blur`, evitando chamadas ao backend com datas parciais durante a digitação manual.

## Complemento 2026-07-24: Visão geral de Moderação em blocos gráficos

A aba `/moderacao` deixou de exibir previews/listas/tabelas no dashboard e passou a usar quatro blocos analíticos alinhados ao padrão visual das visões gerais administrativas de Psicólogos e Pacientes: cards de contadores selecionáveis acima de um gráfico temporal em SVG.

O contrato `GET /api/admin/private/moderation/summary` foi ampliado com `overview_charts`, mantendo o endpoint único do dashboard. As séries são derivadas somente de dados reais:

- denúncias: `post_report`, segmentadas por tipo de alvo/autor e por status normalizado (**pendente**, **improcedente**, **procedente**);
- compliance: alertas derivados de `psychologist_profile` e `professional_subscription` para CRP profissional pendente e WhatsApp inválido;
- operacionais: alertas derivados de cobertura em comunidades, configuração obrigatória de perfil e tráfego/WhatsApp de psicólogos assinantes;
- conteúdo sensível: `content_moderation_event`, segmentado por categoria e decisão.

Cada bloco possui filtro independente de período e datas. A filtragem temporal é client-side sobre os pontos agregados retornados pelo summary, sem criar novo endpoint, sem persistir snapshots históricos de alertas derivados e sem introduzir estado fake. Como compliance e operacionais continuam derivados/read-only, suas curvas representam a distribuição por data de origem dos alertas atualmente existentes, não um histórico de snapshots diários.

Para preservar a leitura do dashboard em desktop, os blocos usam uma toolbar única: período, datas, seletor contextual e atalho de lista ficam na mesma linha em larguras administrativas. Em telas pequenas, a regra mobile-first permite empilhamento para evitar overflow horizontal e manter campos tocáveis.

## Complemento 2026-07-25: layout unificado das páginas exclusivas de moderação

Após revisão visual da página `/moderacao/denuncias`, as páginas exclusivas `/moderacao/compliance`, `/moderacao/operacionais` e `/moderacao/conteudo-sensivel` passam a seguir o mesmo padrão estrutural de página: card de cabeçalho com eyebrow **Moderação**, título e descrição; card principal com filtros no topo, contador de registros abaixo do primeiro filtro, indicador **Atualizando** e paginação no rodapé.

Compliance e Operacionais continuam usando `GET /api/admin/private/moderation/operational-alerts` com alertas derivados/read-only. Para permitir filtros equivalentes sem criar mock nem estado local inconsistente, o endpoint recebeu o parâmetro opcional `alertType`, aplicado sobre o tipo real do alerta (`professional_crp_pending`, `invalid_whatsapp`, `patient_post_without_coverage`, `unpublished_required_settings` e `psychologist_no_traction`). Datas continuam sendo aplicadas somente após `blur`, como na fila de denúncias.

Conteúdo sensível mantém os endpoints reais de `content_moderation_event`, detalhe protegido e ações auditadas; a mudança é visual/composicional: os filtros passam a usar React Hook Form/Zod/controllers do Admin no mesmo card da lista, sem o header intermediário de filtros, sem faixa de período consultado e sem botão **Voltar** no cabeçalho.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário da página `/moderacao/denuncias` e os padrões Admin já documentados em `_product/proto/admin`.

## Complemento 2026-07-25: selo Lectum no autor verificado da fila de denúncias

A fila `/moderacao/denuncias` passa a representar psicólogos verificados no card de autor usando o mesmo selo visual da Lectum, sem a pílula textual **Verificado**. A mudança é apenas composicional e preserva a fonte real do estado `author.verified` retornada pelo backend, mantendo acessibilidade por `aria-label` no SVG.

## Complemento 2026-07-25: contadores de pendências nos headers exclusivos

As paginas exclusivas de moderacao passam a repetir, no lado direito do card de header, o total de pendências correspondente a cada area: denuncias pendentes, compliance, operacionais e conteudo sensivel. O contador e apresentado sem fundo azul nem titulo auxiliar, com o numero centralizado e o texto **pendências** abaixo.

A decisao reaproveita contadores reais ja existentes nos contratos Admin (`operational-alerts.counts` para Denuncias/Compliance/Operacionais e `summary.pending_total` para Conteudo sensivel), em vez de criar chamada paralela, estado local estimado ou novo contrato. Durante carregamento/refetch, a UI indica atualizacao e evita exibir `0` temporario como se fosse dado real.

## Complemento 2026-07-25: demandas de Compliance em linha única

A página exclusiva `/moderacao/compliance` passa a tratar cada alerta derivado de psicólogo como uma linha operacional compacta, em vez de card narrativo. A linha mostra somente os campos necessários para triagem rápida: **Pendência**, **Data**, **Profissional**, **Plano**, **Perfil** e ícone de abertura do detalhe administrativo do psicólogo.

A decisão mantém os alertas como derivados/read-only e reaproveita o contrato existente de `operational-alerts`. Para completar a coluna **Perfil** sem criar estado novo, os alertas de **CRP pendente** passaram a incluir o fato aditivo **Publicado** no mesmo padrão já usado nos alertas de WhatsApp inválido. A UI deriva **Ativo/Inativo** desse fato real de publicação do perfil.

O detalhe textual, origem técnica, idade, papel profissional, selo de verificado e demais fatos continuam disponíveis no payload e na busca, mas não são exibidos na fila principal de Compliance para preservar a exigência de uma demanda por linha. Em mobile, a tabela usa rolagem horizontal contida, sem expandir a largura da página.

## Complemento 2026-07-25: filtros de Plano e Status de perfil na fila de Compliance

A fila exclusiva `/moderacao/compliance` passa a priorizar filtros operacionais fechados, removendo a busca textual livre dessa página. A barra agora mantém **Tipo**, **De** e **Até** e adiciona **Plano** e **Status de perfil**, porque a triagem solicitada pelo admin precisa segmentar pendências por assinatura e publicação do perfil sem depender de termos digitados.

O endpoint derivado/read-only `GET /api/admin/private/moderation/operational-alerts` recebeu os parâmetros opcionais `plan` e `profileStatus`. Ambos são aplicados no backend antes da paginação, preservando consistência entre contadores, páginas e filtros; não há filtragem client-side sobre uma página já paginada.

`plan=profissional` usa o marcador derivado `professional.is_subscriber` e o fato **Plano** já exposto nos alertas. `plan=gratuito` usa o fato **Plano**. `profileStatus=active|inactive` deriva do fato real **Publicado**, mantendo a decisão anterior de não criar persistência própria para alertas operacionais.

A faixa **Fora do escopo agora...** foi removida da UI de Compliance para reduzir ruído na triagem. As dimensões fora de escopo permanecem registradas na documentação/ADR e podem voltar em decisão futura, mas não competem com a lista acionável atual.

## Complemento 2026-07-25: Operacionais em tabela por Usuário

A página exclusiva `/moderacao/operacionais` passa a usar o mesmo padrão de tabela compacta adotado em Compliance, mas com semântica própria de operação: **Pendência**, **Pendente há**, **Usuário**, **Plano**, **Status do perfil** e ação por ícone. A coluna foi definida como **Usuário**, e não **Profissional**, porque a fila mistura pendências de conteúdo criado por pacientes e pendências de perfil de psicólogos.

Para sustentar a leitura sem heurística no frontend, `GET /api/admin/private/moderation/operational-alerts` recebeu um campo aditivo `user` em cada alerta derivado. Em **Post sem cobertura**, o usuário vem do autor real de `community_post` e é rotulado como **Paciente**. Em **Perfis não publicados** e **Sem tração**, o usuário vem do `psychologist_profile`/`user_id`, com rótulo **Psicólogo** ou **Psicóloga** conforme o gênero profissional armazenado.

O status **Ativo/Inativo** continua derivado do fato real **Publicado**. Por isso, os alertas operacionais de psicólogo passaram a incluir esse fato no payload, enquanto alertas de post exibem `—` nas colunas **Plano** e **Status do perfil** por não haver plano/status de perfil aplicável ao paciente/conteúdo. A ação da linha preserva o destino correto: detalhe do conteúdo para posts e detalhe administrativo do psicólogo para pendências de perfil.

A decisão mantém os alertas operacionais como derivados/read-only, sem novo estado persistido, sem migration e sem criar endpoint paralelo.

## Complemento 2026-07-25: refinos profissionais da tabela de Compliance

A tabela visual de `/moderacao/compliance` passa a receber metadados derivados de profissional no contrato `operational-alerts`: nome normalizado, gênero selecionado, rótulo profissional, estado de assinatura profissional, estado de registro verificado e booleano de exibição do selo Lectum.

O rótulo abaixo do nome é derivado exclusivamente de `psychologist_profile.gender`, sem inferência por nome. Valores femininos (`feminino`/`mulher`) são exibidos como **Psicóloga**; os demais valores continuam como **Psicólogo**, mantendo a taxonomia binária solicitada para esta UI.

O selo de verificado na linha só é exibido quando coexistem assinatura profissional ativa não gratuita e registro reconhecido pela regra de domínio já vigente (`crp_status="aprovado"`, `cfp_verified_at` ou cortesia administrativa válida). A tabela também reduz pesos de fonte e usa tags de **Perfil** autoajustadas ao texto para preservar densidade de triagem.

## Complemento 2026-07-25: filtros de listas entram na query key

As listas exclusivas que usam `GET /api/admin/private/moderation/operational-alerts` dependem de cache client-side por TanStack Query. A chave anterior considerava grupo, paginação, datas, busca e filtros de denúncia, mas não incluía `alertType` nem os filtros específicos adicionados depois (`contentType`, `plan`, `profileStatus`). Com isso, a UI podia exibir um select segmentado, como **Sem tração**, enquanto a tabela permanecia com o resultado em cache de **Todos** ou de outro tipo.

A decisão é tratar todos os parâmetros funcionais de segmentação como parte obrigatória da query key: `alertType`, `contentType`, `plan` e `profileStatus` foram adicionados à normalização de `adminModerationKeys.operationalAlerts`. O backend e o contrato HTTP permanecem inalterados; a correção garante apenas que o cache/refetch do cliente acompanhe a segmentação real já suportada pelo endpoint.

## Complemento 2026-07-25: tempo pendente na tabela de Compliance

A segunda coluna da fila exclusiva `/moderacao/compliance` deixa de exibir a data absoluta e passa a se chamar **Pendente há**, mostrando uma duração relativa da pendência. A decisão melhora a priorização operacional, porque o moderador compara imediatamente o envelhecimento das demandas sem calcular a diferença entre a data exibida e o momento atual.

A duração usa o campo derivado `age_hours` do alerta quando presente, mantendo a fonte de verdade no backend. Quando o campo não está disponível, a UI calcula o fallback a partir de `created_at`; a data/hora absoluta permanece no `title` da célula como **Pendente desde ...** para auditoria e conferência.

O helper de duração foi centralizado e também alimenta a tabela de **Operacionais**, preservando consistência visual entre filas derivadas sem novo estado persistido, sem migration e sem endpoint paralelo.

## Complemento 2026-07-25: Plano Cortesia no filtro de Compliance

O filtro **Plano** de `/moderacao/compliance` passa a tratar **Plano Cortesia** como uma segmentação própria, usando o valor HTTP `plan=cortesia`. A distinção é necessária porque a cortesia administrativa concede experiência profissional, mas a operação precisa separá-la do assinante pago/profissional para triagem e auditoria.

A fonte canônica da cortesia permanece o dado persistido `professional_subscription.source="admin_grant"`, conforme o modelo de assinatura. O endpoint derivado `operational-alerts` não cria estado novo: ele rotula a assinatura vigente de origem `admin_grant` como **Plano Cortesia**, inclui a origem nos fatos de pendências de Compliance e aplica o filtro antes da paginação.

Com a nova segmentação, `plan=profissional` deixa de capturar alertas de origem `admin_grant`; esses alertas ficam em `plan=cortesia`. A decisão mantém a central read-only, sem migration, sem endpoint paralelo e sem fallback mockado.

## Complemento 2026-07-25: Detalhes operacionais por tipo de pendencia

A tabela de `/moderacao/operacionais` passa a remover **Plano** e **Status do perfil** da grade principal e a concentrar a leitura acionavel em **Detalhes**. Como as pendencias operacionais sao heterogeneas, cada tipo define seus proprios fatos: cobertura de post mostra comunidade e nivel de engajamento do paciente; perfil nao publicado mostra plano e motivo de inatividade; sem tracao mostra tempo na plataforma e criterios de adaptacao ja cumpridos.

O backend continua sendo a fonte de verdade dos fatos. Para **Post sem cobertura**, a decisao vigente e classificar o engajamento do paciente somente dentro da comunidade onde o post foi publicado, nao pela temperatura/intencao geral na plataforma. A classificacao usa atividades first-party de comunidade (`community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save` e `post_share`) e retorna rotulos operacionais como **Pouco ativo**, **Ativo** ou **Muito ativo**.

A UI apenas formata esses fatos e remove valores duplicados ao compor a comunidade, evitando repetir o mesmo nome quando ele aparece tanto no objeto `community` quanto no fato **Comunidade**. A decisao preserva filtros/paginacao no endpoint derivado e evita mocks, estado local paralelo ou persistencia nova.

## Complemento 2026-07-25: engajamento comunitario resumido

Em **Post sem cobertura**, o nivel de engajamento continua sendo calculado a partir das atividades first-party reais do paciente na comunidade, mas a leitura operacional nao deve expor a decomposicao dessas atividades. A UI e o payload de fatos visiveis passam a apresentar apenas o segmento analitico resultante, como **Sem atividade previa**, **Pouco ativo**, **Ativo** ou **Muito ativo**.

A decisao reduz ruido na fila e evita que a coluna **Detalhes** vire uma lista de contadores. Os contadores internos de posts, respostas, votos, salvamentos e compartilhamentos permanecem apenas como insumo de classificacao no service; os fatos **Atividade na comunidade** e **Score de atividade** deixam de ser retornados para apresentacao. Nao ha novo estado persistido, migration, endpoint paralelo ou mock.

## Complemento 2026-07-25: detalhe de cobertura substitui engajamento

A fila `/moderacao/operacionais` passa a usar uma copy de escopo mais curta no header: **Pendencias por falta de cobertura, perfis profissionais nao publicados e falta de tracao de profissionais.**. A decisao evita repetir regras internas como 48h/configuracoes obrigatorias/WhatsApp no resumo da pagina, mantendo esses criterios no contrato e na documentacao da task.

Para **Post sem cobertura**, a coluna **Detalhes** deixa de exibir o nivel de engajamento do paciente e passa a exibir **Sem cobertura**, com a duracao real da pendencia. A UI usa primeiro o fato derivado **Idade** do alerta e mantém fallback para `age_hours`/`created_at` pelo helper de duracao ja usado nas tabelas, sem nova query, sem persistencia e sem endpoint paralelo.

## Complemento 2026-07-25: Conteúdo sensível em tabela operacional

A fila exclusiva `/moderacao/conteudo-sensivel` deixa de usar lista em cards com detalhe lateral fixo e passa a usar uma tabela compacta no mesmo padrão visual de `/moderacao/operacionais`, com rolagem horizontal contida em telas pequenas e densidade adequada para triagem.

A tabela exibe uma linha por evento real de `content_moderation_event` com as colunas **Data**, **Categoria**, **Severidade**, **Decisão**, **Autor**, **Conteúdo** e **Comunidade**. A coluna **Conteúdo** concentra duas linhas: prévia do título/snapshot e prévia da descrição/trecho seguro. Para preservar as ações auditadas e o snapshot protegido sem adicionar uma coluna fora do pedido, o detalhe completo abre a partir do botão acessível dentro da célula **Conteúdo**.

Não houve alteração de backend, contrato HTTP, Prisma schema/migrations, package novo ou dados artificiais. A mudança é composicional no Admin, mobile-first e mantém os endpoints reais de conteúdo sensível.
