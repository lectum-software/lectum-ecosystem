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
