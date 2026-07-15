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
- Backend Admin: o modulo existente de comunidades passou a expor `GET /api/admin/private/communities`, protegido por auth Admin, com busca, categoria, ordenacao e paginacao sobre dados reais.
- A resposta usa `community`, `community_member`, `community_post`, `post_reply` e `post_report` para compor membros, posts, comentarios, denuncias, atividade e ultima atividade, sem mocks, seeds ou endpoint simulado.
- Frontend Admin: criada a rota estatica `/comunidades/lista`, com busca em URL, filtro de categoria, ordenacao, paginacao, estados loading/erro/vazio e tabela/lista mobile-first que abre o detalhe real `/comunidades/[slug]`.
- O submenu lateral **Comunidades > Lista de Comunidades** passou a apontar para `/comunidades/lista`; **Visao geral** permanece em `/comunidades`.
- A acao **Ver todas** de **Principais comunidades** no dashboard agora navega para a lista real.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` nao esta exposto como ferramenta callable neste ambiente; referencias usadas: `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` e o modelo de `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`.
- Nao houve alteracao em `backend/prisma/schema.prisma`, migrations ou packages; `pnpm --dir backend db:migrate` nao se aplica.
- ADR criado: `adrs/0271-lista-admin-comunidades-rota-real.md`.

### Criterios complementares

- [x] `/comunidades/lista` existe como rota Admin protegida pelo shell/autenticacao administrativa.
- [x] A lista usa endpoint real `GET /api/admin/private/communities`.
- [x] Busca, filtro de categoria, ordenacao e paginacao usam URL/search params.
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
