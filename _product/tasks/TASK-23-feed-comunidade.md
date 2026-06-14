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
- Exibir busca, filtro "Todas as comunidades"/"Apenas comunidades que o usuário segue" e chips: Explorar, Ansiedade, Relacionamentos, Mulheres, Autocuidado e Luto.
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
