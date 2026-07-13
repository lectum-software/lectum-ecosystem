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
