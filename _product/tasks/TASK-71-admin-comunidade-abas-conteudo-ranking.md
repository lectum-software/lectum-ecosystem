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
