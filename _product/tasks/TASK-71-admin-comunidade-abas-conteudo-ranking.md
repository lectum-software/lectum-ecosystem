# TASK-71: Abas administrativas da comunidade, conteúdo e ranking completo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-71 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Comunidades / Moderação |
| Status | Completed |
| Dependências | TASK-23, TASK-24, TASK-26, TASK-27, TASK-45, TASK-46, TASK-51, TASK-52, TASK-67, TASK-70 |
| ADR alvo | ADR sobre detalhe administrativo de comunidade com abas, moderação de conteúdo e ranking completo |

## Contexto

A página administrativa de comunidade já exibia resumo, desempenho, edição, regras, top mentores e posts populares em uma única tela. A operação de suporte e moderação precisa de mais contexto sem criar uma guia global com todos os conteúdos da plataforma.

Decisão de produto desta task:

- Transformar o detalhe administrativo da comunidade em um shell com abas, seguindo o padrão visual do detalhe de psicólogos.
- Manter o contexto dentro de cada comunidade, com abas: **Geral**, **Dados**, **Conteúdo**, **Ranking**, **Denúncias** e **Atividades**.
- A aba **Conteúdo** deve listar posts e comentários reais daquela comunidade e permitir remoção administrativa auditada.
- A aba **Ranking** deve listar todos os psicólogos participantes da comunidade, não apenas top 5. Se houver mil psicólogos participantes, todos devem ter posição paginada.
- O ranking deve indicar se o psicólogo subiu, caiu, ficou estável ou entrou no ranking em relação ao período anterior equivalente.
- A aba **Denúncias** deve mostrar denúncias reais daquela comunidade; denúncias continuam acessíveis também pelos contextos já existentes.
- A aba **Atividades** deve expor auditoria administrativa real da comunidade, sem segredos ou payload bruto.

## Objetivo

Permitir que um Admin autenticado navegue pelo detalhe de uma comunidade em abas contextuais para acompanhar dashboard, editar dados/regras, acessar e remover posts/comentários quando necessário, acompanhar ranking completo dos psicólogos participantes, consultar denúncias e visualizar atividades administrativas auditadas.

## Prérequisitos e bloqueios

- TASK-45 e TASK-46 concluídas: autenticação Admin real e app Admin.
- TASK-51 e TASK-52 concluídas: dashboard/detalhe de comunidades existentes.
- TASK-23, TASK-24 e TASK-26 concluídas: posts e comentários reais de comunidades.
- TASK-27 concluída: regra de ranking Top Mentores.
- TASK-67 e TASK-70 consideradas para auditoria sensível e resolução/remoção de conteúdo denunciado.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o padrão de abas do detalhe administrativo do psicólogo.
- Não há protótipo específico para as novas abas da comunidade; usar o padrão visual existente e registrar a limitação.
- Não usar mocks, endpoints simulados, dados inventados nem remoção sem persistência real.

## Escopo implementado

### Frontend Admin

- O detalhe `/comunidades/[slug]` passou a aceitar `?tab=geral`, `?tab=dados`, `?tab=conteudo`, `?tab=ranking`, `?tab=denuncias` e `?tab=atividades`.
- A navegação por abas é mobile-first, horizontal e preserva deep links.
- **Geral** concentra resumo, desempenho, posts populares e top mentores resumidos.
- **Dados** concentra edição de identidade, avatar, cores, informações e regras.
- **Conteúdo** lista posts/comentários reais, com filtros, busca, paginação, link para visualização pública e formulário de remoção com React Hook Form, Zod, motivo obrigatório e confirmação `REMOVER CONTEUDO`.
- **Ranking** lista todos os psicólogos participantes da comunidade, com posição, score, métricas e tendência de subida/queda/estabilidade/novo.
- **Denúncias** lista denúncias reais vinculadas à comunidade.
- **Atividades** lista eventos auditados em `admin_activity_log` para a comunidade.

### Backend Admin

Endpoints reais adicionados ao módulo privado de comunidades:

- `GET /api/admin/private/communities/:id/content`;
- `POST /api/admin/private/communities/:id/content/:targetType/:targetId/remove`;
- `GET /api/admin/private/communities/:id/ranking`;
- `GET /api/admin/private/communities/:id/reports`;
- `GET /api/admin/private/communities/:id/activities`.

Regras:

- Todos os endpoints exigem Admin autenticado.
- Conteúdo e denúncias são filtrados pela comunidade real selecionada.
- Remoção de post marca `community_post` como removido/deletado, remove comentários vinculados e registra auditoria.
- Remoção de comentário remove a árvore de respostas descendentes, ajusta contador do post e registra auditoria.
- Denúncias pendentes/em análise do alvo removido são marcadas como resolvidas.
- Auditoria usa `admin_activity_log` com `target_type="community"`, domínio `communities`, área `conteudo`, motivo obrigatório e metadados seguros sem conteúdo bruto, token ou segredo.
- Ranking usa todos os `community_member` ativos cujo usuário é `role="psicologo"`, inicializando métricas zeradas para todos antes de ordenar.
- A tendência compara a posição atual com a posição do período anterior equivalente de 30 dias.

## Fora do escopo

- Criar uma listagem global de todos os conteúdos da plataforma.
- Impersonar usuários.
- Hard delete de posts/comentários.
- Resolver manualmente denúncia como improcedente dentro da aba da comunidade.
- Silenciar, banir ou suspender participantes.
- Criar ou alterar schema Prisma.
- Criar pacote novo.

## Critérios de aceite

- [x] A página administrativa da comunidade possui abas **Geral**, **Dados**, **Conteúdo**, **Ranking**, **Denúncias** e **Atividades**.
- [x] Deep links por `?tab=` funcionam sem quebrar a rota existente.
- [x] A aba **Conteúdo** lista posts e comentários reais da comunidade, com busca, filtro e paginação.
- [x] Admin consegue remover post/comentário com motivo obrigatório e confirmação forte.
- [x] Remoção é persistida por soft delete/status real e registra auditoria administrativa.
- [x] Remoção de post também remove comentários vinculados; remoção de comentário remove descendentes.
- [x] A aba **Ranking** lista todos os psicólogos participantes com posição, inclusive participantes sem atividade/score.
- [x] Ranking mostra tendência de subida, queda, estabilidade ou novo em relação ao período anterior.
- [x] A aba **Denúncias** mostra denúncias reais da comunidade.
- [x] A aba **Atividades** mostra eventos de auditoria administrativa da comunidade.
- [x] Formulário sensível usa React Hook Form, Zod e controllers existentes.
- [x] Nenhum mock, dado fake permanente, endpoint simulado ou envio/remoção falsa foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] Não houve alteração em Prisma schema/migrations.
- [x] Traduções PT-BR foram adicionadas para erros/mensagens necessárias.
- [x] Builder/Quick Copy não estava disponível como ferramenta no ambiente; imagens locais e padrão de abas existentes foram usados.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - Admin `/comunidades/[slug]?tab=conteudo` em ~390px e desktop;
  - Admin `/comunidades/[slug]?tab=ranking` validando ranking paginado;
  - remoção negativa/positiva de conteúdo apenas com Admin real e motivo obrigatório quando houver conteúdo real autorizado.

## Execução TASK-71

- Implementadas abas contextuais no detalhe da comunidade, sem criar guia global de conteúdo.
- Implementados endpoints Admin privados reais para conteúdo, ranking completo, denúncias e atividades.
- Ranking administrativo inclui todos os psicólogos membros da comunidade e compara posições com o período anterior de 30 dias.
- Remoção administrativa usa soft delete/status, ajusta comentários, resolve denúncias pendentes do alvo e registra auditoria segura.
- Não houve alteração em Prisma schema ou migrations; `db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível no ambiente; foram usadas as imagens locais e o padrão visual das abas já implementadas no Admin.

### Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `pnpm --dir frontend build`
- Browser/HTTP local com Admin já servido em `localhost:3002`:
  - `http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=conteudo` retornou 200;
  - `http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=ranking` retornou 200.
- Smoke HTTP dos novos endpoints Admin privados não foi executado porque o backend local não estava em execução em `localhost:3001`; contratos e proteção foram validados por typecheck/build/check. Mutação real de remoção não foi disparada sem sessão Admin e sem intenção explícita de alterar conteúdo real.

## Ajuste complementar 2026-07-15 - Contexto do conteúdo na aba Conteúdo

- Pedido do usuário: na aba **Conteúdo** do detalhe administrativo de comunidade, remover a tag verde `Publicado`, informar se o item é post/comentário de paciente ou post/resposta de psicólogo verificado/não verificado, exibir miniatura quando houver mídia e mostrar prévia do conteúdo de origem em comentários/respostas.
- O backend de `GET /api/admin/private/communities/:id/content` passou a retornar classificação operacional derivada de dados reais (`community_post`, `post_reply`, `user.role` e verificação profissional real), primeira mídia publicada e `origin_preview` para itens de comentário/resposta.
- A UI Admin removeu a tag verde `Publicado`; conteúdos ativos exibem a classificação de autoria/forma e itens removidos continuam marcados como `Removido`.
- A miniatura usa `next/image` para imagens e `<video>` somente para mídia de vídeo, sem `<img>` cru; URLs públicas de arquivos são resolvidas contra `NEXT_PUBLIC_API_URL`.
- A prévia de origem segue o padrão visual da página pública **Minhas respostas**, usando o post original para comentários diretos e o comentário de origem para respostas.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

- Validação executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Miniplayer e ordem da prévia de origem

- Pedido do usuário: a mídia de vídeo exibida na aba **Conteúdo** precisa funcionar como miniplayer, manter proporção vertical 9:16 e a prévia do conteúdo de origem deve aparecer acima da resposta/comentário.
- A UI Admin passou a renderizar vídeos publicados com `<video controls>` diretamente no card, sem overlay que bloqueie interação, e com container mobile-first em `aspect-[9/16]`.
- Imagens continuam usando `next/image`; não foi introduzido `<img>` cru.
- A prévia de origem agora é exibida antes do título/texto do comentário ou resposta, preservando primeiro o contexto do conteúdo respondido.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Ações laterais e métricas abaixo de divisor

- Pedido do usuário: na aba **Conteúdo**, separar as métricas do conteúdo por uma linha horizontal e mover as opções de visualização/exclusão para a coluna direita, exibindo somente ícones.
- A UI Admin passou a renderizar ações em coluna lateral no desktop, com botões icon-only acessíveis via `aria-label`, `title` e texto `sr-only`.
- As métricas de upvotes, downvotes, comentários, salvos e denúncias agora ficam abaixo de um divisor (`border-t`) no rodapé do card, seguindo a leitura visual do site público.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

## Ajuste complementar 2026-07-15 - Play explícito e mídia alinhada à resposta

- Pedido do usuário: adicionar botão de play no miniplayer, não repetir o título do post de origem no corpo da resposta de psicólogo e alinhar o miniplayer à altura da resposta, não à altura do post original.
- O miniplayer de vídeo agora mantém controles nativos e adiciona botão central de play que dispara `video.play()` no próprio card.
- Comentários/respostas deixam de renderizar título; exibem somente o texto próprio quando existir, preservando a prévia do conteúdo de origem acima como contexto separado.
- Em comentários/respostas, a prévia de origem fica acima do grid de mídia/texto; a miniatura/miniplayer passa a alinhar com o corpo da resposta.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validação executada para os ajustes de layout/miniplayer: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Autor sem papel entre parênteses

- Pedido do usuário: na linha de autor da aba **Conteúdo**, exibir apenas o nome e o selo de verificado quando houver, sem papel entre parênteses.
- A UI Admin removeu `Autor:`/papel do usuário da linha visual e passou a mostrar `author.name` com selo `verificado` derivado de `author.verified`.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Selo azul visual no autor

- Pedido do usuário: substituir a tag textual `verificado` pelo selo azul já usado na Lectum.
- A UI Admin passou a usar o mesmo SVG do selo azul de perfil verificado existente no app principal (`frontend/src/components/ui/verified-badge.tsx`), sem texto de tag.
- Como Admin e frontend são aplicações separadas em produção, o SVG foi reproduzido localmente no componente do card, sem criar import cross-app ou package compartilhado.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração de dados persistidos.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local do Admin/site público.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Identidade do autor acima da m�dia e papel por g�nero

- Pedido do usu�rio: na aba **Conte�do**, posicionar a identifica��o do autor acima do v�deo e do texto, com foto de perfil, nome, selo azul quando houver e o papel abaixo do nome; em seguida, substituir `Psic�logo/Psic�loga` por `Psic�logo` ou `Psic�loga` conforme o g�nero cadastrado do psic�logo.
- A UI Admin passou a renderizar um bloco de autoria antes do grid de m�dia/texto, usando `next/image` para avatar, fallback de iniciais, nome trunc�vel, selo visual azul de verificado e linha de papel abaixo.
- O contrato de conte�do administrativo passou a expor `author.gender` para autores psic�logos, derivado de `psychologist_profile.gender`; pacientes e autores an�nimos continuam com `gender=null`.
- O r�tulo do papel usa `Psic�loga` quando `gender="feminino"` e `Psic�logo` nos demais casos de psic�logo; pacientes continuam como `Paciente`.
- N�o houve package novo, mock, schema Prisma/migration, endpoint paralelo ou altera��o de persist�ncia; apenas select/DTO do endpoint real e apresenta��o no Admin.
- Builder/Quick Copy n�o est� exposto como ferramenta callable no ambiente; a refer�ncia visual usada foi a captura enviada pelo usu�rio e o padr�o local do Admin/site p�blico.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Valida��o executada para este ajuste: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

- Valida��o executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Nome real em post an�nimo no Admin

- Pedido do usu�rio: quando um item da aba **Conte�do** for um post an�nimo, o painel administrativo deve exibir o nome real do paciente e informar que o post foi feito anonimamente.
- O contrato de conte�do administrativo passou a expor `author.anonymous` para diferenciar anonimato p�blico de identidade administrativa, sem substituir `author.role` por `anonymous`.
- Posts an�nimos de pacientes agora retornam `author.name` com o nome real do paciente para o Admin; o card mostra o papel `Paciente` e o marcador `Post feito anonimamente` abaixo do nome.
- Coment�rios/respostas e posts de psic�logos retornam `author.anonymous=false`; a regra de anonimato continua restrita ao post an�nimo de paciente.
- A remo��o administrativa auditada agora preserva `author_anonymous` no snapshot seguro usado pela rotina de remo��o.
- N�o houve package novo, mock, schema Prisma/migration, endpoint paralelo ou altera��o de persist�ncia; apenas contrato derivado do endpoint real e apresenta��o no Admin.
- Builder/Quick Copy n�o est� exposto como ferramenta callable no ambiente; a refer�ncia visual usada foi a captura enviada pelo usu�rio e o padr�o local do Admin/site p�blico.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Valida��o executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/tdah?tab=conteudo` retornando 200.


## Ajuste complementar 2026-07-15 - Filtros da aba Conteúdo acima da listagem

- Pedido do usuário: na aba **Conteúdo** de /comunidades/[slug], mover o bloco de filtros para cima da listagem de publicações, trocar o filtro de tipo para opções operacionais específicas e remover o filtro de status.
- A UI Admin passou a renderizar um card de filtros separado, antes do card **Conteúdo da comunidade**, com **Buscar**, **Tipo** e **Período**, mantendo layout mobile-first.
- O filtro **Tipo** agora expõe Posts de psicólogo verificado, Posts de psicólogo não verificado, Respostas de psicólogo verificado, Respostas de psicólogo não verificado, Comentários de pacientes e Posts anônimos, além de Todos os tipos.
- O filtro de status deixou de ser exibido na interface; itens removidos continuam marcados a partir do status real retornado pela API.
- O backend passou a aceitar filtro por content_kind real e período (Todo o período, Últimos 7 dias, Últimos 30 dias, Últimos 90 dias) aplicado sobre created_at.
- Posts anônimos passaram a ter classificação operacional própria (nonymous_post) derivada de community_post.anonymous, sem alterar schema Prisma ou persistência.
- Não houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteração destrutiva de dados.
- ADR atualizado: drs/0264-admin-comunidade-abas-conteudo-ranking.md.
- Validação executada: pnpm --dir backend check, pnpm --dir backend build, pnpm --dir admin check, pnpm --dir admin build, pnpm check e smoke local GET http://localhost:3002/comunidades/tdah?tab=conteudo retornando 200.

## Ajuste complementar 2026-07-15 - Fullscreen 9:16 no miniplayer

- Pedido do usuario: quando o miniplayer de video for ampliado/tela cheia, manter o formato vertical 9:16 na tela.
- A UI Admin passou a aplicar uma classe dedicada ao elemento `<video>` do miniplayer e regras globais para `:fullscreen`/`:-webkit-full-screen` com largura/altura maximizadas dentro da proporcao 9:16.
- A ampliacao usa fundo preto, centralizacao por `margin:auto` e `object-fit: cover` para preservar a mesma composicao vertical do miniplayer, inclusive quando o arquivo de video tiver metadados em paisagem.
- Durante a validacao, a aba **Denuncias** deixou de inicializar `period="all"`, pois esse filtro pertence apenas a **Conteudo** e quebrava o typecheck do Admin.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de persistencia; apenas CSS/apresentacao no Admin e correcao de tipo da query local.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin/site publico.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Contagem da listagem e setas dos filtros

- Pedido do usuario: trocar a descricao estatica por "Mostrando X de X registros.", remover a tag de contagem "13 itens" e afastar as setas dos dropdowns.
- A UI Admin da aba **Conteudo** agora calcula a contagem visivel a partir de `result.data.data.length` e o total a partir de `result.data.count`, mantendo a lista/paginacao real da API.
- O badge de total no cabecalho da listagem foi removido; a informacao fica apenas na descricao "Mostrando X de X registros.".
- Os selects **Tipo** e **Periodo** usam `appearance-none`, `ChevronDown` do `lucide-react` e `right-5`/`pr-12` para dar margem visual a seta sem package novo.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de persistencia; apenas apresentacao no Admin.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.


## Ajuste complementar 2026-07-15 - Metricas de alcance no conteudo publicado

- Pedido do usuario: na aba **Conteudo**, adicionar quantidade de compartilhamentos, visualizacoes e cliques no botao de WhatsApp nas metricas de cada conteudo publicado.
- O contrato de `GET /api/admin/private/communities/:id/content` passou a retornar `shares_count`, `views_count` e `whatsapp_clicks_count` em cada item, alem das metricas ja existentes.
- `shares_count` vem de `post_share`; `views_count` vem de `page_view_event`; `whatsapp_clicks_count` vem de `important_action_event.action_type="whatsapp_click"` com alvo explicito de post ou resposta.
- O frontend publico passou a registrar `whatsapp_click` first-party nos CTAs de WhatsApp de posts/respostas de comunidade, com `target_type` e `target_id`; clicks historicos sem alvo permanecem nao atribuidos, sem backfill ou mock.
- A UI Admin renderiza as novas metricas no rodape do card, abaixo do divisor, junto de upvotes, downvotes, comentarios, salvos e denuncias.
- Nao houve package novo, schema Prisma/migration, endpoint paralelo, mock ou alteracao destrutiva de dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin/site publico.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md` e complemento em `adrs/0266-metricas-conversao-uso-psicologos-admin.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo`/`GET http://localhost:3000/community/autocuidado-em-pratica` retornando 200.


## Ajuste complementar 2026-07-15 - Periodo personalizado fixo no Conteudo

- Pedido do usuario: na aba **Conteudo**, trocar as opcoes de periodo para **Esta semana**, **Este mes**, **Este ano**, **Todo o periodo** e **Personalizado**, mantendo os campos **De** e **Ate** sempre visiveis.
- A UI Admin agora exibe Buscar, Tipo, Periodo, De e Ate no card de filtros, com layout mobile-first e os campos de data fixos mesmo quando o periodo selecionado nao e personalizado.
- A selecao de periodo preenche as datas de referencia: semana atual, mes atual, ano atual ou do cadastro da comunidade ate hoje; ao editar De/Ate, o filtro muda para **Personalizado**.
- O backend de `GET /api/admin/private/communities/:id/content` passou a aceitar `period=week|month|year|all|custom` e `from`/`to` para periodo personalizado, filtrando por `created_at` real dos posts/respostas.
- `Todo o periodo` continua sem limitar o resultado no backend; os campos De/Ate sao referencia visual e ponto de partida para customizacao.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao destrutiva de dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario, o padrao da aba Publicacoes do detalhe de psicologo e o padrao local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.


## Ajuste complementar 2026-07-15 - Ordem e exibicao contextual das metricas

- Pedido do usuario: na aba **Conteudo**, colocar **Visualizacoes** na primeira posicao, trocar o icone de cliques WhatsApp pelo icone de WhatsApp ja usado na Lectum e ocultar a metrica em conteudos de paciente.
- A UI Admin passou a renderizar **Visualizacoes** como primeira metrica no rodape do card, antes de votos, comentarios, salvos, compartilhamentos, cliques WhatsApp e denuncias.
- O icone de cliques WhatsApp foi reproduzido localmente a partir do SVG ja usado na Lectum, sem criar import entre Admin e frontend, pois as apps devem permanecer separadas em producao.
- A metrica `whatsapp_clicks_count` agora aparece somente quando `author.role === "psicologo"`; posts, comentarios e posts anonimos de pacientes nao exibem essa metrica porque nao possuem CTA de WhatsApp.
- Nao houve package novo, mock, schema Prisma/migration, endpoint paralelo ou alteracao de persistencia; o ajuste e apenas de apresentacao contextual no Admin.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da Lectum/Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-15 - Fullscreen custom 9:16 no miniplayer

- Pedido do usuario: o miniplayer ampliado ainda estava esticando no fullscreen nativo do navegador.
- A UI Admin deixou de depender do fullscreen nativo do proprio elemento `<video>` para ampliacao principal e passou a usar um overlay customizado com botao de ampliar dedicado.
- O botao de ampliar abre um container fullscreen/fixed com fundo preto e video filho dimensionado por `aspect-ratio: 9 / 16`, evitando que o Chrome estique o video em paisagem.
- Os controles nativos do miniplayer continuam disponiveis para play/pause/progresso, mas o fullscreen nativo do video foi ocultado com `controlsList="nofullscreen"`; a ampliacao suportada e a do botao customizado.
- O tempo de reproducao e sincronizado entre miniplayer e overlay ampliado ao abrir/fechar, sem criar endpoint, mock, schema Prisma/migration, package novo ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local do Admin/site publico.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.

## Ajuste complementar 2026-07-16 - Paginacao padrao no Conteudo

- Pedido do usuario: na aba **Conteudo** do detalhe administrativo de comunidade, trocar a barra de navegacao de paginas para o formato padrao do painel, igual ao usado na aba **Publicacoes** do detalhe de psicologo.
- O componente compartilhado de paginacao do detalhe de comunidade deixou de exibir o texto `Pagina X de Y` com botoes grandes `Anterior`/`Proxima` e passou a renderizar controles centralizados com setas icon-only, pagina atual destacada e janela de ate 5 paginas.
- A mudanca e mobile-first e preserva a paginacao real ja retornada pela API; nao houve endpoint novo, mock, schema Prisma/migration, package novo ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Publicacoes** do detalhe de psicologo.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`, `pnpm --dir admin build` e smoke local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornando 200.
- Observacao de validacao: `pnpm --dir admin check` completo nao concluiu porque ha pendencias preexistentes nao relacionadas em `admin/src/app/(admin)/psicologos/[id]/client.tsx` (imports/variaveis nao usados na arvore de trabalho antes deste ajuste).


## Ajuste complementar 2026-07-16 - Tabela na aba Atividades da comunidade

- Pedido do usuário: na aba **Atividades** do detalhe administrativo de comunidade, usar o mesmo modelo de layout da aba **Atividades** do detalhe administrativo de psicólogos.
- A UI Admin de `/comunidades/[slug]?tab=atividades` deixou de renderizar eventos como cards soltos e passou a usar um card de busca seguido de uma tabela responsiva com colunas **Data**, **Ação**, **Descrição** e **Usuário**.
- A tabela preserva dados reais já retornados por `admin_activity_log`: data do evento, resumo, motivo quando houver, área, origem do painel administrativo e ator real com papel **Admin**.
- O ajuste é exclusivamente visual, mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteração de contrato.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência visual usada foi a captura enviada pelo usuário e o padrão local da aba **Atividades** de psicólogos.
- Validação executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200. A validação visual por controle direto de browser não foi concluída porque este ambiente não expõe ferramenta de automação/inspeção de navegador.

## Ajuste complementar 2026-07-16 - Metricas e filtros na aba Denuncias

- Pedido do usuario: na aba **Denuncias** do detalhe administrativo de comunidade, adicionar contadores superiores com total, pendentes, procedentes e improcedentes, alem de bloco de filtros por **Tipo**, **Status**, **Periodo**, **De** e **Ate**.
- O endpoint real `GET /api/admin/private/communities/:id/reports` passou a retornar `cards`, `filters`, `period`, `status_group`, `status_label` e `content_kind` derivados de `post_report`, `community_post`, `post_reply`, `user.role` e verificacao profissional real, sem mock ou endpoint paralelo.
- O status `em_analise` legado continua agrupado como **Pendente**; `resolvida` aparece como **Procedente** e `rejeitada` como **Improcedente**, mantendo a mesma semantica operacional ja usada em denuncias de psicologos.
- O filtro **Tipo** diferencia post/resposta de psicologo verificado ou nao verificado, post de paciente e comentario de paciente. Posts anonimos de paciente entram como **Post de paciente** neste contexto de denuncias.
- A UI Admin passou a renderizar cards mobile-first e filtros no mesmo padrao visual da aba **Denuncias** do detalhe administrativo de psicologos, com periodo padrao de 90 dias e datas sempre visiveis.
- Nao houve package novo, mock, schema Prisma/migration ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Denuncias** de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=denuncias` retornando 200 e smoke HTTP sem sessao Admin em `GET /api/admin/private/communities/relacionamentos-com-proposito/reports?...` retornando 401. A validacao visual autenticada por browser nao foi concluida porque o ambiente headless nao possui sessao Admin; em headless, a rota redirecionou para login apos carregar.

## Ajuste complementar 2026-07-16 - Agrupamento e resolucao de denuncias por conteudo

- Pedido do usuario: na aba **Denuncias** de `/comunidades/[slug]`, exibir o conteudo completo denunciado com midia, agrupar multiplas denuncias do mesmo conteudo, listar todos os denunciantes, permitir marcar como procedente/improcedente, ordenar pelos conteudos mais denunciados e mostrar a quantidade de denuncias recebidas por conteudo.
- O backend privado `GET /api/admin/private/communities/:id/reports` agora agrupa as denuncias por conteudo denunciado depois do recorte de periodo/tipo, retornando texto integral, midia principal, URL publica quando disponivel, contagem por conteudo, lista de denunciantes e contadores por status do grupo.
- A ordenacao da lista prioriza `report_count` decrescente e usa a ultima denuncia como desempate, mantendo cards superiores com contagens reais de denuncias.
- Foi adicionado `POST /api/admin/private/communities/:id/reports/:targetType/:targetId/resolve` para marcar todas as denuncias pendentes/em_analise do mesmo conteudo como `rejeitada` (improcedente) ou `resolvida` (procedente), com motivo obrigatorio e confirmacao forte `DENUNCIA IMPROCEDENTE`/`DENUNCIA PROCEDENTE`.
- A resolucao registra auditoria real em `admin_activity_log` com area `denuncias`, origem `admin_panel`, acoes `community_report_dismissed`/`community_report_upheld` e snapshots seguros; esta acao nao remove conteudo, preservando a remocao auditada na aba **Conteudo**.
- A UI Admin renderiza um unico card por conteudo denunciado, texto completo com `white-space: pre-wrap`, midia com `next/image` ou miniplayer existente para video, lista de denunciantes, quantidade total e botoes de resolucao apenas quando houver pendencia.
- Nao houve package novo, mock, schema Prisma/migration ou alteracao destrutiva de dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o padrao local da aba **Denuncias** de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=denuncias` retornando 200 e smoke HTTP sem sessao Admin em `POST /api/admin/private/communities/relacionamentos-com-proposito/reports/post/smoke/resolve` retornando 401.

## Ajuste complementar 2026-07-16 - Bloco de filtros na aba Atividades da comunidade

- Pedido do usuario: na aba **Atividades** do detalhe administrativo de comunidade, adicionar o mesmo bloco de acoes/filtros usado na aba **Atividades** do detalhe administrativo de psicologos.
- A UI Admin agora renderiza, antes da tabela, filtros mobile-first por **Periodo**, **Area**, **Tipo de atividade** e **Buscar**, com o mesmo layout flex/responsivo e campos **De/Ate** quando o periodo personalizado e selecionado.
- O endpoint real `GET /api/admin/private/communities/:id/activities` passou a aceitar `area`, `type`, `from`, `to` e `q`, retornando tambem `filters`, `period` e `active_filters_count` derivados de `admin_activity_log` real, sem mock ou endpoint paralelo.
- O filtro de periodo usa intervalo maximo de 365 dias quando datas customizadas sao enviadas; sem datas, a resposta permanece em **Todo historico registrado**.
- Nao houve package novo, schema Prisma/migration, seed ou alteracao destrutiva de dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Atividades** de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada em worktree isolada por alteracoes concorrentes na arvore principal: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Ajuste complementar 2026-07-16 - Desativacao de comunidade na aba Dados

- Pedido do usuario: adicionar no painel Admin uma opcao para desativar a comunidade, posicionada ao final da aba **Dados**, depois de **Regras da comunidade**.
- A UI Admin de `/comunidades/[slug]?tab=dados` passou a exibir o card **Disponibilidade da comunidade** apos o gerenciador real de regras, com status Ativa/Inativa, data de desativacao quando existir e acao de desativar/reativar.
- A acao usa modal com motivo obrigatorio e confirmacao forte (`DESATIVAR COMUNIDADE`/`REATIVAR COMUNIDADE`) usando React Hook Form, Zod e controllers do projeto.
- O backend adicionou `PATCH /api/admin/private/communities/:id/status`, persistindo `community.active` e `community.deactivated_at` e auditando em `admin_activity_log` com area `dados`.
- Consultas publicas de comunidades, feed/posts, posts salvos, publicacoes de perfil e ranking publico passam a esconder comunidades inativas com `active=true`; o Admin continua podendo abrir e reativar a comunidade.
- Foi criada/reconstituida a migration `20260716150139_community_active_status`; `pnpm --dir backend db:migrate --name community_active_status` ficou **Already in sync** apos restaurar a migration local que ja constava aplicada no banco de desenvolvimento.
- Nao houve package novo, mock, reset/destruicao de banco ou endpoint paralelo.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Dados** do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend db:migrate --name community_active_status` (apos restaurar migration local, **Already in sync**), `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=dados` retornando 200 e smoke HTTP sem sessao Admin em `PATCH /api/admin/private/communities/relacionamentos-com-proposito/status` retornando 401.

## Ajuste complementar 2026-07-16 - Correcao de acentuacao nas Atividades

- Pedido do usuario: corrigir textos corrompidos na aba **Atividades** da comunidade apos a inclusao dos filtros.
- Foram restaurados os textos acentuados em labels, placeholders, cabecalhos da tabela, fallback de ator e metadados de area/origem: **Periodo**, **Area**, **Todo historico registrado**, **Ultimos**, **Descricao**, **Acao**, **Usuario**, **Ate** e **Nao informado**.
- O backend tambem voltou a enviar labels acentuados em `period.label` e no filtro **Todas as areas**.
- Nao houve alteracao de regra de negocio, endpoint, schema Prisma/migration, package ou persistencia.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir admin build`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Ajuste complementar 2026-07-16 - Descricao limpa nas Atividades

- Pedido do usuario: na coluna **Descricao** da aba **Atividades** da comunidade, remover os prefixos **Motivo**, **Area** e **Origem**.
- A tabela administrativa agora exibe somente o texto descritivo do evento (`activity.reason`) na coluna **Descricao**, com fallback **Sem descricao registrada.** quando o log nao possuir motivo.
- O filtro por **Area** e os dados reais de auditoria continuam preservados no contrato e nas opcoes de filtro; a mudanca e apenas de apresentacao da linha.
- Nao houve endpoint novo, schema Prisma/migration, package, mock ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Atividades** de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://127.0.0.1:3012/comunidades/relacionamentos-com-proposito?tab=atividades` retornando 200.

## Ajuste complementar 2026-07-16 - Aba Estatisticas da comunidade

- Pedido do usuario: criar uma aba de estatisticas da comunidade com contadores e graficos para seguidores, usuarios ativos, postagens por perfil/verificacao, respostas/comentarios por perfil/verificacao, denuncias, posts anonimos e novos usuarios ativos no periodo.
- O Admin de `/comunidades/[slug]?tab=estatisticas` agora possui aba propria **Estatisticas**, mobile-first, com filtros de periodo (**Esta semana**, **Este mes**, **Este ano**, **Todo o periodo** e **Personalizado**), cards de contadores e graficos responsivos/sem dependencia nova.
- Foi adicionado o endpoint real `GET /api/admin/private/communities/:id/statistics`, protegido por autenticacao Admin e implementado dentro do modulo existente de comunidades, sem criar dashboard paralelo.
- As metricas usam somente fontes reais: `community_member`, `community_post`, `post_reply`, `post_report` e `page_view_event` autenticado; psicologos verificados usam a regra canonica de entitlement/verificacao ja existente.
- Usuarios ativos sao usuarios autenticados que seguiram, publicaram, responderam/comentaram ou acessaram a comunidade/conteudos no periodo; novos usuarios ativos sao aqueles cuja primeira atividade real nessa comunidade ocorreu no periodo.
- Posts de pacientes respondidos por psicologos verificados sao contados quando o post de paciente do periodo recebeu ao menos uma resposta de psicologo verificado ate o fim do periodo.
- Nao houve package novo, mock, seed, backfill artificial, schema Prisma/migration ou captura de mensagens/consultas/WhatsApp.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o padrao local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e smoke sem sessao Admin de `GET /api/admin/private/communities/relacionamentos-com-proposito/statistics?period=month` retornando 401.

## Ajuste complementar 2026-07-16 - Segmentacao de Estatisticas da comunidade

- Pedido do usuario: mover a aba **Estatisticas** para depois de **Dados** e separar a leitura em **Estatisticas de pessoas** e **Estatisticas de conteudo**, seguindo o modelo de cards que exibem/ocultam curvas no grafico usado no detalhe de psicologos.
- A navegacao do detalhe Admin da comunidade agora ordena as abas como **Geral**, **Dados**, **Estatisticas**, **Conteudo**, **Ranking**, **Denuncias** e **Atividades**.
- A aba **Estatisticas** foi reorganizada em dois blocos mobile-first com contadores clicaveis e graficos SVG sem dependencia nova: pessoas e conteudo.
- **Estatisticas de pessoas** exibe somente Psicologos seguidores, Pacientes seguidores, Psicologos ativos, Pacientes ativos, Novos pacientes ativos e Novos psicologos ativos.
- **Estatisticas de conteudo** exibe somente Postagens de psicologos, Postagens de pacientes, Respostas de psicologos verificados, Respostas de psicologos nao verificados, Comentarios de pacientes e Denuncias.
- O endpoint real de estatisticas passou a retornar pontos diarios segmentados por papel/verificacao para alimentar as curvas de cada contador; as fontes continuam sendo `community_member`, `community_post`, `post_reply`, `post_report` e `page_view_event` autenticado.
- Nao houve package novo, mock, seed, schema Prisma/migration, endpoint paralelo ou alteracao destrutiva de dados.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o modelo local da aba **Estatisticas** de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e smoke sem sessao Admin de `GET /api/admin/private/communities/relacionamentos-com-proposito/statistics?period=month` retornando 401.

## Ajuste complementar 2026-07-16 - Filtro de data nos blocos de Estatisticas

- Pedido do usuario: em **Estatisticas de pessoas** e **Estatisticas de conteudo**, posicionar o filtro de data a direita do titulo do bloco.
- A UI Admin removeu o card de periodo separado do topo e passou a renderizar os mesmos controles reais de **Periodo**, **De** e **Ate** no cabecalho de cada bloco de estatisticas, alinhados a direita em desktop e empilhados no mobile.
- A primeira versao dos filtros no cabecalho compartilhava a mesma consulta real de estatisticas da comunidade; o ajuste complementar seguinte substitui esse comportamento por consultas independentes por bloco para que a troca de periodo nao recarregue o outro bloco.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Estatisticas** de psicologos.

## Ajuste complementar 2026-07-16 - Filtros sem resumo textual nem fundo destacado

- Pedido do usuario: remover o texto de resumo do periodo dentro dos blocos de estatisticas e remover o fundo azul atras dos campos de data.
- A UI Admin manteve os filtros no cabecalho direito de **Estatisticas de pessoas** e **Estatisticas de conteudo**, mas sem renderizar a linha de resumo textual do periodo e sem card/fundo destacado envolvendo os campos.
- O ajuste e exclusivamente visual, sem endpoint novo, contrato semantico, schema Prisma/migration, package, mock ou alteracao de persistencia.
- Validacao executada para o ajuste dos filtros: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e smoke sem sessao Admin de `GET /api/admin/private/communities/relacionamentos-com-proposito/statistics?period=month` retornando 401.

## Ajuste complementar 2026-07-16 - Periodos independentes nos blocos de Estatisticas

- Pedido do usuario: ao clicar para alterar o periodo de um bloco de estatisticas, recarregar somente os contadores e o grafico daquele bloco, sem recarregar a pagina inteira nem o outro bloco.
- A UI Admin passou a manter estado de periodo, intervalo customizado e query React Query independentes para **Estatisticas de pessoas** e **Estatisticas de conteudo**.
- Cada bloco continua usando o endpoint real `GET /api/admin/private/communities/:id/statistics`, mas com chave de cache propria conforme seus parametros de periodo.
- Durante uma troca de periodo, apenas o bloco afetado exibe carregamento/atualizacao e recalcula seus contadores e grafico; o outro bloco preserva filtros, contadores e serie temporal atuais.
- Nao houve endpoint paralelo, package novo, schema Prisma/migration, mock, seed ou alteracao de persistencia.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e smoke sem sessao Admin de `GET /api/admin/private/communities/relacionamentos-com-proposito/statistics?period=month` retornando 401.

## Ajuste complementar 2026-07-17 - Contadores de destaque na aba Geral

- Pedido do usuario: na aba geral da comunidade, adicionar contadores de destaque como os da aba geral do detalhe de psicologos, com **Posts de pacientes**, **Posts de Psicologos**, **Respostas de psicologos**, **Comentarios de pacientes** e **Denuncias**.
- A aba **Geral** de `/comunidades/[slug]` agora renderiza uma grade mobile-first de cinco cards no topo da aba, antes do resumo diario e da fila de urgencias.
- O endpoint real `GET /api/admin/private/communities/:id` foi expandido com `highlight_counters`, calculado a partir de `community_post`, `post_reply` e `post_report`, sem endpoint paralelo nem mock.
- Os contadores sao historicos da comunidade; o recorte diario permanece no bloco **Resumo da comunidade hoje** e a analise por periodo permanece na aba **Estatisticas**.
- Nao houve package novo, schema Prisma/migration, seed, backfill artificial, dados estimados ou uso de `<img>`.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia visual usada foi a captura enviada pelo usuario e o padrao local da aba **Geral** do detalhe administrativo de psicologos.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir backend build`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Ajuste complementar 2026-07-17 - Carrossel somente em Estatisticas de conteudo

- Pedido do usuario: os contadores de **Estatisticas de pessoas** devem ficar inteiros na largura util da tela, sem scroll horizontal; somente **Estatisticas de conteudo** deve ter carrossel horizontal, sem barra de rolagem visivel, mantendo os cards do mesmo tamanho dos contadores de pessoas, sem o texto "Contadores" e com setas junto aos cards sem encobrir os contadores selecionaveis.
- A UI Admin agora usa grade responsiva para **Estatisticas de pessoas** (`1/2/3/6` colunas conforme breakpoint), eliminando scroll horizontal nesse bloco.
- **Estatisticas de conteudo** permanece em carrossel horizontal por ter mais contadores, mas os cards usam as mesmas larguras responsivas dos contadores de pessoas.
- A barra horizontal nativa foi ocultada; a seta de retorno fica em uma coluna lateral junto ao primeiro card visivel e a seta de avanco fica em uma coluna lateral junto ao ultimo card visivel, em vez de ficarem acima ou sobre os contadores.
- O ajuste e exclusivamente visual/mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi o pedido do usuario e o padrao local dos contadores do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200.

## Ajuste complementar 2026-07-17 - Contencao de overflow horizontal em Estatisticas

- Pedido do usuario: explicar/remover a barra de rolagem horizontal visivel na tela de **Estatisticas** da comunidade.
- A causa era o overflow produzido pelo carrossel de **Estatisticas de conteudo**: os cards mantinham largura interna rolavel e as setas participavam do fluxo lateral, permitindo que o excedente fosse considerado pela pagina em vez de ficar contido no componente.
- O carrossel agora reserva gutters internos para as setas com posicionamento absoluto dentro da largura util, preservando a navegacao junto ao primeiro/ultimo card sem encobrir os contadores selecionaveis.
- A aba e os cards de estatisticas passaram a declarar `min-w-0` e contencao horizontal local, mantendo somente o scroller interno do carrossel e impedindo barra horizontal global da pagina.
- O ajuste e exclusivamente visual/mobile-first, sem endpoint novo, mock, package, schema Prisma/migration ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario e validacao local autenticada.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito?tab=estatisticas` retornando 200 e inspecao headless autenticada em 1920px confirmando `documentElement.scrollWidth === documentElement.clientWidth`.

## Ajuste complementar 2026-07-17 - Denúncias pendentes listadas individualmente na aba Geral

- Pedido do usuário: no bloco **Denúncias pendentes** da aba **Geral** do detalhe administrativo de comunidade, substituir o único card agregado **Conteúdos denunciados** por uma lista em que cada denúncia pendente aparece separadamente.
- O endpoint real `GET /api/admin/private/communities/:id` agora expõe `urgent_summary.pending_reports` com denúncias pendentes individuais derivadas de `post_report`, incluindo conteúdo denunciado, autor do conteúdo, denunciante, motivo e data de recebimento.
- `urgent_summary.pending_reports_count` passa a refletir a quantidade de denúncias pendentes individuais, não apenas a quantidade de conteúdos agrupados, para alinhar o badge da seção com os itens listados.
- A UI Admin renderiza cards mobile-first por denúncia pendente, com link para a aba **Denúncias**, sem criar endpoint paralelo, mock, package novo, schema Prisma/migration, seed ou alteração destrutiva de dados.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o padrão local do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

### Ajuste complementar 2026-07-17 - Copy compacta nos cards de denúncias pendentes

- Pedido do usuário: remover a linha **Motivo** dos cards de denúncias pendentes e trocar o badge superior de `N denúncias pendentes` para `N denúncias`.
- A UI Admin mantém o contrato real com motivo disponível para a aba **Denúncias**, mas a aba **Geral** exibe somente status, tipo do conteúdo, denunciante, autor e data de recebimento para reduzir ruído visual.
- O ajuste é exclusivamente apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.
## Ajuste complementar 2026-07-17 - Ultimos posts alinhados a Posts populares

- Pedido do usuario: em **Ultimos posts** da aba **Geral**, seguir o layout da lista **Posts mais populares**, encurtar o titulo, remover a descricao, refinar **Ver todos**, reduzir a coluna **Post**, adicionar **Comentarios** e tornar cada linha clicavel para abrir o post.
- A UI Admin passou a renderizar os ultimos posts em tabela mobile-first com colunas **Post**, **Autor**, **Comentarios** e **Data e hora**, usando o mesmo endpoint real de conteudo ja existente e sem contrato novo.
- A coluna **Post** ficou mais compacta e a previa da descricao permanece limitada a duas linhas com ellipsis visual (`line-clamp-2`).
- Cada celula da linha abre o `public_url` real do post em nova aba, mantendo a navegacao administrativa preservada; **Ver todos** continua levando para a aba **Conteudo**.
- O bloco manteve foto, nome, selo e papel do autor via componente existente, sem `<img>` cru, mock, package novo, schema Prisma/migration, endpoint paralelo ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario e o padrao local de **Posts mais populares**.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.
- Validacao executada: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend build`, `pnpm check` e smoke HTTP local `GET http://localhost:3002/comunidades/relacionamentos-com-proposito` retornando 200.

## Ajuste complementar 2026-07-17 - Ultimos posts sem previa

- Pedido do usuario: em **Ultimos posts**, remover a previa de descricao e centralizar o numero da coluna **Comentarios**.
- A UI Admin passou a exibir somente o titulo do post na coluna **Post**, com limite visual de duas linhas para preservar a tabela enxuta.
- O numero de comentarios e o skeleton da coluna foram centralizados, mantendo cada celula da linha clicavel para o `public_url` real do post.
- O ajuste e exclusivamente apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteracao de persistencia.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

## Ajuste complementar 2026-07-17 - Cards de denúncias pendentes sem metadados secundários

- Pedido do usuário: no card de denúncia pendente da aba **Geral**, remover as linhas **Denunciante**, **Autor** e **Recebida em**.
- A UI Admin mantém status, tipo do conteúdo, título e prévia do conteúdo denunciado; os metadados completos continuam disponíveis na aba **Denúncias**.
- O ajuste é exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.

## Ajuste complementar 2026-07-17 - Badge de denúncias em uma linha

- Pedido do usuário: manter a tag `N denúncias` do bloco **Denúncias pendentes** em apenas uma linha.
- A UI Admin passou a aplicar `whitespace-nowrap` e `shrink-0` no badge, preservando o texto compacto sem quebra visual.
- O ajuste é exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.

## Ajuste complementar 2026-07-17 - Data dos últimos posts abaixo do título

- Pedido do usuário: em **Últimos posts**, colocar **data e hora** abaixo do título do post.
- A UI Admin removeu a coluna separada **Data e hora** e passou a renderizar a data/hora na coluna **Post**, logo abaixo do título, mantendo autor e comentários nas demais colunas.
- O skeleton de carregamento foi alinhado ao novo formato da tabela e cada célula do post continua clicável para o `public_url` real.
- O ajuste é exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.

## Ajuste complementar 2026-07-17 - Cards de denúncias pendentes sem tag Pendente

- Pedido do usuário: nos cards vermelhos do bloco **Denúncias pendentes**, remover a tag **Pendente**.
- A UI Admin mantém somente a tag de tipo do conteúdo denunciado, como **Post de paciente** ou **Comentário de paciente**, já que o contexto da seção informa que todos os itens estão pendentes.
- O ajuste é exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.

## Ajuste complementar 2026-07-17 - Últimos posts com visualizações

- Pedido do usuário: em **Últimos posts**, deixar o botão **Ver todos** com fundo transparente e adicionar uma coluna **Visualizações** antes de **Comentários**.
- A UI Admin passou a renderizar as colunas **Post**, **Autor**, **Visualizações** e **Comentários**, usando `metrics.views_count` do contrato real já consumido pela aba **Conteúdo**.
- O botão **Ver todos** mantém o link para a aba **Conteúdo**, mas sem preenchimento de fundo no estado padrão; o skeleton foi alinhado à nova coluna.
- O ajuste é exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteração de persistência.

## Ajuste complementar 2026-07-17 - Cards de denuncias pendentes com conteudo direto

- Pedido do usuario: no bloco **Denuncias pendentes**, remover a copy de apoio abaixo do titulo, mostrar somente o titulo quando a denuncia for de post e, quando for comentario, remover o titulo generico **Comentario denunciado**.
- A UI Admin passa a renderizar o texto primario conforme o tipo do alvo: posts usam apenas o titulo do post; comentarios usam apenas o texto do comentario, limitado visualmente a duas linhas com ellipsis.
- Comentarios denunciados usam peso visual de descricao (text-xs, font-bold, text-muted), sem hierarquia de titulo, enquanto posts preservam o peso de titulo do card.
- O ajuste e exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteracao de persistencia.

## Ajuste complementar 2026-07-17 - Posts populares alinhados a ultimos posts

- Pedido do usuario: fazer o bloco **Posts mais populares** seguir o mesmo layout de **Ultimos posts**, trocando apenas **Visualizacoes** por **Upvotes**.
- A UI Admin passou a renderizar **Posts mais populares** com header e botao **Ver todos** iguais ao bloco de ultimos posts, tabela com colunas **Post**, **Autor**, **Upvotes** e **Comentarios**, data/hora abaixo do titulo e metricas centralizadas.
- Cada celula da linha abre o post publico real via `/community/{slug}/post/{id}`, preservando a navegacao administrativa e usando apenas dados reais do contrato `popular_posts`.
- O ajuste e exclusivamente visual/apresentacional, sem endpoint novo, schema Prisma/migration, package, mock ou alteracao de persistencia.

## Ajuste complementar 2026-07-18 - Contador de Acessos em Estatísticas de pessoas

- Pedido do usuário: em **Estatísticas de pessoas** da aba **Estatísticas** do detalhe Admin da comunidade, adicionar um contador **Acessos** na primeira posição.
- O endpoint real `GET /api/admin/private/communities/:id/statistics` agora retorna `counters.accesses.total` e `charts.daily[].accesses`, calculados por `page_view_event` do período filtrado para a comunidade e seus conteúdos relacionados.
- A consulta de `page_view_event` passou a preservar acessos anônimos e autenticados para o contador bruto de acessos; a regra de **usuários ativos** continua restrita a usuários autenticados com papel real `paciente` ou `psicologo`.
- A UI Admin renderiza o cartão **Acessos** como primeiro contador clicável de **Estatísticas de pessoas** e ajusta a grade mobile-first para acomodar 7 contadores no desktop sem scroll horizontal global.
- Não houve package novo, schema Prisma/migration, seed, backfill artificial, mock, endpoint paralelo ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o layout atual da aba **Estatísticas** da comunidade.
- ADR criado: `adrs/0282-contador-acessos-estatisticas-pessoas-comunidade.md`.

### Critério de aceite complementar

- [x] **Estatísticas de pessoas** exibe o contador **Acessos** na primeira posição, usando dados reais de `page_view_event`.

### Validação executada para este ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=estatisticas` retornou 200.
- Chrome headless local abriu a rota e confirmou o guard/shell Admin; sem sessão Admin reutilizável no perfil headless, a validação visual autenticada ficou limitada à captura enviada pelo usuário e ao build/check local.

## Ajuste complementar 2026-07-18 - Contador de Acessos na aba Geral

- Pedido do usuário: na aba **Geral** do detalhe Admin da comunidade, adicionar o contador **Acessos** na primeira posição, antes de **Posts de pacientes**.
- O endpoint real `GET /api/admin/private/communities/:id` agora inclui `highlight_counters.accesses_count`, calculado pelo total histórico de `page_view_event` da comunidade e de seus conteúdos relacionados já carregados no dataset real da comunidade.
- A UI Admin renderiza o card **Acessos** como primeiro contador de destaque da aba **Geral** e ajusta a grade mobile-first para 6 contadores no desktop.
- Não houve package novo, schema Prisma/migration, seed, backfill artificial, mock, endpoint paralelo ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o padrão atual da aba **Geral** de comunidades.
- ADR atualizado: `adrs/0282-contador-acessos-estatisticas-pessoas-comunidade.md`.

### Critério de aceite complementar

- [x] A aba **Geral** exibe o contador **Acessos** na primeira posição, antes de **Posts de pacientes**, usando dados reais de `page_view_event`.

### Validação executada para este ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica` retornou 200.
- `pnpm check`

## Ajuste complementar 2026-07-18 - Fallback zero para acessos sem eventos

- Pedido do usuário: quando não houver acessos no card **Acessos** da aba **Geral**, exibir `0` em vez de `NaN`.
- A UI Admin agora normaliza contadores com valor ausente, nulo, negativo ou não numérico para `0` antes da formatação, incluindo o card **Acessos** da aba **Geral** e os contadores clicáveis da aba **Estatísticas**.
- O ajuste é defensivo e apresentacional: mantém a fonte real `page_view_event`, não cria mock, seed, endpoint paralelo, schema Prisma/migration ou package novo.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`.

### Critério de aceite complementar

- [x] Quando a comunidade não possui eventos reais de acesso ou o campo vem ausente durante atualização/compatibilidade, o Admin exibe `0` no contador **Acessos**, nunca `NaN`.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica` retornou 200.
- `pnpm --dir admin check` foi executado como baseline e atingiu timeout após 124s no workspace atual; as validações direcionadas acima passaram sem erros.

## Ajuste complementar 2026-07-20 - Copy curta da Cobertura de acolhimento

- Pedido do usuário: alterar a descrição do bloco **Cobertura de acolhimento** de **Visão administrativa da resposta qualificada aos posts de pacientes no período selecionado.** para **Taxa de resposta qualificada aos posts de pacientes.**
- A UI Admin recebeu somente o ajuste de copy no bloco, sem alterar layout, dados reais, contrato, endpoint, schema Prisma/migration, package, seed, backfill, persistência ou preview local.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Estatísticas** da comunidade.
- ADR atualizado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] A descrição do bloco **Cobertura de acolhimento** usa a copy **Taxa de resposta qualificada aos posts de pacientes.**

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.

## Ajuste complementar 2026-07-19 - Horários de pico por dia da semana

- Pedido do usuário: no bloco **Horários de maior atividade** da aba **Estatísticas** de comunidade, permitir selecionar o gráfico por dia da semana, mantendo os cards de horários de pico como visão geral agregada de todos os dias da semana/período.
- O endpoint real `GET /api/admin/private/communities/:id/statistics` agora retorna `charts.hourly_activity_by_weekday`, com 7 grupos (`Dom` a `Sáb`) e 24 pontos horários por grupo, calculados das mesmas fontes reais já usadas em `charts.hourly_activity`.
- A UI Admin adiciona seletor **Todos**, **Seg**, **Ter**, **Qua**, **Qui**, **Sex**, **Sáb** e **Dom** acima do gráfico; a seleção altera somente as barras e o rótulo acessível do gráfico, sem texto auxiliar visível repetindo a seleção.
- Os três cards de pico continuam usando a agregação geral de `charts.hourly_activity`, somando todos os dias do período próprio de **Horários de maior atividade**.
- Nos cards de pico, acessos, conteúdos, interações e denúncias são exibidos na mesma linha compacta.
- O bloco passou a ter filtros próprios de **Período**, **De** e **Até**, independentes dos filtros de pessoas e conteúdo; os picos e o gráfico usam esse período próprio.
- No filtro próprio de horários, a opção **Hoje** foi removida e o default é **Todo o período**.
- A copy do bloco foi ajustada para: `Distribuição por hora das atividades na comunidade.`
- Não houve package novo, schema Prisma/migration, seed, backfill artificial, mock, endpoint paralelo ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Estatísticas** da comunidade.
- ADR criado/atualizado: `adrs/0284-horarios-maior-atividade-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] O gráfico de **Horários de maior atividade** permite selecionar **Todos** ou um dia da semana.
- [x] A seleção por dia muda somente o gráfico/legenda; os cards de pico permanecem gerais, agregando todos os dias do período.
- [x] O bloco não exibe texto auxiliar `Gráfico exibindo...`.
- [x] Cada card de pico mostra acessos, conteúdos, interações e denúncias na mesma linha.
- [x] O bloco possui filtro próprio de período/data e não depende do filtro de **Estatísticas de conteúdo**.
- [x] O filtro próprio do bloco não exibe **Hoje** e inicia em **Todo o período**.
- [x] A descrição do bloco usa a copy curta definida pelo produto.
- [x] Os dados por dia da semana são calculados no backend a partir de eventos reais, sem mock ou backfill.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx" "src/api/req/communities/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/communities/manage/DTOs/IAdminCommunityManageDTO.ts" "src/modules/api/admin/private/communities/manage/use-cases/services.ts"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real do service `showStatistics` para `autocuidado-em-pratica?period=all`, retornando `status=200`, `period=Todo o período`, `charts.hourly_activity.length=24`, `charts.hourly_activity_by_weekday.length=7`, `firstWeekdayHours=24` e soma total horária igual à soma por dia da semana.
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=estatisticas` retornou 200.

## Ajuste complementar 2026-07-20 - Ordem dos blocos da aba Estatisticas

- Pedido do usuario: alterar a ordem dos blocos da aba **Estatisticas** do detalhe administrativo de comunidade para **Estatisticas de conteudo**, **Cobertura de acolhimento**, **Horarios de maior atividade** e **Estatisticas de pessoas**.
- A UI Admin passou a renderizar primeiro o bloco de conteudo, depois o bloco de cobertura, depois o bloco de horarios e, por fim, o bloco de pessoas, preservando os filtros independentes, contadores, graficos, estados de carregamento e chamadas reais ja existentes.
- O ajuste e exclusivamente visual/mobile-first, sem endpoint novo, schema Prisma/migration, package, mock, seed, backfill artificial ou alteracao de persistencia.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario e o layout atual da aba **Estatisticas** de comunidades.
- ADR atualizado: `adrs/0284-horarios-maior-atividade-comunidade-admin.md`.

### Criterio de aceite complementar

- [x] A aba **Estatisticas** do detalhe Admin de comunidade exibe os blocos na ordem: **Estatisticas de conteudo**, **Cobertura de acolhimento**, **Horarios de maior atividade** e **Estatisticas de pessoas**.

### Validacao executada para este ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.

## Ajuste complementar 2026-07-20 - Cobertura de acolhimento em Estatísticas

- Pedido do usuário: na aba **Estatísticas** do detalhe Admin da comunidade, abaixo de **Estatísticas de conteúdo**, adicionar um bloco **Cobertura de acolhimento** com indicadores administrativos de posts de pacientes anônimos/identificados, resposta por psicólogos verificados e pendências de acolhimento.
- O endpoint real `GET /api/admin/private/communities/:id/statistics` passou a retornar `counters.care_coverage`, calculado com `community_post` e `post_reply` reais do período selecionado, sem mock, seed ou backfill.
- A regra de **Aguardando acolhimento** considera posts de pacientes do período que ainda não receberam resposta de psicólogo verificado até o fim do período; posts com respostas comuns continuam pendentes para a métrica qualificada.
- A UI Admin renderiza o bloco logo abaixo de **Estatísticas de conteúdo**, reutilizando o mesmo período/dados desse bloco e exibindo posts de pacientes, anônimos, identificados, respondidos por psicólogos verificados, aguardando acolhimento, tempo médio até a primeira resposta verificada e barra de taxa de cobertura.
- O bloco é mobile-first (`grid` 1 coluna na base, evoluindo para 2/3/6 colunas) e não foi exposto ao público nem aos psicólogos.
- Não houve package novo, schema Prisma/migration, endpoint paralelo, mock, seed, backfill ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário, `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e o layout atual da aba **Estatísticas** da comunidade.
- ADR criado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] A aba **Estatísticas** exibe o bloco **Cobertura de acolhimento** imediatamente abaixo de **Estatísticas de conteúdo**.
- [x] O bloco mostra posts de pacientes, anônimos, identificados, respondidos por psicólogos verificados, aguardando acolhimento e tempo médio até a primeira resposta verificada.
- [x] **Aguardando acolhimento** usa dados reais e exige resposta de psicólogo verificado para sair da fila qualificada.
- [x] Os indicadores usam o mesmo período filtrado de **Estatísticas de conteúdo**.
- [x] A UI permanece mobile-first e não usa `<img>` cru.
- [x] Nenhum mock, seed, backfill, package novo ou migration foi usado.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx" "src/api/req/communities/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/communities/manage/DTOs/IAdminCommunityManageDTO.ts" "src/modules/api/admin/private/communities/manage/use-cases/services.ts"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend exec tsc --noEmit --pretty false`

## Ajuste complementar 2026-07-20 - Refinamento visual da Cobertura de acolhimento

- Pedido do usuário: remover a frase-resumo **36 posts têm alguma resposta; 19 posts ainda precisam de acolhimento por psicólogo verificado.** da barra de taxa e melhorar o layout geral do bloco **Cobertura de acolhimento**, porque alguns textos estavam pequenos.
- A UI Admin removeu a frase-resumo abaixo da barra de taxa, preservando a métrica visual pela barra e o percentual.
- O bloco recebeu hierarquia tipográfica maior em título, descrição, cards, contadores, percentuais e descrições; os ícones e paddings também foram ampliados para melhorar leitura em desktop sem quebrar a base mobile-first.
- A análise integrada de **Posts de pacientes**, **Anônimos** e **Identificados** foi mantida, mas com cards internos mais espaçados e barra de distribuição mais legível.
- O ajuste é exclusivamente visual/apresentacional no Admin, sem endpoint novo, alteração backend, schema Prisma/migration, package, seed, backfill, persistência ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Estatísticas** da comunidade.
- ADR atualizado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] A frase-resumo abaixo da barra de **Taxa de cobertura por psicólogos verificados** foi removida.
- [x] O bloco **Cobertura de acolhimento** usa tipografia, ícones e espaçamentos maiores, mantendo layout mobile-first.
- [x] O ajuste não altera dados reais, endpoints, schema Prisma/migrations, produção ou a regra do preview local.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.

## Ajuste complementar 2026-07-20 - Preview local visual da Cobertura de acolhimento

- Pedido do usuário: remover a frase **Anônimos e identificados analisados como uma única base de acolhimento.** do card **Posts de pacientes** e exibir números de exemplo na **Cobertura de acolhimento** apenas para avaliação visual.
- A UI Admin removeu a frase do card principal, preservando a análise integrada por meio da distribuição visual entre **Anônimos** e **Identificados**.
- Como a base local da comunidade usada na validação está zerada, foi adicionada uma prévia visual exclusivamente local/de desenvolvimento (`NODE_ENV !== "production"`), aplicada somente quando todos os indicadores reais de cobertura retornam zero/nulo.
- A prévia é sinalizada com o marcador **Exemplo local**, não altera backend, contrato, persistência, seed, migration ou dados reais, e não é usada em build/produção nem quando existir qualquer dado real para o período.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Estatísticas** da comunidade.
- ADR atualizado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] O card **Posts de pacientes** não exibe mais a frase removida pelo usuário.
- [x] A **Cobertura de acolhimento** exibe números de exemplo somente em ambiente local/de desenvolvimento quando o retorno real está totalmente zerado, para avaliação visual.
- [x] A prévia visual é identificada como **Exemplo local** e não altera dados reais, endpoints, schema Prisma/migrations ou produção.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real do service `showStatistics` para `ansiedade-em-equilibrio?period=week`, retornando `status=200`, breakdown `anonymous/identified/total` em `counters.care_coverage.patient_posts_verified_response_breakdown` e `awaitingVerified=0` no dataset local.
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke real do service `showStatistics` para `ansiedade-em-equilibrio?period=week`, retornando `status=200`, `period=Esta semana`, `patientPosts=0`, `respondedByVerified=0`, `awaitingVerified=0`, `anyResponse=0` e `avgFirstVerifiedMinutes=null`.
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio?tab=estatisticas` retornou 200.
- Chrome headless local abriu a rota sem sessão administrativa e confirmou o guard/login; a validação visual autenticada ficou limitada à captura enviada pelo usuário, ao protótipo local e aos checks/builds.

## Ajuste complementar 2026-07-20 - Filtro próprio e breakdown da Cobertura de acolhimento

- Pedido do usuário: no bloco **Cobertura de acolhimento**, adicionar filtro próprio de período/data, mostrar nos contadores **Posts de pacientes**, **Anônimos** e **Identificados** a quantidade e taxa que foram respondidas por psicólogos verificados, e remover o contador separado **Respondidos por psicólogos verificados**.
- O contrato real `GET /api/admin/private/communities/:id/statistics` passou a retornar `counters.care_coverage.patient_posts_verified_response_breakdown`, com total e respondidos por psicólogos verificados para `total`, `anonymous` e `identified`, calculados a partir de `community_post` e `post_reply` reais.
- A UI Admin passou a usar uma query/filtro próprio para **Cobertura de acolhimento**, independente de **Estatísticas de conteúdo**, **Estatísticas de pessoas** e **Horários de maior atividade**.
- Os indicadores **Posts de pacientes**, **Anônimos** e **Identificados** foram integrados em uma única análise visual de base de posts de pacientes, com distribuição por anonimato/identificação, total e linha interna de `respondidos por psicólogos verificados (taxa%)`; o card separado de respondidos foi removido para reduzir duplicidade.
- A ordem visual final da aba ficou **Estatísticas de conteúdo**, **Cobertura de acolhimento**, **Horários de maior atividade** e **Estatísticas de pessoas**, preservando abordagem mobile-first.
- Não houve package novo, schema Prisma/migration, endpoint paralelo, mock, seed, backfill ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Estatísticas** da comunidade.
- ADR atualizado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] **Cobertura de acolhimento** possui filtro próprio de **Período**, **De** e **Até**.
- [x] **Posts de pacientes**, **Anônimos** e **Identificados** aparecem como uma única análise visual integrada e exibem total, quantidade respondida por psicólogos verificados e taxa de resposta verificada.
- [x] O contador separado **Respondidos por psicólogos verificados** foi removido.
- [x] O breakdown é calculado no backend a partir de posts e respostas reais, sem mock/backfill.
- [x] A UI permanece mobile-first e não usa `<img>` cru.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx" "src/api/req/communities/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/communities/manage/DTOs/IAdminCommunityManageDTO.ts" "src/modules/api/admin/private/communities/manage/use-cases/services.ts"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir backend exec tsc --noEmit --pretty false`

## Ajuste complementar 2026-07-20 - Conteúdo abre em Todo o período

- Pedido do usuário: na aba **Conteúdo** do detalhe administrativo da comunidade, abrir por padrão em **Todo o período** para que a listagem inicial seja coerente com os contadores totais de posts exibidos no topo e na lista de comunidades.
- A UI Admin passou a usar `contentPeriod=all` como fallback quando a URL não informa período. Parâmetros explícitos de URL, como `contentPeriod=week`, continuam sendo respeitados.
- O backend e o contrato real `GET /api/admin/private/communities/:id/content` não foram alterados; `Todo o período` segue sem recorte temporal no backend e os campos **De**/**Até** continuam apenas como referência visual para customização.
- Não houve package novo, schema Prisma/migration, endpoint paralelo, mock, seed, backfill, alteração destrutiva de dados ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o padrão local da aba **Conteúdo** do Admin.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

### Critérios de aceite complementares

- [x] A aba **Conteúdo** abre por padrão com **Período = Todo o período** quando a URL não informa `contentPeriod`.
- [x] A listagem inicial deixa de esconder posts antigos por filtro semanal implícito.
- [x] Parâmetros explícitos de período em URL continuam funcionando.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornou 200.

## Ajuste complementar 2026-07-20 - Hierarquia visual da lista de Conteúdo

- Pedido do usuario: na lista de conteudo da comunidade, substituir a tag `Post de psicólogo verificado` por **icone + Post** como no detalhe do post, trocar o icone de detalhe do post por um icone de analytics e remover o icone de excluir post.
- A UI Admin da aba **Conteudo** passou a renderizar posts com **FileText + Post**, mantendo a verificacao profissional apenas no selo azul do autor.
- A acao lateral de detalhe analitico passou a usar `BarChart3`, com texto acessivel de Analytics.
- O botao inline de exclusao/remocao foi removido dos cards da listagem; a remocao administrativa segue disponivel pelos fluxos operacionais de detalhe/moderacao existentes.
- O ajuste e visual/mobile-first, sem endpoint novo, schema Prisma/migration, package, mock, seed, backfill, alteracao de persistencia ou uso de `<img>` cru.
- Builder/Quick Copy nao esta exposto como ferramenta callable no ambiente; a referencia usada foi a captura enviada pelo usuario, o screenshot local headless e `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`.
- ADR atualizado: `adrs/0264-admin-comunidade-abas-conteudo-ranking.md`.

### Criterios de aceite complementares

- [x] Posts na lista da aba **Conteudo** exibem **icone + Post** no cabecalho, sem a tag textual longa `Post de psicólogo verificado`.
- [x] A acao de detalhe analitico da lista usa icone de analytics.
- [x] O icone/botao de excluir post nao aparece mais nos cards da listagem.
- [x] O ajuste nao altera dados reais, endpoints, schema Prisma/migrations, packages ou producao.

### Validacao executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local `GET http://localhost:3002/comunidades/autocuidado-em-pratica?tab=conteudo` retornou 200.
- Chrome headless local abriu a rota com perfil temporario e confirmou o guard/login administrativo; a validacao visual autenticada ficou limitada a captura enviada pelo usuario e ao prototipo local porque a sessao Admin real nao fica disponivel no perfil headless isolado.

## Ajuste complementar 2026-07-20 - Cobertura simplificada na aba Geral

- Pedido do usuário: na aba **Geral** do detalhe administrativo da comunidade, adicionar entre **Denúncias pendentes** e **Top mentores** um bloco simplificado de **Cobertura da comunidade**, mostrando quantos posts de pacientes estão sem cobertura.
- A UI Admin passou a renderizar o bloco na coluna lateral da aba **Geral**, logo abaixo de denúncias pendentes e antes de top mentores.
- O bloco usa o endpoint real já existente `GET /api/admin/private/communities/:id/statistics` com `period=all` e lê `counters.care_coverage.patient_posts_awaiting_verified_psychologist_response`, sem mock, seed, backfill, endpoint paralelo ou alteração de persistência.
- A regra permanece consistente com a cobertura qualificada da aba **Estatísticas**: um post de paciente está sem cobertura enquanto não recebeu resposta de psicólogo verificado.
- O bloco é mobile-first, exibe total de posts de pacientes, quantidade já respondida por psicólogos verificados, taxa de cobertura e link para a cobertura completa em **Estatísticas**.
- Não houve package novo, schema Prisma/migration, alteração backend ou uso de `<img>` cru.
- Builder/Quick Copy não está exposto como ferramenta callable no ambiente; a referência usada foi a captura enviada pelo usuário e o layout atual da aba **Geral** de comunidades.
- ADR atualizado: `adrs/0289-cobertura-acolhimento-estatisticas-comunidade-admin.md`.

### Critérios de aceite complementares

- [x] A aba **Geral** exibe o bloco **Cobertura da comunidade** entre **Denúncias pendentes** e **Top mentores**.
- [x] O bloco mostra quantos posts de pacientes estão sem cobertura no período **Todo o período**.
- [x] A métrica usa dados reais de `counters.care_coverage`, sem mock, seed, backfill ou endpoint paralelo.
- [x] A UI permanece mobile-first e não usa `<img>` cru.

### Validação executada para este ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/comunidades/[slug]/client.tsx"`
- `pnpm --dir admin exec tsc --noEmit --pretty false`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke real do service `showStatistics` para `ansiedade-em-equilibrio?period=all`, retornando `status=200`, `period=Todo o período`, `patientPosts=1`, `respondedByVerified=0` e `awaitingCoverage=1`.
- Smoke HTTP local `GET http://localhost:3002/comunidades/ansiedade-em-equilibrio` retornou 200.
- Validação visual autenticada ficou limitada à captura enviada pelo usuário e à rota local em execução; uma tentativa de abrir/controlar o Chrome pela automação foi bloqueada pela política do ambiente.
