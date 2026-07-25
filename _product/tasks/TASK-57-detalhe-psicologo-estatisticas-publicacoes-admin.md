# TASK-57: Detalhe administrativo do psicólogo — Estatísticas e publicações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-57 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-55 |
| ADR alvo | ADR se houver nova decisão sobre métricas indisponíveis, vídeo ou atribuição |

## Contexto

As abas "Estatísticas" e "Publicações" usam como referências:

- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.

Muitos dados já existem por eventos de perfil, vídeo, WhatsApp, favoritos e comunidade. Métricas de busca/visualizações detalhadas só podem aparecer se houver tracking real.

## Objetivo

Exibir estatísticas de negócio/comunidade e publicações do psicólogo com dados reais, sem inventar métricas de busca ou visualização.

## Escopo frontend

- Implementar abas:
  - Estatísticas;
  - Publicações.
- Estatísticas:
  - visualizações de perfil;
  - cliques WhatsApp;
  - favoritos;
  - vídeo de apresentação com retenção quando real;
  - posts/respostas/salvamentos/comentários recebidos;
  - comunidades em que participa.
- Publicações:
  - filtros por comunidade, tipo e período;
  - cards de totais;
  - lista paginada de posts/respostas;
  - métricas de upvotes/downvotes/comentários/visualizações/salvamentos/compartilhamentos quando reais.

## Escopo backend

- Endpoints admin privados:
  - `GET /api/admin/private/psychologists/:id/statistics`;
  - `GET /api/admin/private/psychologists/:id/publications`.
- Usar dados reais de:
  - `profile_view_event`;
  - `profile_video_watch_session`;
  - `contact_request`;
  - `psychologist_favorite`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`;
  - `post_reply_save`;
  - `post_share`;
  - `page_view_event` apenas se TASK-49 já estiver disponível e confiável.

## Fora do escopo

- Editar ou remover publicações.
- Moderar conteúdo.
- Criar tracking novo.
- Exibir resultados de busca sem fonte real.

## Critérios de aceite

- [x] Abas só abrem para admin autenticado.
- [x] Estatísticas usam dados reais.
- [x] Métricas indisponíveis aparecem como indisponíveis ou são omitidas.
- [x] Publicações vêm de `community_post`/`post_reply` reais.
- [x] Filtros e paginação funcionam.
- [x] Vídeo usa `next/image`/player existente; nenhum `<img>` cru.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Imagens de referência foram citadas.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.


## Execução

- Implementados endpoints privados Admin `GET /api/admin/private/psychologists/:id/statistics` e `GET /api/admin/private/psychologists/:id/publications` com dados reais existentes.
- A aba **Estatísticas** exibe visualizações de perfil, cliques WhatsApp, favoritos, métricas de vídeo quando disponíveis, participação em comunidades e lista métricas sem tracking como indisponíveis.
- A aba **Publicações** exibe totais, filtros por comunidade/tipo/período, paginação e lista somente leitura de posts/respostas reais.
- Referências visuais usadas: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`; Builder/Quick Copy não estava disponível no ambiente.
- ADR criado: `adrs/0237-admin-psicologo-estatisticas-publicacoes.md`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, API local autenticada e browser local via Edge/CDP nas abas `estatisticas` e `publicacoes`.

### Correção pós-validação em 2026-07-11

- Ativado o contador **Resultados de busca** na aba Admin **Estatísticas** com tracking real de impressão do psicólogo quando o card/slide fica ativo na listagem pública.
- A persistência reaproveita `profile_view_event.source="search_result"` e preserva `source="profile_page"` para aberturas reais do perfil, sem criar mock, seed ou estimativa.
- O endpoint `POST /api/private/directory/psychologists/:id/search-impression` usa `optionalAuth`, não dispara notificação de visualização de perfil e ignora autoimpressão do próprio psicólogo.
- As métricas existentes de visualização de perfil passaram a filtrar `source="profile_page"` para não misturar resultados de busca com visitas ao perfil.
### Correção visual em 2026-07-12

- O título **Estatísticas de comunidade** foi movido para fora do card branco, seguindo o padrão visual de **Estatísticas de negócio**.
- A seção de comunidade passou a ter seu próprio filtro de período e datas à direita do título.
- Os filtros de negócio/vídeo e comunidade são independentes: alterar o período da comunidade não altera o período de negócio.
- A implementação reaproveita o endpoint real de estatísticas em duas queries separadas, sem alterar contrato backend e sem mock.
- Referência visual consultada: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`; Builder/Quick Copy não estava disponível como ferramenta callable no ambiente.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless via Edge/CDP em `http://localhost:3012/psicologos/demo-psychologist-marina-rocha?tab=estatisticas` com admin temporário real removido ao final, confirmando título fora do card e filtros independentes.


### Correção UX em 2026-07-12

- A troca de período/data em **Estatísticas** deixou de substituir a aba inteira pelo skeleton global.
- As queries de estatísticas mantêm o último resultado visível durante a busca da nova janela (`placeholderData`), evitando recarregar títulos, filtros e a seção não afetada.
- O feedback de carregamento agora fica restrito à seção em atualização: **Estatísticas de negócio** ou **Estatísticas de comunidade** exibem o estado `Atualizando` enquanto preservam os dados anteriores.
- Os filtros continuam independentes: alterar negócio/vídeo não altera comunidade, e alterar comunidade não altera negócio/vídeo.
- A implementação usa o endpoint real Admin de estatísticas, sem mock, sem seed e sem alteração de contrato backend.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless via Edge/CDP com atraso controlado nas requisições de estatísticas, confirmando que a aba permaneceu renderizada e que apenas a seção afetada exibiu `Atualizando`.

### Correção visual e comparativa em 2026-07-12

- Restaurada a hierarquia visual do protótipo da aba **Estatísticas**: os contadores **Visualizações de perfil**, **Resultados de busca**, **Cliques no WhatsApp** e **Favoritados** voltaram a ser cards/KPIs com ícone, valor e comparação, em vez de pílulas compactas.
- O gráfico de negócio permanece controlável por esses cards acessíveis (`aria-pressed`), mas a leitura primária volta a ser o KPI conforme `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- O contrato real `GET /api/admin/private/psychologists/:id/statistics` passou a retornar o período anterior e comparações reais para contadores de negócio e métricas do vídeo, calculadas com a janela imediatamente anterior ao filtro aplicado.
- As métricas do vídeo (**Visualizações**, **Taxa de replays** e **Retenção média**) exibem crescimento/queda contra o período anterior sem expor dados sensíveis e sem estimativa.
- A proporção da seção **Análises do vídeo de apresentação** foi ajustada para reduzir o peso do preview do vídeo e dar mais espaço horizontal ao gráfico de retenção.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; a correção usou o PNG local da aba **Estatísticas** e o recorte atual fornecido pelo usuário.
- Validações executadas em worktree limpo com apenas esta correção aplicada: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check` e `pnpm check`.

### Refinamento visual em 2026-07-12

- Corrigido o overflow de texto nos cards de contadores da aba **Estatísticas** com largura útil maior no bloco de negócio, cards com conteúdo contido, labels/comparativos quebrando linha dentro do botão e remoção dos ícones internos para ampliar a área útil do texto.
- Removido o rótulo visível **Retenção do vídeo** da seção de vídeo, preservando somente o gráfico.
- Os comparativos passaram a exibir datas no formato curto `dd/mm - dd/mm`, sem ano, para reduzir ruído visual.
- Validações executadas em worktree limpo com apenas esta correção aplicada: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `/psicologos/test-id?tab=estatisticas`.

### Complemento comunidades em 2026-07-12

- O bloco **Comunidades em que participa** da aba **Estatísticas** passou a exibir avatar real de `community.avatar_url`, nome real de `community.name`, coluna **Membro desde** baseada em `community_member.createdAt` e coluna **Ranking** derivada do ranking real de mentores por comunidade.
- A UI foi reestruturada em layout mobile-first: em ~390px cada comunidade fica empilhada com rótulos por campo; no desktop a leitura vira grade com colunas **Comunidade**, **Membro desde**, **Posts**, **Respostas** e **Ranking**.
- O ranking exibe somente a posição `Top #N` do psicólogo no ranking real de Top Mentores da comunidade; quando o psicólogo não é elegível ou não há sinal persistido suficiente, mostra **Sem ranking**, sem estimativa ou mock.
- O helper de ranking de mentores foi alinhado para considerar compartilhamentos persistidos (`post_share`) na pontuação derivada usada como sinal de ranking.
- Ajuste posterior: o Admin passou a resolver `/community/icons/*` pelo backend para exibir os avatares reais do catálogo de comunidades, e o layout desktop ganhou mais espaçamento entre **Posts**, **Respostas** e **Ranking**.
- Não houve alteração de Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; foram usados o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e o recorte enviado pelo usuário.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, smoke HTTP em `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` e chamada direta do service `showAdminPsychologistStatistics` para confirmar `avatar_url`, `name`, `member_since` e `ranking` no contrato.
- Validação do ajuste posterior: `pnpm --dir backend check`, `pnpm --dir admin check`, `pnpm --dir admin build`, smoke HTTP local `200` em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` e chamada direta do service confirmando avatar/nome reais em comunidade de catálogo; `pnpm --dir backend build` ficou bloqueado por erros TypeScript preexistentes no módulo Admin de denúncias/feedback.

### Complemento regra de Membro desde em 2026-07-12

- A regra de produto de **Membro desde** foi consolidada como data histórica fixa: a primeira vez que o usuário segue/entra na comunidade ou a primeira participação real por post/resposta quando ainda não havia vínculo.
- Posts e respostas agora garantem a criação/reativação do `community_member` real na mesma transação, sem recalcular `createdAt` quando o vínculo já existe.
- A leitura Admin usa a menor data real entre `community_member.createdAt`, primeiro post e primeira resposta do psicólogo na comunidade, cobrindo bases legadas sem inventar data.
- Migration de dados criada para backfill de `community_member` a partir de posts/respostas já existentes e recálculo de `community.members_count`.


### Complemento filtro de comunidade e ranking em 2026-07-12

- A secao **Estatisticas de comunidade** ganhou filtro de **Comunidade** com valor padrao **Todas**, sem alterar os filtros independentes de periodo/data de negocio e comunidade.
- O endpoint real `GET /api/admin/private/psychologists/:id/statistics` passou a aceitar `community` opcional para recalcular posts, respostas, votos, salvamentos, compartilhamentos, comentarios recebidos e serie temporal apenas da comunidade selecionada.
- O contador **Ranking do psicologo** foi adicionado aos cards da secao: com **Todas** selecionado, a UI informa que e preciso escolher uma comunidade especifica; com comunidade selecionada, exibe a posicao real `#N` quando houver ranking de mentor persistido/derivado e mostra indisponibilidade honesta quando nao houver posicao.
- A lista **Comunidades em que participa** respeita o filtro selecionado na UI, mantendo dados reais de avatar, nome, membro desde, posts, respostas e ranking, sem estimativa ou mock.
- Nao houve alteracao em Prisma schema ou migrations nesta correcao; a migration ja presente no workspace pertence ao complemento anterior de backfill de membros.
- Builder/Quick Copy nao estava disponivel como ferramenta callable no ambiente; foram usados o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png` e o recorte atual fornecido pelo usuario.
- Validacoes executadas para este complemento: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `pnpm --dir backend db:migrate` e `pnpm --dir backend exec prisma migrate status`.
- Validacao funcional direta do service `showAdminPsychologistStatistics`: com `community=all`, o card `ranking` retornou indisponibilidade honesta; com uma comunidade real selecionada, os contadores de comunidade foram recalculados para a comunidade filtrada sem expor dados sensiveis.
- Smoke HTTP local: Admin `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou 200; API Admin sem sessao retornou 401, preservando autenticacao real.

### Ajuste visual do carregamento de comunidade em 2026-07-12

- O indicador `Atualizando` de **Estatisticas de comunidade** agora usa espaco reservado no bloco do titulo e posicionamento absoluto, evitando deslocar os filtros de **Comunidade**, **Periodo**, **De** e **Ate** durante o carregamento/refetch.
- Os filtros da secao permanecem no mesmo grid do cabecalho e usam `lg:flex-nowrap` em desktop para nao mudar de linha enquanto a query de comunidade esta carregando.
- Validacoes executadas para este ajuste: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

### Remocao do bloco de comunidades em 2026-07-12

- O bloco visual **Comunidades em que participa** foi removido da aba **Estatisticas**, mantendo apenas os cards, grafico e filtro de comunidade da secao.
- O contrato real continua retornando as comunidades do psicologo para popular o filtro **Comunidade**; nenhum mock, endpoint paralelo ou alteracao de banco foi adicionada.
- Validacoes executadas para este ajuste: `pnpm --dir admin check`, `pnpm --dir admin build` e smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

### Alinhamento da retenção de vídeo com Analytics do psicólogo em 2026-07-13

- O gráfico Admin de **Análises do vídeo de apresentação** foi alinhado à regra do Analytics do psicólogo: vídeo atual do perfil, sessões reais reproduzidas, exclusão de autoações e buckets de retenção de 5% com fallback para marcos legados.
- A retenção média no Admin passa a seguir a mesma semântica do psicólogo: tempo médio assistido dividido pela duração do vídeo.
- O contrato Admin de estatísticas foi ampliado com `duration_seconds`, `average_watch_seconds` e `retention_dropoff` para renderizar a curva contínua estimada e o maior trecho de queda sem expor dados sensíveis.
- A visualização do Admin agora desenha a curva contínua estimada de 100% até 0% no fim do eixo, com playhead sincronizado ao miniplayer, como no painel do psicólogo.
- Não houve alteração de Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; foram usados o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e o recorte atual enviado pelo usuário.
- Validações executadas para este ajuste: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, chamada direta do service `showAdminPsychologistStatistics` confirmando 20 pontos de retenção e smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornando 200.

### Ajuste visual das setas em Estatísticas de negócio em 2026-07-18

- As setas laterais de navegação foram removidas apenas do carrossel de cards da seção **Estatísticas de negócio**, pois os cards principais não precisam de controle manual no desktop e continuam navegáveis por rolagem horizontal/gesto em telas menores.
- O componente compartilhado manteve suporte opcional à navegação por setas para outras seções que ainda possam precisar do controle.
- Não houve alteração de contrato backend, dados, Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; foram usados o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e o recorte atual enviado pelo usuário.
- Validações executadas para este ajuste: `pnpm --dir admin check`, `pnpm check`, `pnpm --dir admin build` e browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`, confirmando `0` setas em **Estatísticas de negócio** e preservação das setas opcionais em **Estatísticas de comunidade**.

### Ajuste de largura útil dos contadores de negócio em 2026-07-18

- Os cards/KPIs da seção **Estatísticas de negócio** passaram a usar uma largura desktop específica para 5 colunas, consumindo a largura útil do bloco depois da remoção das setas laterais.
- O comportamento mobile-first foi preservado: 1 card por vez em telas estreitas, 2 colunas em `sm`, 3 colunas em `lg` e 5 colunas apenas em `xl+`.
- O componente compartilhado de contadores recebeu classe opcional por item; o layout padrão continua inalterado para outros carrosséis, incluindo **Estatísticas de comunidade**.
- Não houve alteração de contrato backend, dados, Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; foram usados o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e o recorte atual enviado pelo usuário.
- Validações executadas para este ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`, confirmando 5 cards visíveis em **Estatísticas de negócio**, sem setas, com a última borda alinhada à largura útil da seção.

### Complemento comunidades ativas em 2026-07-20

- O bloco **Estatísticas de comunidade** removeu os contadores contextuais **Ranking**, **Segue a comunidade**, **Cobertura** e **Comunidades mais ativas**; os cards do bloco principal agora ficam restritos aos contadores que desenham curva no gráfico.
- Foi adicionado o bloco **Comunidades ativas** entre **Estatísticas de comunidade** e **Horários mais ativos**, com comunidades onde o psicólogo teve ao menos um post ou resposta real no período.
- A lista é ordenada da comunidade mais ativa para a menos ativa pela soma real de posts e respostas do psicólogo; empates usam o nome da comunidade.
- Cada comunidade ativa exibe identidade real da comunidade, se o psicólogo segue ou não segue, ranking real na comunidade e cobertura de posts de pacientes.
- **Cobertura** usa posts de pacientes publicados no período e respostas reais do psicólogo no mesmo período, contando cada post de paciente no máximo uma vez.
- O contrato Admin real `GET /api/admin/private/psychologists/:id/statistics` foi enriquecido em `community.communities[]` com `following` e `coverage`, mantendo ranking no item da comunidade e sem criar endpoint paralelo.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; foram usados o recorte enviado pelo usuário e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- ADR atualizado: `adrs/0290-admin-psicologo-comunidade-resumo-cobertura.md`.
- Validações executadas: Biome direcionado nos arquivos alterados de Admin/Backend, ESLint direcionado no arquivo Admin alterado, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin build`, chamada direta do service `showAdminPsychologistStatistics` e smoke HTTP local em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`.
- Observação: `pnpm --dir admin check` e `pnpm check` foram tentados, mas ficaram bloqueados por alterações paralelas não relacionadas em pacientes; elas não fazem parte deste ajuste.


### Ajuste visual da ordem de mídia em Publicações em 2026-07-20

- Na aba **Publicações**, quando um post ou resposta possui mídia, a descrição/texto agora é renderizada antes da mídia e a mídia fica abaixo do texto em todos os breakpoints.
- O layout lado a lado desktop entre mídia e descrição foi removido para preservar a hierarquia solicitada; no mobile (~390px) a ordem continua descrição primeiro, mídia abaixo.
- O renderer existente de mídia foi reaproveitado, mantendo `next/image` para imagens e o miniplayer atual para vídeos; nenhum `<img>` cru foi adicionado.
- Não houve alteração de backend, API, Prisma schema, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; a validação visual usou o recorte enviado pelo usuário e o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.
- ADR atualizado: `adrs/0237-admin-psicologo-estatisticas-publicacoes.md`.
- Validações executadas para este ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=publicacoes`, com admin temporário real removido ao final, confirmando no desktop 1365px e no mobile 390px que a mídia aparece depois da descrição no DOM e visualmente abaixo dela.


### Refinamento visual e filtro de Comunidades ativas em 2026-07-20

- O bloco **Comunidades ativas** foi reestruturado como uma tabela mais sóbria com colunas de comunidade, interações, posts, respostas, status de seguimento, ranking e cobertura.
- O bloco ganhou filtro próprio de **Período**, **De** e **Até**, independente do filtro de comunidade do gráfico de **Estatísticas de comunidade** e do filtro de **Horários mais ativos**.
- A lista passou a usar uma query real separada do endpoint Admin de estatísticas, sem criar endpoint paralelo, para recalcular as comunidades ativas pelo período/data escolhidos no próprio bloco.
- O feedback **Atualizando** fica restrito ao bloco de **Comunidades ativas** durante refetch, preservando os dados anteriores por `placeholderData` do hook existente.
- A implementação permanece mobile-first: em telas estreitas a tabela fica em rolagem horizontal controlada dentro do card; em desktop usa a largura disponível de forma sóbria.
- Não houve alteração de backend, API, Prisma schema, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` não foi necessário.
- Builder/Quick Copy não estava disponível como ferramenta callable no ambiente; a validação visual usou o recorte enviado pelo usuário e o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- ADR atualizado: `adrs/0290-admin-psicologo-comunidade-resumo-cobertura.md`.
- Validações executadas para este ajuste: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check`.
- Validação de browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`: desktop 1365px confirmou tabela com 7 colunas e filtro próprio `active-communities-statistics-*`; mobile 390px confirmou rolagem horizontal controlada da tabela. Admin temporário real criado para validação foi removido ao final.

### Ajuste da tabela de Comunidades ativas em 2026-07-20

- Pedido do usuario: no bloco **Comunidades ativas**, substituir o slug exibido abaixo do nome da comunidade pelo total real de **acoes no periodo**, remover a coluna **Interacoes** e centralizar os dados das colunas restantes.
- A implementacao preserva a regra de dados reais: o total de acoes no periodo continua sendo `posts + respostas` do psicologo para aquela comunidade e periodo filtrado, sem mock, seed ou alteracao de contrato.
- A tabela permanece mobile-first com rolagem horizontal controlada em telas estreitas; em desktop, posts, respostas, status, ranking e cobertura ficam centralizados.
- Nao houve alteracao de backend, API, Prisma schema, migrations, packages ou endpoints; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava disponivel como ferramenta callable no ambiente; a validacao visual usou o recorte enviado pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR atualizado: `adrs/0290-admin-psicologo-comunidade-resumo-cobertura.md`.
- Validacoes executadas para este ajuste: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check`.
- Validacao de browser local/headless via Chrome/CDP em desktop 1365px e mobile 390px confirmou cabecalhos `Comunidade`, `Posts`, `Respostas`, `Status`, `Ranking` e `Cobertura`, ausencia da coluna **Interacoes**, sublinha `1 acao no periodo` abaixo do nome e alinhamento central dos dados das colunas.

### Ajuste visual do cabecalho de Publicacoes em 2026-07-20

- Na aba **Publicacoes**, o card branco que envolvia o titulo, o texto **Mostrando X de X registros**, o filtro **Ordenar**, a lista e a paginacao foi removido.
- O titulo, o contador e o filtro de ordenacao agora ficam diretamente sobre o fundo da pagina; o seletor de ordenacao tambem deixou de ter preenchimento branco proprio, preservando borda e foco acessiveis.
- Somente os blocos/cards individuais de publicacao mantem `bg-surface` branco, como solicitado, preservando a hierarquia mobile-first e a leitura dos conteudos reais.
- Nao houve alteracao de backend, API, Prisma schema, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava disponivel como ferramenta callable no ambiente; a validacao visual usou o recorte enviado pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Publicacoes.png`.
- ADR atualizado: `adrs/0237-admin-psicologo-estatisticas-publicacoes.md`.
- Validacoes executadas para este ajuste: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=publicacoes` com admin temporario real removido ao final. O browser confirmou em desktop 1365px e mobile 390px: cabecalho da secao transparente, filtro **Ordenar** transparente e primeiro card de publicacao em branco (`bg-surface`).

### Ajuste da copy de status em Comunidades ativas em 2026-07-21

- Pedido do usuario: na coluna **Status** do bloco **Comunidades ativas**, trocar os textos **Segue** e **Nao segue** por **Seguindo** e **Nao seguindo**.
- A alteracao e apenas de copy/rotulo visual sobre o booleano real `community.following`; nao houve alteracao de contrato, backend, schema, migration, endpoint, mock ou seed.
- A tabela permanece mobile-first e preserva os dados reais e a centralizacao das colunas ajustadas anteriormente.
- Builder/Quick Copy nao estava disponivel como ferramenta callable no ambiente; a validacao visual usou o recorte enviado pelo usuario e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR atualizado: `adrs/0290-admin-psicologo-comunidade-resumo-cobertura.md`.
- Validacoes executadas para este ajuste: `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin exec eslint "src/app/(admin)/psicologos/[id]/client.tsx"`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` (reexecutado com sucesso apos timeout inicial) e browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` com admin temporario real removido ao final. O browser confirmou em desktop 1365px e mobile 390px: coluna **Status** exibindo **Seguindo** ou **Nao seguindo**, ausencia da copy antiga **Segue**/**Nao segue**, ausencia da coluna **Interacoes** e alinhamento central da coluna **Status**.

## Ajuste pos-feedback 2026-07-21 - Diagnostico de Engajamento nas Comunidades ativas

- Pedido do usuario: chamar o indicador de **Diagnostico de Engajamento**, usando os rotulos **Muito ativo**, **Ativo**, **Pouco ativo** e **Sem base**, separar **Upvotes** e **Downvotes** e nao exibir comunidades sem atividade real no periodo.
- O bloco **Comunidades ativas** do psicologo agora considera atividade real como post, resposta, upvote ou downvote realizado pelo psicologo na comunidade durante o periodo filtrado; comunidades apenas seguidas e sem acao real nao aparecem.
- A tabela passou a separar **Upvotes** e **Downvotes** para expor o habito de incentivo/desincentivo feito pelo psicologo dentro da comunidade.
- O endpoint real `GET /api/admin/private/psychologists/:id/statistics` foi expandido em `communities.items[]` com `upvotes`, `downvotes`, `interactions` e `engagement_diagnosis`, sem endpoint paralelo, mock, seed, backfill artificial, schema Prisma, migration ou package novo.
- A regra compartilhada de diagnostico foi centralizada em `backend/src/utils/admin-community-engagement-diagnosis.ts` e documentada no ADR-0300.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario em 2026-07-21 e `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR criado: `adrs/0300-diagnostico-engajamento-comunidades-admin.md`.

### Criterios de aceite do ajuste

- [x] Comunidades sem post, resposta, upvote ou downvote real do psicologo no periodo nao aparecem em **Comunidades ativas**.
- [x] A tabela mostra **Upvotes** e **Downvotes** separados.
- [x] A tabela mostra **Diagnostico de Engajamento** com **Muito ativo**, **Ativo**, **Pouco ativo** ou **Sem base**.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

### Validacao complementar executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.
- Service local: `showAdminPsychologistStatistics({ id: "cmrgztri7000tn0uh1q4n8vxf", period: "all" })` retornou `upvotes`, `downvotes`, `interactions` e `engagement_diagnosis` por comunidade com atividade real.

### Ajuste visual da tabela de Comunidades ativas em 2026-07-21

- Pedido do usuario: na tabela **Comunidades ativas** do psicologo, remover as colunas **Upvotes** e **Downvotes**, encurtar **Diagnostico de Engajamento** para **Engajamento**, mover a tag **Seguindo**/**Nao seguindo** para junto do nome da comunidade e ordenar as colunas como **Comunidade**, **Ranking**, **Posts**, **Respostas**, **Cobertura** e **Engajamento**.
- A alteracao e somente de apresentacao no Admin; o contrato real continua preservando `upvotes`, `downvotes`, `interactions` e `engagement_diagnosis` para diagnostico e compatibilidade, sem endpoint paralelo ou dado artificial.
- A tabela permanece mobile-first com rolagem horizontal controlada em telas estreitas e menos largura minima no desktop por ter menos colunas.
- Nao houve alteracao de backend, API, Prisma schema, migrations, packages, mocks, seeds ou dados artificiais; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a validacao visual usou o screenshot enviado pelo usuario em 2026-07-21 e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR atualizado: `adrs/0300-diagnostico-engajamento-comunidades-admin.md`.

#### Criterios de aceite do ajuste

- [x] Colunas **Upvotes** e **Downvotes** nao aparecem na tabela de comunidades ativas do psicologo.
- [x] A coluna de diagnostico aparece como **Engajamento**.
- [x] A tag **Seguindo**/**Nao seguindo** aparece junto ao nome da comunidade, sem coluna propria de status.
- [x] A ordem das colunas e **Comunidade**, **Ranking**, **Posts**, **Respostas**, **Cobertura** e **Engajamento**.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

#### Validacao complementar executada

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` retornou `200`.

### Ajuste pos-feedback 2026-07-22 - Distribuicao de formatos em Posts e Respostas

- Pedido do usuario: entre **Comunidades ativas** e **Horarios de maior atividade**, adicionar duas colunas com dois blocos, um de **Posts** e outro de **Respostas**, informando quantidade e taxa de conteudo **Apenas texto**, **Video**, **Imagem** e **Carrossel de imagens** em grafico de pizza.
- O contrato real `GET /api/admin/private/psychologists/:id/statistics` foi expandido em `community.content_distribution`, preservando o endpoint existente e calculando a distribuicao por posts/respostas reais do psicologo no periodo.
- A classificacao V1 e deterministica: sem midia = **Apenas texto**; qualquer video = **Video**; uma imagem = **Imagem**; duas ou mais imagens no post = **Carrossel de imagens**. Respostas usam a midia unica real de `post_reply`; carrossel permanece categoria canonica com `0` enquanto nao existir suporte real a multiplas midias em respostas.
- A UI usa SVG acessivel para os graficos de pizza, legenda textual com quantidade e percentual, e layout mobile-first: uma coluna em ~390px e duas colunas no desktop.
- Nao houve alteracao em Prisma schema ou migrations; `pnpm --dir backend db:migrate` nao foi necessario.
- Builder/Quick Copy nao estava disponivel como ferramenta callable no ambiente; a validacao visual usou o screenshot enviado pelo usuario em 2026-07-22 e o PNG local `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR criado: `adrs/0310-distribuicao-formato-conteudo-psicologo-admin.md`.

#### Criterios de aceite do ajuste

- [x] Dois blocos aparecem entre **Comunidades ativas** e **Horarios de maior atividade**.
- [x] O bloco **Posts** mostra grafico de pizza, quantidade e taxa para **Apenas texto**, **Video**, **Imagem** e **Carrossel de imagens**.
- [x] O bloco **Respostas** mostra grafico de pizza, quantidade e taxa para **Apenas texto**, **Video**, **Imagem** e **Carrossel de imagens**.
- [x] Os dados vem de posts/respostas reais do psicologo no periodo, sem mock, seed, endpoint paralelo, migration ou package novo.
- [x] A UI permanece mobile-first e foi validada em desktop e 390px.

#### Validacao complementar executada

- `pnpm --dir backend biome:check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Chamada direta do service `showAdminPsychologistStatistics({ id: "cmrgztri7000tn0uh1q4n8vxf", period: "all" })` confirmou `community.content_distribution.posts` e `community.content_distribution.replies` com as quatro categorias, contagens e percentuais reais.
- Browser local/headless via Chrome/CDP em `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`: desktop 1365px e mobile 390px confirmaram os graficos de pizza de **Posts** e **Respostas**, as legendas de formatos e o posicionamento entre os blocos solicitados. Admin temporario real criado para validacao foi removido ao final.

### Ajuste pos-feedback 2026-07-25 - Tag de tracao em Estatisticas de negocio

- Pedido do usuario: ao lado do titulo **Estatisticas de negocio**, exibir uma tag com a classificacao **Tracao Forte**, **Interesse Nao Convertido**, **Trafego Nao Convertido**, **Baixa Tracao** ou **Dados Insuficientes**.
- O endpoint real `GET /api/admin/private/psychologists/:id/statistics` foi expandido em `business.traction`, calculado com os mesmos sinais reais da TASK-84: `profile_view_event.source="profile_page"`, `contact_request.channel="whatsapp"` e `psychologist_favorite`.
- A classificacao respeita o filtro de periodo da secao de negocio e normaliza os sinais para 30 dias pelos dias ativos do perfil na janela selecionada, sem mock, seed, endpoint paralelo, migration ou package novo.
- A UI Admin renderiza a tag em layout mobile-first ao lado do titulo, preservando o indicador **Atualizando** durante refetch.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram o screenshot enviado pelo usuario e `_product/proto/admin/Psicologos/Detalhes do psicologo/Estatisticas.png`.
- ADR atualizado: `adrs/0322-tracao-dashboard-psicologos-admin.md`.

#### Criterios de aceite do ajuste

- [x] A aba **Estatisticas** exibe a tag de tracao ao lado de **Estatisticas de negocio**.
- [x] A categoria vem do endpoint real de estatisticas e usa somente visualizacoes de perfil, cliques WhatsApp e favoritos persistidos.
- [x] A classificacao respeita o periodo selecionado na secao e usa normalizacao para 30 dias.
- [x] Nenhum mock, seed, endpoint simulado, migration ou package novo foi adicionado.

#### Validacao complementar executada

- `pnpm --dir backend exec biome check src/modules/api/admin/private/psychologists/engagement/DTOs/IAdminPsychologistEngagementDTO.ts src/modules/api/admin/private/psychologists/engagement/use-cases/services.ts`
- `pnpm --dir admin exec biome check src/api/req/psychologists/index.ts "src/app/(admin)/psicologos/[id]/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` passou apos repetir a execucao; a primeira tentativa falhou por erro transitorio do `prisma generate` no Windows indicando que `src/external/generated/prisma` existia mas nao parecia um Prisma Client gerado. `pnpm --dir backend exec prisma generate` passou em seguida e a repeticao de `pnpm check` ficou verde.
- Chamada direta do service `showAdminPsychologistStatistics({ id: "cmrgztri7000tn0uh1q4n8vxf", period: "all" })` confirmou `business.traction.label="Tracao Forte"` com sinais reais.
- HTTP local autenticado em `GET http://localhost:3001/api/admin/private/psychologists/cmrgztri7000tn0uh1q4n8vxf/statistics?period=all` confirmou `business.traction`.
- Browser local/headless via Chrome/CDP em build Admin servido em `http://localhost:3012/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` confirmou em desktop 1365px e mobile 390px que **Estatisticas de negocio** exibe a tag **Tracao Forte** ao lado do titulo. A porta 3012 foi usada apenas para validar build novo sem interferir no servidor local 3002 ja aberto; CORS foi desabilitado no Chrome de validacao porque o backend local permite a origem padrao 3002.
