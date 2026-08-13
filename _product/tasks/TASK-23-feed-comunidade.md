# TASK-23: Feed de comunidade

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-23 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Completed |
| Dependências | TASK-22 |
| ADR alvo | ADR de feed de comunidade |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Feed Comunidade.jpg` | `figma-design-frame-3-Feed-Comunidade.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

O feed é longo e precisa ser eficiente. Deve listar posts reais, com contadores vindos do backend. Refinamento de 2026-06-13: a tela principal é o Feed da Comunidade agregado, reunindo destaques de todas as comunidades; detalhes por comunidade serão criados em task futura.

## Objetivo

Criar feed real agregado de posts de comunidades com paginação, filtros, chips de comunidade e ações básicas.

## Refinamento vigente do Feed Global

- A tela principal é o Feed da Comunidade global, não detalhe de comunidade.
- Comunidades individuais terão telas próprias em task futura; chips e nomes de comunidade já apontam para as rotas futuras.
- Usuários finais não criam comunidades diretamente: usam "Solicitar nova comunidade" para análise da equipe.
- Criação, curadoria e moderação de comunidades pertencem à plataforma/administração, não a usuários comuns.
- O selo `TOP MENTOR`/`TOP #1 MENTOR` é apenas destaque visual e não concede permissão especial. A UI deve suportar `TOP #1 MENTOR` (ouro), `TOP #2 MENTOR` (prata) e `TOP #3 MENTOR` (bronze), usando os gradientes definidos no Figma e posicionados acima do nome do psicólogo.
- Posts de pacientes exigem título, texto/descrição e comunidade relacionada.
- A publicação anônima de paciente usa avatar com ícone anônimo e nome `Membro Anônimo #1234`, com sufixo determinístico por post; a publicação identificada mostra nome/avatar reais do paciente.
- A prévia profissional no card só aparece quando houver resposta/comentário de psicólogo com `cfp_verified_at`; entre várias respostas verificadas, vence a de maior `upvotes_count`.
- Comentários de usuários comuns e respostas de psicólogos não verificados não entram na prévia profissional.
- WhatsApp aparece somente em respostas de psicólogos verificados com entitlement profissional pago ativo.
- O header do feed esconde ao rolar para baixo e reaparece ao rolar para cima, com transição suave.
- A navegação inferior do Feed da Comunidade substitui o item central `Comunidade` por um CTA circular azul com ícone `+`, sem texto abaixo, apontando para a rota futura de criação de post; a navbar mantém a mesma altura/estrutura das demais telas e apenas o botão central usa proporção visual do mockup.

## Pré-requisitos e bloqueios

- Depende de comunidades reais ou estado vazio honesto.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community` exibe a lista/exploração de comunidades.
- `/app/community/feed` é a rota canônica do Feed da Comunidade agregado.
- `/app/community/[slug]` fica reservado para detalhe futuro; enquanto o detalhe não existir, pode servir apenas como compatibilidade/filtro do feed.
- `/app/community/post/new` é a rota preparada para criação futura de posts de pacientes e psicólogos.

Implementação esperada:

- Criar feed agregado com infinite scroll ou paginação.
- Exibir comunidade, autor, tags, contadores, CTA de WhatsApp quando houver psicólogo e ações de post.
- Exibir busca, filtro "Todas as comunidades"/"Apenas comunidades que o usuário segue" e chips ativos do catálogo curado: Explorar, Ansiedade, Relacionamentos, Autocuidado, Depressão e TDAH.
- Filtrar por comunidade/categoria quando disponível sem transformar o feed agregado em página de detalhe.
- Estados loading, erro e vazio.
- Não usar array local de posts.

## Escopo backend

Implementação esperada:

- Endpoint de feed agregado paginado, com filtro opcional por comunidade para chips/compatibilidade.
- Retornar apenas posts com `community_post.status = "publicado"`.
- Usar os contadores denormalizados de `community_post` (`upvotes_count`, `downvotes_count`, `replies_count`, `saves_count`) — não recalcular por agregação a cada request.
- Índices conforme `DATA-MODEL.md` (`@@index([community_id, status, createdAt])`).
- Não expor dados privados de autores; downvote nunca exposto individualmente.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (contadores denormalizados)
- `community`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/community/feed/posts`
- GET `/api/private/community/:slug/posts` (compatibilidade/detalhe futuro)

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — paginação `page`/`limit` (default 20, máx 50), busca `search`, filtro opcional `community` e `scope="all"|"following"`. Para feed muito longo avaliar cursor por `createdAt`+`id` e `@tanstack/react-virtual` (registrar em ADR).

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- TanStack Query
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execucao complementar: refinamento visual do feed e follow silencioso (2026-06-14)

- Pedido do usuario: ajustar `/app/community/feed` sem alterar estrutura do post, conteudo textual ou responsividade geral.
- As chamadas `followCommunity` e `unfollowCommunity` deixaram de usar `showSuccess`, removendo o toast/notificacao verde de sucesso ao seguir/deixar de seguir comunidade; a mutation, o estado otimista, a invalidacao de cache e os erros permanecem funcionando.
- No card do post, o espacamento horizontal entre nome, selo verificado e selo `TOP #1 Mentor` foi reduzido para que os elementos fiquem visualmente conectados e alinhados ao centro.
- Os botoes/numeros de upvote, downvote, comentarios, salvar e compartilhar foram padronizados em altura, `min-width`, padding, tamanho de icone, fonte tabular e gap interno usando os componentes existentes.
- Upvote/downvote permanecem agrupados, mas seguem a mesma escala visual dos demais controles; comentarios, salvar e compartilhar receberam a mesma superficie neutra.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, textos ou rotas.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg` e o pedido detalhado do usuario.
- ADR criado: `adrs/0081-refinos-feed-comunidade.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/community/feed`.

## Execucao complementar: `ver mais` inline no feed de comunidade (2026-06-14)

- Pedido do usuario: ajustar o alinhamento dos textos do post e da resposta em `/app/community/feed`, principalmente no mobile, sem alterar conteudo textual nem estrutura geral do card.
- O truncamento deixou de usar `line-clamp` com botao absoluto, gradiente e padding manual para empurrar `... ver mais` para uma posicao fixa.
- Foi criado um componente local de texto expansivel inline para post e resposta profissional; o `... ver mais` agora entra no fluxo do paragrafo e acompanha a linha do texto.
- O controle inline herda tamanho de fonte, line-height e fonte do texto imediatamente anterior, com apenas uma cor levemente interativa.
- O texto completo permanece intacto ao expandir; `ver menos` tambem fica inline no fluxo do paragrafo expandido.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API ou responsividade geral da pagina.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, a captura enviada pelo usuario e o pedido detalhado.
- ADR criado: `adrs/0082-ver-mais-inline-feed-comunidade.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/community/feed`.

## Execucao complementar: truncamento medido e identidade compacta no feed de comunidade (2026-06-14)

- Pedido do usuario: corrigir `/app/community/feed` no mobile e desktop para que o texto do post e da resposta usem ate 2 linhas completas, aproveitando 100% da largura util antes de truncar, mantendo `... ver mais` inline no final da ultima linha visivel.
- O truncamento deixou de usar constantes fixas de caracteres (`POST_CONTENT_PREVIEW_LENGTH` e `REPLY_CONTENT_PREVIEW_LENGTH`) e passou a medir a largura real do paragrafo no cliente, com `ResizeObserver`, `document.fonts.ready` e busca binaria do maior prefixo que cabe em 2 linhas junto do sufixo inline.
- `... ver mais` e `ver menos` permanecem dentro do fluxo do paragrafo, herdando tamanho de fonte e line-height do texto imediatamente anterior, sem posicionamento absoluto ou linha separada.
- O fundo cinza foi mantido somente no grupo upvote/downvote; comentarios, salvar e compartilhar voltaram a ficar sem essa superficie cinza base, mantendo a mesma escala visual do componente de comentarios.
- A altura do grupo de votos foi ajustada para `h-8`, alinhada aos demais botoes de interacao.
- Causa raiz do espacamento excessivo entre nome, selo e `TOP #1 Mentor`: `PostCard` e `ProfessionalReplyPreview` separavam nome+selo verificado em um wrapper e `MentorBadge` em outro item de `flex`, com `flex-wrap`/gaps intermediarios.
- Correcao estrutural: criacao de `AuthorIdentityLine`, renderizando nome, selo verificado e `MentorBadge` como uma unica linha flex compacta (`gap-1`) reutilizada no post e na resposta profissional.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API, conteudo textual ou estrutura geral dos cards.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, as capturas enviadas pelo usuario e o pedido detalhado.
- ADR criado: `adrs/0085-truncamento-medido-feed-comunidade.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/community/feed`.

## Execucao complementar: fullscreen vertical dos videos do feed de comunidade (2026-06-14)

- Pedido do usuario: ajustar o modo expandido/fullscreen de videos de postagens e respostas em `/app/community/feed`, preservando o player dentro do card e mantendo mobile como esta.
- Os videos de `PostMedia` e `ProfessionalReplyMedia` receberam a classe `lectum-community-feed-video` sem alterar as classes de exibicao embutida no card.
- Foi adicionada regra CSS apenas para desktop (`min-width: 1024px`) nos estados nativos `:fullscreen` e `:-webkit-full-screen`.
- No fullscreen desktop, o video passa a usar `aspect-ratio: 9 / 16`, largura calculada a partir da altura da viewport, `object-fit: contain`, centralizacao via `inset: 0` + `margin: auto` e backdrop preto.
- No mobile, nenhuma regra nova e aplicada porque o media query desktop nao atua abaixo de 1024px.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API ou conteudo textual.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, as capturas enviadas pelo usuario e o pedido detalhado.
- ADR criado: `adrs/0086-fullscreen-video-feed-comunidade.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://127.0.0.1:3000/app/community/feed`.

## Execucao complementar: destaque leve da resposta profissional no feed (2026-06-14)

- Pedido do usuario: destacar visualmente apenas o bloco da resposta do psicologo em `/app/community/feed`, sem alterar o post original nem transformar a resposta em um card pesado.
- `ProfessionalReplyPreview` recebeu fundo azul extremamente suave, borda azul sutil, `border-radius` de 16px e padding interno confortavel.
- A linha lateral interna da resposta passou para um tom azul claro para reforcar que se trata de resposta profissional destacada.
- Nao foram adicionadas sombras, fundo cinza, novos componentes, novos contratos de API, backend, Prisma, migrations ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, a captura enviada pelo usuario e o pedido detalhado.
- ADR atualizado: `adrs/0081-refinos-feed-comunidade.md`.
- Validacoes executadas nesta execucao:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check` (primeira tentativa excedeu o timeout local de 120s; repetido com timeout maior e concluiu com sucesso)
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://localhost:3000/app/community/feed` com cookie de sessao de desenvolvimento.

## Execucao complementar: links discretos nos campos do card do feed (2026-06-14)

- Pedido do usuario: ajustar os campos clicaveis dos posts em `/app/community/feed` no desktop para abrir detalhe pelo texto do post e remover aparencia de link azul/sublinhado no hover.
- O texto do post recebeu uma camada de link para `communityPostDetailHref(post)` somente a partir do breakpoint desktop/tablet largo (`md`), mantendo o mobile sem mudanca de comportamento.
- O controle inline `... ver mais` continua funcionando sobre a camada clicavel porque para a propagacao do clique e permanece no fluxo do texto.
- Titulo do post, texto do post, nome do psicologo na resposta, metadados do psicologo, nome da comunidade e bloco da resposta profissional mantem apenas cursor de interacao, sem `hover:text-primary`, `hover:underline`, mudanca de peso ou deslocamento de layout.
- A resposta profissional segue clicavel para o detalhe do post, mas sem alteracao visual de fundo no hover.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API, conteudo textual ou estrutura geral dos cards.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, a captura enviada pelo usuario e o pedido detalhado.
- ADR atualizado: `adrs/0081-refinos-feed-comunidade.md`.
- Validacoes executadas nesta execucao:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://localhost:3000/app/community/feed` com cookie de sessao de desenvolvimento.

## Execucao complementar: ranking diversificado do feed geral (2026-06-14)

- Pedido do usuario: implementar a logica completa de ordenacao do feed geral `/app/community/feed`, reunindo posts de todas as comunidades com diversidade, sem limitar o feed aos Top 5 de cada comunidade e sem alterar as paginas internas `/app/community/[slug]`.
- Backend: o endpoint agregado `GET /api/private/community/feed/posts` passou a buscar o conjunto elegivel persistido, calcular metricas reais por post, criar filas ranqueadas por comunidade, montar uma janela inicial de ate 5 candidatos por comunidade e recarregar novos candidatos da fila conforme a pagina ordenada e montada.
- Score base do feed geral: `PostHotScore = upvotes*3 + comentarios*5 + respostasPsicologos*25 + respostasTopMentor*40 + compartilhamentos*4 - penalidades`, com decaimento temporal `CommunityHotScore = PostHotScore / (horasDesdePublicacao + 2)^0.5`.
- Score final: `FeedScore = CommunityHotScore * FreshnessWeight * CommunitySizeWeight * DiversityWeight`, usando pesos de frescor por janela de idade, peso de tamanho por comunidade com `clamp(0.75, 1.15, ...)` e penalizacao dinamica de repeticao de comunidade no historico recente.
- Diversidade: se a comunidade apareceu imediatamente antes, o peso e `0.35`; se apareceu nos ultimos 3 posts, `0.70`; caso contrario `1.00`.
- Paginacao: a ordenacao global e deterministica e a paginacao atual recebe fatias consecutivas dessa ordem, sem repetir posts entre paginas enquanto o conjunto persistido nao mudar. A janela inicial Top 5 por comunidade e apenas o primeiro pool de candidatos; posts abaixo dessa janela continuam elegiveis quando a fila da comunidade e recarregada.
- Penalidades: posts removidos seguem excluidos por `status = publicado`; nao ha campos persistidos de denuncia/ocultacao/moderacao, entao a estrutura fica preparada via penalidade interna. Downvotes persistidos sao usados apenas como penalidade leve interna e nao sao exibidos ao usuario.
- Escopo: nao houve alteracao no endpoint `GET /api/private/community/:slug/posts` nem no algoritmo das paginas internas de comunidade, que continuam usando o ranking comunitario proprio.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia visual registrada permanece `_product/proto/Feed Comunidade.jpg`, mas a alteracao foi de regra de ranking backend sem mudanca visual de layout.
- ADR criado: `adrs/0088-feed-geral-ranking-diversificado.md`.

- Validacoes executadas nesta execucao: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check`; HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/feed` e `/app/community/ansiedade-em-equilibrio`.

## Execucao complementar: onboarding de primeira visita para publicar na comunidade (2026-06-14)

- Pedido do usuario: exibir uma orientacao leve apenas na primeira visita a qualquer tela de comunidade, destacando o botao Publicar sem alterar sua logica nem o layout permanente.
- Foi criado um onboarding local em `frontend/src/app/app/community/[slug]/logic.tsx`, renderizado em `/app/community/feed` e `/app/community/[slug]`.
- O estado de visualizacao e persistido em `localStorage` com a chave `lectum:community:publish-onboarding:v1`; depois de fechar por `Entendi`, clique fora ou `Esc`, o onboarding nao aparece novamente.
- O overlay cobre a viewport inteira acima de menu lateral, navegacao mobile e botoes flutuantes (`z-[120]`), com fundo escurecido e blur leve.
- O botao Publicar original permanece inalterado; o destaque usa uma camada visual propria com pulso/glow para nao interferir no href, handlers ou estrutura do CTA.
- No desktop, o tooltip fica proximo ao botao flutuante de publicar; no mobile do feed, o foco fica no botao central da bottom navigation; na comunidade interna, o foco acompanha o botao flutuante existente.
- O texto segue a regra de comunicacao segura: conversa gratuita dentro da comunidade e acolhimento de psicologos mediadores, sem prometer consulta, diagnostico ou atendimento psicologico gratuito.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API ou dados persistidos no servidor.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia usada foi `_product/proto/Feed Comunidade.jpg`, o comportamento atual das rotas e o pedido detalhado do usuario.
- ADR criado: `adrs/0089-onboarding-publicar-comunidade.md`.
- Validacoes executadas nesta execucao:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/feed` e `/app/community/ansiedade-em-equilibrio`.

## Execucao complementar: hierarquia visual do contexto de comunidade no feed (2026-06-14)

- Pedido do usuario: reduzir o peso visual do nome da comunidade no cabecalho dos posts do feed, mantendo foco em autor, titulo e conteudo da discussao.
- Em `PostCard`, o texto auxiliar `Postado em` passou a usar `text-subtle`, ficando mais discreto que o contexto principal.
- O nome da comunidade manteve o peso `font-black`, tamanho e espacamento, mas passou de `text-foreground` para `text-muted`, preservando legibilidade em tom cinza neutro sem preto ou azul.
- O chip `Seguindo`, os espacamentos, a fonte e a navegacao para a comunidade nao foram alterados.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, contratos de API, dados ou layout estrutural.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; a referencia usada foi `_product/proto/Feed Comunidade.jpg` e o pedido detalhado do usuario.
- ADR nao atualizado porque a mudanca e apenas de hierarquia visual local, sem decisao arquitetural, regra de dominio, integracao ou trade-off relevante.
- Validacoes executadas nesta execucao:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/feed`.

## Execucao complementar: badge TOP Mentor premium (2026-06-15)

- Pedido do usuario: reforcar visualmente o badge `TOP #1 Mentor` em respostas/comentarios de psicologos, com ouro/prata/bronze por posicao e brilho sutil sem alterar ranking, dados ou layout geral.
- Foi criado o componente compartilhado `frontend/src/components/community/mentor-badge.tsx` para padronizar o selo no feed e nas respostas profissionais.
- O badge passou a usar tipografia compacta com peso 800, letter-spacing sutil, variacao visual por posicao (`#1` ouro, `#2` prata, `#3` bronze) e brilho horizontal por CSS.
- A string recebida da API permanece a fonte do conteudo; a aparencia em caixa alta e apenas transformacao visual via CSS.
- A animacao respeita `prefers-reduced-motion`, ficando estatica para usuarios que reduzem movimento.
- Nao houve mudanca de backend, Prisma, migrations, endpoints, ranking, ordenacao, dados, posicao do badge ou estrutura dos cards.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; as referencias visuais usadas foram `_product/proto/Feed Comunidade.jpg` e o pedido detalhado do usuario.
- ADR criado: `adrs/0097-top-mentor-badge-premium.md`.
- Validacoes executadas nesta execucao: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local sem cookie autenticado retornou 307 esperado para `/app/community/feed`.

## Execucao complementar: fullscreen nativo liberado em videos do feed (2026-06-16)

- Pedido do usuario: garantir expansao/tela cheia dos videos tambem no feed de comunidades.
- O player vertical compartilhado removeu o bloqueio `nofullscreen` de `controlsList` e passa a abrir o video pela Fullscreen API com preservacao de proporcao antes de usar o lightbox como fallback.
- Videos de posts e respostas do feed continuam usando o mesmo layout embutido, mas podem expandir com fundo preto, controles acessiveis e `object-fit: contain`.
- Nao houve alteracao de backend, Prisma, migrations, packages, schema, ranking, conteudo textual ou cards.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.

## Execução complementar: padronização de controles de interação (2026-06-16)

- Pedido do usuário: padronizar os ícones de upvote/downvote e o texto `Ãštil` no feed, alinhando o tamanho visual aos demais controles relacionados.
- O feed herda a atualização do componente compartilhado `CommunityActionBar`, que agora usa as mesmas primitivas de tamanho para ícones, texto e contadores em upvote, downvote, comentários, salvar e compartilhar.
- O destaque de resposta profissional nos cards compartilhados deixou de usar fundo esverdeado e passou ao azul claro consistente com o padrão de psicólogo verificado.
- Não houve alteração de backend, Prisma, migrations, packages, endpoints, payloads, ranking ou diversidade do feed.
- ADR atualizado: `adrs/0104-barra-acoes-comunidade-unificada.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP local `200` em `/app/community/feed`.

## Complemento 2026-06-16 - fullscreen mobile de videos de conteudo

- Pedido do usuario: corrigir somente no mobile o tamanho ocupado pelo video em fullscreen nos videos de conteudo do feed, sem alterar fullscreen desktop, controles nativos, play/pause, volume, timeline ou centralizacao.
- O `VerticalVideoPlayer` recebeu a variante `fullscreenVariant="content"` apenas nos videos de conteudo do feed/comunidade, marcando esses videos com `data-lectum-content-video="true"`.
- No mobile, ao entrar no fullscreen nativo, o player aplica estilos temporarios calculados pela viewport (`min(100vw, 100dvh * 9 / 16)` e `min(100dvh, 100vw * 16 / 9)`), mantendo proporcao 9:16, `object-fit: contain`, centralizacao e fundo preto.
- Ao sair do fullscreen, todos os estilos temporarios sao restaurados, preservando o player embutido no card.
- O ajuste e restrito a `max-width: 1023px` e a videos marcados como conteudo; o comportamento desktop ja corrigido nao foi alterado.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, ranking, controles nativos ou logica de interacao.
- Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao; referencias auditaveis: `_product/proto/Feed Comunidade.jpg`, `_product/proto/Dentro da Comunidade.jpg`, `_product/proto/Dentro do Post.jpg` e captura enviada pelo usuario.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.
- Validacoes executadas: `pnpm --dir frontend check` e Chrome/CDP mobile 390x844 nas rotas `/app/community/feed`, `/app/community/ansiedade-em-equilibrio` e `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, confirmando expansao para 390x693px, proporcao 9:16, `object-fit: contain`, fundo/viewport centralizado e restauracao do tamanho embutido ao sair.


## Complemento 2026-06-17 - conteudo textual clicavel no feed

- Pedido do usuario: permitir abrir o detalhe do post ao clicar tambem no texto/resumo abaixo do titulo e no trecho `... ver mais`, sem transformar o card inteiro em link.
- Fonte visual auditavel: `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta direta nesta sessao, entao a validacao visual usou browser local.
- No feed geral, a area textual do post agora e um link para `/app/community/[slug]/post/[id]`, incluindo o trecho `... ver mais` quando houver truncagem.
- O titulo permanece clicavel e as acoes de upvote, downvote, comentarios, salvar e compartilhar seguem fora da area de navegacao.
- O ajuste tambem foi aplicado ao card compartilhado de posts para manter consistencia nos contextos que reutilizam o mesmo componente visual.
- Nao houve alteracao de backend, Prisma, migrations, packages, endpoints, payloads, votos, salvamento ou compartilhamento.
- ADR atualizado: `adrs/0062-comunidades-feed-paginado.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- 'src/app/app/community/[slug]/logic.tsx' 'src/components/community/community-post-card.tsx'`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP autenticado validando no mobile que o texto do feed abre o detalhe e que upvote nao navega.

## Execucao complementar: background uniforme no feed de comunidades (2026-06-23)

- Pedido do usuario: padronizar o background de `Comunidades / Feed` para a mesma sensacao visual das telas `Psicologos`, `Favoritos`, `Notificacoes` e `Perfil`.
- Frontend: `/app/community/feed` e `/app/community/[slug]` passaram a usar o token global `bg-background` no `PrivateTemplate`, removendo o hardcode `#F5F7FA` do fundo principal.
- Frontend: os headers sticky de busca/filtros agora usam `bg-background` solido, sem transparencias, blur ou `supports-[backdrop-filter]`, evitando faixas ou manchas sutis no topo.
- Frontend: `/app/community` tambem passou a usar `bg-background` e removeu o fade lateral em gradiente do carrossel de comunidades, mantendo a hierarquia somente por cards, bordas e componentes.
- Frontend: o offset de foco do FAB de publicar passou a usar `ring-offset-background`, evitando divergencia tonal em estados de foco.
- Estados de loading/vazio continuam como superficies/cards sobre o fundo uniforme, sem alterar contratos de API, dados, rankings, posts, comentarios, midias, storage ou permissoes.
- Nao houve alteracao de backend, Prisma schema, migrations ou packages.
- Fonte visual auditavel: screenshots do usuario e telas locais existentes; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR criado: `adrs/0160-background-uniforme-comunidades-feed.md`.

### Validacoes

- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] `git diff --check`

## Execução complementar: header compacto premium do feed (2026-06-25)

- Pedido do usuário: transformar o header do feed em uma única linha `[buscar] [selecionar comunidade] [configurações]`, com seletor de comunidades e primeira opção `Todas as comunidades` levando para explorar comunidades.
- Fonte visual auditável: `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy não está exposto como ferramenta callable nesta sessão.
- O header de `/app/community/feed` e compatibilidade `/app/community/[slug]` deixou de usar chips em segunda linha e passou a usar um dropdown central de comunidades.
- A primeira opção do dropdown é `Todas as comunidades`, com ícone de explorar e seta ao final do texto, apontando para `/app/community`.
- Busca e configurações viraram botões premium padronizados, com superfície, borda, foco, sombra sutil e popovers compactos sem alterar dados, ranking, rotas ou contratos da API.
- ADR criado: `adrs/0166-header-feed-comunidades-premium.md`.
- Validações executadas: `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check` e HTTP local `200` em `/app/community/feed` e `/app/community/ansiedade-em-equilibrio`.

## Execucao complementar: header transparente no feed de comunidades (2026-06-25)

- Pedido do usuario: remover o fundo branco atras do header compacto do feed, mantendo apenas os controles visiveis sobre o fundo da pagina.
- O container sticky de `/app/community/feed` teve removidos `bg-background` e a borda inferior, preservando comportamento sticky/auto-hide, padding e transicao.
- O wrapper visual interno que agrupava busca, seletor e configuracoes teve removidos fundo, borda, raio e sombra, mantendo somente layout, largura, gap e padding para nao alterar o espacamento dos controles.
- Os componentes internos do header mantiveram suas classes de superficie, borda, sombra, foco e estados ativos.
- Nao houve alteracao de backend, Prisma, migrations, packages, dados, rotas, ranking ou contratos de API.
- ADR atualizado: `adrs/0166-header-feed-comunidades-premium.md`.
- Validacoes executadas nesta execucao: `pnpm.cmd --dir frontend exec biome check --write "src/app/app/community/[slug]/logic.tsx"`, `pnpm.cmd --dir frontend check`, `pnpm.cmd --dir frontend build`, `pnpm.cmd check` e HTTP local `200` em `/app/community/feed` e `/app/community/ansiedade-em-equilibrio`.

## Complemento 2026-06-25 - chips de ordenacao com escala do CTA Top Mentores

- Pedido do usuario: manter cor azul na chip ativa, inativas brancas e layout atual, alterando somente o tamanho das chips `Em destaque`, `Novos`, `Mais comentados` e `Mais uteis` para aproximar da chip `Ver Top 5 mentores da comunidade`.
- Frontend: somente as chips de ordenacao de `/app/community/[slug]` foram recalibradas para `h-8/min-h-8` e tipografia `text-xs`, preservando cores, bordas, icones, raio, rolagem horizontal, dropdown de periodo e comportamento atual.
- O CTA `Ver Top 5 mentores da comunidade` nao foi alterado; ele foi usado apenas como referencia de escala.
- Escopo: sem alteracao de backend, Prisma, migrations, packages, ranking, filtros reais, posts, rotas, Favoritos ou Perfil.

## Complemento 2026-06-26 - seletor do header com copy e avatar

- Pedido do usuario: no header premium do feed, trocar o placeholder `Selecione uma comunidade` por `Escolher comunidade`, refinar a fonte do texto e exibir avatar da comunidade no seletor.
- Frontend: o catalogo `COMMUNITY_FEED_CHIPS` passou a carregar `iconUrl` dos assets publicos curados em `/community/icons/*.png`, sem alterar slugs, nomes, rotas ou dados de API.
- Frontend: o seletor central do feed agora usa tipografia mais leve/premium (`font-semibold`, tracking negativo sutil) e exibe o avatar quando ha comunidade ativa; no estado geral, exibe icone discreto de explorar ao lado de `Escolher comunidade`.
- O dropdown tambem exibe os avatares das comunidades nas opcoes individuais, mantendo `Todas as comunidades` como primeira acao de navegacao para `/app/community` com seta ao final.
- Escopo: sem alteracao de backend, Prisma schema, migrations, endpoints, ranking, posts, respostas, filtros reais, Favoritos, Perfil ou packages.
- Fonte visual/auditavel: screenshot do usuario em `/app/community/feed` e `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- ADR atualizado: `adrs/0166-header-feed-comunidades-premium.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check --write -- "src/app/app/community/[slug]/logic.tsx" "src/utils/community.ts"`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `git diff --check`, HTTP local `200` em `/app/community/feed` e HTTP local `200` em `/app/community/ansiedade-em-equilibrio`.

## Complemento 2026-06-26 - alias anônimo estável por usuário

- Pedido do usuário: posts anônimos devem manter o mesmo identificador para o mesmo membro, permitindo que psicólogos reconheçam continuidade entre publicações sem revelar identidade real.
- Backend: o alias `Membro Anônimo #XXXX` deixou de ser calculado a partir do `post.id` e passou a ser calculado a partir do `author.id`, mantendo o mesmo número para todos os posts anônimos daquele usuário em qualquer comunidade.
- A anonimização continua ocultando nome real, avatar e link de identidade do paciente; psicólogos continuam exibidos normalmente e não usam alias anônimo.
- Escopo: sem mudança de schema Prisma, migrations, packages, endpoints, payloads, frontend, permissões, ranking, votos, salvos ou respostas.
- ADR criado: `adrs/0167-alias-anonimo-estavel-por-usuario.md`.

## Complemento 2026-06-26 - mensagem WhatsApp com primeiro nome

- Pedido do usuário: a mensagem pronta do WhatsApp em posts de comunidade deve incluir o primeiro nome do psicólogo, por exemplo `Olá Camila, encontrei seu post na Lectum e gostaria de conversar sobre atendimento.`
- Backend: a geração de `author.whatsapp_url` passou a usar utilitário compartilhado que inclui o primeiro nome do psicólogo e escolhe a copy pelo contexto (`perfil`, `post de comunidade` ou `resposta de comunidade`).
- Frontend: a transição compartilhada para WhatsApp preserva o texto contextual vindo do card/post, mesmo quando o endpoint de tracking retorna uma URL de contato atualizada.
- Escopo: sem mudança de schema Prisma, migrations, endpoints, permissões, ranking, votos, salvos, mídia ou packages.
- ADR atualizado: `adrs/0022-contato-whatsapp-wa-me.md`.


## Complemento 2026-08-10 - video 9:16 e metadata discreta em resposta destacada

- Pedido do usuario: no feed publico, o video exibido dentro da resposta profissional em destaque deve permanecer em formato vertical 9:16, e a metadata da resposta destacada nao deve exibir `1 upvotes`.
- Fonte visual/auditavel: screenshot do usuario nesta conversa e referencia local `_product/proto/Feed Comunidade.jpg`. Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a imagem local foi consultada como fallback.
- Frontend: `CommunityMediaBlock` passou a forcar videos com `variant="reply"` para orientacao `portrait`, frame `9 / 16` e `object-fit: contain`, ignorando apenas para respostas o `aspectRatio` inline derivado dos metadados do arquivo.
- Frontend: a metadata de `ProfessionalReplyPreview` no card duplicado legado e no componente compartilhado deixou de renderizar a contagem textual de upvotes; votos continuam na barra de acoes da entidade correta.
- Escopo: sem alteracao de backend, Prisma schema, migrations, endpoints, dados persistidos, dependencia nova ou envs.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.

### Criterios de aceite do complemento

- [x] Video em resposta profissional destacada usa frame 9:16 em vez de herdar proporcoes intermediarias do arquivo.
- [x] A resposta destacada nao exibe `1 upvotes`/contador textual de upvotes na linha de metadata.
- [x] Votos persistidos e barra de acoes nao foram alterados.
- [x] Sem mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration.

### Validacoes do complemento

- [x] `pnpm --dir frontend exec biome check --write -- "src/components/community/community-media-frame.tsx" "src/components/community/community-post-card-reply-preview.tsx" "src/app/app/community/[slug]/components/post-card.tsx"`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` com `.next` limpo apos lock/artefato stale local de build.
- [x] `pnpm check:version`
- [x] `git diff --check`
- [x] Browser local mobile 390x844 abriu `http://localhost:3000/` com HTTP 200; a API local/externa do feed retornou estado `Feed indisponivel`, entao a sessao nao usou mock/seed para forcar card real.

## Complemento 2026-08-12 - ajuste fino do pill de votos do feed

- Pedido do usuario: no feed mobile, a borda do grupo upvote/downvote estava cortando um pedaco e deveria ser reduzida apenas alguns pixels para nao perder o contorno.
- Fonte visual auditavel: screenshot enviado em `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-12 at 14.38.13.jpeg` e referencia local `_product/proto/Feed Comunidade.jpg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: o cluster padrao de votos da `CommunityActionBar` deixou de usar `ring`, que desenha para fora da caixa e pode ser cortado por containers com overflow horizontal, e passou a usar `border` interna.
- Frontend: o padding externo do pill foi reduzido de `p-0.5` para `p-px`; nos tamanhos `sm` e `md`, os controles internos do cluster foram reduzidos uma etapa para alinhar a altura do pill aos demais botoes da barra sem alterar icones, contadores, texto `Util`, votos ou mutations.
- Escopo: sem mudancas de backend, Prisma schema, migrations, endpoints, payloads, packages, envs, storage, ranking, votos, salvos, comentarios ou compartilhamento.
- ADR atualizado: `adrs/0104-barra-acoes-comunidade-unificada.md`.

### Criterios de aceite do complemento

- [x] O pill de upvote/downvote do feed fica alguns pixels menor e preserva todo o contorno visivel.
- [x] A borda do pill e interna ao componente, evitando corte por overflow horizontal da action bar.
- [x] As acoes de voto mantem a mesma semantica, handlers, contadores e estados ativos.
- [x] O ajuste permanece frontend-only e compativel com backend antigo/novo.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes

- [x] `pnpm --dir frontend biome:check`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build`
- [x] `pnpm check`
- [x] Next local buildado em `http://127.0.0.1:3035`: `/version` respondeu 200, `/app/community/feed` respondeu 308 para `/app/comunidades/feed`, e `/app/comunidades/feed` respondeu 200.
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `git diff --check`
- [x] `pnpm version:bump`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.

## Complemento 2026-08-12 - identidade do psicologo mais compacta e selo unificado

- Pedido do usuario: na identificacao do psicologo em comunidades, reduzir o espaco entre nome e metadata (`Psicologo • ha 5d`), reduzir o espaco entre nome e selo verificado, e garantir que o selo das paginas de comunidade seja o mesmo do perfil publico do psicologo.
- Fonte visual auditavel: screenshot enviado em `c:/Users/tulio/Downloads/WhatsApp Image 2026-08-12 at 19.26.56.jpeg`; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: as linhas de autoria das comunidades passaram a usar `gap-0.5` entre nome e selo verificado e `gap-0.5` entre a linha do nome e a metadata, com `leading-tight` nos textos envolvidos para reduzir o espaco vertical sem alterar conteudo.
- Frontend: posts do feed/comunidade, resposta profissional destacada, detalhe do post, continuacao de conversa, replies e Top Mentores da comunidade passaram a renderizar o selo com `VerifiedBadgeIcon`, o mesmo componente usado no perfil publico do psicologo.
- Escopo: sem alteracao de backend, Prisma schema, migrations, endpoints, payloads, packages, envs, ranking, dados de verificacao ou regras de exibicao; apenas apresentacao frontend.
- ADR atualizado: `adrs/0085-truncamento-medido-feed-comunidade.md`.

### Criterios de aceite do complemento

- [x] O espaco entre nome do psicologo e a linha de metadata foi reduzido nas identificacoes de comunidade.
- [x] O espaco entre nome do psicologo e selo verificado foi reduzido nas identificacoes de comunidade.
- [x] O selo verificado das paginas de comunidade usa o mesmo `VerifiedBadgeIcon` do perfil publico do psicologo.
- [x] O ajuste cobre feed/comunidade, detalhe do post, thread/continuacao, respostas e ranking Top Mentores de comunidade.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.

### Validacoes do complemento

- [x] `pnpm --dir frontend biome:check`
- [x] `pnpm --dir frontend check`
- [x] `pnpm --dir frontend build` (repetido apos o bump para validar `0.1.81`)
- [x] Next local buildado em `http://127.0.0.1:3057`: `/version` respondeu `0.1.80`; HTTP local 200 em `/app/comunidades/feed`, `/comunidades/ansiedade-em-equilibrio` e `/psicologos/demo-psychologist-camila-rocha`; Chrome headless mobile 390x844 abriu as tres rotas; apos o bump, `http://127.0.0.1:3058/version` respondeu `0.1.81` e as mesmas tres rotas responderam HTTP 200.
- [x] `pnpm check`
- [x] `git diff --check`
- [x] `pnpm check:encoding`
- [x] `pnpm check:adrs`
- [x] `pnpm check:tasks`
- [x] `pnpm version:bump` para `0.1.81`
- [x] `pnpm check:version`
- Smoke de homologacao sera executado apos o push de `homolog` e reportado ao usuario, pois o push dispara o deploy automatico.
