# TASK-51: Dashboard administrativo de comunidades

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-51 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46 |
| ADR alvo | ADR se houver nova decisão sobre agregações, severidade de alertas ou navegação admin de comunidades |

## Contexto

A aba Comunidades do painel Admin terá uma visão geral operacional das comunidades da Lectum. A referência visual é `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`, com cards de atividade, gráfico temporal, divisão de posts anônimos/identificados, alertas de prioridade, postagens recentes e principais comunidades.

O backend já possui dados reais suficientes para a V1: `community`, `community_member`, `community_post`, `post_reply`, `post_report`, `post_vote`, `post_save` e `user.role`. Esta task não deve criar moderação avançada nem simular métricas.

## Objetivo

Implementar a tela Admin de visão geral de Comunidades, com dados reais agregados por período, permitindo à operação acompanhar atividade, risco e engajamento das comunidades.

## Pré-requisitos e bloqueios

- TASK-45 concluída: auth admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação.

## Escopo frontend

- Criar rota protegida no app Admin:
  - `/communities` ou rota equivalente definida na TASK-46.
- Renderizar:
  - título "Comunidades" e subtítulo;
  - filtro de período;
  - cards:
    - postagens de psicólogos;
    - postagens de pacientes;
    - respostas de psicólogos;
    - comentários de pacientes;
    - membros ativos;
  - gráfico de atividade nas comunidades;
  - donut/lista de posts de pacientes anônimos vs identificados;
  - alertas de prioridade com denúncias pendentes;
  - postagens mais recentes;
  - principais comunidades.
- Estados:
  - loading;
  - erro;
  - vazio;
  - métrica indisponível quando dado real faltar.
- Ações permitidas na V1:
  - abrir detalhe da comunidade;
  - abrir post/comunidade relacionados;
  - "Ver todas" pode navegar para listagens reais se existirem, ou ficar fora da V1.

## Escopo backend

- Criar endpoint admin privado:
  - `GET /api/admin/private/communities/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Agregar dados reais:
  - `psychologist_posts`: posts em `community_post` cujo autor tem `role="psicologo"`;
  - `patient_posts`: posts cujo autor tem `role="paciente"`;
  - `psychologist_replies`: replies em `post_reply` cujo autor tem `role="psicologo"`;
  - `patient_comments`: replies cujo autor tem `role="paciente"`;
  - `active_members`: membros com atividade no período, por post/reply/vote/save, e/ou total de `community_member` quando atividade real não for aplicável, com label honesto;
  - `patient_posts_anonymous` vs `identified`: `community_post.anonymous`;
  - `pending_reports`: `post_report.status="pendente"`;
  - `recent_posts`: posts recentes com comunidade, autor, status de discussão derivado e comentários;
  - `top_communities`: comunidades por membros/posts/atividade.

## Fora do escopo

- Editar comunidade.
- Editar regras.
- Resolver denúncias/moderar conteúdo.
- Criar ações em massa.
- Criar status/visibilidade/permitir posts/permitir comentários como configuração admin.
- Criar dados fake para reproduzir números do protótipo.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos admin, helpers de resposta, validação e separação de aplicações.
- `PACKAGES.md`: não instalar charts/tables sem ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Comunidades Dashboard.

Backend esperado:

- Módulo admin privado com controller/service/repository/validator.
- Validator de período:
  - default: últimos 7 dias;
  - limite máximo inicial: 90 dias, salvo ADR;
  - `from <= to`.
- Resposta sugerida:
  - `period`;
  - `cards`;
  - `activity_series`;
  - `patient_posts_breakdown`;
  - `priority_alerts`;
  - `recent_posts`;
  - `top_communities`;
  - `unavailable`.
- Severidade de alertas:
  - derivada de `post_report.reason` por regra determinística documentada no service;
  - exemplos: violência/autolesão/ódio = alta; conteúdo inadequado = média; spam = baixa;
  - não criar coluna nova de severidade nesta task, salvo ADR.
- Discussão iniciada/não iniciada:
  - derivar de `post_reply` existente;
  - "iniciada" quando houver ao menos uma reply.

Frontend esperado:

- `admin/src/api/req/communities`;
- `admin/src/api/callers/communities`;
- query keys próprias;
- componentes reutilizáveis de cards/gráficos/listas do Admin quando existirem.
- Gráficos com SVG/CSS próprio e alternativa textual acessível.
- Tabelas/listas responsivas sem pacote novo por padrão.

Packages usados:

- Nenhum pacote novo por padrão.
- Qualquer adoção de chart/table lib exige validação em `PACKAGES.md` e ADR.

Regras anti-recriação:

- Reutilizar shell, API client e tokens do app Admin.
- Reutilizar dados de comunidade já existentes.
- Não criar estrutura paralela para comunidades se os modelos atuais atenderem.

Regras de UI obrigatórias:

- Mobile-first obrigatório.
- Nenhum `<img>` cru; usar `next/image` se imagem for necessária.
- Cores por tokens.
- Foco visível e labels acessíveis.

## Critérios de aceite

- [x] A rota Comunidades só abre para admin autenticado.
- [x] Cards usam dados reais de `community_post`, `post_reply`, `community_member` e `user.role`.
- [x] Alertas de prioridade usam `post_report` real.
- [x] Postagens recentes usam posts reais e mostram comunidade/autor/status de discussão.
- [x] Principais comunidades usam comunidades reais.
- [x] Filtro de período atualiza as agregações.
- [x] Estados loading, erro, vazio e indisponível foram implementados.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check` foram executados sem erros.
- [x] Browser local validado com admin real.
- [x] ADR criado ou atualizado em `adrs/` se houver nova decisão relevante.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - login admin;
  - abrir Comunidades;
  - trocar período;
  - abrir detalhe de uma comunidade;
  - validar mobile ~390px e desktop.

## Notas de execução

- Os números do protótipo são referência visual, não seed.
- Se determinada métrica não puder ser calculada com precisão, retornar `unavailable` com copy clara.


## Execucao TASK-51

- Implementada a rota protegida do Admin em `/comunidades`, usando a convencao da TASK-46.
- Implementado o endpoint real `GET /api/admin/private/communities/dashboard`, com agregacoes derivadas de `community`, `community_member`, `community_post`, `post_reply`, `post_report`, `post_vote`, `post_save` e `user.role`.
- A severidade dos alertas e derivada de `post_report.reason` por regra deterministica no service, sem criar coluna nova.
- A navegacao para detalhe foi habilitada em `/comunidades/[slug]` com placeholder honesto da TASK-52, sem dados fake e sem antecipar edicao/moderacao.
- Builder/Quick Copy nao estava exposto como ferramenta MCP nesta execucao; a referencia visual usada foi `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- Nenhuma alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao foi necessario.
- Browser local validado com admin real transitorio em dev server do Admin na porta 3102 por indisponibilidade/conflito local da porta 3002 durante a validacao; a porta alvo local do app Admin permanece 3002.
- ADR criado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

## Evidencias de validacao

- `pnpm --dir backend check`: sem erros.
- `pnpm --dir backend build`: sem erros.
- `pnpm --dir admin check`: sem erros.
- `pnpm --dir admin build`: sem erros.
- `pnpm check`: sem erros.
- Smoke API: endpoint retornou periodo, cards, series, breakdown de posts de pacientes, alertas, posts recentes e principais comunidades com dados reais existentes.
- Browser local: login admin real, abertura de `/comunidades`, troca de periodo disponivel, validacao mobile (~390px), tablet (768px), desktop e abertura de detalhe `/comunidades/[slug]`.

## Execucao complementar: lista administrativa de comunidades (2026-07-15)

- Pedido do usuario: criar uma pagina de **Lista de Comunidades** no Admin seguindo o modelo da lista administrativa de psicologos.
- Backend Admin: o modulo existente de comunidades passou a expor `GET /api/admin/private/communities`, protegido por auth Admin, com busca, ordenacao e paginacao sobre dados reais; o filtro de categoria foi removido em ajuste posterior.
- A resposta usa `community`, `community_member`, `community_post`, `post_reply` e `post_report` para compor membros, posts, comentarios, denuncias, atividade e ultima atividade, sem mocks, seeds ou endpoint simulado.
- Frontend Admin: criada a rota estatica `/comunidades/lista`, com busca em URL, ordenacao, paginacao, estados loading/erro/vazio e tabela/lista mobile-first que abre o detalhe real `/comunidades/[slug]`; o filtro visual de categoria foi removido em ajuste posterior.
- O submenu lateral **Comunidades > Lista de Comunidades** passou a apontar para `/comunidades/lista`; **Visao geral** permanece em `/comunidades`.
- A acao **Ver todas** de **Principais comunidades** no dashboard agora navega para a lista real.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e o modelo de `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0271-lista-admin-comunidades-rota-real.md`.

### Criterios complementares

- [x] `/comunidades/lista` existe como rota Admin protegida pelo shell/autenticacao administrativa.
- [x] A lista usa endpoint real `GET /api/admin/private/communities`.
- [x] Busca, ordenacao e paginacao usam URL/search params; filtro de categoria removido da lista.
- [x] As metricas por linha sao derivadas de dados reais de comunidades, membros, posts, respostas e denuncias.
- [x] Clicar em uma comunidade abre o detalhe administrativo existente.
- [x] O submenu lateral de Comunidades aponta para a rota real da lista.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo ou alteracao de Prisma/migration foi usado.

### Validacao complementar

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke service real: `listCommunities({ page: 1, limit: 2, sort: "name" })` retornou `status=200`, `count=7`, `items=2`.
- Smoke local: `GET http://localhost:3002/comunidades/lista` retornou `200`.
- Smoke de protecao: `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` sem token retornou `401`.

## Correcao complementar: foco da busca na lista de comunidades (2026-07-15)

- Pedido do usuario: ao selecionar a barra de pesquisa nas listas Admin, a borda esquerda do campo ficava visualmente cortada.
- A busca de `/comunidades/lista` passou a usar `focus:ring-inset`, mantendo o anel de foco dentro do controle arredondado e evitando corte lateral.
- O mesmo ajuste foi aplicado na busca de `/psicologos/lista`, que usa o mesmo padrao visual.
- Nao houve alteracao de backend, Prisma/migrations, packages, dados, filtros, paginacao ou contratos de API.

### Validacao complementar

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke local `GET http://localhost:3002/comunidades/lista` e `GET http://localhost:3002/psicologos/lista`.

## Correcao complementar: remover anel da busca na lista de comunidades (2026-07-15)

- Pedido do usuario: o anel de foco ainda cortava a lateral esquerda da barra de pesquisa; remover o anel e manter somente a borda azul interna ao selecionar o campo.
- A busca de `/comunidades/lista` removeu as classes de `focus:ring-*` e manteve `focus:border-primary`, sem alterar layout, dados, endpoint, filtros ou paginacao.
- O mesmo ajuste foi aplicado em `/psicologos/lista` para manter consistencia visual entre listas Admin.
- Nao houve alteracao de backend, Prisma/migrations, packages ou contratos de API.

### Validacao complementar

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke local `GET http://localhost:3002/comunidades/lista` e `GET http://localhost:3002/psicologos/lista`.

## Correcao complementar: layout piloto nas paginas de comunidades (2026-07-15)

- Pedido do usuario: aplicar nas paginas de Comunidades o layout piloto ja usado nas paginas de Psicologos.
- O shell administrativo agora habilita `admin-premium-pilot` tambem para `/comunidades` e descendentes (`/comunidades/lista` e `/comunidades/[slug]`), reutilizando a mesma base visual clara, tokens e comportamento do menu lateral de Psicologos.
- A alteracao ficou centralizada em `AdminShell`, sem duplicar layout nas paginas, sem alterar endpoints, dados, filtros, paginacao, Prisma/migrations ou packages.
- Nao houve decisao arquitetural nova; a decisao existente do piloto foi apenas estendida para o modulo de comunidades.

### Validacao complementar

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke local `GET http://localhost:3002/comunidades`, `GET http://localhost:3002/comunidades/lista` e `GET http://localhost:3002/psicologos/lista`.

## Correcao complementar: header do dashboard de comunidades (2026-07-15)

- Pedido do usuario: fazer o header do dashboard de comunidades seguir o modelo visual do header do dashboard de psicologos.
- O header de `/comunidades` passou a usar card com borda/sombra, label superior, titulo **Dashboard de Comunidades**, subtitulo e filtros `Periodo`, `De` e `Ate` no mesmo padrao mobile-first de `/psicologos`.
- Os chips rapidos `7 dias`, `30 dias` e `90 dias` foram substituidos por um seletor de periodo com `Esta semana`, `Este mes` e `Ultimos 90 dias`; datas manuais continuam ativando estado personalizado e respeitam o limite real de 90 dias do endpoint.
- A linha separada **Periodo consultado** foi removida do topo da pagina para alinhar a hierarquia visual ao dashboard de psicologos; os cards de indicadores agora entram sob o titulo **Visao geral**.
- Nao houve alteracao de backend, endpoint, Prisma/migrations, packages, dados persistidos ou regra de agregacao.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local de `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.

### Validacao complementar

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: refinamento da lista administrativa de comunidades (2026-07-15)

- Pedido do usuario: ajustar a lista em `/comunidades/lista` removendo o filtro/coluna de categoria, simplificando a primeira coluna, corrigindo avatar e alterando labels operacionais.
- A UI Admin removeu o seletor de categoria e passa a limpar `category` de URLs antigas, mantendo busca, ordenacao e paginacao reais.
- O icone do chip **Filtros ativos** foi trocado para `Filter` do `lucide-react`.
- As tags de legenda **Membros**, **Posts** e **Comentarios** foram removidas do cabecalho da tabela.
- A coluna **Categoria** foi removida da tabela desktop e o card mobile tambem deixou de exibir o badge de categoria.
- A coluna **Membros** passou a se chamar **Seguidores**; o dado continua vindo de `community_member` real, com fallback existente para `community.members_count`.
- A coluna **Atividade** foi inicialmente trocada para **Ultima atividade**, mas o ajuste seguinte removeu essa coluna da tabela; o contrato ainda pode retornar `last_activity_at` sem exibicao na lista.
- O avatar da primeira coluna agora resolve caminhos publicos do backend (`/public/files/...`) contra `NEXT_PUBLIC_API_URL`, evitando imagem quebrada no Admin local, e continua usando `next/image`.
- A primeira coluna exibe somente o nome da comunidade; slug e descricao foram removidos abaixo do nome.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da lista Admin.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0271-lista-admin-comunidades-rota-real.md`.

### Criterios deste ajuste

- [x] Filtro de categoria removido da lista e de URLs antigas da tela.
- [x] Chip **Filtros ativos** usa icone de filtro.
- [x] Tags **Membros**, **Posts** e **Comentarios** removidas.
- [x] Coluna **Categoria** removida da tabela.
- [x] Coluna **Membros** renomeada para **Seguidores**.
- [x] Coluna **Ultima atividade** removida da apresentacao da lista no ajuste seguinte.
- [x] Avatar da comunidade corrigido sem uso de `<img>` cru.
- [x] Slug e descricao removidos da primeira coluna.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local em `next start` do Admin: `GET http://localhost:3102/comunidades/lista` retornou 200.
- Smoke de protecao Admin real: `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` sem token retornou 401.

## Correcao complementar: acoes e denuncias pendentes na lista de comunidades (2026-07-15)

- Pedido do usuario: remover a coluna **Ultima atividade**, renomear **Denuncias** para **Denuncias pendentes** e deixar **Acoes** como na lista de psicologos.
- A tabela desktop deixou de renderizar a coluna **Ultima atividade**; o card mobile tambem nao exibe mais essa metrica.
- A coluna passou a se chamar **Denuncias pendentes** e o backend da lista agora conta apenas `post_report.status="pendente"` em posts e comentarios da comunidade.
- A coluna **Acoes** passou a ter dois atalhos: visualizar detalhe administrativo e abrir a comunidade publica em `/community/[slug]` no site publico, em nova aba.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.

### Criterios deste ajuste

- [x] Coluna **Ultima atividade** removida.
- [x] Coluna **Denuncias** renomeada para **Denuncias pendentes** e alimentada por denuncias pendentes reais.
- [x] Coluna **Acoes** exibe icone de visualizar e icone para abrir a comunidade publica, seguindo o padrao da lista de psicologos.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke local em `next start` do Admin: `GET http://localhost:3102/comunidades/lista` retornou 200.
- Smoke de protecao Admin real: `GET http://localhost:3001/api/admin/private/communities?page=1&limit=2` sem token retornou 401.

## Correcao complementar: botao e criacao real de comunidades (2026-07-15)

- Pedido do usuario: adicionar no header de `/comunidades/lista` um botao para **Criar nova comunidade**.
- O header da lista recebeu o botao mobile-first **Criar nova comunidade**, navegando para a rota Admin real `/comunidades/nova`.
- Para nao criar botao quebrado nem mockado, foi implementado o fluxo real de criacao com `POST /api/admin/private/communities`, protegido por auth Admin, reutilizando o modulo existente de comunidades.
- O formulario de criacao usa React Hook Form, Zod e controllers do Admin para nome, slug opcional, categoria, descricao e cores visuais; apos sucesso, redireciona para o detalhe administrativo da comunidade criada.
- O backend gera slug deterministico a partir do nome quando o slug nao e informado e rejeita conflitos reais com `community.slug`.
- Como o schema atual de `community` nao possui status/draft, comunidades criadas pelo Admin ficam disponiveis no catalogo publico imediatamente; avatar e regras seguem editaveis no detalhe.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- ADR atualizado: `adrs/0271-lista-admin-comunidades-rota-real.md`.

### Criterios deste ajuste

- [x] Header de `/comunidades/lista` exibe o botao **Criar nova comunidade**.
- [x] O botao navega para uma rota Admin real, sem 404 nem mock.
- [x] A criacao usa endpoint Admin privado real e persiste em `community`.
- [x] O formulario usa React Hook Form, Zod e controllers do Admin.
- [x] Nenhum package novo, mock, dado fake, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local em `next start` do Admin: `GET http://localhost:3102/comunidades/lista` retornou 200.
- Smoke local em `next start` do Admin: `GET http://localhost:3102/comunidades/nova` retornou 200.
- Smoke de protecao Admin real: `POST http://localhost:3001/api/admin/private/communities` sem token retornou 401.

## Correcao complementar: tipografia dos controles da lista de comunidades (2026-07-17)

- Pedido do usuario: padronizar tambem a fonte textual da barra de pesquisa e filtros da lista de comunidades, alinhando `/comunidades/lista` ao padrao Lectum ja aplicado em `/psicologos/lista`.
- A busca, o seletor **Ordenar por**, o chip **Filtros ativos** e o contador passaram a declarar `text-sm font-medium`/`text-xs font-medium` no elemento e no ancestral correto. Isso e necessario porque o Admin define `button,input,textarea,select { font: inherit; }`, entao controles de formulario herdam tamanho/peso do container.
- O label **Ordenar por** permanece discreto em `text-xs font-medium`, enquanto o texto selecionado, o placeholder da busca, o chip **Filtros ativos** e o contador usam peso medio consistente.
- Nao houve alteracao em backend, endpoints, Prisma schema/migrations, packages, dados, filtros, ordenacao ou paginacao.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e o padrao local de `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`.
- ADR atualizado: `adrs/0271-lista-admin-comunidades-rota-real.md`.

### Criterios deste ajuste

- [x] A barra de pesquisa de `/comunidades/lista` usa texto `14px` com peso medio.
- [x] O seletor **Ordenar por** usa texto `14px` com peso medio e label `12px` discreto.
- [x] O chip **Filtros ativos** e o contador usam peso medio alinhado aos controles.
- [x] O ajuste permanece mobile-first e nao introduz overflow horizontal no desktop validado.
- [x] Nenhum mock, dado fake, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin exec biome format --write "src/app/(admin)/comunidades/lista/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Browser local/headless autenticado em `http://localhost:3002/comunidades/lista?sort=name&limit=8`: controles presentes, busca `fontWeight=500`/`fontSize=14px`, seletor de ordenacao `fontWeight=500`/`fontSize=14px`, chip **Filtros ativos** `fontWeight=500`/`fontSize=14px`, contador `fontWeight=500` e sem overflow horizontal de viewport.

## Correcao complementar: remocao dos blocos laterais e overflow do dashboard (2026-07-17)

- Pedido do usuario: remover do dashboard `/comunidades` os blocos **Alertas de prioridade** e **Moderacao automatica**, alem de remover a rolagem horizontal global da pagina.
- A UI do dashboard deixou de renderizar a coluna lateral de alertas, mantendo denuncias e eventos automaticos nas rotas/listas operacionais existentes.
- O layout principal passou a usar uma unica coluna de conteudo com grafico, posts de pacientes, postagens recentes e principais comunidades, com contencao `min-w-0`/`overflow-x-hidden`.
- O grafico de atividade agora escala para a largura util do card em vez de exigir largura minima rolavel.
- As tabelas **Postagens mais recentes** e **Principais comunidades** deixaram de depender de `min-width` com rolagem horizontal; no mobile usam cards empilhados e no desktop usam `table-fixed` com truncamento.
- Nao houve alteracao de backend, endpoints, Prisma schema/migrations, packages, dados ou regra de agregacao.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard `/comunidades` nao renderiza mais **Alertas de prioridade**.
- [x] O dashboard `/comunidades` nao renderiza mais **Moderacao automatica**.
- [x] A pagina evita overflow horizontal global com contencao local do layout.
- [x] Grafico e tabelas se ajustam a largura disponivel sem barra horizontal nativa da pagina.
- [x] O ajuste permanece mobile-first e nao usa `<img>` cru.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Execucao complementar: estatisticas globais de pessoas e conteudo (2026-07-17)

- Pedido do usuario: no dashboard geral `/comunidades`, adicionar blocos com contadores e graficos de **Estatisticas de pessoas** e **Estatisticas de conteudo**, equivalentes aos blocos da aba de estatisticas de uma comunidade, mas agregados para todas as comunidades.
- Backend Admin: o endpoint real `GET /api/admin/private/communities/dashboard` passou a retornar `global_statistics.current` e `global_statistics.previous`, calculados sobre todas as comunidades ativas a partir de `community_member`, `community_post`, `post_reply`, `post_report`, `post_vote`, `post_save`, `post_reply_save`, `page_view_event` e `important_action_event`.
- As estatisticas de pessoas contam seguidores por usuario unico em ao menos uma comunidade, usuarios ativos no periodo e novos usuarios ativos por primeira atividade real, segmentados entre pacientes e psicologos.
- As estatisticas de conteudo agregam posts de pacientes/psicologos, respostas de psicologos verificados/nao verificados, comentarios de pacientes, denuncias, votos, salvamentos, cliques de WhatsApp e acessos a perfis relacionados.
- Frontend Admin: `/comunidades` agora renderiza os dois blocos com cards selecionaveis e grafico SVG responsivo, sem pacote novo e sem rolagem horizontal global.
- O layout permanece mobile-first, sem `<img>` cru e sem reinstalar os blocos removidos de **Alertas de prioridade** e **Moderacao automatica**.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: capturas enviadas pelo usuario e os prototipos locais de Comunidades.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard geral de comunidades exibe **Estatisticas de pessoas** agregadas para todas as comunidades.
- [x] O dashboard geral de comunidades exibe **Estatisticas de conteudo** agregadas para todas as comunidades.
- [x] Cada bloco possui contadores reais e grafico temporal SVG com alternativa textual.
- [x] A comparacao usa o periodo anterior equivalente, sem simular base quando ela nao existe.
- [x] A pagina continua sem rolagem horizontal global.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke service real: `buildCommunitiesDashboard({ from: "2026-07-13", to: "2026-07-17" })` retornou `status=200`, `has_global_statistics=true`, `daily_points=5`.
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: remover contadores legados do dashboard geral (2026-07-17)

- Pedido do usuario: remover os contadores antigos **Postagens de psicologos**, **Postagens de pacientes**, **Respostas de psicologos**, **Comentarios de pacientes** e **Membros ativos** do topo de `/comunidades`.
- A UI deixou de renderizar a secao antiga **Visao geral** com os cinco cards legados, mantendo os blocos novos de **Estatisticas de pessoas** e **Estatisticas de conteudo** como a visao principal do dashboard.
- Nao houve alteracao de backend, endpoint, Prisma schema/migrations, packages, dados ou regras de agregacao.
- O ajuste permanece mobile-first, sem `<img>` cru e sem rolagem horizontal global.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencia usada: captura enviada pelo usuario.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard `/comunidades` nao renderiza mais o card **Postagens de psicologos**.
- [x] O dashboard `/comunidades` nao renderiza mais o card **Postagens de pacientes**.
- [x] O dashboard `/comunidades` nao renderiza mais o card **Respostas de psicologos**.
- [x] O dashboard `/comunidades` nao renderiza mais o card **Comentarios de pacientes**.
- [x] O dashboard `/comunidades` nao renderiza mais o card **Membros ativos**.
- [x] Os blocos de estatisticas globais permanecem visiveis e responsivos.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: alinhar blocos globais ao layout de estatisticas do detalhe (2026-07-17)

- Pedido do usuario: no dashboard geral `/comunidades`, fazer os blocos de contadores + grafico seguirem o mesmo layout dos blocos **Estatisticas de pessoas** e **Estatisticas de conteudo** da aba de estatisticas do detalhe da comunidade.
- Os cards globais agora usam o mesmo padrao visual dos cards do detalhe: contadores selecionaveis marcados por default, icone no topo, label, valor, comparacao com periodo anterior e sem texto descritivo dentro do card.
- O grafico global passou a usar o mesmo padrao visual do detalhe, com linhas suavizadas, area de grafico isolada e pontos com `title` acessivel por serie.
- O bloco **Estatisticas de pessoas** permanece em grid, como no detalhe da comunidade.
- O bloco **Estatisticas de conteudo** passou a renderizar os contadores em carrossel horizontal com botoes laterais, como no detalhe da comunidade.
- Nao houve alteracao de backend, endpoint, Prisma schema/migrations, packages, dados ou regras de agregacao.
- O ajuste permanece mobile-first e a rolagem horizontal fica restrita ao carrossel/grafico, sem criar overflow global da pagina.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: capturas enviadas pelo usuario e implementacao existente de `/comunidades/[slug]?tab=estatisticas`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] Cards de estatisticas globais iniciam selecionados por default.
- [x] Cards de estatisticas globais nao exibem texto de descricao individual.
- [x] **Estatisticas de pessoas** usa grid de contadores como no detalhe da comunidade.
- [x] **Estatisticas de conteudo** usa carrossel horizontal de contadores como no detalhe da comunidade.
- [x] O grafico dos blocos globais segue o mesmo padrao visual base do detalhe da comunidade.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: remocao dos blocos redundantes de atividade e posts de pacientes (2026-07-18)

- Pedido do usuario: remover do dashboard `/comunidades` os blocos **Atividade nas comunidades** e **Posts de pacientes**.
- A UI deixou de renderizar o grafico legado de atividade segmentado por papel do autor e o donut/lista de posts anonimos vs identificados.
- As informacoes de conteudo permanecem cobertas pelos blocos globais de **Estatisticas de conteudo**, incluindo posts de pacientes e a quebra anonimos/identificados no proprio contador de postagens de pacientes, evitando duplicidade visual.
- O endpoint e o contrato existentes nao foram alterados nesta correcao para preservar compatibilidade com agregacoes ja consumidas e evitar mudanca desnecessaria de backend.
- O ajuste permanece mobile-first, sem `<img>` cru, sem package novo e sem alteracao em `backend/prisma/schema.prisma` ou migrations.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencia usada: captura enviada pelo usuario e implementacao existente de `/comunidades`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard `/comunidades` nao renderiza mais o bloco **Atividade nas comunidades**.
- [x] O dashboard `/comunidades` nao renderiza mais o bloco **Posts de pacientes**.
- [x] **Postagens mais recentes** e **Principais comunidades** sobem diretamente apos os blocos globais de estatisticas.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: remocao do bloco de metricas indisponiveis (2026-07-18)

- Pedido do usuario: remover do dashboard `/comunidades` o bloco **Metricas indisponiveis ou vazias**.
- A UI deixou de renderizar o card de avisos `summary.unavailable`, incluindo a mensagem de alertas automaticos vazios, para manter o dashboard focado nos blocos analiticos e listas operacionais visiveis.
- O endpoint e o contrato existentes nao foram alterados nesta correcao; `unavailable` continua disponivel para compatibilidade e possivel uso futuro, mas sem exposicao no dashboard geral.
- O ajuste permanece mobile-first, sem `<img>` cru, sem package novo e sem alteracao em `backend/prisma/schema.prisma` ou migrations.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencia usada: captura enviada pelo usuario e implementacao existente de `/comunidades`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard `/comunidades` nao renderiza mais o bloco **Metricas indisponiveis ou vazias**.
- [x] **Principais comunidades** passa a ser o ultimo bloco visual da pagina quando nao houver outros elementos abaixo.
- [x] O contrato `unavailable` nao foi removido do backend, evitando quebra de compatibilidade.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: periodo abaixo dos titulos dos blocos (2026-07-18)

- Pedido do usuario: abaixo dos titulos dos blocos do dashboard `/comunidades` (por exemplo **Estatisticas de pessoas** e **Estatisticas de conteudo**), exibir o periodo no mesmo padrao visual usado no Admin de Psicologos.
- A UI agora exibe somente `Periodo: {opcao selecionada} · {data inicial} a {data final}` abaixo dos titulos dos blocos filtrados por periodo: **Estatisticas de pessoas**, **Estatisticas de conteudo**, **Postagens mais recentes** e **Principais comunidades**.
- As descricoes auxiliares que ficavam imediatamente abaixo desses titulos foram removidas para que a linha abaixo do titulo contenha apenas o periodo, conforme o padrao solicitado.
- O periodo usa o preset selecionado no front (`Esta semana`, `Este mes`, `Ultimos 90 dias` ou `Personalizado`) e as datas reais retornadas pelo endpoint, sem alterar contrato de API, regra de agregacao ou persistencia.
- O ajuste permanece mobile-first, sem `<img>` cru, sem package novo e sem alteracao em `backend/prisma/schema.prisma` ou migrations.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, padrao local de `/psicologos` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] Os blocos filtrados por periodo no dashboard `/comunidades` exibem a linha de periodo logo abaixo do titulo.
- [x] A linha segue o padrao `Periodo: {preset} · {data inicial} a {data final}` usado no Admin de Psicologos.
- [x] Abaixo dos titulos dos blocos nao ha descricao auxiliar concorrendo com o periodo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: posts mais populares no dashboard geral (2026-07-18)

- Pedido do usuario: abaixo de **Postagens mais recentes**, adicionar um bloco de **Posts mais populares** no dashboard `/comunidades`.
- O endpoint `GET /api/admin/private/communities/dashboard` agora expoe `popular_posts` com dados reais de `community_post` e contadores persistidos de interacao (`upvotes_count`, `replies_count`/comentarios e `saves_count`), sem mocks ou endpoint paralelo.
- A ordenacao do bloco segue o mesmo criterio usado no detalhe da comunidade: mais upvotes, depois comentarios, depois salvamentos e, em empate, posts mais recentes.
- A UI renderiza o novo bloco imediatamente abaixo de **Postagens mais recentes** e antes de **Principais comunidades**, com a mesma linha de periodo abaixo do titulo e layout mobile-first em cards no mobile e tabela no desktop.
- Nao houve package novo, schema Prisma, migration, seed ou dado fake permanente. O ajuste apenas amplia o contrato do dashboard e a apresentacao Admin.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, padrao existente de `/comunidades` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O dashboard `/comunidades` renderiza o bloco **Posts mais populares** logo abaixo de **Postagens mais recentes**.
- [x] O bloco usa somente dados reais do endpoint admin, sem mock, seed ou dado fake permanente.
- [x] A ordenacao considera upvotes, comentarios, salvamentos e recencia como desempate.
- [x] O bloco exibe o periodo abaixo do titulo no padrao `Periodo: {preset} · {data inicial} a {data final}`.
- [x] Nenhum package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: autores e link publico em posts populares (2026-07-18)

- Pedido do usuario: no bloco **Posts mais populares** do dashboard `/comunidades`, exibir foto de perfil e selo de verificado na identificacao do autor quando houver, remover as colunas **Salvos** e **Acoes**, e fazer o clique na linha abrir o post original no site publico.
- O endpoint `GET /api/admin/private/communities/dashboard` agora retorna, em cada item de `popular_posts`, o objeto `author` normalizado com avatar, nome exibivel, genero, papel, anonimato e verificacao real do psicologo. Os campos legados `author_name` e `author_role` foram preservados para compatibilidade.
- A regra de verificacao usa dados reais de `psychologist_profile` e assinatura profissional ativa/cortesia conforme helper existente; pacientes anonimos continuam sem avatar e com identificacao anonima.
- A UI Admin renderiza autor com `next/image`, iniciais como fallback e selo de verificado colado ao nome, sem usar `<img>` cru.
- A tabela desktop de **Posts mais populares** agora exibe somente **Titulo**, **Autor**, **Upvotes** e **Comentarios**; o card mobile tambem remove **Salvos**.
- Todas as celulas da linha desktop e o card mobile apontam para `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}`, abrindo o post publico original em nova aba.
- Nao houve package novo, schema Prisma, migration, seed, endpoint paralelo, mock ou dado fake permanente.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, padrao existente de `/comunidades` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] A identificacao do autor em **Posts mais populares** exibe foto de perfil quando houver.
- [x] O selo de verificado aparece junto ao nome quando o autor psicologo possui verificacao real.
- [x] A coluna/card de **Salvos** nao e mais exibida nesse bloco.
- [x] A coluna **Acoes** nao e mais exibida nesse bloco.
- [x] O clique em qualquer celula da linha desktop e no card mobile abre o post original no site publico.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.
- Smoke direto do service real `buildCommunitiesDashboard({ period: "week" })` retornou `status=200`, `popular_posts.items[0].author` com avatar/verificacao e URL publica `/community/{slug}/post/{id}`.

## Correcao complementar: autores, visualizacoes e link publico em postagens recentes (2026-07-18)

- Pedido do usuario: em **Postagens mais recentes**, exibir foto de perfil e selo de verificado na identificacao do autor quando houver, remover a coluna **Acoes** e qualquer exposicao de **Salvos**, fazer o clique na linha abrir o post original no site publico e substituir **Discussao** por **Visualizacoes**.
- Backend Admin: `recent_posts.items` agora inclui `views_count` derivado de `page_view_event` real em todo o periodo para os alvos `community_post`/`post`, sem mocks ou contadores simulados.
- Frontend Admin: a secao renderiza autor com avatar via `next/image`, fallback por iniciais e selo de verificado real; mobile e desktop abrem `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}` em nova aba.
- A tabela desktop de **Postagens mais recentes** agora exibe somente **Titulo**, **Autor**, **Visualizacoes** e **Comentarios**.
- Nao houve alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; `pnpm --dir backend db:migrate` nao se aplica.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] A identificacao do autor em **Postagens mais recentes** exibe foto de perfil quando houver.
- [x] O selo de verificado aparece junto ao nome quando o autor psicologo possui verificacao real.
- [x] A coluna **Salvos** nao e exibida nesse bloco.
- [x] A coluna **Acoes** nao e exibida nesse bloco.
- [x] O clique em qualquer celula da linha desktop e no card mobile abre o post original no site publico.
- [x] A coluna **Discussao** foi substituida por **Visualizacoes** com dado real de `page_view_event`.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke service real `buildCommunitiesDashboard({})` retornou `status=200`, `recent_posts.items[0].author`, `views_count`, listas globais fixas e URL publica `/community/{slug}/post/{id}`.
- Smoke local `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: presets completos no filtro de periodo do dashboard (2026-07-18)

- Pedido do usuario: no dashboard `/comunidades`, o filtro **Periodo** deve ter as mesmas opcoes dos demais paineis: **Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**; **Personalizado** aparece apenas quando uma data e digitada manualmente.
- Backend Admin: `GET /api/admin/private/communities/dashboard` passou a aceitar `period=today|week|month|year|all|custom`, mantendo `from`/`to` legados como periodo personalizado.
- O preset **Todo o periodo** usa como inicio o primeiro registro real relevante das fontes do dashboard de comunidades; se nao houver registros, usa o intervalo operacional padrao, sem backfill ou dado artificial.
- O preset antigo **Ultimos 90 dias** foi removido da UI e o limite tecnico foi alinhado a janelas longas (`max_days=3660`) para suportar **Este ano** e **Todo o periodo**.
- O ajuste permanece mobile-first, sem `<img>` cru, sem package novo e sem alteracao em `backend/prisma/schema.prisma` ou migrations.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencia usada: captura enviada pelo usuario e padroes locais dos filtros Admin.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] O seletor de periodo em `/comunidades` exibe **Hoje**, **Esta semana**, **Este mes**, **Este ano** e **Todo o periodo**.
- [x] O estado **Personalizado** aparece somente quando o Admin digita uma data manual em **De** ou **Ate**.
- [x] O dashboard consulta o backend por presets reais de periodo, sem mapear **Este ano** ou **Todo o periodo** para **Ultimos 90 dias**.
- [x] Periodos personalizados continuam usando datas `from`/`to` reais e validacao de intervalo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check` foi executado, mas ficou bloqueado por alteracoes nao relacionadas ja presentes em `backend/src/modules/api/admin/private/communities/manage/*`, `backend/prisma/schema.prisma` e arquivos da TASK-75 em andamento; o erro reportado foi de imports/formatacao nao usados nesses arquivos fora do escopo deste ajuste.

## Correcao complementar: coluna de acoes em postagens recentes e populares (2026-07-18)

- Pedido do usuario: no dashboard de comunidades, nos blocos **Postagens mais recentes** e **Posts mais populares**, adicionar uma coluna de acoes com botoes para ver o conteudo publico e seus analytics.
- Frontend Admin: as tabelas desktop desses dois blocos agora exibem a coluna **Acoes** com botoes compactos para **Abrir publico** e **Analytics**.
- O botao publico abre `NEXT_PUBLIC_FRONTEND_URL + /community/{slug}/post/{id}` em nova aba; o botao de analytics abre a rota Admin existente `/comunidades/{slug}/conteudo/post/{id}`.
- No mobile, os cards mantem a mesma decisao como botoes textuais, preservando a abordagem mobile-first sem criar coluna artificial em telas estreitas.
- Nao houve alteracao de backend, endpoint, contrato, `backend/prisma/schema.prisma`, migrations, packages, seed, mock ou dado fake permanente.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e padroes Admin existentes.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] **Postagens mais recentes** exibe coluna desktop **Acoes**.
- [x] **Posts mais populares** exibe coluna desktop **Acoes**.
- [x] Cada linha possui botao para abrir o post publico real em nova aba.
- [x] Cada linha possui botao para abrir o detalhe de analytics Admin do post.
- [x] A apresentacao mobile mantem botoes equivalentes dentro dos cards.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/comunidades`, `GET http://localhost:3002/comunidades/autocuidado-em-pratica/conteudo/post/cmrmg709v000yt0uh8x55eqae` e `GET http://localhost:3000/community/autocuidado-em-pratica/post/cmrmg709v000yt0uh8x55eqae` retornaram 200.
- Browser local validado no Chrome em `http://localhost:3002/comunidades`: os blocos de posts exibiram botoes de publico e analytics na coluna de acoes.

## Correcao complementar: hover e acoes em principais comunidades (2026-07-18)

- Pedido do usuario: em **Principais comunidades**, aplicar hover nas linhas como nas tabelas de posts recentes/populares, adicionar acao de detalhes e alinhar as colunas ao grid visual das tabelas acima.
- Frontend Admin: os cards mobile e as linhas desktop de **Principais comunidades** agora usam hover com borda/fundo suave, mantendo tokens do app Admin e abordagem mobile-first.
- A coluna **Acoes** passou a exibir dois botoes compactos: **Abrir publico** (`/community/[slug]` no site publico) e **Detalhes** (`/comunidades/[slug]` no Admin).
- O icone de **Detalhes** usa o mesmo `BarChart3` das acoes analiticas/estatisticas das tabelas anteriores, conforme ajuste visual solicitado.
- A tabela desktop de **Principais comunidades** passou a usar `colgroup` `48% / 8% / 8% / 36%`, alinhando **Seguidores**, **Posts** e **Acoes** com as colunas numericas e de acoes dos blocos acima.
- Nao houve alteracao de backend, endpoint, contrato, `backend/prisma/schema.prisma`, migrations, packages, seed, mock ou dado fake permanente.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e padroes Admin existentes.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] **Principais comunidades** aplica hover em cards mobile e linhas desktop.
- [x] A coluna **Acoes** exibe botao para abrir a comunidade publica real em nova aba.
- [x] A coluna **Acoes** exibe botao para abrir os detalhes administrativos da comunidade.
- [x] O botao de detalhes usa o icone `BarChart3`, igual ao icone de estatisticas/analytics das tabelas anteriores.
- [x] As colunas desktop de **Principais comunidades** ficam alinhadas ao grid das tabelas de posts acima.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/comunidades` retornou 200.

## Correcao complementar: avatar em principais comunidades (2026-07-18)

- Pedido do usuario: em **Principais comunidades**, substituir o icone/color block pelo avatar real da comunidade.
- Backend Admin: `top_communities.items` no endpoint `GET /api/admin/private/communities/dashboard` passou a incluir `avatar_url` vindo do modelo real `community`, sem endpoint paralelo, seed ou dado fake.
- Frontend Admin: o bloco **Principais comunidades** renderiza o avatar da comunidade com `next/image`, resolvendo arquivos publicos do backend pelo helper local usado no dashboard; quando a comunidade nao possui avatar, usa iniciais como fallback visual honesto.
- O ajuste preserva layout mobile-first em cards e tabela desktop, acoes existentes, hover e alinhamento de colunas.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: captura enviada pelo usuario e implementacao existente de `/comunidades`.
- ADR atualizado: `adrs/0231-admin-comunidades-dashboard-agregacoes.md`.

### Criterios deste ajuste

- [x] **Principais comunidades** usa `community.avatar_url` real quando houver.
- [x] O avatar e renderizado com `next/image`, sem `<img>` cru.
- [x] Comunidades sem avatar mantem fallback visual por iniciais, sem mock ou asset artificial.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, schema Prisma ou migration foi usado.

### Validacao deste ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke service real `buildCommunitiesDashboard({ period: "week" })` retornou `status=200`, `top_communities_total=7` e `top_communities.items[0].avatar_url="/community/icons/autocuidado.png"`.
- Smoke HTTP local: `GET http://localhost:3002/comunidades` retornou 200.
