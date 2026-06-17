# TASK-28: Meus posts e posts salvos

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-28 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Posts |
| Status | Completed |
| Dependências | TASK-24 |
| ADR alvo | ADR de posts do usuário e salvos |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Meus Posts - Paciente.jpg` | `figma-design-frame-14-Meus-Posts---Paciente.html` |
| `_product/proto/Meus Posts - Psicólogo.jpg` | `figma-design-frame-11-Meus-Posts---Psic-logo.html` |
| `_product/proto/Posts Salvos.jpg` | `figma-design-frame-7-Posts-Salvos.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

As telas permitem que usuários acompanhem conteúdo publicado/salvo. Devem usar os mesmos modelos de post e ações do feed.

## Objetivo

Criar telas para posts do usuário e posts salvos, diferenciando paciente e psicólogo.

## Pré-requisitos e bloqueios

- Depende de criação/salvamento real de posts.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md` — "Saved/my posts" sob `/app/posts/...`):

- `/app/posts/mine`
- `/app/posts/saved`

Implementação esperada:

- Criar listagem Meus Posts com variação por perfil.
- Criar listagem Posts Salvos.
- Permitir abrir detalhe do post.
- Exibir status do post quando houver moderação.
- Reutilizar card de post do feed.

## Escopo backend

Implementação esperada:

- Endpoints para posts do usuário autenticado e salvos.
- Garantir escopo por usuário (`community_post.author_id` para Meus Posts; `post_save.user_id` para Salvos).
- Paginar listas.
- Permitir remover salvo (`post_save`, `@@unique([user_id, post_id])`).
- Não retornar posts de outros usuários em Meus Posts.
- Exibir `community_post.status` em Meus Posts (incl. `"removido"`/`"pendente"` quando houver moderação).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (posts próprios)
- `post_save`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- GET `/api/private/posts/mine`
- GET `/api/private/posts/saved`
- DELETE `/api/private/posts/:id/save`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` — listas paginadas (`page`/`limit`, resposta `data: { items, total, page, limit }`; `post_save` ordenado por `@@index([user_id, createdAt])`).

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

## Execução 2026-06-13

- Referências visuais consultadas pelas imagens locais `_product/proto/Meus Posts - Paciente.jpg`,
  `_product/proto/Meus Posts - Psicólogo.jpg` e `_product/proto/Posts Salvos.jpg`; o Builder/Quick
  Copy ativo não estava disponível como ferramenta callable no ambiente.
- Backend implementado nos endpoints `GET /api/private/posts/mine`, `GET /api/private/posts/saved`
  e na ação existente `DELETE /api/private/posts/:id/save`, sem alteração de schema Prisma.
- Frontend implementado em `/app/posts/mine` e `/app/posts/saved`, com estados de loading, erro,
  vazio, sucesso discreto e remoção de salvo real.
- Nenhum mock, seed artificial, endpoint simulado, package novo ou código gerado por Builder foi
  usado.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local mobile
  390x844 nas rotas privadas, com redirecionamento esperado para login sem sessão persistida e sem
  overflow horizontal.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Ajuste complementar em 2026-06-16 - acompanhamento de comentarios

- A rota `/app/posts/mine` foi renomeada visualmente para "Meus posts e comentarios" no perfil do paciente e no titulo da tela.
- A tela passou a iniciar em "Posts" e removeu o filtro "Todos", mantendo apenas "Posts" e "Comentarios" com controles premium.
- Cards de comentarios passaram a usar "Comentado em", removendo rotulos/acoes de engajamento do card e exibindo foco de acompanhamento: respostas recebidas e indicador "Respondido por psicologo" apenas quando ha resposta direta de profissional verificado.
- O bloco de conteudo original citado foi refinado visualmente com fundo, borda, radius, padding e faixa lateral mais discreta.
- Backend de `GET /api/private/posts/mine?type=replies` passou a retornar `replies_received_count` e `has_verified_professional_reply` derivados de dados reais, sem mock e sem alteracao de schema.

## Ajuste complementar em 2026-06-17 - limpeza dos cards de posts

- A rota `/app/posts/mine` removeu a badge/chip visual "PUBLICADO" dos cards de post para reduzir ruido visual.
- Os cards continuam usando o `CommunityPostCard` real e mantendo apenas o contexto "Postado em [comunidade]" na linha superior.
- O backend continua retornando `community_post.status` para compatibilidade e regras futuras, mas a tela nao exibe um status visual substituto nos cards de post.
- Referencias visuais da TASK-28 seguem sendo as imagens locais `_product/proto/Meus Posts - Paciente.jpg`, `_product/proto/Meus Posts - Psicologo.jpg` e `_product/proto/Posts Salvos.jpg`; o Builder/Quick Copy ativo nao esta disponivel como ferramenta callable neste ambiente.

## Ajuste complementar em 2026-06-17 - foco em comentarios do usuario

- Na aba "Comentarios" de `/app/posts/mine`, cada card de comentario passou a navegar para o post
  original com deep link `?focusReplyId=<replyId>#reply-<replyId>`.
- Comentarios diretos no post agora exibem o bloco de contexto "Post original" com o titulo real do
  post; respostas a comentarios continuam exibindo o trecho do comentario pai como contexto.
- O detalhe do post passou a aceitar `focusReplyId` ao carregar a arvore de comentarios, buscando a
  pagina que contem o comentario raiz daquela participacao e aplicando scroll automatico com
  destaque temporario no comentario alvo.
- A implementacao usa dados reais de `post_reply` e `community_post`, sem mock, sem novo package e
  sem alteracao de schema Prisma.
- Validacoes complementares executadas: `pnpm --dir backend check`, `pnpm --dir backend build`,
  `pnpm --dir frontend check`, `pnpm --dir frontend build` e smoke local mobile 390x844 em Chrome
  headless validando card direto com titulo do post, link com `focusReplyId` e destaque temporario
  do comentario no detalhe do post.

## Ajuste complementar em 2026-06-17 - padronizacao da tela Salvos

- A rota `/app/posts/saved` passou a renderizar acoes abaixo de posts e respostas salvas com a mesma `CommunityActionBar` usada no feed/comunidade: upvote/downvote, comentarios/respostas, salvar ativo em azul e compartilhar.
- Foram removidas acoes extras visiveis dos cards salvos, como botoes textuais `Abrir post`, lixeira vermelha e compartilhamento duplicado fora da barra padrao.
- Posts principais salvos deixaram de incorporar automaticamente a resposta profissional em destaque; respostas salvas continuam aparecendo como itens independentes.
- Respostas salvas agora recebem do backend autor, midia, voto atual e estado salvo reais para manter WhatsApp profissional, midia e interacoes consistentes sem mock.
- O CTA `Chamar no WhatsApp` de resposta profissional verificada usa a identidade do feed: fundo transparente, borda verde e texto/icone verdes.
- Validacao complementar: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e smoke local Chrome headless mobile 390x844 em `/app/posts/saved`, confirmando ausencia de `Abrir post`, ausencia de `Resposta profissional em destaque` dentro de post salvo, barra padrao renderizada e WhatsApp vazado verde.

## Ajuste complementar em 2026-06-17 - comentarios com barra padrao e contexto limpo

- Na aba "Comentarios" de `/app/posts/mine`, o chip `X respostas recebidas` foi removido e substituido pela `CommunityActionBar` compartilhada: upvote, downvote, respostas, salvar e compartilhar.
- Cards de comentarios diretos ao post exibem apenas o titulo do post no bloco de contexto, sem rotulo `POST ORIGINAL` e sem icone lateral; respostas a comentarios continuam exibindo o trecho do comentario pai.
- Comentarios continuam navegando para o post original com `?focusReplyId=<replyId>#reply-<replyId>`, preservando scroll automatico e destaque temporario no detalhe do post.
- Posts da aba "Posts" e contextos de post na aba "Comentarios" exibem a flag premium `Respondido por psicologo verificado` quando o post possui resposta profissional verificada real.
- O seletor segmentado `Posts / Comentarios` teve o glow/sombra externa removido, mantendo apenas borda, radius e contraste de estado ativo.
- O backend passou a devolver voto atual e estado salvo dos comentarios em `/api/private/posts/mine`, derivados de `post_vote` e `post_reply_save`, sem schema novo e sem mock.
- Referencias visuais seguem as imagens locais da TASK-28; Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 validando ausencia do chip de respostas recebidas, ausencia de `POST ORIGINAL`, seletor sem box-shadow, deep link com `focusReplyId` e seletor compacto de notificacoes sem overflow.
