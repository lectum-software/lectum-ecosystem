# ADR-0072: Meus posts e posts salvos reais

## Status

Accepted

## Task relacionada

TASK-28

## Contexto

A TASK-28 exige as telas `/app/posts/mine` e `/app/posts/saved` usando posts reais das
comunidades, sem mock, e mantendo o mesmo modelo de interacao de `community_post` e `post_save`.
As imagens locais consultadas foram `_product/proto/Meus Posts - Paciente.jpg`,
`_product/proto/Meus Posts - Psicólogo.jpg` e `_product/proto/Posts Salvos.jpg`.
O Builder/Quick Copy ativo nao estava exposto como ferramenta callable neste ambiente, entao a
validacao visual usou as imagens exportadas em `_product/proto`.

## Decisao

Criar endpoints privados sob o namespace existente `/api/private/posts`:

- `GET /api/private/posts/mine`: lista conteudo do usuario autenticado, escopando posts por
  `community_post.author_id=req.auth.id` e respostas por `post_reply.author_id=req.auth.id`.
  O filtro `type=all|posts|replies` sustenta as abas do prototipo.
- `GET /api/private/posts/saved`: lista somente posts salvos ativos do usuario autenticado,
  escopando por `post_save.user_id=req.auth.id`, `post_save.deleted=false` e post publicado.
- `DELETE /api/private/posts/:id/save`: permanece como acao canonica para remover salvo.

As respostas usam paginacao no padrao real do backend (`data`, `page`, `pages`, `count`) e tambem
exponem aliases `items`, `total` e `limit` para compatibilizar o contrato textual da TASK-28 sem
quebrar o padrao usado nas demais listas.

No frontend:

- rotas novas em `frontend/src/app/app/posts/mine` e `frontend/src/app/app/posts/saved`;
- chamadas via `frontend/src/api/req/posts`, hooks em `frontend/src/api/callers/posts` e keys em
  `frontend/src/api/cache/keys.ts`;
- componente reutilizavel `CommunityPostCard` para manter a apresentacao de posts consistente com
  o feed;
- acesso pelas opcoes "Meus posts e comentarios" e "Salvos" no menu de Comunidade da tela de Perfil;
- estados de loading, erro, vazio, sucesso e feedback de remocao dos salvos em PT-BR.

Nao houve alteracao de schema Prisma nem nova dependencia.

## Consequencias

- Meus Posts nunca retorna posts de outros usuarios.
- Posts Salvos nunca retorna salvos de outro usuario e permite remover o salvo real por soft delete.
- O backend segue retornando `community_post.status` em Meus Posts para compatibilidade e regras de
  moderacao futuras, mas a tela `/app/posts/mine` nao exibe mais selo visual de status nos cards de
  post; o contexto principal fica apenas em "Postado em [comunidade]".
- Posts Salvos mostra apenas posts publicados disponiveis.
- Respostas do usuario entram em Meus Posts para cumprir a variacao visual das abas "Todos",
  "Posts" e "Respostas", sem criar modelo novo.

## Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local Chrome headless em 390x844 para `/app/posts/mine` e `/app/posts/saved`: sem sessao
  persistida, ambas redirecionaram para login como esperado para rotas privadas, sem overflow
  horizontal (`documentElement.scrollWidth=390`, `body.scrollWidth=390`).

## Complemento 2026-06-16

- A tela `/app/posts/mine` passou a ser a area de acompanhamento "Meus posts e comentarios" para pacientes, mantendo o endpoint existente e sem criar rota paralela.
- O filtro visual "Todos" foi removido desta tela; "Posts" passa a ser o estado inicial padrao, e "Comentarios" consulta apenas `type=replies`. O contrato legado `type=all` permanece no backend para compatibilidade com outras listas.
- Comentarios do usuario agora retornam metadados derivados `replies_received_count` e `has_verified_professional_reply`, calculados por dados reais de `post_reply`, para permitir acompanhamento de conversa sem expor upvotes, compartilhar ou CTA de abrir post no card.
- O indicador profissional so aparece quando ha resposta direta ativa de psicologo com `cfp_verified_at`; nao ha estado negativo quando a conversa ainda nao recebeu resposta profissional.

## Complemento 2026-06-17

- A tela `/app/posts/mine` removeu a badge visual "PUBLICADO" dos cards de post.
- A decisao reduz ruido visual e preserva apenas a linha de contexto "Postado em [comunidade]" sem
  criar status substituto.
- A mudanca e apenas de apresentacao: nenhum endpoint, schema Prisma ou regra de ordenacao foi
  alterado, e o status permanece disponivel no contrato backend.

## Complemento 2026-06-17: Deep link para comentarios do usuario

### Contexto

Na aba "Comentarios" de `/app/posts/mine`, o paciente precisa voltar diretamente para a conversa em
que participou. Comentarios diretos no post tambem nao possuíam contexto textual suficiente quando
nao havia `parent_reply`.

### Decisao

- Adotar o formato de deep link
  `/app/community/:slug/post/:postId?focusReplyId=:replyId#reply-:replyId` para comentarios listados
  em "Meus posts e comentarios".
- Estender `GET /api/private/posts/:id/replies` com o query param opcional `focusReplyId`, sem novo
  endpoint, para resolver o comentario raiz da participacao e retornar a pagina correta da arvore.
- Manter a arvore e a ordenacao existentes; o `focusReplyId` altera somente a pagina inicial
  retornada quando necessario.
- Aplicar scroll suave e destaque temporario no frontend por `id="reply-:replyId"`, sem persistir
  estado adicional e sem criar modelo novo.
- Exibir o titulo real de `community_post` no card quando o comentario for direto no post; respostas
  continuam usando `post_reply.parent_reply.content`.

### Consequencias

- A navegacao de acompanhamento leva o usuario ao post original e posiciona a tela no comentario
  especifico, mesmo quando o comentario nao esta na primeira pagina de raizes da discussao.
- Comentarios diretos passam a ter contexto claro por titulo de post, enquanto respostas preservam o
  contexto do comentario pai.
- Nao houve alteracao de schema Prisma nem dependencia nova.

## Complemento 2026-06-17: Salvos com barra de interacao padrao

### Contexto

A tela `/app/posts/saved` havia acumulado acoes paralelas aos componentes de comunidade, como
botao textual `Abrir post`, lixeira vermelha e compartilhamento fora do padrao. Alem disso, um post
principal salvo podia carregar automaticamente a resposta profissional em destaque, criando a
percepcao de que a resposta tambem havia sido salva.

### Decisao

- Reutilizar `CommunityActionBar` em todos os cards salvos, tanto posts quanto respostas, para
  manter a mesma linguagem de interacao do feed/comunidade: upvote/downvote, comentarios ou
  respostas, salvar ativo e compartilhar.
- Transformar a remocao de salvo na propria acao de salvar ativa da barra padrao, sem lixeira ou
  botao destrutivo paralelo.
- Adicionar `saveActionOverride` e `showHighlightedProfessionalReply` ao `CommunityPostCard` para
  permitir que a tela de Salvos remova itens pelo icone de salvar e oculte a resposta destacada sem
  duplicar card de post.
- Estender o DTO de respostas em listas de usuario com `author`, `media_url`, `media_type`,
  `current_user_vote` e `saved`, derivados das tabelas reais `post_reply`, `post_vote` e
  `post_reply_save`, para que respostas salvas tenham interacoes, midia e WhatsApp profissional
  consistentes.
- Padronizar o CTA `Chamar no WhatsApp` de respostas profissionais como outline verde
  (`bg-transparent`, borda/texto/icone verdes), alinhado ao feed.

### Consequencias

- Salvar um post principal guarda apenas o post; uma resposta profissional so aparece em Salvos se
  tiver sido salva como item independente.
- A tela de Salvos deixa de ter acoes duplicadas e passa a depender da mesma barra de interacao das
  comunidades, reduzindo manutencao visual paralela.
- Nao houve mudanca de schema Prisma nem dependencia nova; apenas enriquecimento de DTO e ajuste de
  apresentacao/contrato de resposta existente.
- A validacao visual foi feita com Chrome headless em 390x844 usando sessao real local com itens
  salvos, confirmando que nao ha `Abrir post`, lixeira extra ou resposta destacada embutida no post
  salvo.
